import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachDashboardClient } from './coach-dashboard-client'

export default async function CoachDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  // Fetch stats
  const [studentsCount, sessionsCount, videosCount, tagsCount, recentSessions, recentStudents, progressStats, sessionStatuses] = await Promise.all([
    prisma.user.count({ where: { coachId: userId } }),
    prisma.session.count({ where: { coachId: userId } }),
    prisma.video.count({ where: { coachId: userId, isActive: true } }),
    prisma.tag.count({ where: { coachId: userId } }),
    prisma.session.findMany({
      where: { coachId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: { select: { videos: true, tags: true } },
      },
    }),
    prisma.user.findMany({
      where: { coachId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, _count: { select: { videoProgress: true } } },
    }),
    // Real progress: how many assigned videos have been watched/implemented
    prisma.videoProgress.groupBy({
      by: ['status'],
      where: { user: { coachId: userId } },
      _count: { status: true },
    }),
    // Session completion rate
    prisma.session.groupBy({
      by: ['status'],
      where: { coachId: userId },
      _count: { status: true },
    }),
  ])

  const totalProgress = progressStats.reduce((s, p) => s + p._count.status, 0)
  const completedProgress = progressStats
    .filter((p) => p.status === 'WATCHED' || p.status === 'IMPLEMENTED')
    .reduce((s, p) => s + p._count.status, 0)
  const totalSessions = sessionStatuses.reduce((s, p) => s + p._count.status, 0)
  const completedSessions = sessionStatuses.find((p) => p.status === 'COMPLETED')?._count.status ?? 0

  const effectiveness =
    totalProgress > 0
      ? Math.round((completedProgress / totalProgress) * 100)
      : totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0

  return <CoachDashboardClient initialStats={{ studentsCount, sessionsCount, videosCount, tagsCount, recentSessions, recentStudents, effectiveness }} />
}