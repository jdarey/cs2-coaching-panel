import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { videoProgressSchema } from '@/lib/validations'

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

    if (validated.status === 'WATCHED' || validated.status === 'IMPLEMENTED') {
      updateData.watchedAt = new Date()
    }
    if (validated.status === 'WATCHING') {
      updateData.watchedAt = new Date()
    }

    const progress = await prisma.videoProgress.upsert({
      where: {
        userId_videoId_sessionId: {
          userId,
          videoId: validated.videoId,
          sessionId: validated.sessionId || null,
        },
      },
      update: updateData,
      create: {
        userId,
        videoId: validated.videoId,
        sessionId: validated.sessionId,
        ...updateData,
      },
      include: {
        video: true,
        session: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json(progress)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Progress POST error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji postępu' }, { status: 500 })
  }
}