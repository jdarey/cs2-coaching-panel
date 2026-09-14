import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPasswordResetToken } from '@/lib/password-reset'
import { sendEmail } from '@/lib/mail'
import { emailLayout } from '@/lib/email-layout'

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
    const { html } = emailLayout({
      preheader: 'Ustaw nowe hasło — link ważny 1 godzinę',
      badge: 'Reset hasła',
      title: `Cześć ${name}, ustaw nowe hasło`,
      subtitle: 'Dostałeś tę wiadomość, bo ktoś poprosił o reset hasła do Twojego konta. Dasz radę w mniej niż minutę — obiecujemy, że to prostsze niż clutch 1v3.',
      bodyHtml: `
        <p style="margin:0;">Kliknij wielki fioletowy przycisk poniżej i wpisz nowe hasło (min. 8 znaków). Link działa <strong style="color:#f4f6f7;">tylko 1 godzinę</strong> i tylko raz — potem wygasa dla Twojego bezpieczeństwa.</p>
        <p style="margin:12px 0 0;">Po zmianie od razu zalogujesz się nowym hasłem i wrócisz do treningu. Powodzenia na serwerze!</p>`,
      button: { label: 'Ustaw nowe hasło →', url: resetUrl },
      buttonNote: 'Przycisk nie działa? Wklej ten link do przeglądarki.',
      footerNote: 'Nie prosiłeś o reset? Zignoruj tę wiadomość — Twoje hasło zostaje bez zmian, a link sam wygaśnie.',
    })

    const mailResult = await sendEmail({
      to: email,
      subject: 'Zresetuj hasło — CS2 Coaching',
      html,
      text: `Zresetuj hasło — CS2 Coaching\n\nCześć ${name}! Otrzymaliśmy prośbę o zresetowanie hasła.\nOtwórz ten link, aby ustawić nowe hasło (ważny 1 godzinę):\n${resetUrl}\n\nJeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość.`,
    })
    if (!mailResult.ok) console.error(`[mail:forgot-password] FAILED to=${email}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
