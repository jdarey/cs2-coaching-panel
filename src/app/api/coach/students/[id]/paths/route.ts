import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isCoachRole((session.user as any).role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: studentId } = await params
  const coachId = (session.user as any).id
  const student = await prisma.user.findFirst({ where: { id: studentId, coachId }, select: { id: true, coachId: true } })
  if (!student) return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })

  const paths = await prisma.trainingPath.findMany({
    where: { coachId, isActive: true },
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
  const progress = videoIds.length ? await prisma.videoProgress.findMany({ where: { userId: studentId, videoId: { in: videoIds } }, select: { videoId: true, status: true, positionSeconds: true } }) : []
  const statusByVideo: Record<string, string> = {}
  const posByVideo: Record<string, number> = {}
  for (const p of progress) { statusByVideo[p.videoId] = p.status; posByVideo[p.videoId] = p.positionSeconds ?? 0 }

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
        if (st === 'WATCHED' || st === 'IMPLEMENTED') { doneLessons++; doneSeconds += v.video.duration ?? 0 }
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

  return NextResponse.json({ paths: pathsForClient, summary: { totalLessons, doneLessons, totalSeconds, doneSeconds } })
}
