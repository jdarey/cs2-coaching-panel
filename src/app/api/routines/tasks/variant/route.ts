import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  taskId: z.string(),
  variantLabel: z.string().max(60).nullable(),
  variantDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).nullable(),
  // Opcjonalne minuty — warianty mają własne czasy; gdy null, nie ruszamy pola
  minutes: z.number().int().min(1).max(600).optional().nullable(),
})

// Uczeń zmienia wariant trudności swojego zadania z rutyny. Ograniczone do
// zadań z rutyn przypisanych TEMU uczniowi (join przez RoutineAssignment).
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const body = await request.json()
    const validated = schema.parse(body)

    // Zadanie musi należeć do rutyny przypisanej temu uczniowi
    const task = await prisma.routineTask.findFirst({
      where: {
        id: validated.taskId,
        routine: { assignments: { some: { studentId: userId } } },
      },
      select: { id: true, variantLabel: true, variantDifficulty: true, minutes: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Zadanie nie znalezione lub nie należy do Ciebie' }, { status: 404 })
    }

    const updated = await prisma.routineTask.update({
      where: { id: task.id },
      data: {
        variantLabel: validated.variantLabel,
        variantDifficulty: validated.variantDifficulty,
        ...(validated.minutes !== undefined ? { minutes: validated.minutes } : {}),
      },
      select: { id: true, variantLabel: true, variantDifficulty: true, minutes: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Task variant PATCH error:', error)
    return NextResponse.json({ error: 'Błąd zmiany wariantu' }, { status: 500 })
  }
}
