import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'
import { exercisePresetSchema } from '@/lib/preset-schema'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const presets = await prisma.exercisePreset.findMany({
      where: { coachId: userId },
      include: { variants: { orderBy: { order: 'asc' } } },
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
    if (!isCoachRole((session.user as any).role)) {
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
        category: validated.category ?? null,
        variants: {
          create: validated.variants.map((v, i) => ({
            label: v.label,
            difficulty: v.difficulty,
            description: v.description ?? null,
            minutes: v.minutes ?? null,
            order: i,
          })),
        },
      },
      include: { variants: { orderBy: { order: 'asc' } } },
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