import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionSchema, sessionUpdateSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const studentId = searchParams.get('studentId')

    let where: any = {}

    if (role === 'COACH') {
      where.coachId = userId
      if (studentId) where.studentId = studentId
    } else {
      where.studentId = userId
    }

    if (status) where.status = status

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        tags: { include: { tag: true } },
        videos: { include: { video: { include: { tags: { include: { tag: true } } } }, tag: true } },
        notes: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        _count: { select: { videos: true } },
      },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Sessions GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania sesji' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może tworzyć sesje' }, { status: 403 })
    }

    const body = await request.json()
    const validated = sessionSchema.parse(body)

    const userId = (session.user as any).id

    // Verify student belongs to coach
    const student = await prisma.user.findUnique({
      where: { id: validated.studentId },
      select: { coachId: true },
    })

    if (!student || student.coachId !== userId) {
      return NextResponse.json({ error: 'Uczeń nie należy do tego trenera' }, { status: 400 })
    }

    const newSession = await prisma.session.create({
      data: {
        ...validated,
        coachId: userId,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
        tags: {
          create: validated.tagIds.map((tagId, index) => ({ tagId, order: index })),
        },
        videos: {
          create: validated.videoIds.map((videoId, index) => ({ videoId, order: index })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        videos: { include: { video: true, tag: true } },
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })

    // Create initial video progress records for student
    await prisma.videoProgress.createMany({
      data: validated.videoIds.map((videoId) => ({
        userId: validated.studentId,
        videoId,
        sessionId: newSession.id,
        status: 'PENDING',
      })),
      skipDuplicates: true,
    })

    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Sessions POST error:', error)
    return NextResponse.json({ error: 'Błąd tworzenia sesji' }, { status: 500 })
  }
}