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

  const [sessions, progress, coach] = await Promise.all([
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
  ])

  // Calculate stats
  const stats = {
    totalVideos: progress.length,
    pending: progress.filter((p) => p.status === 'PENDING').length,
    watching: progress.filter((p) => p.status === 'WATCHING').length,
    watched: progress.filter((p) => p.status === 'WATCHED').length,
    implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === 'ACTIVE').length,
  }

  // Convert Date fields to strings for client component
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

  return <StudentDashboardClient initialStats={stats} initialSessions={sessionsForClient} initialProgress={progressForClient} initialCoach={coach?.coach ?? null} />
}