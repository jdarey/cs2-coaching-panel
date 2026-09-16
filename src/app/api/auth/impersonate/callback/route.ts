import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Nazwa ciasteczka sesji — MUSI zgadzać się z cookies.sessionToken w auth.ts.
const SESSION_COOKIE = 'cs2-coaching.session-token'
// Sesja z podszywania jest krótsza niż zwykła (12 h zamiast 30 dni).
const SESSION_MAX_AGE = 12 * 60 * 60

// GET: zużywa jednorazowy token impersonacji i wystawia sesję NextAuth
// zalogowaną jako target user. Działa też w incognito (bez sesji admina) —
// całym zabezpieczeniem jest token: losowy, hashowany w DB, ważny 10 minut,
// spalany przy pierwszym użyciu (atomowo).
export async function GET(request: NextRequest) {
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/admin/users?error=${code}`, request.url))

  const token = new URL(request.url).searchParams.get('token')
  if (!token || token.length < 32) return fail('invalid_token')

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const record = await prisma.impersonationToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      adminId: true,
      targetId: true,
      expiresAt: true,
      usedAt: true,
      target: { select: { id: true, role: true } },
    },
  })
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return fail('invalid_token')
  }
  if (!record.target || record.target.role === 'ADMIN') {
    return fail('invalid_target')
  }

  // Atomowe spalenie: tylko pierwsze wywołanie wygrywa (wyścig dwóch kart).
  const consumed = await prisma.impersonationToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (consumed.count !== 1) return fail('invalid_token')

  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return fail('invalid_token')

  // Sesja JWT w formacie NextAuth (ten sam kształt co jwt() w auth.ts).
  const jwt = await encode({
    secret,
    maxAge: SESSION_MAX_AGE,
    token: {
      id: record.target.id,
      role: record.target.role,
      remember: true,
      impersonatedBy: record.adminId,
    } as any,
  })

  const dest =
    record.target.role === 'COACH' ? '/coach/dashboard' : '/student/dashboard'
  const res = NextResponse.redirect(new URL(dest, request.url))
  res.cookies.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
