import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 300

/**
 * GET /api/public/stats — publiczny licznik social proof dla landing page.
 * Zasada „zero ściemy”: pokazujemy WYŁĄCZNIE realne, zanonimizowane liczby
 * agregowane z całej bazy (dni treningu, minuty praktyki, liczba uczniów).
 * Zero danych per-user, zero sztucznie zawyżanych liczb. Skonfigurowany
 * revalidate=300 — endpoint jest tani (3 count/aggregate) i nie needs auth.
 */
export async function GET() {
  try {
    const [trainingDays, practiceMinutesAgg, students] = await Promise.all([
      prisma.routineCompletion.count(),
      prisma.practiceSession.aggregate({ _sum: { minutes: true } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
    ])

    return NextResponse.json({
      trainingDays,
      practiceMinutes: practiceMinutesAgg._sum.minutes ?? 0,
      students,
    })
  } catch {
    // Błąd bazy nie powinien wysadzać landinga — klient po prostu ukryje sekcję.
    return NextResponse.json({ trainingDays: 0, practiceMinutes: 0, students: 0 })
  }
}
