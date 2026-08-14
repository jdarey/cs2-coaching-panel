import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const FACEIT_API = 'https://open.faceit.com/data/v4'

/**
 * Tests whether a Faceit Open API key is valid by calling the players
 * endpoint with a known public player. Returns a clear status so the
 * coach knows immediately whether their key works.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    let key: string | null = null
    const body = await request.json().catch(() => null)
    if (body?.key && typeof body.key === 'string' && body.key.trim()) {
      key = body.key.trim()
    } else {
      // Fall back to the saved key
      key = process.env.FACEIT_API_KEY || null
      if (!key && role === 'COACH') {
        const settings = await prisma.coachSettings.findUnique({
          where: { coachId: userId },
          select: { faceitApiKey: true },
        })
        key = settings?.faceitApiKey || null
      } else if (!key) {
        const student = await prisma.user.findUnique({
          where: { id: userId },
          select: { coach: { select: { coachSettings: { select: { faceitApiKey: true } } } } },
        })
        key = (student as any)?.coach?.coachSettings?.faceitApiKey || null
      }
    }

    if (!key) {
      return NextResponse.json(
        { valid: false, error: 'Brak klucza — wpisz klucz w polu powyżej i kliknij „Testuj klucz”' },
        { status: 200 },
      )
    }

    // Validate the key with /games — it requires a valid bearer token and does
    // not depend on any specific player's nickname existing.
    const res = await fetch(`${FACEIT_API}/games`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })

    if (res.status === 200) {
      // Bonus: resolve the coach's own player profile for a nicer message
      let nickname: string | null = null
      let elo: number | null = null
      const playerRes = await fetch(`${FACEIT_API}/players?nickname=${encodeURIComponent('jdareyy')}`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      })
      if (playerRes.status === 200) {
        const data = await playerRes.json()
        nickname = data.nickname || null
        elo = data.games?.cs2?.faceit_elo ?? data.games?.csgo?.faceit_elo ?? null
      }
      return NextResponse.json({ valid: true, nickname, elo })
    }

    // Faceit returns 400 with invalid_token for a bad key, 401/403 as well in some regions
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const body = await res.text().catch(() => '')
      const isTokenError = /invalid_token|unauthorized|not recognised|not recognized/i.test(body)
      return NextResponse.json(
        {
          valid: false,
          error: isTokenError
            ? 'Klucz jest nieprawidłowy — sprawdź, czy kopiujesz cały klucz z developers.faceit.com'
            : `Nieoczekiwana odpowiedź Faceit (${res.status})`,
        },
        { status: 200 },
      )
    }

    if (res.status === 429) {
      return NextResponse.json(
        { valid: false, error: 'Limit zapytań Faceit osiągnięty (429) — spróbuj za chwilę' },
        { status: 200 },
      )
    }

    return NextResponse.json(
      { valid: false, error: `Nieoczekiwana odpowiedź Faceit (${res.status})` },
      { status: 200 },
    )
  } catch (error) {
    console.error('Faceit key test error:', error)
    return NextResponse.json({ valid: false, error: 'Błąd sieci — nie udało się połączyć z Faceit' }, { status: 500 })
  }
}
