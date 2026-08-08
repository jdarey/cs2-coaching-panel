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

  const [videos, tags] = await Promise.all([
    prisma.video.findMany({
      where: { coachId: userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { progress: true } },
      },
    }),
    prisma.tag.findMany({
      where: { coachId: userId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
  ])

  return <CoachVideosClient initialVideos={videos} initialTags={tags} />
}