import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { renderEmail, isTemplateEnabled } from '@/lib/email-templates'
import { infoCard } from '@/lib/email-layout'

export const dynamic = 'force-dynamic'

// Dedup: nie wysyłaj tego samego przypomnienia w kółko przy codziennym cronie.
const DEDUP_HOURS = { OVERDUE: 72, DUE_TOMORROW: 20, INACTIVE: 168 } as const

async function alreadySent(type: keyof typeof DEDUP_HOURS, targetId: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_HOURS[type] * 3600_000)
  const hit = await prisma.reminderLog.findFirst({
    where: { type, targetId, sentAt: { gte: since } },
    select: { id: true },
  })
  return !!hit
}

async function markSent(type: keyof typeof DEDUP_HOURS, targetId: string) {
  await prisma.reminderLog.create({ data: { type, targetId } }).catch(() => {})
}

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
      skipped: [] as string[],
      errors: [] as string[],
    }

    // Włączniki z panelu admina (/admin/emails) — wyłączony typ jest pomijany.
    const [overdueOn, dueTomorrowOn, inactiveOn] = await Promise.all([
      isTemplateEnabled('reminder-overdue'),
      isTemplateEnabled('reminder-due-tomorrow'),
      isTemplateEnabled('reminder-inactive'),
    ])
    if (!overdueOn) results.skipped.push('reminder-overdue')
    if (!dueTomorrowOn) results.skipped.push('reminder-due-tomorrow')
    if (!inactiveOn) results.skipped.push('reminder-inactive')

    // Send overdue notifications to coaches
    for (const assignment of overdueAssignments) {
      if (!overdueOn) break
      if (await alreadySent('OVERDUE', assignment.id)) {
        results.skipped.push(`overdue:${assignment.id}`)
        continue
      }
      try {
        const due = assignment.dueDate?.toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })
        const studentName = assignment.student.name || assignment.student.email
        // Treść z szablonu (edytowalna w /admin/emails, klucz reminder-overdue)
        const { subject, html, text } = await renderEmail(
          'reminder-overdue',
          {
            studentName,
            title: assignment.title,
            videoLine: assignment.video ? assignment.video.title : '',
            dueDate: due ?? '',
            profileUrl: `${process.env.NEXTAUTH_URL}/coach/students/${assignment.student.id}`,
            detailsHtml: infoCard('Szczegóły', [
              `Uczeń: <strong style="color:#f4f6f7;">${studentName}</strong>`,
              `Zadanie: <strong style="color:#f4f6f7;">${assignment.title}</strong>`,
              ...(assignment.video ? [`Film: ${assignment.video.title}`] : []),
              ...(due ? [`Termin był: ${due}`] : []),
            ]),
          },
          {
            buttonUrl: `${process.env.NEXTAUTH_URL}/coach/students/${assignment.student.id}`,
            safeKeys: ['detailsHtml'],
          },
        )
        await sendEmail({ to: assignment.coach.email, subject, html, text })
        await markSent('OVERDUE', assignment.id)
        results.overdueNotified++
      } catch (e) {
        results.errors.push(`Overdue email failed for assignment ${assignment.id}: ${e}`)
      }
    }

    // Send due tomorrow notifications to students
    for (const assignment of dueTomorrow) {
      if (!dueTomorrowOn) break
      if (await alreadySent('DUE_TOMORROW', assignment.id)) {
        results.skipped.push(`due-tomorrow:${assignment.id}`)
        continue
      }
      try {
        const studentName = assignment.student.name || 'graczu'
        const { subject, html, text } = await renderEmail(
          'reminder-due-tomorrow',
          {
            studentName,
            title: assignment.title,
            videoLine: assignment.video ? assignment.video.title : '',
            tasksUrl: `${process.env.NEXTAUTH_URL}/student/tasks`,
            detailsHtml: infoCard('Twoje zadanie', [
              `<strong style="color:#f4f6f7;">${assignment.title}</strong>`,
              ...(assignment.video ? [`Film do obejrzenia: ${assignment.video.title}`] : []),
            ]),
          },
          {
            buttonUrl: `${process.env.NEXTAUTH_URL}/student/tasks`,
            safeKeys: ['detailsHtml'],
          },
        )
        await sendEmail({ to: assignment.student.email, subject, html, text })
        await markSent('DUE_TOMORROW', assignment.id)
        results.dueTomorrowNotified++
      } catch (e) {
        results.errors.push(`Due tomorrow email failed for assignment ${assignment.id}: ${e}`)
      }
    }

    // Send inactivity notifications to coaches
    for (const student of inactiveStudents) {
      if (!inactiveOn) break
      if (!student.coach) continue
      if (await alreadySent('INACTIVE', student.id)) {
        results.skipped.push(`inactive:${student.id}`)
        continue
      }
      try {
        const lastActivity = student.videoProgress[0]?.updatedAt
        const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)
        const studentName = student.name || student.email

        const { subject, html, text } = await renderEmail(
          'reminder-inactive',
          {
            studentName,
            days,
            lastActivity: lastActivity?.toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' }) ?? '',
            profileUrl: `${process.env.NEXTAUTH_URL}/coach/students/${student.id}`,
            detailsHtml: infoCard('Uczeń', [
              `<strong style="color:#f4f6f7;">${studentName}</strong>`,
              `Ostatnia aktywność: ${lastActivity?.toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}`,
            ]),
          },
          {
            buttonUrl: `${process.env.NEXTAUTH_URL}/coach/students/${student.id}`,
            safeKeys: ['detailsHtml'],
          },
        )
        await sendEmail({ to: student.coach.email, subject, html, text })
        await markSent('INACTIVE', student.id)
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