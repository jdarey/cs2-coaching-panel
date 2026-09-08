import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchFaceitLegacy } from '@/lib/gaming'

export const dynamic = 'force-dynamic'

const FACEIT_API = 'https://open.faceit.com/data/v4'

async function getFaceitApiKey(userId: string, role: string): Promise<string | null> {
  const envKey = process.env.FACEIT_API_KEY
  if (envKey) return envKey

  let settings: { faceitApiKey: string | null } | null = null
  if (role === 'COACH') {
    settings = await prisma.coachSettings.findUnique({
      where: { coachId: userId },
      select: { faceitApiKey: true },
    })
  } else {
    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { coach: { select: { coachSettings: { select: { faceitApiKey: true } } } } },
    })
    settings = (student as any)?.coach?.coachSettings ?? null
  }
  return settings?.faceitApiKey || null
}

// Keyless first (Faceit legacy endpoint), Open API as an optional upgrade.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { searchParams } = new URL(request.url)
    const nickname = searchParams.get('nickname')?.trim()

    if (!nickname) {
      return NextResponse.json({ error: 'Podaj nickname Faceit' }, { status: 400 })
    }

    // 1) Keyless legacy endpoint — works without any API key
    const legacy = await fetchFaceitLegacy(nickname)
    if (legacy) {
      return NextResponse.json({
        faceitId: legacy.faceitId,
        nickname: legacy.nickname,
        avatar: legacy.avatar,
        country: legacy.country,
        elo: legacy.elo,
        skillLevel: legacy.skillLevel,
        source: 'legacy-keyless',
      })
    }

    // 2) Fallback: official Open API if the coach configured a key
    const apiKey = await getFaceitApiKey(userId, role)
    if (apiKey) {
      const url = `${FACEIT_API}/players?nickname=${encodeURIComponent(nickname)}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        const cs2 = data.games?.cs2 || data.games?.csgo || {}
        return NextResponse.json({
          faceitId: data.player_id,
          nickname: data.nickname,
          avatar: data.avatar,
          country: data.country || null,
          elo: cs2.faceit_elo ?? data.faceit_elo ?? null,
          skillLevel: cs2.skill_level ?? null,
          source: 'open-api',
        })
      }
    }

    return NextResponse.json(
      { error: `Nie znaleziono gracza Faceit o nicku „${nickname}”` },
      { status: 404 },
    )
  } catch (error) {
    console.error('Faceit integration error:', error)
    return NextResponse.json({ error: 'Błąd integracji Faceit' }, { status: 500 })
  }
}
