import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchFaceitLegacy } from '@/lib/gaming'
import { getFaceitApiKey } from '@/lib/faceit-key'

export const dynamic = 'force-dynamic'

const FACEIT_API = 'https://open.faceit.com/data/v4'

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

    console.log('[FaceitAPI] Fetching for nickname:', nickname)

    // 1) Keyless legacy endpoint — works without any API key
    const legacy = await fetchFaceitLegacy(nickname)
    console.log('[FaceitAPI] Legacy result:', legacy)
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
