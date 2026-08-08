import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachSessionDetailClient } from './coach-session-detail-client'

export default async function CoachSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const { id } = await params
  const userId = (session.user as any).id

  const sessionData = await prisma.session.findUnique({
    where: { id },
    include: {
      coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
      student: { select: { id: true, name: true, email: true, avatarUrl: true } },
      tags: { include: { tag: true }, orderBy: { order: 'asc' } },
      videos: {
        include: {
          video: { include: { tags: { include: { tag: true } } } },
          tag: true,
        },
        orderBy: { order: 'asc' },
      },
      notes: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!sessionData || sessionData.coachId !== userId) {
    redirect('/coach/sessions')
  }

  // Get student's progress for videos in this session
  const progress = await prisma.videoProgress.findMany({
    where: {
      userId: sessionData.studentId,
      sessionId: id,
    },
  })

  return <CoachSessionDetailClient initialSession={sessionData} initialProgress={progress} />
}