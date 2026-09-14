import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// POST: admin generuje link logowania dla użytkownika (magic link)
// Admin otwiera link w nowej karcie/incognito by testować jako ten user
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
  const impersonationToken = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')

  // Log audit
  await audit.userImpersonated(admin.id, admin.role, targetUser.id)

  // Zwracamy URL - admin otwiera w nowej karcie/incognito
  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`
  const loginUrl = `${baseUrl}/login?impersonate=${impersonationToken}&targetId=${targetUser.id}`

  return NextResponse.json({
    ok: true,
    message: `Link do logowania jako ${targetUser.email} wygenerowany. Otwórz w nowej karcie/incognito.`,
    loginUrl,
    targetUser: { id: targetUser.id, email: targetUser.email, name: targetUser.name },
  })
}