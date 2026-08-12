import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const progressSchema = z.object({
  assignmentId: z.string(),
  taskId: z.string(),
  status: z.enum(['PENDING', 'DONE']),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const body = await request.json()
    const validated = progressSchema.parse(body)

    const assignment = await prisma.routineAssignment.findFirst({
      where: { id: validated.assignmentId },
    })
    if (!assignment) {
      return NextResponse.json({ error: 'Przypisanie nie znalezione' }, { status: 404 })
    }
    if (assignment.studentId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const progress = await prisma.routineTaskProgress.upsert({
      where: {
        assignmentId_taskId: {
          assignmentId: validated.assignmentId,
          taskId: validated.taskId,
        },
      },
      update: {
        status: validated.status,
        completedAt: validated.status === 'DONE' ? new Date() : null,
      },
      create: {
        assignmentId: validated.assignmentId,
        taskId: validated.taskId,
        status: validated.status,
        completedAt: validated.status === 'DONE' ? new Date() : null,
      },
    })

    // Auto-complete the whole assignment when every task is done
    const taskCount = await prisma.routineTask.count({ where: { routineId: assignment.routineId } })
    const doneCount = await prisma.routineTaskProgress.count({
      where: { assignmentId: validated.assignmentId, status: 'DONE' },
    })
    if (doneCount >= taskCount && taskCount > 0) {
      await prisma.routineAssignment.update({
        where: { id: validated.assignmentId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    } else if (assignment.status === 'COMPLETED') {
      await prisma.routineAssignment.update({
        where: { id: validated.assignmentId },
        data: { status: 'ACTIVE', completedAt: null },
      })
    }

    return NextResponse.json(progress)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Routine progress PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji postępu' }, { status: 500 })
  }
}
