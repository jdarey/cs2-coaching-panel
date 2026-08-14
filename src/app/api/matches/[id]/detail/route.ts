import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchFaceitMatchDetails, fetchLeetifyMatchDetails } from '@/lib/gaming'

// Resolve the Faceit API key: env first, then the coach's stored settings.
async function getFaceitApiKey(coachId: string | null | undefined): Promise<string | null> {
  if (process.env.FACEIT_API_KEY) return process.env.FACEIT_API_KEY
  if (!coachId) return null
  const settings = await prisma.coachSettings.findUnique({
    where: { coachId },
    select: { faceitApiKey: true },
  })
  return settings?.faceitApiKey || null
}

export const dynamic = 'force-dynamic'

async function getOwnedMatch(id: string, userId: string, role: string) {
  const match = await prisma.matchLog.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          steamId: true,
          faceitNickname: true,
          coachId: true,
        },
      },
    },
  })
  if (!match) return null
  if (role === 'STUDENT' && match.studentId !== userId) return null
  if (role === 'COACH') {
    const student = await prisma.user.findFirst({
      where: { id: match.studentId, coachId: userId },
      select: { id: true },
    })
    if (!student) return null
  }
  return match
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { id } = await params

    const match = await getOwnedMatch(id, userId, role)
    if (!match) {
      return NextResponse.json({ error: 'Mecz nie znaleziony' }, { status: 404 })
    }

    // For Faceit matches, fetch the full per-player scoreboard live from the
    // official Faceit API (needs the coach's key); fall back to Leetify's
    // keyless API only when no key is configured. Manual matches return just
    // what we have stored.
    let details = null
    if (match.source === 'FACEIT' && match.platformMatchId) {
      const coachId = (match.student as any).coachId ?? null
      const apiKey = await getFaceitApiKey(coachId)
      if (apiKey) {
        details = await fetchFaceitMatchDetails(match.platformMatchId, apiKey)
      }
    }
    if (!details && match.source === 'FACEIT' && match.externalId) {
      details = await fetchLeetifyMatchDetails(match.externalId)
    }

    const steamId = (match.student as any).steamId || null
    const faceitNickname = (match.student as any).faceitNickname || null
    const myStats =
      details && (steamId || faceitNickname)
        ? details.players.find((p) =>
            steamId && p.steam64Id ? String(p.steam64Id) === String(steamId) : false,
          ) ||
          details.players.find(
            (p: any) =>
              faceitNickname && p.name && p.name.toLowerCase() === faceitNickname.toLowerCase(),
          ) ||
          null
        : null

    // Link to the original match: Faceit matches get their Faceit match URL,
    // everything else (Premier/competitive) points at the Leetify match page.
    const faceitUrl =
      match.source === 'FACEIT' && match.platformMatchId
        ? `https://www.faceit.com/en/cs2/room/${encodeURIComponent(match.platformMatchId)}`
        : null
    const leetifyUrl = match.externalId
      ? `https://leetify.com/app/match-details/${encodeURIComponent(match.externalId)}`
      : null

    return NextResponse.json({
      match: {
        id: match.id,
        map: match.map,
        result: match.result,
        eloChange: match.eloChange,
        kills: match.kills,
        deaths: match.deaths,
        reflection: match.reflection,
        source: match.source,
        platformMatchId: match.platformMatchId,
        faceitUrl,
        leetifyUrl,
        createdAt: match.createdAt.toISOString(),
        leetifyRating: match.leetifyRating,
        preaim: match.preaim,
        reactionMs: match.reactionMs,
        accuracyEnemySpotted: match.accuracyEnemySpotted,
        accuracyHead: match.accuracyHead,
        sprayAccuracy: match.sprayAccuracy,
        coachNotes: match.coachNotes as { time: number; note: string }[] | null,
        coachVerdict: match.coachVerdict,
        coachReviewedAt: match.coachReviewedAt ? match.coachReviewedAt.toISOString() : null,
        student: {
          id: match.student.id,
          name: match.student.name,
          email: match.student.email,
          avatarUrl: match.student.avatarUrl,
          steamId,
        },
      },
      details: details
        ? {
            matchId: details.matchId,
            finishedAt: details.finishedAt,
            map: details.map,
            teamScores: details.teamScores,
            players: details.players,
            myStats,
          }
        : null,
    })
  } catch (error) {
    console.error('Match detail GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania szczegółów meczu' }, { status: 500 })
  }
}
