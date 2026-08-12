import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const assignSchema = z.object({
  routineId: z.string(),
  studentId: z.string(),
})

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
    const validated = assignSchema.parse(body)

    const routine = await prisma.routine.findFirst({
      where: { id: validated.routineId, coachId: userId },
      include: { tasks: true },
    })
    if (!routine) {
      return NextResponse.json({ error: 'Rutyna nie znaleziona' }, { status: 404 })
    }
    const student = await prisma.user.findFirst({
      where: { id: validated.studentId, coachId: userId },
    })
    if (!student) {
      return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
    }

    // Re-assigning an active routine: reuse the same assignment (fresh progress)
    const existing = await prisma.routineAssignment.findFirst({
      where: { routineId: validated.routineId, studentId: validated.studentId },
    })
    if (existing) {
      await prisma.routineTaskProgress.deleteMany({ where: { assignmentId: existing.id } })
      await prisma.routineAssignment.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', completedAt: null },
      })
      return NextResponse.json(existing, { status: 200 })
    }

    const assignment = await prisma.routineAssignment.create({
      data: {
        routineId: validated.routineId,
        coachId: userId,
        studentId: validated.studentId,
        progress: {
          create: routine.tasks.map((t) => ({ taskId: t.id, status: 'PENDING' })),
        },
      },
      include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Routine assign POST error:', error)
    return NextResponse.json({ error: 'Błąd przypisywania rutyny' }, { status: 500 })
  }
}
