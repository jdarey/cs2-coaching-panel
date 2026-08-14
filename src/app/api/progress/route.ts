import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { videoProgressSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const videoId = searchParams.get('videoId')

    let where: any = {}

    if (role === 'COACH') {
      // Coach can see progress of their students
      const studentIds = await prisma.user.findMany({
        where: { coachId: userId },
        select: { id: true },
      })
      where.userId = { in: studentIds.map((s) => s.id) }
    } else {
      where.userId = userId
    }

    if (sessionId) where.sessionId = sessionId
    if (videoId) where.videoId = videoId

    const progress = await prisma.videoProgress.findMany({
      where,
      include: {
        video: { include: { tags: { include: { tag: true } } } },
        session: { select: { id: true, title: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Progress GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania postępu' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = videoProgressSchema.parse(body)

    // Verify video exists and user has access
    const video = await prisma.video.findUnique({ where: { id: validated.videoId } })
    if (!video) {
      return NextResponse.json({ error: 'Film nie znaleziony' }, { status: 404 })
    }

    // If sessionId provided, verify access
    if (validated.sessionId) {
      const sessionRecord = await prisma.session.findUnique({
        where: { id: validated.sessionId },
      })
      if (!sessionRecord) {
        return NextResponse.json({ error: 'Sesja nie znaleziona' }, { status: 404 })
      }

      const role = (session.user as any).role
      if (role === 'COACH' && sessionRecord.coachId !== userId) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
      if (role === 'STUDENT' && sessionRecord.studentId !== userId) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
    }

    const updateData: any = {
      status: validated.status,
      progress: validated.progress,
      note: validated.note,
    }

    // Resume point in seconds — only overwrite when the client sends one, so
    // status-only updates (e.g. manual dialogs) never wipe the saved position.
    if (validated.positionSeconds != null) {
      updateData.positionSeconds = validated.positionSeconds
    }

    if (validated.status === 'WATCHED' || validated.status === 'IMPLEMENTED') {
      updateData.watchedAt = new Date()
    }
    if (validated.status === 'WATCHING') {
      updateData.watchedAt = new Date()
    }

    const existing = await prisma.videoProgress.findFirst({
        where: {
          userId,
          videoId: validated.videoId,
          sessionId: validated.sessionId ?? null,
        },
      })

      let progress
      if (existing) {
        progress = await prisma.videoProgress.update({
          where: { id: existing.id },
          data: updateData,
          include: { video: true, session: { select: { id: true, title: true } } },
        })
      } else {
        progress = await prisma.videoProgress.create({
          data: {
            userId,
            videoId: validated.videoId,
            sessionId: validated.sessionId ?? null,
            ...updateData,
          },
          include: { video: true, session: { select: { id: true, title: true } } },
        })
      }

    return NextResponse.json(progress)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Progress POST error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji postępu' }, { status: 500 })
  }
}