import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { videoUpdateSchema } from '@/lib/validations'
import { getVideoThumbnail } from '@/lib/utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może edytować filmy' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validated = videoUpdateSchema.parse(body)

    const userId = (session.user as any).id

    // Check ownership
    const existingVideo = await prisma.video.findUnique({ where: { id } })
    if (!existingVideo || existingVideo.coachId !== userId) {
      return NextResponse.json({ error: 'Film nie znaleziony lub brak uprawnień' }, { status: 404 })
    }

    // Update thumbnail if URL changed
    const thumbnail = validated.url ? getVideoThumbnail(validated.url) : undefined

    // tagIds is a validation-layer field, not a Prisma column - it is handled
    // through the relation update below instead of being spread into data.
    const { tagIds, ...videoData } = validated
    const updateData: any = { ...videoData }
    if (thumbnail) updateData.thumbnail = thumbnail

    // Handle tag updates
    if (tagIds) {
      updateData.tags = {
        deleteMany: {},
        create: tagIds.map((tagId) => ({ tagId })),
      }
    }

    const video = await prisma.video.update({
      where: { id },
      data: updateData,
      include: { tags: { include: { tag: true } } },
    })

    return NextResponse.json(video)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Video PUT error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji filmu' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może usuwać filmy' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const existingVideo = await prisma.video.findUnique({ where: { id } })
    if (!existingVideo || existingVideo.coachId !== userId) {
      return NextResponse.json({ error: 'Film nie znaleziony lub brak uprawnień' }, { status: 404 })
    }

    await prisma.video.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Video DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania filmu' }, { status: 500 })
  }
}