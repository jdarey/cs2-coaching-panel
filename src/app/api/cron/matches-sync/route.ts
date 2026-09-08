import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncStudentMatches } from '@/lib/matches'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET || ''

// Weekly automatic Faceit match sync for every student. Runs without any user
// session (cron secret auth, same convention as the other /api/cron routes) —
// the same syncStudentMatches code path as the manual "Sync" button, so a
// student never has to click anything: their match log stays fresh.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  const summary = {
    students: 0,
    synced: 0,
    created: 0,
    skipped: 0,
    purged: 0,
    errors: 0,
    details: [] as { name: string | null; ok: boolean; error?: string; created: number; skipped: number; purged: number }[],
  }

  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, steamId: true, steamVanity: true },
    })

    for (const student of students) {
      if (!student.steamId && !student.steamVanity) continue
      summary.students++
      const result = await syncStudentMatches(student.id)
      summary.created += result.created
      summary.skipped += result.skipped
      summary.purged += result.purged
      if (result.ok) {
        summary.synced++
      } else {
        summary.errors++
      }
      summary.details.push({
        name: result.name ?? student.name,
        ok: result.ok,
        error: result.error,
        created: result.created,
        skipped: result.skipped,
        purged: result.purged,
      })
    }

    return NextResponse.json({ ok: true, tookMs: Date.now() - started, summary })
  } catch (error) {
    console.error('Cron matches-sync error:', error)
    return NextResponse.json({ error: 'Błąd crona synchronizacji meczów' }, { status: 500 })
  }
}
