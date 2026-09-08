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
    const routine = await prisma.routine.findUnique({ where: { id: assignment.routineId } })
    // Recurring routines keep running every day: instead of completing, the
    // progress rolls over to a fresh cycle — unless the coach set an end date
    // that has already passed.
    const repeat =
      (routine?.recurring ?? false) && (!assignment.endsAt || assignment.endsAt > new Date())
    let assignmentStatus = assignment.status
    if (doneCount >= taskCount && taskCount > 0) {
      // log completion for calendar (survives reset)
      const minutesDone = await prisma.routineTask.aggregate({ where: { routineId: assignment.routineId }, _sum: { minutes: true } })
      await prisma.routineCompletion.create({
        data: {
          assignmentId: validated.assignmentId,
          routineId: assignment.routineId,
          studentId: assignment.studentId,
          tasksDone: doneCount,
          tasksTotal: taskCount,
          minutesDone: minutesDone._sum.minutes ?? null,
        },
      })
      if (repeat) {
        await prisma.routineTaskProgress.updateMany({
          where: { assignmentId: validated.assignmentId },
          data: { status: 'PENDING', completedAt: null },
        })
        await prisma.routineAssignment.update({
          where: { id: validated.assignmentId },
          data: { status: 'ACTIVE', completedAt: null },
        })
        assignmentStatus = 'ACTIVE'
        return NextResponse.json({ ...progress, status: 'PENDING', assignmentStatus, repeated: true })
      }
      await prisma.routineAssignment.update({
        where: { id: validated.assignmentId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      assignmentStatus = 'COMPLETED'
    } else if (assignment.status === 'COMPLETED') {
      await prisma.routineAssignment.update({
        where: { id: validated.assignmentId },
        data: { status: 'ACTIVE', completedAt: null },
      })
      assignmentStatus = 'ACTIVE'
    }

    return NextResponse.json({ ...progress, assignmentStatus })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Routine progress PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji postępu' }, { status: 500 })
  }
}
