import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchLeetifyProfile, fetchLeetifyRecentMatches } from '@/lib/gaming'
import { analyzeMatch, matchVerdict, recordSkillSnapshot } from '@/lib/ai-coach'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role

    const body = await request.json().catch(() => ({}))
    let studentId = userId
    if (role === 'COACH') {
      if (!body.studentId) {
        return NextResponse.json({ error: 'Podaj studentId' }, { status: 400 })
      }
      const student = await prisma.user.findFirst({
        where: { id: body.studentId, coachId: userId },
        select: { id: true },
      })
      if (!student) {
        return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
      }
      studentId = body.studentId
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { steamId: true, faceitNickname: true },
    })
    if (!student?.steamId) {
      return NextResponse.json(
        { error: 'Uczeń nie ma ustawionego Steam ID. Dodaj je w ustawieniach (link do profilu Steam), aby zsynchronizować mecze.' },
        { status: 400 },
      )
    }

    // Profile (season stats + rating) — used by the AI analysis
    const profile = await fetchLeetifyProfile(student.steamId)
    if (!profile?.raw) {
      return NextResponse.json(
        { error: 'Nie udało się pobrać profilu Leetify dla tego Steam ID. Sprawdź, czy profil jest publiczny i czy włączona jest integracja Leetify.' },
        { status: 404 },
      )
    }
    const raw = profile.raw as any
    const aiProfile = {
      aim: typeof raw.rating?.aim === 'number' ? raw.rating.aim : null,
      positioning: typeof raw.rating?.positioning === 'number' ? raw.rating.positioning : null,
      utility: typeof raw.rating?.utility === 'number' ? raw.rating.utility : null,
      clutch: typeof raw.rating?.clutch === 'number' ? raw.rating.clutch : null,
      opening: typeof raw.rating?.opening === 'number' ? raw.rating.opening : null,
      stats: (raw.stats || {}) as Record<string, number>,
    }

    // Sample skills so the weakness-progress chart grows with each sync
    await recordSkillSnapshot(studentId, aiProfile)

    const matches = await fetchLeetifyRecentMatches(student.steamId, 5)
    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'Nie znaleziono meczów dla tego Steam ID w Leetify. Zaloguj się na Leetify, aby mecze zaczęły się tam pojawiać (integracja automatyczna).' },
        { status: 404 },
      )
    }

    // Save only new matches (dedupe by externalId)
    const created: any[] = []
    let skipped = 0
    for (const m of matches) {
      const existing = await prisma.matchLog.findUnique({ where: { externalId: m.externalId } })
      if (existing) {
        skipped++
        continue
      }
      const match = await prisma.matchLog.create({
        data: {
          studentId,
          map: m.map,
          result: m.outcome,
          eloChange: 0,
          kills: null,
          deaths: null,
          reflection: analyzeMatch(aiProfile, m),
          source: 'FACEIT',
          externalId: m.externalId,
          createdAt: new Date(m.finishedAt),
          // Accurate per-match stats straight from Leetify
          leetifyRating: m.leetifyRating,
          preaim: m.preaim,
          reactionMs: m.reactionTimeMs,
          accuracyEnemySpotted: m.accuracyEnemySpotted,
          accuracyHead: m.accuracyHead,
          sprayAccuracy: m.sprayAccuracy,
        },
      })
      created.push(match)
    }

    return NextResponse.json({
      created,
      skipped,
      summary: created.map((c) => ({
        id: c.id,
        map: c.map,
        result: c.result,
        verdict: matchVerdict(aiProfile, matches.find((m) => m.externalId === c.externalId)!),
      })),
      profile: { name: raw.name || null, totalMatches: raw.total_matches ?? null, winrate: raw.winrate ?? null },
    })
  } catch (error) {
    console.error('Faceit sync error:', error)
    return NextResponse.json({ error: 'Błąd synchronizacji Faceit' }, { status: 500 })
  }
}
