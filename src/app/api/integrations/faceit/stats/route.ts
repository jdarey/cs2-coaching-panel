import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchFaceitLegacy } from '@/lib/gaming'
import { getFaceitApiKey } from '@/lib/faceit-key'

export const dynamic = 'force-dynamic'

const FACEIT_API = 'https://open.faceit.com/data/v4'

export interface FaceitStatsResult {
  nickname: string | null
  avatar: string | null
  country: string | null
  faceitId: string | null
  elo: number | null
  skillLevel: number | null
  // Lifetime stats — tylko z kluczem Open API (bez klucza null)
  matches: number | null
  wins: number | null
  winrate: number | null
  avgKd: number | null
  avgHs: number | null
  currentWinStreak: number | null
  longestWinStreak: number | null
  avgKills: number | null
  source: string
}

// Pełny profil FACEIT gracza: live ELO/level/avatar (keyless legacy) + lifetime
// statystyki (opcjonalny klucz Open API trenera). Trend ELO karta dostaje osobno
// z /api/ranks (historia w DB) — tu go nie dublujemy.
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

    // ── 1) Keyless legacy: live ELO, level, avatar, country ──────────────
    const legacy = await fetchFaceitLegacy(nickname)
    if (!legacy) {
      return NextResponse.json({ error: `Nie znaleziono gracza Faceit o nicku „${nickname}”` }, { status: 404 })
    }

    const base: FaceitStatsResult = {
      nickname: legacy.nickname || nickname,
      avatar: legacy.avatar,
      country: legacy.country,
      faceitId: legacy.faceitId,
      elo: legacy.elo,
      skillLevel: legacy.skillLevel,
      matches: null,
      wins: null,
      winrate: null,
      avgKd: null,
      avgHs: null,
      currentWinStreak: null,
      longestWinStreak: null,
      avgKills: null,
      source: 'legacy-keyless',
    }

    // ── 2) Open API (opcjonalny klucz): lifetime stats CS2 ───────────────
    const apiKey = await getFaceitApiKey(userId, role)
    if (apiKey && legacy.faceitId) {
      try {
        const res = await fetch(`${FACEIT_API}/players/${legacy.faceitId}/stats?game=cs2`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const st = await res.json()
          const l: Record<string, string> = st?.lifetime ?? {}
          const num = (k: string) => {
            const v = l[k]
            const n = typeof v === 'string' ? parseFloat(v) : NaN
            return Number.isFinite(n) ? n : null
          }
          const m = num('Matches')
          const w = num('Wins')
          base.matches = m
          base.wins = w
          base.winrate = m != null && w != null && m > 0 ? (w / m) * 100 : null
          base.avgKd = num('Average K/D Ratio')
          base.avgHs = num('Average Headshots %')
          base.currentWinStreak = num('Current Win Streak')
          base.longestWinStreak = num('Longest Win Streak')
          base.avgKills = num('Average Kills')
          base.source = 'legacy+open-api'
        }
      } catch {
        // best-effort — zwracamy to, co daje legacy
      }
    }

    return NextResponse.json(base)
  } catch (error) {
    console.error('Faceit stats error:', error)
    return NextResponse.json({ error: 'Błąd integracji Faceit' }, { status: 500 })
  }
}
