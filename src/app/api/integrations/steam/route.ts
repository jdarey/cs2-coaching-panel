import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSteamIdentifier, resolveSteamVanity } from '@/lib/gaming'

export const dynamic = 'force-dynamic'

const STEAM_API = 'https://api.steampowered.com'

// Keyless by default (Steam XML page). Falls back to the coach's Steam Web API
// key when configured — that key also returns the richer profile summary.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { searchParams } = new URL(request.url)
    const identifier = searchParams.get('identifier')?.trim()

    if (!identifier) {
      return NextResponse.json({ error: 'Podaj Steam ID lub vanity URL' }, { status: 400 })
    }

    const parsed = parseSteamIdentifier(identifier)
    if (!parsed.type) {
      return NextResponse.json({ error: 'Nie rozpoznano Steam ID lub vanity URL' }, { status: 400 })
    }

    let steamId = parsed.type === 'steam64' ? parsed.value : null

    // Resolve vanity keyless via Steam XML page
    if (!steamId && parsed.type === 'vanity') {
      steamId = await resolveSteamVanity(parsed.value)
      if (!steamId) {
        return NextResponse.json(
          { error: 'Nie znaleziono profilu Steam o tym vanity URL (lub profil jest prywatny)' },
          { status: 404 },
        )
      }
    }

    // Try the coach's Steam API key for the richer profile (name/avatar). Keyless
    // XML page also exposes steamID64 + personaname, so this is best-effort only.
    let settings: { steamApiKey: string | null } | null = null
    if (role === 'COACH') {
      settings = await prisma.coachSettings.findUnique({
        where: { coachId: userId },
        select: { steamApiKey: true },
      })
    } else {
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: { coach: { select: { coachSettings: { select: { steamApiKey: true } } } } },
      })
      settings = (student as any)?.coach?.coachSettings ?? null
    }

    const apiKey = settings?.steamApiKey || process.env.STEAM_API_KEY || null

    if (apiKey) {
      const url = `${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(apiKey)}&steamids=${steamId}`
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const player = data?.response?.players?.[0]
        if (player) {
          return NextResponse.json({
            steamId,
            name: player.personaname,
            avatar: player.avatarfull || player.avatarmedium || player.avatar,
            profileUrl: player.profileurl,
            country: player.loccountrycode || null,
          })
        }
      }
    }

    // Keyless fallback: steam64 ID itself is enough to identify the profile
    return NextResponse.json({
      steamId,
      name: null,
      avatar: null,
      profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
      country: null,
      keyless: true,
    })
  } catch (error) {
    console.error('Steam integration error:', error)
    return NextResponse.json({ error: 'Błąd integracji Steam' }, { status: 500 })
  }
}
