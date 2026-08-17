import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const videoSchema = z.object({
  videoId: z.string().min(1),
  description: z.string().max(2000).optional().nullable(),
})
const moduleSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  videos: z.array(videoSchema).default([]),
})
const createSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  modules: z.array(moduleSchema).default([]),
})

const videoSelect = { id: true, title: true, thumbnail: true, duration: true } as const
const moduleVideoSelect = { id: true, videoId: true, description: true, order: true, video: { select: videoSelect } } as const

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
  }

  let coachId: string | null = user.role === 'COACH' ? user.id : null
  if (user.role === 'STUDENT') {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { coachId: true } })
    coachId = dbUser?.coachId ?? null
  }
  if (!coachId) {
    return NextResponse.json({ paths: [] })
  }

  const paths = await prisma.trainingPath.findMany({
    where: user.role === 'COACH' ? { coachId } : { coachId, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          videos: {
            orderBy: { order: 'asc' },
            select: moduleVideoSelect,
          },
        },
      },
    },
    take: 100,
  })

  return NextResponse.json({
    paths: paths.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Uzupełnij tytuł ścieżki' }, { status: 400 })
  }

  // Verify all videos belong to this coach before building the path.
  const videoIds = Array.from(new Set(parsed.data.modules.flatMap((m) => m.videos.map((v) => v.videoId))))
  if (videoIds.length) {
    const count = await prisma.video.count({ where: { id: { in: videoIds }, coachId: user.id } })
    if (count !== videoIds.length) {
      return NextResponse.json({ error: 'Niektóre filmy nie należą do Ciebie' }, { status: 403 })
    }
  }

  const path = await prisma.trainingPath.create({
    data: {
      coachId: user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      isActive: parsed.data.isActive,
      modules: {
        create: parsed.data.modules.map((m, mi) => ({
          title: m.title.trim(),
          description: m.description?.trim() || null,
          order: mi,
          videos: {
            create: m.videos.map((v, vi) => ({ videoId: v.videoId, order: vi, description: v.description?.trim() || null })),
          },
        })),
      },
    },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { videos: { orderBy: { order: 'asc' }, select: moduleVideoSelect } },
      },
    },
  })

  return NextResponse.json({ path: { ...path, createdAt: path.createdAt.toISOString(), updatedAt: path.updatedAt.toISOString() } }, { status: 201 })
}
