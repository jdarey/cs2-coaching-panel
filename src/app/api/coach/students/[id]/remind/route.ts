import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { renderEmail } from '@/lib/email-templates'
import { infoCard } from '@/lib/email-layout'

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
  const taskLines = pending.map((a) => {
    const due = a.dueDate ? ` <span style="color:rgba(244,246,247,0.45);">· termin ${new Date(a.dueDate).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}</span>` : ''
    return `${a.title}${due}`
  })
  // Treść z szablonu (edytowalna w /admin/emails, klucz remind)
  const { subject, html, text } = await renderEmail(
    'remind',
    {
      studentName: student.name ? ` ${student.name}` : '',
      coachName,
      taskCount: pending.length,
      appUrl: APP_URL,
      taskCardsHtml: pending.length
        ? infoCard('Twoje zadania', taskLines) + `<p style="margin:0;">Wejdź do panelu, odhacz je po kolei i patrz jak rośnie seria dni. Dasz radę!</p>`
        : `<p style="margin:0;">Dobra wiadomość: nic nie zalega! Zajrzyj do panelu po nową sesję treningową i trzymaj formę.</p>`,
    },
    { buttonUrl: `${APP_URL}/student/dashboard`, safeKeys: ['taskCardsHtml'] },
  )
  const result = await sendEmail({ to: student.email, subject, html, text })

  if (!result.ok) {
    return NextResponse.json({ error: 'Nie udało się wysłać przypomnienia' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
