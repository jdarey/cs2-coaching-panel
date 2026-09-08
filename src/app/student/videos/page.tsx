import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentVideosClient } from './student-videos-client'

export default async function StudentVideosPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  // Get all sessions with videos for this student
  const sessions = await prisma.session.findMany({
    where: { studentId: userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    orderBy: { scheduledAt: 'desc' },
    include: {
      videos: {
        include: {
          video: { include: { tags: { include: { tag: true } } } },
          tag: true,
        },
        orderBy: { order: 'asc' },
      },
      tags: { include: { tag: true } },
    },
  })

  // Get progress for all videos
  const sessionIds = sessions.map((s) => s.id)
  const progressData = await prisma.videoProgress.findMany({
    where: { userId, sessionId: { in: sessionIds } },
  })

  const progress = progressData.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    watchedAt: p.watchedAt?.toISOString() ?? null,
  }))

  // Convert Date fields to strings for client component
  const sessionsForClient = sessions.map((s) => ({
    ...s,
    scheduledAt: s.scheduledAt?.toISOString() ?? null,
    completedAt: s.completedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return <StudentVideosClient initialSessions={sessionsForClient} initialProgress={progress} />
}