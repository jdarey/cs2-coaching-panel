import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { emailLayout, infoCard } from '@/lib/email-layout'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    // 1. Find overdue assignments
    const overdueAssignments = await prisma.assignment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now },
      },
      include: {
        student: { select: { id: true, name: true, email: true, coachId: true } },
        coach: { select: { id: true, name: true, email: true } },
        video: { select: { title: true } },
      },
    })

    // 2. Find assignments due tomorrow
    const dueTomorrow = await prisma.assignment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: now, lt: tomorrow },
      },
      include: {
        student: { select: { id: true, name: true, email: true, coachId: true } },
        coach: { select: { id: true, name: true, email: true } },
        video: { select: { title: true } },
      },
    })

    // 3. Find students inactive for 3+ days
    const inactiveStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        coachId: { not: null },
        videoProgress: {
          some: { updatedAt: { lt: threeDaysAgo } },
        },
      },
      include: {
        coach: { select: { id: true, name: true, email: true } },
        videoProgress: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    })

    const results = {
      overdueNotified: 0,
      dueTomorrowNotified: 0,
      inactiveNotified: 0,
      errors: [] as string[],
    }

    // Send overdue notifications to coaches
    for (const assignment of overdueAssignments) {
      try {
        const due = assignment.dueDate?.toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })
        const { html } = emailLayout({
          preheader: `${assignment.student.name || assignment.student.email} spóźnia się z zadaniem`,
          badge: 'Po terminie',
          title: `Zadanie po terminie: ${assignment.title}`,
          subtitle: 'Warto napisać do ucznia — jedno zdanie potrafi uratować serię treningową.',
          bodyHtml: infoCard('Szczegóły', [
            `Uczeń: <strong style="color:#f4f6f7;">${assignment.student.name || assignment.student.email}</strong>`,
            `Zadanie: <strong style="color:#f4f6f7;">${assignment.title}</strong>`,
            ...(assignment.video ? [`Film: ${assignment.video.title}`] : []),
            ...(due ? [`Termin był: ${due}`] : []),
          ]),
          button: { label: 'Otwórz profil ucznia →', url: `${process.env.NEXTAUTH_URL}/coach/students/${assignment.student.id}` },
        })
        await sendEmail({
          to: assignment.coach.email,
          subject: `Po terminie: ${assignment.title} (${assignment.student.name || assignment.student.email})`,
          html,
          text: `Zadanie "${assignment.title}" ucznia ${assignment.student.name || assignment.student.email} było do oddania ${due}.`,
        })
        results.overdueNotified++
      } catch (e) {
        results.errors.push(`Overdue email failed for assignment ${assignment.id}: ${e}`)
      }
    }

    // Send due tomorrow notifications to students
    for (const assignment of dueTomorrow) {
      try {
        const { html } = emailLayout({
          preheader: `Jutro mija termin: ${assignment.title}`,
          badge: 'Jutro termin',
          title: `Hej ${assignment.student.name || 'graczu'}, jutro termin!`,
          subtitle: 'Wykorzystaj swój wykupiony coaching — jedno zadanie dziś wieczorem i seria uratowana.',
          bodyHtml: infoCard('Twoje zadanie', [
            `<strong style="color:#f4f6f7;">${assignment.title}</strong>`,
            ...(assignment.video ? [`Film do obejrzenia: ${assignment.video.title}`] : []),
          ]) + `<p style="margin:0;">Wejdź w zadania, odhacz je i idź spać ze spokojną głową.</p>`,
          button: { label: 'Otwórz zadania →', url: `${process.env.NEXTAUTH_URL}/student/tasks` },
        })
        await sendEmail({
          to: assignment.student.email,
          subject: `Jutro termin: ${assignment.title} — dasz radę!`,
          html,
          text: `Przypomnienie: zadanie "${assignment.title}" jest do oddania jutro.`,
        })
        results.dueTomorrowNotified++
      } catch (e) {
        results.errors.push(`Due tomorrow email failed for assignment ${assignment.id}: ${e}`)
      }
    }

    // Send inactivity notifications to coaches
    for (const student of inactiveStudents) {
      if (!student.coach) continue
      try {
        const lastActivity = student.videoProgress[0]?.updatedAt
        const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)

        const { html } = emailLayout({
          preheader: `${student.name || student.email} nie trenuje od ${days} dni`,
          badge: 'Brak aktywności',
          title: `${student.name || student.email} nie korzysta z coachingu od ${days} dni`,
          subtitle: 'Wykupiony program sam się nie zrobi — krótka wiadomość od trenera często wystarcza, żeby wrócić do gry.',
          bodyHtml: infoCard('Uczeń', [
            `<strong style="color:#f4f6f7;">${student.name || student.email}</strong>`,
            `Ostatnia aktywność: ${lastActivity?.toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}`,
          ]),
          button: { label: 'Napisz do ucznia →', url: `${process.env.NEXTAUTH_URL}/coach/students/${student.id}` },
        })
        await sendEmail({
          to: student.coach.email,
          subject: `${student.name || student.email} nieaktywny od ${days} dni`,
          html,
          text: `Uczeń ${student.name || student.email} jest nieaktywny od ${days} dni.`,
        })
        results.inactiveNotified++
      } catch (e) {
        results.errors.push(`Inactive email failed for student ${student.id}: ${e}`)
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
    })
  } catch (error) {
    console.error('Cron reminders error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}