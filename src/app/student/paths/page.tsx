import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentPathsClient } from './student-paths-client'
import { getStreak } from '@/lib/gamification'

export const metadata = {
  title: 'Ścieżki treningowe',
}

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
  // Uczeń bez trenera: pokazujemy przyjazny pusty stan zamiast cichego
  // przekierowania na dashboard (wyglądało jak "nie działa").
  if (!dbUser?.coachId) {
    return (
      <StudentPathsClient
        paths={[]}
        summary={{ totalLessons: 0, doneLessons: 0, totalSeconds: 0, doneSeconds: 0, streak: 0 }}
        noCoach
      />
    )
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

  // Seria w Europe/Warsaw (wspólny helper — serwer działa w UTC).
  const streak = getStreak(Array.from(watchedDays))

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
