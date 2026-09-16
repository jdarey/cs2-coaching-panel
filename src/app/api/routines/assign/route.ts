import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isCoachRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

const assignSchema = z.object({
  routineId: z.string(),
  studentId: z.string(),
  // Optional end date set by the coach; without it the routine repeats
  // every day (for recurring routines).
  endsAt: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isCoachRole((session.user as any).role)) {
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

    const endsAt = validated.endsAt ? new Date(validated.endsAt) : null
    if (endsAt && isNaN(endsAt.getTime())) {
      return NextResponse.json({ error: 'Nieprawidłowa data zakończenia' }, { status: 400 })
    }

    // Re-assigning an active routine: reuse the same assignment (fresh progress)
    const existing = await prisma.routineAssignment.findFirst({
      where: { routineId: validated.routineId, studentId: validated.studentId },
    })
    if (existing) {
      await prisma.routineTaskProgress.deleteMany({ where: { assignmentId: existing.id } })
      await prisma.routineAssignment.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', completedAt: null, endsAt },
      })
      return NextResponse.json(existing, { status: 200 })
    }

    const assignment = await prisma.routineAssignment.create({
      data: {
        routineId: validated.routineId,
        coachId: userId,
        studentId: validated.studentId,
        endsAt,
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

// DELETE ?assignmentId= — odpięcie rutyny od ucznia (postęp kaskadowo).
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    const userId = (session.user as any).id
    const assignmentId = new URL(request.url).searchParams.get('assignmentId')
    if (!assignmentId) {
      return NextResponse.json({ error: 'Brak assignmentId' }, { status: 400 })
    }
    const assignment = await prisma.routineAssignment.findFirst({
      where: { id: assignmentId, coachId: userId },
      select: { id: true },
    })
    if (!assignment) {
      return NextResponse.json({ error: 'Nie znaleziono przypisania' }, { status: 404 })
    }
    await prisma.routineTaskProgress.deleteMany({ where: { assignmentId } })
    await prisma.routineAssignment.delete({ where: { id: assignmentId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Routine assign DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania przypisania' }, { status: 500 })
  }
}
