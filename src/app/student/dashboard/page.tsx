import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentDashboardClient } from './student-dashboard-client'

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const userId = (session.user as any).id
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  const [sessions, progress, coach, rankEntries, myTags, assignments, coachInfo, weekStats] = await Promise.all([
    prisma.session.findMany({
      where: { studentId: userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { scheduledAt: 'desc' },
      take: 5,
      include: {
        coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tags: { include: { tag: true } },
        videos: { include: { video: true }, orderBy: { order: 'asc' } },
        _count: { select: { videos: true } },
      },
    }),
    prisma.videoProgress.findMany({
      where: { userId },
      include: {
        video: { include: { tags: { include: { tag: true } } } },
        session: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
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
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        coach: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    // Weekly deltas
    prisma.$transaction([
      prisma.videoProgress.count({ where: { userId, updatedAt: { gte: weekAgo }, status: { in: ['WATCHED', 'IMPLEMENTED'] } } }),
      prisma.assignment.count({ where: { studentId: userId, completedAt: { gte: weekAgo } } }),
      prisma.session.count({ where: { studentId: userId, createdAt: { gte: weekAgo } } }),
    ]),
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

  return (
    <StudentDashboardClient
      initialStats={stats}
      initialSessions={sessionsForClient}
      initialProgress={progressForClient}
      initialCoach={coach?.coach ?? null}
      initialRank={rankForClient}
      initialMistakes={myMistakes}
      initialAssignments={assignmentsForClient}
      weekly={{ videosDone: weekStats[0], tasksDone: weekStats[1], sessionsThisWeek: weekStats[2], overdueAssignments, dueSoonAssignments }}
    />
  )
}
