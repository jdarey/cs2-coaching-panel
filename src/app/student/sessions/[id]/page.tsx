import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentSessionDetailClient } from './student-session-detail-client'

export default async function StudentSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
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

  if (!sessionData || sessionData.studentId !== userId) {
    redirect('/student/sessions')
  }

  // Get student's progress for videos in this session
  const progress = await prisma.videoProgress.findMany({
    where: {
      userId,
      sessionId: id,
    },
  })

  // Convert Date fields to strings for client component
  const sessionForClient = {
    ...sessionData,
    scheduledAt: sessionData.scheduledAt?.toISOString() ?? null,
    completedAt: sessionData.completedAt?.toISOString() ?? null,
    createdAt: sessionData.createdAt.toISOString(),
    updatedAt: sessionData.updatedAt.toISOString(),
    notes: sessionData.notes.map((note) => ({
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
  }

  const progressForClient = progress.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    watchedAt: p.watchedAt?.toISOString() ?? null,
  }))

  return <StudentSessionDetailClient initialSession={sessionForClient} initialProgress={progressForClient} />
}