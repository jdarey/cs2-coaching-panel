import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPasswordResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/mail'

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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0d0d0d; border-radius: 16px; color: #e5e7eb;">
        <p style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 8px;">Zresetuj hasło</p>
        <p style="color: #9ca3af; line-height: 1.6;">Cześć ${name}! Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w panelu CS2 Coaching.</p>
        <p style="color: #9ca3af; line-height: 1.6;">Kliknij poniższy przycisk, aby ustawić nowe hasło. Link jest ważny przez 1 godzinę.</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; border-radius: 12px; background: #2de5ca; color: #062a24; font-weight: 700; text-decoration: none;">Ustaw nowe hasło</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość.</p>
      </div>
    `

    await sendEmail({
      to: email,
      subject: 'Zresetuj hasło — CS2 Coaching',
      html,
      text: `Zresetuj hasło — CS2 Coaching\n\nCześć ${name}! Otrzymaliśmy prośbę o zresetowanie hasła.\nOtwórz ten link, aby ustawić nowe hasło (ważny 1 godzinę):\n${resetUrl}\n\nJeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość.`,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
