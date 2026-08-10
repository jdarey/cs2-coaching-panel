import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachStudentDetailClient } from './coach-student-detail-client'

export default async function CoachStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const { id } = await params
  const userId = (session.user as any).id

  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      coachId: true,
    },
  })

  if (!student || student.coachId !== userId) {
    redirect('/coach/students')
  }

  const sessions = await prisma.session.findMany({
    where: { coachId: userId, studentId: id },
    include: {
      tags: { include: { tag: true }, orderBy: { order: 'asc' } },
      _count: { select: { videos: true, notes: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  const progress = await prisma.videoProgress.findMany({
    where: { userId: id },
    select: { status: true },
  })

  const progressStats = {
    total: progress.length,
    pending: progress.filter((p) => p.status === 'PENDING').length,
    watching: progress.filter((p) => p.status === 'WATCHING').length,
    watched: progress.filter((p) => p.status === 'WATCHED').length,
    implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
  }

  return (
    <CoachStudentDetailClient
      student={{
        id: student.id,
        email: student.email,
        name: student.name,
        avatarUrl: student.avatarUrl,
        createdAt: student.createdAt.toISOString(),
      }}
      progressStats={progressStats}
      sessions={sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
        videosCount: s._count.videos,
        notesCount: s._count.notes,
        tags: s.tags.map((t) => ({ name: t.tag.name, color: t.tag.color })),
      }))}
    />
  )
}
