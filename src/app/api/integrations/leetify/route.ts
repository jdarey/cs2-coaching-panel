import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseSteamIdentifier, resolveSteamVanity, fetchLeetifyProfile, fetchFaceitLegacy } from '@/lib/gaming'

export const dynamic = 'force-dynamic'

// Keyless "everything" endpoint. Accepts any of:
//   ?identifier=...   Steam profile URL, bare vanity, steam64, or Faceit nickname
//   ?steamId=...      explicit steam64
//   ?nickname=...     explicit Faceit nickname
// Returns Premier rating, Faceit level/ELO, name, avatar and rating stats —
// all without any API key (Leetify public API + Steam XML + Faceit legacy).
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const identifier = searchParams.get('identifier')?.trim()
    const steamIdParam = searchParams.get('steamId')?.trim()
    const nicknameParam = searchParams.get('nickname')?.trim()

    if (!identifier && !steamIdParam && !nicknameParam) {
      return NextResponse.json(
        { error: 'Podaj Steam (link / vanity / ID) lub nickname Faceit' },
        { status: 400 },
      )
    }

    let steamId: string | null = steamIdParam || null
    let faceitNick: string | null = nicknameParam || null
    let source = ''

    if (identifier) {
      const parsed = parseSteamIdentifier(identifier)
      if (parsed.type === 'steam64') {
        steamId = parsed.value
        source = 'steam64'
      } else if (parsed.type === 'vanity') {
        const resolved = await resolveSteamVanity(parsed.value)
        if (resolved) {
          steamId = resolved
          source = `vanity:${parsed.value}`
        } else {
          // Maybe it's a Faceit nickname instead
          faceitNick = parsed.value
          source = 'faceit-nickname'
        }
      } else {
        // Not a Steam identifier at all — treat as Faceit nickname
        faceitNick = parsed.value
        source = 'faceit-nickname'
      }
    }

    // 1) Prefer Leetify (steam64 -> Premier + Faceit + stats, keyless)
    if (steamId) {
      const leetify = await fetchLeetifyProfile(steamId)
      if (leetify) {
        return NextResponse.json({
          ok: true,
          source: `leetify:${source || 'steam64'}`,
          steamId: leetify.steamId,
          name: leetify.name,
          premier: leetify.premier,
          faceitLevel: leetify.faceitLevel,
          faceitElo: leetify.faceitElo,
          winrate: leetify.winrate,
          totalMatches: leetify.totalMatches,
          aim: leetify.aim,
          positioning: leetify.positioning,
          utility: leetify.utility,
          privacy: leetify.privacy,
          leetifyProfileUrl: `https://leetify.com/app/profile/${leetify.steamId}`,
        })
      }
      // Leetify has no data (private/not indexed) — fall through to Faceit by steam64? Not available keyless; report gracefully.
      return NextResponse.json(
        {
          ok: false,
          error:
            'Nie znaleziono profilu w Leetify (konto prywatne lub brak danych). Podłącz Steam na leetify.com, albo podaj nickname Faceit.',
          steamId,
        },
        { status: 404 },
      )
    }

    // 2) Fallback: Faceit legacy by nickname (keyless)
    if (faceitNick) {
      const faceit = await fetchFaceitLegacy(faceitNick)
      if (faceit) {
        return NextResponse.json({
          ok: true,
          source: 'faceit-legacy',
          steamId: null,
          name: faceit.nickname,
          avatar: faceit.avatar,
          premier: null,
          faceitLevel: faceit.skillLevel,
          faceitElo: faceit.elo,
          winrate: null,
          totalMatches: null,
          aim: null,
          positioning: null,
          utility: null,
          privacy: null,
          faceitProfileUrl: faceit.faceitId ? `https://www.faceit.com/pl/players/${faceit.nickname}` : null,
        })
      }
      return NextResponse.json(
        { ok: false, error: `Nie znaleziono gracza Faceit o nicku „${faceitNick}”` },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: false, error: 'Nie udało się rozpoznać identyfikatora' }, { status: 400 })
  } catch (error) {
    console.error('Leetify integration error:', error)
    return NextResponse.json({ ok: false, error: 'Błąd integracji zewnętrznej' }, { status: 500 })
  }
}
