import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'

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
          const due = a.dueDate ? ` (termin: ${new Date(a.dueDate).toLocaleDateString('pl-PL')})` : ''
          return `• ${a.title}${due}`
        })
        .join('\n')
    : 'Czeka na Ciebie nowa sesja treningowa. Zajrzyj do panelu ucznia, aby zobaczyć szczegóły.'

  const result = await sendEmail({
    to: student.email,
    subject: `📣 Przypomnienie od trenera (${coachName})`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0a0a0a; border-radius: 20px; border: 1px solid rgba(45,229,202,0.25);">
        <h2 style="color:#fff; margin:0 0 8px;">Cześć${student.name ? ` ${student.name}` : ''}!</h2>
        <p style="color:rgba(255,255,255,0.8); line-height:1.6; margin:0;">Twój trener <strong style="color:#2de5ca;">${coachName}</strong> przypomina o treningu.</p>
        <div style="background:rgba(255,255,255,0.05); border-radius:14px; padding:16px 18px; margin:18px 0; color:rgba(255,255,255,0.85); white-space:pre-line; line-height:1.6; font-size:14px;">${lines}</div>
        <a href="${APP_URL}/student/dashboard" style="display:inline-block; background:linear-gradient(135deg,#2de5ca,#147a6b); color:#fff; text-decoration:none; padding:12px 22px; border-radius:12px; font-weight:600;">Otwórz panel ucznia</a>
        <p style="color:rgba(255,255,255,0.4); font-size:12px; margin-top:24px;">To wiadomość automatyczna z Twojego panelu coachingowego.</p>
      </div>`,
    text: `Cześć${student.name ? ` ${student.name}` : ''}!\nTwój trener ${coachName} przypomina o treningu.\n\n${lines}\n\nOtwórz panel ucznia: ${APP_URL}/student/dashboard`,
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'Nie udało się wysłać przypomnienia' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
