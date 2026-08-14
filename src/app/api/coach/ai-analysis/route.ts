import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchLeetifyProfile, resolveStudentSteamId } from '@/lib/gaming'
import { analyzeWeaknesses, suggestRoutineForWeakness, recordSkillSnapshot, toPercent } from '@/lib/ai-coach'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    const userId = (session.user as any).id
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    if (!studentId) {
      return NextResponse.json({ error: 'Podaj studentId' }, { status: 400 })
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, coachId: userId },
      select: { id: true, name: true, email: true, steamId: true, steamVanity: true },
    })
    if (!student) {
      return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
    }

    // Resolve the student's CURRENT Steam identifier — fresh vanity first, so a
    // stale/wrong stored steam64 (e.g. from another account) never hijacks the
    // analysis. Persists the resolved ID when it changed.
    const steamId = await resolveStudentSteamId(student, async (resolved) => {
      await prisma.user.update({ where: { id: studentId }, data: { steamId: resolved } })
    })
    if (!steamId) {
      return NextResponse.json(
        { error: 'Uczeń nie ma ustawionego Steam ID — dodaj je w ustawieniach ucznia, aby AI mogło analizować jego grę.' },
        { status: 400 },
      )
    }

    const profile = await fetchLeetifyProfile(steamId)
    if (!profile?.raw) {
      return NextResponse.json(
        { error: 'Nie udało się pobrać profilu Leetify. Sprawdź, czy profil Steam jest publiczny i ma zintegrowane Leetify.' },
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

    const weaknesses = analyzeWeaknesses(aiProfile).slice(0, 3)
    const primary = weaknesses[0] ?? null

    // Record a skill snapshot so the history is kept in the DB
    await recordSkillSnapshot(studentId, aiProfile)

    return NextResponse.json({
      profile: {
        name: raw.name || student.name || student.email,
        totalMatches: raw.total_matches ?? null,
        winrate: toPercent(raw.winrate ?? null),
        rating: {
          aim: aiProfile.aim,
          positioning: aiProfile.positioning,
          utility: aiProfile.utility,
          clutch: aiProfile.clutch,
          opening: aiProfile.opening,
        },
      },
      weaknesses: weaknesses.map((w) => ({
        key: w.key,
        label: w.label,
        value: w.value,
        advice: w.advice,
      })),
      suggestedRoutine: primary ? suggestRoutineForWeakness(primary) : null,
    })
  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json({ error: 'Błąd analizy AI' }, { status: 500 })
  }
}
