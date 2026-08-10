import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachVideosClient } from './coach-videos-client'

export default async function CoachVideosPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const [videos, tags, students, sessions] = await Promise.all([
    prisma.video.findMany({
      where: { coachId: userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { progress: true, sessionVideos: true } },
      },
    }),
    prisma.tag.findMany({
      where: { coachId: userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
    prisma.user.findMany({
      where: { coachId: userId, role: 'STUDENT' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.session.findMany({
      where: { coachId: userId, status: { not: 'ARCHIVED' } },
      select: { id: true, title: true, studentId: true, status: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  return <CoachVideosClient initialVideos={videos} initialTags={tags} initialStudents={students} initialSessions={sessions} />
}