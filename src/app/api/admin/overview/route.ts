import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/overview
 * Przegląd systemu dla admina: liczby encji, nabór (rejestracje w czasie),
 * aktywność (logowania/treningi), ostatnie akcje audytu i stan kolejki maili.
 * Wszystko w jednym callsie — strona /admin/monitoring dociąga to przy starcie.
 */
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const now = new Date()
  const d24 = new Date(now.getTime() - 24 * 3600_000)
  const d7 = new Date(now.getTime() - 7 * 24 * 3600_000)
  const d30 = new Date(now.getTime() - 30 * 24 * 3600_000)

  // --- Liczby encji (count na kluczowych tabelach) ---
  const [
    usersTotal,
    students,
    coaches,
    admins,
    newUsers24h,
    newUsers7d,
    newUsers30d,
    active24h,
    active7d,
    routines,
    routineAssignments,
    sessionsTotal,
    videosTotal,
    auditCount,
    auditErrors,
    lastUser,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'COACH' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { createdAt: { gte: d24 } } }),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.user.count({ where: { createdAt: { gte: d30 } } }),
    // aktywność = lastActiveAt (heartbeat obecności)
    prisma.user.count({ where: { lastActiveAt: { gte: d24 } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: d7 } } }),
    prisma.routine.count(),
    prisma.routineAssignment.count(),
    prisma.session.count(),
    prisma.video.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: d24 } } }),
    // "błędy" = akcje audytu z flagą ERROR w details — słaba heurystyka, ale darmowa
    prisma.auditLog.count({ where: { createdAt: { gte: d24 }, action: { contains: 'ERROR' } } }),
    prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, createdAt: true },
    }),
  ])

  // --- Rejestracje ostatnich 14 dni (wykres) ---
  const signupRows = await prisma.user.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 14 * 24 * 3600_000) } },
    select: { createdAt: true },
  })
  const dayKey = (dt: Date) => dt.toLocaleDateString('en-CA', { timeZone: 'Europe/Warsaw' })
  const byDay = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    byDay.set(dayKey(new Date(now.getTime() - i * 24 * 3600_000)), 0)
  }
  for (const u of signupRows) {
    const k = dayKey(new Date(u.createdAt))
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) || 0) + 1)
  }
  const signups = Array.from(byDay.entries()).map(([date, count]) => ({ date, count }))

  // --- Treningi (RoutineCompletion) 14 dni — aktywność uczniów ---
  let training: { date: string; count: number }[] = []
  try {
    const rows = await prisma.routineCompletion.findMany({
      where: { completedAt: { gte: new Date(now.getTime() - 14 * 24 * 3600_000) } },
      select: { completedAt: true, tasksDone: true },
    })
    const tByDay = new Map<string, number>()
    for (let i = 13; i >= 0; i--) {
      tByDay.set(dayKey(new Date(now.getTime() - i * 24 * 3600_000)), 0)
    }
    for (const r of rows) {
      const k = dayKey(new Date(r.completedAt))
      if (tByDay.has(k)) tByDay.set(k, (tByDay.get(k) || 0) + r.tasksDone)
    }
    training = Array.from(tByDay.entries()).map(([date, count]) => ({ date, count }))
  } catch {
    // tabela RoutineCompletion może nie istnieć na starych deployach
  }

  // --- Ostatnie akcje audytu (5) ---
  const recentAudit = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, action: true, actorRole: true, createdAt: true, targetId: true },
  })

  return NextResponse.json({
    entities: {
      usersTotal, students, coaches, admins,
      routines, routineAssignments, sessionsTotal, videosTotal,
    },
    growth: { last24h: newUsers24h, last7d: newUsers7d, last30d: newUsers30d, latest: lastUser },
    activity: { active24h, active7d, auditEvents24h: auditCount, auditErrors24h: auditErrors },
    signups,
    training,
    recentAudit,
    generatedAt: now.toISOString(),
  })
}
