import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { publishToUsers } from '@/lib/realtime'
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
    let assignmentStatus = assignment.status

    // Log EVERY checked exercise to the calendar (RoutineCompletion), not just full routine days.
    // Dzięki temu dzień z jednym odhaczonym ćwiczeniem też zostaje w kalendarzu na stałe
    // i przeżywa codzienny reset rutyn. Odhaczenie (PENDING) usuwa dzisiejszy wpis
    // tego przypisania — dzień znika tylko, gdy uczeń cofnie wszystko.
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    // minuty liczone tylko z odhaczonych zadań (częściowy dzień nie zawyża czasu)
    const minutesDone = await prisma.routineTask.aggregate({
      where: { routineId: assignment.routineId, progress: { some: { assignmentId: validated.assignmentId, status: 'DONE' } } },
      _sum: { minutes: true },
    })
    const lastLog = await prisma.routineCompletion.findFirst({
      where: { assignmentId: validated.assignmentId, completedAt: { gte: dayStart } },
      orderBy: { completedAt: 'desc' },
    })
    if (validated.status === 'DONE') {
      if (lastLog && lastLog.tasksDone < taskCount) {
        // kolejne ćwiczenie w tej samej sesji — aktualizuj istniejący wpis (count/minuty)
        await prisma.routineCompletion.update({
          where: { id: lastLog.id },
          data: { tasksDone: doneCount, minutesDone: minutesDone._sum.minutes ?? null },
        })
      } else {
        // pierwszy wpis dziś — albo nowy cykl po powtórce pełnego treningu
        try {
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
        } catch (e) { console.warn('RoutineCompletion log skip (table missing?)', e) }
      }
    } else if (lastLog) {
      // cofnięcie odhaczenia — usuń najnowszy dzisiejszy wpis;
      // wcześniejszy pełny cykl (jeśli był) zostaje w kalendarzu
      try { await prisma.routineCompletion.delete({ where: { id: lastLog.id } }) } catch {}
    }

    if (doneCount >= taskCount && taskCount > 0) {
      // Zamiast resetować codziennie — zakończ rutynę (nawet recurring). Coach może przypisać ponownie lub student zresetuje ręcznie odhaczając.
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

    // Powiadom ucznia i jego trenera (dashboardy odświeżą się przez SSE, bez pollingu)
    try {
      const full = await prisma.routineAssignment.findUnique({ where: { id: validated.assignmentId }, select: { studentId: true, coachId: true } })
      if (full) publishToUsers([full.studentId, full.coachId], { type: 'task:updated', payload: { assignmentId: validated.assignmentId } })
    } catch { /* realtime best-effort */ }

    return NextResponse.json({ ...progress, assignmentStatus })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Routine progress PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji postępu' }, { status: 500 })
  }
}
