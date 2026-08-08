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
  const [studentsCount, sessionsCount, videosCount, tagsCount, recentSessions, recentStudents] = await Promise.all([
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
  ])

  return <CoachDashboardClient initialStats={{ studentsCount, sessionsCount, videosCount, tagsCount, recentSessions, recentStudents }} />
}