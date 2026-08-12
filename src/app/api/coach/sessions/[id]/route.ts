import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionUpdateSchema } from '@/lib/validations'

const sessionInclude = {
  tags: { include: { tag: true }, orderBy: { order: 'asc' } },
  videos: {
    include: { video: { include: { tags: { include: { tag: true } } } }, tag: true },
    orderBy: { order: 'asc' },
  },
} as const

/**
 * PATCH /api/coach/sessions/[id]
 *
 * Partial session update: status, title, description, scheduledAt and
 * optionally tagIds / videoIds. Used by the coach session detail page to
 * save the session status (and future edits).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może edytować sesje' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id
    const body = await request.json()
    const validated = sessionUpdateSchema.parse(body)

    const existing = await prisma.session.findUnique({
      where: { id },
      select: { id: true, coachId: true, studentId: true, completedAt: true },
    })
    if (!existing || existing.coachId !== userId) {
      return NextResponse.json({ error: 'Sesja nie znaleziona lub brak uprawnień' }, { status: 404 })
    }

    // tagIds/videoIds are validation-layer fields, not Prisma columns — they
    // are handled through the relation updates below.
    const { tagIds, videoIds, ...sessionData } = validated

    const updateData: any = { ...sessionData }
    if (sessionData.scheduledAt) updateData.scheduledAt = new Date(sessionData.scheduledAt)
    if (sessionData.status === 'COMPLETED' && !existing.completedAt) {
      updateData.completedAt = new Date()
    }
    if (sessionData.status && sessionData.status !== 'COMPLETED' && existing.completedAt) {
      updateData.completedAt = null
    }

    if (tagIds) {
      updateData.tags = {
        deleteMany: {},
        create: tagIds.map((tagId, index) => ({ tagId, order: index })),
      }
    }

    if (videoIds) {
      updateData.videos = {
        deleteMany: {},
        create: videoIds.map((videoId, index) => ({ videoId, order: index })),
      }
    }

    const updated = await prisma.session.update({
      where: { id },
      data: updateData,
      include: sessionInclude,
    })

    // Sync progress records for any videos set via videoIds
    if (validated.videoIds) {
      await prisma.videoProgress.createMany({
        data: validated.videoIds.map((videoId) => ({
          userId: existing.studentId,
          videoId,
          sessionId: id,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Coach session PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji sesji' }, { status: 500 })
  }
}
