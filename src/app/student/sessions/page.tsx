import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentSessionsClient } from './student-sessions-client'

export default async function StudentSessionsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const sessions = await prisma.session.findMany({
    where: { studentId: userId },
    orderBy: { scheduledAt: 'desc' },
    include: {
      coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
      tags: { include: { tag: true } },
      videos: { include: { video: { include: { tags: { include: { tag: true } } } }, tag: true }, orderBy: { order: 'asc' } },
      notes: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' }, take: 3 },
      _count: { select: { videos: true, tags: true, notes: true } },
    },
  })

  // Get progress for all videos in these sessions
  const sessionIds = sessions.map((s) => s.id)
  const progress = await prisma.videoProgress.findMany({
    where: { userId, sessionId: { in: sessionIds } },
  })

  return <StudentSessionsClient initialSessions={sessions} initialProgress={progress} />
}