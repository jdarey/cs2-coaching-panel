import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const exercisePresetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  gifUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  steamMapUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  minutes: z.number().int().min(1).max(600).optional().nullable(),
  tags: z.array(z.string()).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const { id } = await params
    const body = await request.json()
    const validated = exercisePresetSchema.parse(body)

    const preset = await prisma.exercisePreset.findFirst({
      where: { id, coachId: userId },
    })
    if (!preset) {
      return NextResponse.json({ error: 'Preset nie znaleziony' }, { status: 404 })
    }

    if (validated.videoId) {
      const video = await prisma.video.findFirst({
        where: { id: validated.videoId, coachId: userId },
      })
      if (!video) {
        return NextResponse.json({ error: 'Film nie należy do Ciebie' }, { status: 403 })
      }
    }

    const updated = await prisma.exercisePreset.update({
      where: { id },
      data: {
        title: validated.title ?? undefined,
        description: validated.description ?? undefined,
        videoId: validated.videoId ?? undefined,
        gifUrl: validated.gifUrl ?? undefined,
        steamMapUrl: validated.steamMapUrl ?? undefined,
        minutes: validated.minutes ?? undefined,
        tags: validated.tags ?? undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('ExercisePreset PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji presetu' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const { id } = await params

    const preset = await prisma.exercisePreset.findFirst({
      where: { id, coachId: userId },
    })
    if (!preset) {
      return NextResponse.json({ error: 'Preset nie znaleziony' }, { status: 404 })
    }

    await prisma.exercisePreset.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('ExercisePreset DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania presetu' }, { status: 500 })
  }
}