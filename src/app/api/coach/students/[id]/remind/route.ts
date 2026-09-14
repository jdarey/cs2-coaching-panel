import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { emailLayout, infoCard } from '@/lib/email-layout'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://cs2-coaching-panel-ten.vercel.app'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const student = await prisma.user.findFirst({
    where: { id: params.id, role: 'STUDENT', coachId: user.id },
    select: { id: true, email: true, name: true },
  })
  if (!student) {
    return NextResponse.json({ error: 'Nie znaleziono ucznia' }, { status: 404 })
  }

  // Pull pending assignments so the reminder is concrete, not generic.
  const pending = await prisma.assignment.findMany({
    where: { studentId: student.id, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
    take: 5,
    select: { title: true, dueDate: true },
  })

  const coachName = user.name || 'Twój trener'
  const lines = pending.length
    ? pending
        .map((a) => {
          const due = a.dueDate ? ` (termin: ${new Date(a.dueDate).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })})` : ''
          return `• ${a.title}${due}`
        })
        .join('\n')
    : 'Czeka na Ciebie nowa sesja treningowa. Zajrzyj do panelu ucznia, aby zobaczyć szczegóły.'

  const taskLines = pending.map((a) => {
    const due = a.dueDate ? ` <span style="color:rgba(244,246,247,0.45);">· termin ${new Date(a.dueDate).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}</span>` : ''
    return `${a.title}${due}`
  })
  const { html } = emailLayout({
    preheader: `${coachName} przypomina o treningu — ${pending.length} zadań czeka`,
    badge: 'Twój coaching',
    title: `Cześć${student.name ? ` ${student.name}` : ''}, Twój coaching czeka!`,
    subtitle: `Trener ${coachName} sprawdził Twój wykupiony plan i podrzuca rzeczy do nadrobienia. Wykorzystaj coaching w 100% — mały krok dziś to duży skok ELO jutro.`,
    bodyHtml: pending.length
      ? infoCard('Twoje zadania', taskLines) + `<p style="margin:0;">Wejdź do panelu, odhacz je po kolei i patrz jak rośnie seria dni. Dasz radę!</p>`
      : `<p style="margin:0;">Dobra wiadomość: nic nie zalega! Zajrzyj do panelu po nową sesję treningową i trzymaj formę.</p>`,
    button: { label: 'Otwórz panel ucznia →', url: `${APP_URL}/student/dashboard` },
  })
  const result = await sendEmail({
    to: student.email,
    subject: `${coachName} przypomina o treningu — ${pending.length} zadań czeka`,
    html,
    text: `Cześć${student.name ? ` ${student.name}` : ''}!\nTwój trener ${coachName} przypomina o treningu.\n\n${lines}\n\nOtwórz panel ucznia: ${APP_URL}/student/dashboard`,
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'Nie udało się wysłać przypomnienia' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
