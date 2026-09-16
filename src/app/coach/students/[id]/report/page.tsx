import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'
import { ReportClient } from './report-client'

export const metadata = {
  title: 'Raport miesięczny ucznia',
}

function parseMonth(raw: string | undefined): { y: number; m: number } {
  const now = new Date()
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? '')
  if (match) {
    const y = Number(match[1])
    const m = Number(match[2])
    if (y >= 2020 && y <= 2100 && m >= 1 && m <= 12) return { y, m }
  }
  return { y: now.getFullYear(), m: now.getMonth() + 1 }
}

export default async function StudentReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }

  const { id } = await params
  const userId = (session.user as any).id
  const { month } = await searchParams
  const { y, m } = parseMonth(month)
  const from = new Date(y, m - 1, 1)
  const to = new Date(y, m, 1)
  const monthKey = `${y}-${String(m).padStart(2, '0')}`

  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, avatarUrl: true, createdAt: true,
      coachId: true, faceitNickname: true,
    },
  })
  if (!student || student.coachId !== userId) {
    redirect('/coach/students')
  }

  const [ranks, practice, sessions, assignmentsDone, assignmentsTotal, completions, videos] =
    await Promise.all([
      prisma.rankEntry.findMany({
        where: { studentId: id, recordedAt: { gte: from, lt: to } },
        select: { mode: true, rank: true, elo: true, recordedAt: true },
        orderBy: { recordedAt: 'asc' },
      }),
      prisma.practiceSession.aggregate({
        where: { studentId: id, createdAt: { gte: from, lt: to } },
        _sum: { minutes: true },
        _count: { id: true },
      }),
      prisma.session.findMany({
        where: { coachId: userId, studentId: id, scheduledAt: { gte: from, lt: to } },
        select: { id: true, title: true, status: true, scheduledAt: true },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.assignment.findMany({
        where: { studentId: id, status: 'DONE', completedAt: { gte: from, lt: to } },
        select: { id: true, title: true, completedAt: true },
        orderBy: { completedAt: 'asc' },
      }),
      prisma.assignment.count({ where: { studentId: id } }),
      prisma.routineCompletion.aggregate({
        where: { studentId: id, completedAt: { gte: from, lt: to } },
        _count: { id: true },
        _sum: { tasksDone: true, minutesDone: true },
      }),
      prisma.videoProgress.findMany({
        where: {
          userId: id,
          watchedAt: { gte: from, lt: to },
          status: { in: ['WATCHED', 'IMPLEMENTED'] },
        },
        select: { videoId: true, status: true, watchedAt: true },
      }),
    ])

  const byMode = (mode: string) => ranks.filter((r) => r.mode === mode)
  const firstLast = (list: typeof ranks) =>
    list.length
      ? { first: list[0], last: list[list.length - 1], count: list.length }
      : null

  // Nawigacja miesięcy (bez dat w przyszłości)
  const now = new Date()
  const isCurrent = y === now.getFullYear() && m === now.getMonth() + 1
  const prevD = new Date(y, m - 2, 1)
  const prevKey = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`
  const nextD = new Date(y, m, 1)
  const nextKey = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`

  return (
    <ReportClient
      student={{
        id: student.id,
        name: student.name,
        email: student.email,
        avatarUrl: student.avatarUrl,
        createdAt: student.createdAt.toISOString(),
        faceitNickname: student.faceitNickname,
      }}
      monthKey={monthKey}
      monthLabel={from.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw' })}
      prevKey={prevKey}
      nextKey={nextKey}
      isCurrent={isCurrent}
      faceit={firstLast(byMode('FACEIT'))}
      premier={firstLast(byMode('PREMIER'))}
      practiceMinutes={practice._sum.minutes ?? 0}
      practiceSessions={practice._count.id}
      sessions={sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        scheduledAt: s.scheduledAt?.toISOString() ?? null,
      }))}
      tasksDone={assignmentsDone.map((a) => ({ id: a.id, title: a.title }))}
      tasksTotal={assignmentsTotal}
      routineDays={completions._count.id}
      routineTasks={completions._sum.tasksDone ?? 0}
      routineMinutes={completions._sum.minutesDone ?? 0}
      videosDone={videos.length}
      coachName={(session.user as any).name ?? null}
    />
  )
}
