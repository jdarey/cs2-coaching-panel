import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
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
        await sendEmail({
          to: assignment.coach.email,
          subject: `⚠️ Zadanie po terminie: ${assignment.title}`,
          html: `
            <div style="font-family: system-ui; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">Zadanie po terminie</h2>
              <p><strong>Uczeń:</strong> ${assignment.student.name || assignment.student.email}</p>
              <p><strong>Zadanie:</strong> ${assignment.title}</p>
              ${assignment.video ? `<p><strong>Film:</strong> ${assignment.video.title}</p>` : ''}
              <p><strong>Termin:</strong> ${assignment.dueDate?.toLocaleDateString('pl-PL')}</p>
              <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL}/coach/students/${assignment.student.id}" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Otwórz profil ucznia</a></p>
            </div>
          `,
          text: `Zadanie "${assignment.title}" ucznia ${assignment.student.name || assignment.student.email} było do oddania ${assignment.dueDate?.toLocaleDateString('pl-PL')}.`,
        })
        results.overdueNotified++
      } catch (e) {
        results.errors.push(`Overdue email failed for assignment ${assignment.id}: ${e}`)
      }
    }

    // Send due tomorrow notifications to students
    for (const assignment of dueTomorrow) {
      try {
        await sendEmail({
          to: assignment.student.email,
          subject: `📅 Przypomnienie: zadanie do oddania jutro`,
          html: `
            <div style="font-family: system-ui; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #fbbf24;">Przypomnienie o zadaniu</h2>
              <p>Cześć ${assignment.student.name || 'Uczeń'}!</p>
              <p>Przypominamy, że zadanie <strong>${assignment.title}</strong> jest do oddania <strong>jutro</strong>.</p>
              ${assignment.video ? `<p><strong>Film do obejrzenia:</strong> ${assignment.video.title}</p>` : ''}
              <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL}/student/tasks" style="background: #fbbf24; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Otwórz zadania</a></p>
            </div>
          `,
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
        
        await sendEmail({
          to: student.coach.email,
          subject: `😴 Uczeń nieaktywny: ${student.name || student.email}`,
          html: `
            <div style="font-family: system-ui; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0ea5e9;">Uczeń nieaktywny od ${days} dni</h2>
              <p><strong>Uczeń:</strong> ${student.name || student.email}</p>
              <p><strong>Ostatnia aktywność:</strong> ${lastActivity?.toLocaleDateString('pl-PL')}</p>
              <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL}/coach/students/${student.id}" style="background: #0ea5e9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Otwórz profil</a></p>
            </div>
          `,
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