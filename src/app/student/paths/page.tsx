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
            include: { video: { select: { id: true, title: true, thumbnail: true, duration: true, url: true, description: true } } },
          },
        },
      },
    },
  })

  const videoIds = Array.from(new Set(paths.flatMap((p) => p.modules.flatMap((m) => m.videos.map((v) => v.videoId)))))
  const progress = videoIds.length
    ? await prisma.videoProgress.findMany({
        where: { userId: user.id, videoId: { in: videoIds } },
        select: { videoId: true, status: true, watchedAt: true, positionSeconds: true },
      })
    : []

  const statusByVideo: Record<string, string> = {}
  const posByVideo: Record<string, number> = {}
  const watchedDays = new Set<string>()
  for (const p of progress) {
    statusByVideo[p.videoId] = p.status
    posByVideo[p.videoId] = p.positionSeconds ?? 0
    if ((p.status === 'WATCHED' || p.status === 'IMPLEMENTED') && p.watchedAt) {
      watchedDays.add(p.watchedAt.toISOString().slice(0, 10))
    }
  }

  // Consecutive-day streak ending today or yesterday (student still active).
  const days = Array.from(watchedDays).sort().reverse()
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < days.length; i++) {
    const d = new Date(days[i] + 'T00:00:00')
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000)
    if (diff === streak || diff === streak + 1) {
      if (diff === streak + 1) cursor.setDate(cursor.getDate() - 1)
      streak++
    } else {
      break
    }
  }

  let totalLessons = 0
  let doneLessons = 0
  let totalSeconds = 0
  let doneSeconds = 0
  for (const p of paths) {
    for (const m of p.modules) {
      for (const v of m.videos) {
        totalLessons++
        totalSeconds += v.video.duration ?? 0
        const st = statusByVideo[v.videoId] ?? 'PENDING'
        if (st === 'WATCHED' || st === 'IMPLEMENTED') {
          doneLessons++
          doneSeconds += v.video.duration ?? 0
        }
      }
    }
  }

  const pathsForClient = paths.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    modules: p.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      videos: m.videos.map((v) => ({
        id: v.id,
        description: v.description,
        video: { id: v.video.id, title: v.video.title, thumbnail: v.video.thumbnail, duration: v.video.duration, url: v.video.url, description: v.video.description },
        status: statusByVideo[v.videoId] ?? 'PENDING',
        positionSeconds: posByVideo[v.videoId] ?? 0,
      })),
    })),
  }))

  return (
    <StudentPathsClient
      paths={pathsForClient}
      summary={{
        totalLessons,
        doneLessons,
        totalSeconds,
        doneSeconds,
        streak,
      }}
    />
  )
}
