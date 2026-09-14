import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { emailLayout, infoCard } from '@/lib/email-layout'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coachId = (session.user as any).id
    const body = await request.json()
    const { email } = body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Nieprawidłowy email' }, { status: 400 })
    }

    // Check if student already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      // If they're already a student of this coach
      if (existingUser.coachId === coachId) {
        return NextResponse.json({ error: 'Ten uczeń już należy do Ciebie' }, { status: 400 })
      }
      // If they exist but with another coach or no coach
      return NextResponse.json({ error: 'Użytkownik z tym emailem już istnieje' }, { status: 400 })
    }

    // Check for existing pending invite — zwróć ISTNIEJĄCY link zamiast
    // błędu, żeby trener mógł go skopiować ponownie (drugie kliknięcie
    // nie wysyła duplikatu maila, tylko pokazuje ten sam link).
    const existingInvite = await prisma.studentInvite.findFirst({
      where: { coachId, email, usedAt: null, expiresAt: { gt: new Date() } }
    })
    if (existingInvite) {
      const inviteUrl = `${process.env.NEXTAUTH_URL}/register?invite=${existingInvite.token}`
      return NextResponse.json({
        ok: true,
        message: 'Zaproszenie już istnieje — mail wysłano wcześniej, oto ten sam link',
        inviteUrl,
        emailSent: false,
        alreadyExisted: true,
      })
    }

    // Create invite token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.studentInvite.create({
      data: {
        coachId,
        email,
        token,
        expiresAt,
      },
    })

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/register?invite=${token}`
    const coachName = (session.user as any).name || 'Twój trener'

    const { html } = emailLayout({
      preheader: `Kupiłeś coaching u ${coachName} — oto Twój dostęp do platformy`,
      badge: 'Twój dostęp',
      title: `Dzięki za zakup coachingu! Oto Twój dostęp`,
      subtitle: `Kupiłeś coaching u trenera ${coachName}. Ten link to Twoje wejście na platformę — załóż konto i zacznij trenować już dziś.`,
      bodyHtml: `
        <p style="margin:0;">Cześć! Trener <strong style="color:#f4f6f7;">${coachName}</strong> aktywował Ci dostęp do platformy CS2 Coaching. W środku czeka Twój wykupiony program:</p>
        ${infoCard('Twój pakiet', ['Biblioteka filmów treningowych', 'Sesje 1:1 z trenerem i demo-review', 'Zadania i rutyny z kalendarzem', 'Śledzenie Faceit ELO na żywo', 'Bezpośredni kontakt z trenerem'])}
        <p style="margin:0;">Założenie konta zajmie Ci mniej niż minutę. Do zobaczenia na serwerze!</p>`,
      button: { label: 'Aktywuj dostęp →', url: inviteUrl },
      buttonNote: 'Link wygasa za 7 dni.',
    })
    const text = `Dzięki za zakup coachingu u ${coachName}!\n\nOto Twój dostęp do platformy CS2 Coaching: filmy treningowe, sesje z trenerem, zadania, śledzenie Faceit ELO.\n\nAktywuj dostęp: ${inviteUrl}\n\nLink wygasa za 7 dni.`

    const emailResult = await sendEmail({
      to: email,
      subject: `Zaproszenie do panelu CS2 Coaching od ${coachName}`,
      html,
      text,
    })

    // Zawsze zwracaj link — bez zweryfikowanej domeny Resend wysyła tylko na
    // własne konto, więc trener wyśle link ręcznie (Discord/SMS). Link działa
    // tak samo niezależnie od maila.
    return NextResponse.json({
      ok: true,
      message: emailResult.ok
        ? 'Zaproszenie wysłane na email ucznia'
        : 'Utworzono zaproszenie, ale mail nie doszedł (brak zweryfikowanej domeny w Resend) — wyślij link ręcznie',
      inviteUrl,
      emailSent: emailResult.ok,
    })
  } catch (error) {
    console.error('Student invite error:', error)
    return NextResponse.json({ error: 'Błąd wysyłania zaproszenia' }, { status: 500 })
  }
}