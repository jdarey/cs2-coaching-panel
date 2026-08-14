import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentPathsClient } from './student-paths-client'

export default async function StudentPathsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'STUDENT') {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coachId: true },
  })
  if (!dbUser?.coachId) {
    redirect('/student/dashboard')
  }

  const paths = await prisma.trainingPath.findMany({
    where: { coachId: dbUser.coachId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          videos: {
            orderBy: { order: 'asc' },
            include: { video: { select: { id: true, title: true, thumbnail: true } } },
          },
        },
      },
    },
  })

  const videoIds = Array.from(new Set(paths.flatMap((p) => p.modules.flatMap((m) => m.videos.map((v) => v.videoId)))))
  const progress = videoIds.length
    ? await prisma.videoProgress.findMany({
        where: { userId: user.id, videoId: { in: videoIds } },
        select: { videoId: true, status: true },
      })
    : []

  const statusByVideo: Record<string, string> = {}
  for (const p of progress) statusByVideo[p.videoId] = p.status

  const pathsForClient = paths.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    modules: p.modules.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      videos: m.videos.map((v) => ({
        id: v.id,
        video: { id: v.video.id, title: v.video.title, thumbnail: v.video.thumbnail },
        status: statusByVideo[v.videoId] ?? 'PENDING',
      })),
    })),
  }))

  return <StudentPathsClient paths={pathsForClient} />
}
