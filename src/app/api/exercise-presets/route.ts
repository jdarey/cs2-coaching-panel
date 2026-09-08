import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const exercisePresetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  gifUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  steamMapUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  linkUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  minutes: z.number().int().min(1).max(600).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const presets = await prisma.exercisePreset.findMany({
      where: { coachId: userId },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(presets)
  } catch (error) {
    console.error('ExercisePresets GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania presetów ćwiczeń' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = exercisePresetSchema.parse(body)

    if (validated.videoId) {
      const video = await prisma.video.findFirst({
        where: { id: validated.videoId, coachId: userId },
      })
      if (!video) {
        return NextResponse.json({ error: 'Film nie należy do Ciebie' }, { status: 403 })
      }
    }

    const preset = await prisma.exercisePreset.create({
      data: {
        coachId: userId,
        title: validated.title,
        description: validated.description ?? null,
        videoId: validated.videoId ?? null,
        gifUrl: validated.gifUrl || null,
        steamMapUrl: validated.steamMapUrl || null,
        linkUrl: validated.linkUrl || null,
        minutes: validated.minutes ?? null,
        tags: validated.tags,
      },
    })

    return NextResponse.json(preset, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('ExercisePresets POST error:', error)
    return NextResponse.json({ error: 'Błąd tworzenia presetu ćwiczenia' }, { status: 500 })
  }
}