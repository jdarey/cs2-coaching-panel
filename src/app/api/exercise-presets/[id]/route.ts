import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'
import { replaceVariants, exercisePresetPatchSchema } from '@/lib/preset-schema'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const { id } = await params
    const body = await request.json()
    const validated = exercisePresetPatchSchema.parse(body)

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
        linkUrl: validated.linkUrl ?? undefined,
        minutes: validated.minutes ?? undefined,
        tags: validated.tags ?? undefined,
        category: validated.category ?? undefined,
      },
      include: { variants: { orderBy: { order: 'asc' } } },
    })

    // Warianty podmieniane w całości gdy przyszły w body
    if (validated.variants) {
      await replaceVariants(id, validated.variants)
    }

    const fresh = await prisma.exercisePreset.findUnique({
      where: { id },
      include: { variants: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json(fresh ?? updated)
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
    if (!isCoachRole((session.user as any).role)) {
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