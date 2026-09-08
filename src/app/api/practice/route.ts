import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  minutes: z.number().int().min(1).max(600),
  taskId: z.string().optional().nullable(),
  assignmentId: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const body = await request.json()
    const validated = postSchema.parse(body)

    // Students log their own sessions; coaches can log for their students too
    let studentId = userId
    if ((session.user as any).role === 'COACH' && body.studentId) {
      const student = await prisma.user.findFirst({
        where: { id: body.studentId, coachId: userId },
        select: { id: true },
      })
      if (!student) {
        return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
      }
      studentId = body.studentId
    }

    // Task just needs to exist (it belongs to a routine the student works on)
    if (validated.taskId) {
      const task = await prisma.routineTask.findUnique({
        where: { id: validated.taskId },
        select: { id: true },
      })
      if (!task) {
        return NextResponse.json({ error: 'Zadanie nie znalezione' }, { status: 404 })
      }
    }

    const practice = await prisma.practiceSession.create({
      data: {
        studentId,
        taskId: validated.taskId ?? null,
        assignmentId: validated.assignmentId ?? null,
        minutes: validated.minutes,
        source: 'TIMER',
      },
    })

    return NextResponse.json(practice, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Practice POST error:', error)
    return NextResponse.json({ error: 'Błąd zapisu praktyki' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { searchParams } = new URL(request.url)

    // Coach can query a specific student's practice
    let studentId = userId
    if (role === 'COACH') {
      const target = searchParams.get('studentId')
      if (target) {
        const student = await prisma.user.findFirst({
          where: { id: target, coachId: userId },
          select: { id: true },
        })
        if (!student) return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
        studentId = target
      } else {
        return NextResponse.json({ error: 'Podaj studentId' }, { status: 400 })
      }
    }

    const weeks = 8
    const now = new Date()
    // Start of the current week (Monday)
    const startOfWeek = new Date(now)
    const day = (now.getDay() + 6) % 7 // Monday = 0
    startOfWeek.setDate(now.getDate() - day)
    startOfWeek.setHours(0, 0, 0, 0)
    const from = new Date(startOfWeek)
    from.setDate(from.getDate() - (weeks - 1) * 7)

    const sessions = await prisma.practiceSession.findMany({
      where: { studentId, createdAt: { gte: from } },
      select: { minutes: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Aggregate per ISO week (Monday start)
    const weeksData = Array.from({ length: weeks }, (_, i) => {
      const weekStart = new Date(from)
      weekStart.setDate(from.getDate() + i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const minutes = sessions
        .filter((s) => s.createdAt >= weekStart && s.createdAt < weekEnd)
        .reduce((acc, s) => acc + s.minutes, 0)
      return {
        label: `${weekStart.getDate()}.${String(weekStart.getMonth() + 1).padStart(2, '0')}`,
        minutes,
        isCurrent: i === weeks - 1,
      }
    })

    const totalMinutes = sessions.reduce((acc, s) => acc + s.minutes, 0)
    const thisWeek = sessions
      .filter((s) => s.createdAt >= startOfWeek)
      .reduce((acc, s) => acc + s.minutes, 0)

    return NextResponse.json({ weeks: weeksData, totalMinutes, thisWeek, sessions: sessions.length })
  } catch (error) {
    console.error('Practice GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania praktyki' }, { status: 500 })
  }
}
