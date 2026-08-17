import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const assignmentSchema = z.object({
  studentId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
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
    const studentId = searchParams.get('studentId')

    let where: any = {}

    if (role === 'COACH') {
      // Coach sees assignments for their own students (optionally one student)
      const myStudents = await prisma.user.findMany({
        where: { coachId: userId },
        select: { id: true },
      })
      const ids = myStudents.map((s) => s.id)
      where.studentId = { in: ids }
      if (studentId) {
        if (!ids.includes(studentId)) {
          return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
        }
        where.studentId = studentId
      }
    } else {
      // Student sees only their own assignments
      if (studentId && studentId !== userId) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
      where.studentId = userId
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        video: { select: { id: true, title: true, url: true, thumbnail: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 500,
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Assignments GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania zadań' }, { status: 500 })
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
    const validated = assignmentSchema.parse(body)

    // Verify the student belongs to this coach
    const student = await prisma.user.findFirst({
      where: { id: validated.studentId, coachId: userId },
    })
    if (!student) {
      return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
    }

    // Verify video belongs to coach if provided
    if (validated.videoId) {
      const video = await prisma.video.findFirst({
        where: { id: validated.videoId, coachId: userId },
      })
      if (!video) {
        return NextResponse.json({ error: 'Film nie znaleziony' }, { status: 404 })
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        coachId: userId,
        studentId: validated.studentId,
        title: validated.title,
        description: validated.description ?? null,
        videoId: validated.videoId ?? null,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        video: { select: { id: true, title: true, url: true, thumbnail: true } },
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Assignments POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania zadania' }, { status: 500 })
  }
}
