import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentDashboardClient } from './student-dashboard-client'

export const revalidate = 30

export const metadata = {
  title: 'Dashboard',
}

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const userId = (session.user as any).id
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  const [sessions, progress, coach, rankEntries, myTags, assignments, weekStats, routines, practice] = await Promise.all([
    prisma.session.findMany({
      where: { studentId: userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { scheduledAt: 'desc' },
      take: 5,
      select: {
        id: true, title: true, status: true, scheduledAt: true, completedAt: true, createdAt: true, updatedAt: true,
        coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        videos: { select: { video: { select: { id: true, title: true, thumbnail: true } } }, orderBy: { order: 'asc' }, take: 6 },
        _count: { select: { videos: true } },
      },
    }),
    prisma.videoProgress.findMany({
      where: { userId },
      select: {
        id: true, status: true, progress: true, note: true, watchedAt: true, updatedAt: true, createdAt: true,
        video: { select: { id: true, title: true, thumbnail: true, tags: { select: { tag: { select: { id: true, name: true, color: true } } } } } },
        session: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 60,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { coach: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    }),
    prisma.rankEntry.findMany({
      where: { studentId: userId },
      orderBy: { recordedAt: 'asc' },
      take: 12,
    }),
    // My mistake tags — aggregated from my sessions' tags
    prisma.sessionTag.groupBy({
      by: ['tagId'],
      where: { session: { studentId: userId } },
      _count: { tagId: true },
    }),
    prisma.assignment.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    // Weekly deltas
    prisma.$transaction([
      prisma.videoProgress.count({ where: { userId, updatedAt: { gte: weekAgo }, status: { in: ['WATCHED', 'IMPLEMENTED'] } } }),
      prisma.assignment.count({ where: { studentId: userId, completedAt: { gte: weekAgo } } }),
      prisma.session.count({ where: { studentId: userId, createdAt: { gte: weekAgo } } }),
    ]),
    // My routines with progress - tylko aktywne + lekkie pola
    prisma.routineAssignment.findMany({
      where: { studentId: userId, status: 'ACTIVE' },
      select: {
        id: true, status: true,
        routine: {
          select: {
            id: true, title: true, description: true,
            tasks: { select: { id: true, title: true, description: true, videoId: true, day: true, minutes: true }, orderBy: [{ day: 'asc' }, { order: 'asc' }] },
          },
        },
        progress: { select: { taskId: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Completed practice sessions (last 8 weeks for the chart)
    prisma.practiceSession.findMany({
      where: { studentId: userId, createdAt: { gte: new Date(now.getTime() - 8 * 7 * 86400000) } },
      select: { minutes: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Stats
  const stats = {
    totalVideos: progress.length,
    pending: progress.filter((p) => p.status === 'PENDING').length,
    watching: progress.filter((p) => p.status === 'WATCHING').length,
    watched: progress.filter((p) => p.status === 'WATCHED').length,
    implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === 'ACTIVE').length,
  }

  // My mistakes with tag details
  const tagDetails = await prisma.tag.findMany({
    where: { id: { in: myTags.map((t) => t.tagId) } },
    select: { id: true, name: true, color: true },
  })
  const tagMap = new Map(tagDetails.map((t) => [t.id, t]))
  const myMistakes: { tag: { id: string; name: string; color: string } | null; count: number }[] = myTags
    .map((t) => ({ tag: tagMap.get(t.tagId) ?? null, count: t._count.tagId }))
    .filter((t): t is { tag: { id: string; name: string; color: string }; count: number } => t.tag !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  // Assignments: due soon / overdue
  const pendingAssignments = assignments.filter((a) => a.status === 'PENDING')
  const overdueAssignments = pendingAssignments.filter((a) => a.dueDate && a.dueDate < now).length
  const dueSoonAssignments = pendingAssignments.filter((a) => a.dueDate && a.dueDate >= now && a.dueDate < new Date(now.getTime() + 3 * 86400000)).length

  // Sessions/coach serialization for the client
  const sessionsForClient = sessions.map((s) => ({
    ...s,
    scheduledAt: s.scheduledAt?.toISOString() ?? null,
    completedAt: s.completedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  const progressForClient = progress.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    watchedAt: p.watchedAt?.toISOString() ?? null,
    session: p.session ? { ...p.session } : undefined,
  }))

  const rankForClient = rankEntries.map((r) => ({
    ...r,
    recordedAt: r.recordedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }))

  const assignmentsForClient = assignments.map((a) => ({
    ...a,
    dueDate: a.dueDate?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }))

  // Routines for client: active one with progress snapshot
  const routinesForClient = routines.map((ra) => ({
    id: ra.id,
    status: ra.status,
    routine: {
      id: ra.routine.id,
      title: ra.routine.title,
      description: ra.routine.description,
      tasks: ra.routine.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        videoId: t.videoId,
        day: t.day,
        minutes: t.minutes,
      })),
    },
    progress: ra.progress.map((p) => ({ taskId: p.taskId, status: p.status })),
  }))

  // Practice aggregation: 8 weeks (Monday start) + totals
  const practiceWeeks = 8
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)
  const from = new Date(startOfWeek)
  from.setDate(from.getDate() - (practiceWeeks - 1) * 7)

  const practiceForClient = Array.from({ length: practiceWeeks }, (_, i) => {
    const weekStart = new Date(from)
    weekStart.setDate(from.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const minutes = practice
      .filter((p) => p.createdAt >= weekStart && p.createdAt < weekEnd)
      .reduce((acc, p) => acc + p.minutes, 0)
    return {
      label: `${weekStart.getDate()}.${String(weekStart.getMonth() + 1).padStart(2, '0')}`,
      minutes,
      isCurrent: i === practiceWeeks - 1,
    }
  })
  const totalPracticeMinutes = practice.reduce((acc, p) => acc + p.minutes, 0)
  const thisWeekPractice = practice
    .filter((p) => p.createdAt >= startOfWeek)
    .reduce((acc, p) => acc + p.minutes, 0)

  return (
    <StudentDashboardClient
      initialStats={stats}
      initialSessions={sessionsForClient}
      initialProgress={progressForClient}
      initialCoach={coach?.coach ?? null}
      initialRank={rankForClient}
      initialMistakes={myMistakes}
      initialAssignments={assignmentsForClient}
      initialRoutines={routinesForClient}
      initialPractice={{
        weeks: practiceForClient,
        totalMinutes: totalPracticeMinutes,
        thisWeek: thisWeekPractice,
        sessions: practice.length,
      }}
      weekly={{ videosDone: weekStats[0], tasksDone: weekStats[1], sessionsThisWeek: weekStats[2], overdueAssignments, dueSoonAssignments }}
    />
  )
}
