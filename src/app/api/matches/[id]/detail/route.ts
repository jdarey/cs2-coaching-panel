import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchLeetifyMatchDetails } from '@/lib/gaming'

export const dynamic = 'force-dynamic'

async function getOwnedMatch(id: string, userId: string, role: string) {
  const match = await prisma.matchLog.findUnique({
    where: { id },
    include: { student: { select: { id: true, name: true, email: true, avatarUrl: true, steamId: true } } },
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

    // For Faceit matches with an external Leetify match id, fetch the full
    // per-player breakdown live from Leetify (keyless). Manual matches return
    // just what we have stored.
    let details = null
    if (match.source === 'FACEIT' && match.externalId) {
      details = await fetchLeetifyMatchDetails(match.externalId)
    }

    const steamId = (match.student as any).steamId || null
    const myStats =
      details && steamId
        ? details.players.find((p) => String(p.steam64Id) === String(steamId)) || null
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
