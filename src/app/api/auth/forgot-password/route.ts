import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPasswordResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/mail'
import { renderEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Podaj prawidłowy adres email' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    })

    // Always return the same response whether or not the account exists, so
    // the endpoint can't be used to probe which emails are registered.
    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const token = await createPasswordResetToken(user.id)

    const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    const name = user.name || 'tam'
    // Treść z szablonu (edytowalna w /admin/emails, klucz reset-password)
    const { subject, html, text } = await renderEmail(
      'reset-password',
      { name, resetUrl },
      { buttonUrl: resetUrl, rawUrl: resetUrl },
    )

    const mailResult = await sendEmail({ to: email, subject, html, text })
    if (!mailResult.ok) console.error(`[mail:forgot-password] FAILED to=${email}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
