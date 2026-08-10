import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rate limiting store (in production use Redis/Upstash)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // In development the session cookie is a plain (non-Secure, non-`__Secure-`)
  // cookie because auth.ts sets useSecureCookies:false. getToken must look for
  // the same name or it won't find the session even though the user is logged in.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    ...(process.env.NODE_ENV === 'development'
      ? { cookieName: 'next-auth.session-token', secureCookie: false }
      : {}),
  })

  // Security headers
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Frame protection: page routes must be embeddable (the app is previewed
  // inside the Freebuff desktop client, whose origin differs from the app's),
  // so they don't set frame-blocking headers. API routes keep a strict CSP
  // since they return JSON only and are never meant to be framed.
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
  }

  // Rate limiting for auth endpoints.
  // Only enforced when a real client IP is present (behind a proxy) and never
  // in local development: without x-forwarded-for / x-real-ip every request
  // falls back to the same 'unknown' key and the limit is exhausted by a
  // single page reload, which made login unusable locally and in previews.
  const isDev = process.env.NODE_ENV === 'development'
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   ''

  const isAuthPath = pathname.startsWith('/api/auth/') || pathname === '/login' || pathname === '/register'

  if (isAuthPath && !isDev && clientIp) {
    const key = `auth:${clientIp}`

    if (!rateLimit(key, 10, 60 * 1000)) { // 10 requests per minute
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      })
    }
  }

  // Rate limiting for API endpoints
  if (pathname.startsWith('/api/') && !isDev && clientIp) {
    const key = `api:${clientIp}`

    if (!rateLimit(key, 100, 60 * 1000)) { // 100 requests per minute
      return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      })
    }
  }

  // Protected routes
  const protectedPaths = ['/coach', '/student']
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access
  if (token && isProtected) {
    const role = (token as any).role
    if (pathname.startsWith('/coach') && role !== 'COACH') {
      return NextResponse.redirect(new URL('/student/dashboard', request.url))
    }
    if (pathname.startsWith('/student') && role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/coach/dashboard', request.url))
    }
  }

  // Redirect authenticated users from auth pages
  if ((pathname === '/login' || pathname === '/register') && token) {
    const role = (token as any).role
    return NextResponse.redirect(new URL(role === 'COACH' ? '/coach/dashboard' : '/student/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}