import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getStarterRoutine, isStarterLevel, STARTER_ROUTINE_LEVELS, levelLabel } from '@/lib/starter-routine'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  level: z.enum(STARTER_ROUTINE_LEVELS).optional(),
  // Klik "zmień poziom" z bannera: zamiast tworzyć kolejne przypisanie,
  // kierujemy istniejące przypisanie rutyny startowej na nowy poziom.
  assignmentId: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const plans = STARTER_ROUTINE_LEVELS.map((level) => {
      const def = getStarterRoutine(level)
      return { level, label: levelLabel(level), title: def.title, description: def.description, totalMinutes: def.totalMinutes, days: 7, tasks: def.tasks.length }
    })
    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Starter routine GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania planów' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session.user as any).role
    if (role !== 'STUDENT') {
      return NextResponse.json({ error: 'Rutyna startowa jest dla uczniów' }, { status: 403 })
    }
    const userId = (session.user as any).id
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.parse(body ?? {})

    // --- Ścieżka 1: zmiana poziomu istniejącej rutyny startowej ---
    if (parsed.assignmentId) {
      const existing = await prisma.routineAssignment.findFirst({
        where: { id: parsed.assignmentId, studentId: userId },
        include: { routine: true },
      })
      if (!existing || !existing.routine.isStarterRoutine) {
        return NextResponse.json({ error: 'Nie znaleziono rutyny startowej' }, { status: 404 })
      }
      const nextLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = isStarterLevel(parsed.level) ? parsed.level : 'BEGINNER'
      // Deterministyczne dopasowanie: zmieniamy tylko gdy poziom rzeczywiście inny
      if (existing.routine.level === nextLevel) {
        return NextResponse.json({ ok: true, assignmentId: existing.id, unchanged: true })
      }
      const def = getStarterRoutine(nextLevel)
      const updated = await prisma.$transaction(async (tx) => {
        await tx.routineTask.deleteMany({ where: { routineId: existing.routineId } })
        await tx.routineTask.createMany({
          data: def.tasks.map((t, i) => ({
            routineId: existing.routineId,
            title: t.title,
            description: t.description,
            minutes: t.minutes,
            day: i + 1,
            order: i,
          })),
        })
        await tx.routine.update({
          where: { id: existing.routineId },
          data: { title: def.title, description: def.description, level: nextLevel },
        })
        // Nowy plan = nowy start: czyścimy postęp przypisania
        await tx.routineTaskProgress.deleteMany({ where: { assignmentId: existing.id } })
        await tx.routineAssignment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', completedAt: null },
        })
        return tx.routineAssignment.findUnique({
          where: { id: existing.id },
          include: {
            routine: { include: { tasks: { orderBy: [{ day: 'asc' as const }, { order: 'asc' as const }] } } },
            progress: true,
          },
        })
      })
      return NextResponse.json({ ok: true, assignment: updated, switched: true })
    }

    // --- Ścieżka 2: start (idempotentny — max 1 żywotna rutyna startowa) ---
    const active = await prisma.routineAssignment.findFirst({
      where: { studentId: userId, status: 'ACTIVE', routine: { isStarterRoutine: true } },
      include: { routine: true },
    })
    if (active) {
      return NextResponse.json({ ok: true, assignmentId: active.id, alreadyActive: true })
    }

    const level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = isStarterLevel(parsed.level) ? parsed.level : 'BEGINNER'
    const def = getStarterRoutine(level)

    const assignment = await prisma.$transaction(async (tx) => {
      const routine = await tx.routine.create({
        data: {
          // Systemowy autor — rutyna startowa nie należy do żadnego trenera
          coachId: userId,
          title: def.title,
          description: def.description,
          level,
          isStarterRoutine: true,
          // Jednorazowy program 7-dniowy: bez codziennego resetu (dzień 2 ≠ dzień 1)
          recurring: false,
          tasks: {
            create: def.tasks.map((t, i) => ({
              title: t.title,
              description: t.description,
              minutes: t.minutes,
              day: i + 1,
              order: i,
            })),
          },
        },
        include: { tasks: true },
      })
      return tx.routineAssignment.create({
        // coachId = uczeń (rutyna systemowa — autorem jest sam system)
        data: { routineId: routine.id, studentId: userId, coachId: userId },
        include: {
          routine: { include: { tasks: { orderBy: [{ day: 'asc' as const }, { order: 'asc' as const }] } } },
          progress: true,
        },
      })
    })

    return NextResponse.json({ ok: true, assignment }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Starter routine POST error:', error)
    return NextResponse.json({ error: 'Nie udało się uruchomić rutyny startowej' }, { status: 500 })
  }
}
