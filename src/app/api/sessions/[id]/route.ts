import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionUpdateSchema, sessionTagSchema, sessionVideoSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as any).id
    const role = (session.user as any).role

    const existingSession = await prisma.session.findUnique({
      where: { id },
      include: {
        coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tags: { include: { tag: true }, orderBy: { order: 'asc' } },
        videos: {
          include: { video: { include: { tags: { include: { tag: true } } } }, tag: true },
          orderBy: { order: 'asc' },
        },
        notes: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Sesja nie znaleziona' }, { status: 404 })
    }

    // Check access
    if (role === 'COACH' && existingSession.coachId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    if (role === 'STUDENT' && existingSession.studentId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    // Get student's progress for videos in this session
    const progress = await prisma.videoProgress.findMany({
      where: {
        userId: existingSession.studentId,
        sessionId: id,
      },
    })

    return NextResponse.json({ ...existingSession, progress })
  } catch (error) {
    console.error('Session GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania sesji' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może edytować sesje' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validated = sessionUpdateSchema.parse(body)

    const userId = (session.user as any).id

    const existingSession = await prisma.session.findUnique({ where: { id } })
    if (!existingSession || existingSession.coachId !== userId) {
      return NextResponse.json({ error: 'Sesja nie znaleziona lub brak uprawnień' }, { status: 404 })
    }

    // tagIds/videoIds are validation-layer fields, not Prisma columns - they
    // are handled through the relation updates below instead of being spread
    // into data.
    const { tagIds, videoIds, ...sessionData } = validated

    const updateData: any = { ...sessionData }
    if (sessionData.scheduledAt) updateData.scheduledAt = new Date(sessionData.scheduledAt)
    if (sessionData.status === 'COMPLETED' && !existingSession.completedAt) {
      updateData.completedAt = new Date()
    }

    // Handle tags update
    if (tagIds) {
      updateData.tags = {
        deleteMany: {},
        create: tagIds.map((tagId, index) => ({ tagId, order: index })),
      }
    }

    // Handle videos update
    if (videoIds) {
      updateData.videos = {
        deleteMany: {},
        create: videoIds.map((videoId, index) => ({ videoId, order: index })),
      }
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        tags: { include: { tag: true }, orderBy: { order: 'asc' } },
        videos: { include: { video: true, tag: true }, orderBy: { order: 'asc' } },
      },
    })

    // Sync video progress for new videos
    if (validated.videoIds) {
      await prisma.videoProgress.createMany({
        data: validated.videoIds.map((videoId) => ({
          userId: existingSession.studentId,
          videoId,
          sessionId: id,
          status: 'PENDING',
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json(updatedSession)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Session PUT error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji sesji' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może usuwać sesje' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const existingSession = await prisma.session.findUnique({ where: { id } })
    if (!existingSession || existingSession.coachId !== userId) {
      return NextResponse.json({ error: 'Sesja nie znaleziona lub brak uprawnień' }, { status: 404 })
    }

    await prisma.session.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania sesji' }, { status: 500 })
  }
}