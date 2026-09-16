import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Token jednorazowy, ważny 10 minut. W bazie ląduje tylko SHA-256 (jak
// PasswordResetToken) — wyciek linku z logów nie wystarcza do odtworzenia
// tokena bez dostępu do DB, a po użyciu token jest spalany.
const TOKEN_TTL_MS = 10 * 60 * 1000

// POST: admin generuje jednorazowy link logowania jako użytkownik.
// Admin otwiera link w nowej karcie/incognito by testować jako ten user.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let admin: { id: string; role: string; email?: string | null }
  try {
    admin = await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, role: true },
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
  }
  if (targetUser.role === 'ADMIN') {
    return NextResponse.json({ error: 'Nie można zalogować się jako inny admin' }, { status: 403 })
  }

  // Generujemy token (Web Crypto API - działa w Edge runtime)
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  await prisma.impersonationToken.create({
    data: {
      adminId: admin.id,
      targetId: targetUser.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })

  // Log audit
  await audit.userImpersonated(admin.id, admin.role, targetUser.id)

  // W URL idzie tylko token — target jest w bazie, więc nie da się podmienić ID.
  const loginUrl = `/api/auth/impersonate/callback?token=${token}`

  return NextResponse.json({
    ok: true,
    message: `Jednorazowy link (10 min) do logowania jako ${targetUser.email} wygenerowany. Otwórz w nowej karcie/incognito.`,
    loginUrl,
    targetUser: { id: targetUser.id, email: targetUser.email, name: targetUser.name },
  })
}
