import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSteamIdentifier, resolveSteamIdentifier, fetchLeetifyProfile, fetchBestFaceitElo, fetchFaceitLegacy } from '@/lib/gaming'

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
      } else if (parsed.type === 'vanity' || parsed.type === 'short') {
        // Steam profile URL/vanity/short link — resolve to steam64.
        const isFullUrl = /steamcommunity\.com|s\.team/i.test(identifier)
        const resolved = await resolveSteamIdentifier(identifier)
        if (resolved) {
          steamId = resolved
          source = parsed.type === 'short' ? `short:${parsed.value}` : `vanity:${parsed.value}`
        } else if (parsed.type === 'vanity' && !isFullUrl) {
          // A bare name that isn't a resolvable Steam vanity — maybe it's a Faceit nickname
          faceitNick = parsed.value
          source = 'faceit-nickname'
        } else {
          return NextResponse.json(
            {
              ok: false,
              error: `Nie udało się rozpoznać linku Steam „${identifier}”. Sprawdź, czy link prowadzi do Twojego profilu Steam i czy profil nie jest prywatny.`,
            },
            { status: 404 },
          )
        }
      } else {
        // Not a Steam identifier at all — treat as Faceit nickname
        faceitNick = parsed.value
        source = 'faceit-nickname'
      }
    }

    // 1) Steam-based: Leetify gives Premier + rating stats (keyless).
    // Faceit ELO comes from the live Faceit legacy API when the nickname is
    // known or can be discovered; Leetify's cached faceit_elo is a fallback
    // (it can be stale — e.g. reports 4000 for a player now at 3437).
    if (steamId) {
      const leetify = await fetchLeetifyProfile(steamId)
      if (leetify) {
        const best = await fetchBestFaceitElo(steamId, faceitNick)

        // Persist an auto-discovered Faceit nickname on the logged-in user's
        // profile when they check their own Steam account, so future lookups
        // use the saved nickname instead of re-discovering it every time.
        if (best.nickname && best.source === 'faceit') {
          const me = await prisma.user.findUnique({
            where: { id: (session.user as any).id },
            select: { id: true, steamId: true, faceitNickname: true },
          })
          if (me && me.steamId === steamId && me.faceitNickname !== best.nickname) {
            await prisma.user.update({
              where: { id: me.id },
              data: { faceitNickname: best.nickname },
            })
          }
        }

        return NextResponse.json({
          ok: true,
          source: `leetify:${source || 'steam64'}`,
          steamId: leetify.steamId,
          name: leetify.name,
          premier: leetify.premier,
          faceitLevel: best.level ?? leetify.faceitLevel,
          faceitElo: best.elo ?? leetify.faceitElo,
          faceitNickname: best.nickname ?? null,
          faceitSource: best.source,
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
