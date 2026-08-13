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
  // Custom cookie name — must match the `cookies.sessionToken` config in
  // auth.ts. The default `next-auth.session-token` was rotated so that stale
  // oversized cookies from the pre-slimmed-down JWT era stop being sent (they
  // caused Vercel 494 REQUEST_HEADER_TOO_LARGE on first page load).
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: 'cs2-coaching.session-token',
    secureCookie: process.env.NODE_ENV === 'production',
  })

  // Actively expire the OLD session cookies. Anyone who logged in before the
  // JWT was slimmed down still has a multi-hundred-KB session token stored —
  // NextAuth v4 chunks tokens over ~3.9KB into `next-auth.session-token.0`,
  // `.1`, … so one oversized JWT becomes dozens of cookies that the browser
  // sends on EVERY request, blowing past Vercel's 10KB request-header limit →
  // 494 REQUEST_HEADER_TOO_LARGE on first page load. Clearing them (by prefix)
  // on any passing response makes them vanish on the next navigation, so those
  // users get a fresh small cookie under the new name.
  const response = NextResponse.next()
  // Plain + `__Secure-`/`__Host-` variants, because production cookies get the
  // secure prefix while development ones don't.
  const stalePrefixes = ['next-auth.session-token', 'next-auth.callback-url', 'next-auth.csrf-token', 'next-auth.pkce.code_verifier', 'next-auth.state', 'next-auth.nonce']
  const allStalePrefixes = stalePrefixes.flatMap((p) => [p, `__Secure-${p}`, `__Host-${p}`])
  for (const cookie of request.cookies.getAll()) {
    const isStale = allStalePrefixes.some((prefix) => cookie.name === prefix || cookie.name.startsWith(prefix + '.'))
    if (isStale) {
      response.cookies.set(cookie.name, '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-'),
        maxAge: 0,
      })
    }
  }

  // Security headers
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
      // Coaches may open a student's match detail page to leave a demo
      // review (timestamped notes + verdict) — everything else under
      // /student is student-only.
      const isMatchDetail = /^\/student\/matches\/[^/]+$/.test(pathname)
      if (!isMatchDetail) {
        return NextResponse.redirect(new URL('/coach/dashboard', request.url))
      }
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