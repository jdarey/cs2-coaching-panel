import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  day: z.number().int().min(1).default(1),
  minutes: z.number().int().min(1).max(600).optional().nullable(),
})

const routineSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  tasks: z.array(taskSchema).min(1).max(60),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { searchParams } = new URL(request.url)

    if (role === 'COACH') {
      const routines = await prisma.routine.findMany({
        where: { coachId: userId },
        include: {
          tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
          assignments: {
            include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
      return NextResponse.json(routines)
    }

    // Student: routines assigned to them with their progress
    const studentId = searchParams.get('studentId')
    if (studentId && studentId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    const assignments = await prisma.routineAssignment.findMany({
      where: { studentId: userId },
      include: {
        routine: {
          include: { tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
        },
        progress: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Routines GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania rutyn' }, { status: 500 })
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
    const validated = routineSchema.parse(body)

    // Verify videos belong to coach if provided
    const videoIds = validated.tasks.map((t) => t.videoId).filter(Boolean) as string[]
    if (videoIds.length) {
      const count = await prisma.video.count({
        where: { id: { in: videoIds }, coachId: userId },
      })
      if (count !== videoIds.length) {
        return NextResponse.json({ error: 'Niektóre filmy nie należą do Ciebie' }, { status: 403 })
      }
    }

    const routine = await prisma.routine.create({
      data: {
        coachId: userId,
        title: validated.title,
        description: validated.description ?? null,
        tasks: {
          create: validated.tasks.map((t, i) => ({
            title: t.title,
            description: t.description ?? null,
            videoId: t.videoId ?? null,
            day: t.day,
            minutes: t.minutes ?? null,
            order: i,
          })),
        },
      },
      include: {
        tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      },
    })

    return NextResponse.json(routine, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Routines POST error:', error)
    return NextResponse.json({ error: 'Błąd tworzenia rutyny' }, { status: 500 })
  }
}
