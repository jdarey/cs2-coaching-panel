import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachSessionsClient } from './coach-sessions-client'

export default async function CoachSessionsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const [sessions, students, tags, videos] = await Promise.all([
    prisma.session.findMany({
      where: { coachId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tags: { include: { tag: true }, orderBy: { order: 'asc' } },
        videos: { include: { video: { include: { tags: { include: { tag: true } } } }, tag: true }, orderBy: { order: 'asc' } },
        _count: { select: { videos: true, tags: true, notes: true } },
      },
    }),
    prisma.user.findMany({
      where: { coachId: userId },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.tag.findMany({
      where: { coachId: userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
    prisma.video.findMany({
      where: { coachId: userId, isActive: true },
      orderBy: { title: 'asc' },
      select: { id: true, title: true, thumbnail: true },
    }),
  ])

  // Convert Date fields to strings for client component
  const sessionsForClient = sessions.map((s) => ({
    ...s,
    scheduledAt: s.scheduledAt?.toISOString() ?? null,
    completedAt: s.completedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }))

  return <CoachSessionsClient initialSessions={sessionsForClient} initialStudents={students} initialTags={tags} initialVideos={videos} />
}