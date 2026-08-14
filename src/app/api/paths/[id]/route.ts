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
const updateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(4000).optional().nullable(),
  isActive: z.boolean().optional(),
  modules: z.array(moduleSchema).optional(),
})

const videoSelect = { id: true, title: true, thumbnail: true, duration: true } as const
const moduleVideoSelect = { id: true, videoId: true, description: true, order: true, video: { select: videoSelect } } as const

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const path = await prisma.trainingPath.findFirst({
    where: { id: params.id, coachId, ...(user.role === 'STUDENT' ? { isActive: true } : {}) },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { videos: { orderBy: { order: 'asc' }, select: moduleVideoSelect } },
      },
    },
  })
  if (!path) {
    return NextResponse.json({ error: 'Nie znaleziono ścieżki' }, { status: 404 })
  }

  return NextResponse.json({
    path: { ...path, createdAt: path.createdAt.toISOString(), updatedAt: path.updatedAt.toISOString() },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const existing = await prisma.trainingPath.findFirst({ where: { id: params.id, coachId: user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Nie znaleziono ścieżki' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  }

  // If modules change, verify video ownership and rebuild the module tree.
  const modules = parsed.data.modules
  if (modules) {
    const videoIds = Array.from(new Set(modules.flatMap((m) => m.videos.map((v) => v.videoId))))
    if (videoIds.length) {
      const count = await prisma.video.count({ where: { id: { in: videoIds }, coachId: user.id } })
      if (count !== videoIds.length) {
        return NextResponse.json({ error: 'Niektóre filmy nie należą do Ciebie' }, { status: 403 })
      }
    }
  }

  const path = await prisma.$transaction(async (tx) => {
    if (modules) {
      await tx.trainingModule.deleteMany({ where: { pathId: params.id } })
    }
    return tx.trainingPath.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description?.trim() || null } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(modules
          ? {
              modules: {
                create: modules.map((m, mi) => ({
                  title: m.title.trim(),
                  description: m.description?.trim() || null,
                  order: mi,
                  videos: {
                    create: m.videos.map((v, vi) => ({ videoId: v.videoId, order: vi, description: v.description?.trim() || null })),
                  },
                })),
              },
            }
          : {}),
      },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: { videos: { orderBy: { order: 'asc' }, select: moduleVideoSelect } },
        },
      },
    })
  })

  return NextResponse.json({
    path: { ...path, createdAt: path.createdAt.toISOString(), updatedAt: path.updatedAt.toISOString() },
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const existing = await prisma.trainingPath.findFirst({ where: { id: params.id, coachId: user.id } })
  if (!existing) {
    return NextResponse.json({ error: 'Nie znaleziono ścieżki' }, { status: 404 })
  }

  await prisma.trainingPath.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
