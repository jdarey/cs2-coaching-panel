import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { createPasswordResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/mail'
import { renderEmail } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

// Admin klika "Resetuj hasło": tworzymy token (ważny 1h) i wysyłamy maila
// tym samym szablonem co zwykły reset. Surowy link zwracamy TYLKO gdy mail
// nie doszedł (limity) — inaczej token lądowałby w logach/proxy przy
// każdym resecie. Klient pokazuje link do ręcznego skopiowania.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
  }

  const token = await createPasswordResetToken(user.id)
  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const { subject, html, text } = await renderEmail(
    'reset-password',
    { name: user.name || 'tam', resetUrl },
    { buttonUrl: resetUrl, rawUrl: resetUrl },
  )
  const mailResult = await sendEmail({ to: user.email, subject, html, text })

  return NextResponse.json({
    ok: true,
    emailSent: mailResult.ok,
    ...(mailResult.ok ? {} : { resetUrl }),
  })
}
