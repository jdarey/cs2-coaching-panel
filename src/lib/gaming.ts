// Keyless gaming integrations — no API keys required.
//
// Sources (all work without any API key):
//  1. Steam XML profile page  -> resolve vanity URL to steam64 (no key)
//  2. Leetify Public CS API   -> profile with Premier rating, Faceit level,
//                                Faceit ELO, name, avatar, rating stats (no key,
//                                increased rate limits without a developer key)
//  3. Faceit legacy API       -> player ELO + skill level by nickname (no key)
//
// The coach MAY still configure keys in settings (steamApiKey/faceitApiKey) to
// raise rate limits, but they are no longer required for anything to work.

const STEAM_XML = 'https://steamcommunity.com'
const LEETIFY_API = 'https://api-public.cs-prod.leetify.com'
const FACEIT_LEGACY = 'https://api.faceit.com'

export interface ResolvedSteam {
  steamId: string | null
  vanity: string | null
}

export interface LeetifyProfile {
  steamId: string
  name: string | null
  premier: number | null
  faceitLevel: number | null
  faceitElo: number | null
  winrate: number | null
  totalMatches: number | null
  aim: number | null
  positioning: number | null
  utility: number | null
  privacy: string | null
  raw?: Record<string, unknown>
}

export interface FaceitLegacyProfile {
  faceitId: string | null
  nickname: string | null
  avatar: string | null
  country: string | null
  elo: number | null
  skillLevel: number | null
}

// Extract steam64 / vanity from a full profile URL or bare identifier.
// Accepts: https://steamcommunity.com/id/xxx, .../profiles/7656119...,
// a bare vanity name, or a numeric steam64.
export function parseSteamIdentifier(identifier: string): { type: 'vanity' | 'steam64' | null; value: string } {
  const trimmed = identifier.trim()
  if (!trimmed) return { type: null, value: '' }

  const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/)
  if (idMatch) return { type: 'steam64', value: idMatch[1] }

  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/\s?]+)/)
  if (vanityMatch) return { type: 'vanity', value: vanityMatch[1] }

  if (/^\d{17}$/.test(trimmed)) return { type: 'steam64', value: trimmed }

  // bare vanity name
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) return { type: 'vanity', value: trimmed }

  return { type: null, value: trimmed }
}

// Resolve a Steam vanity name to steam64 using the public XML profile page.
// No API key required. Returns null if the vanity doesn't exist or is private.
export async function resolveSteamVanity(vanity: string): Promise<string | null> {
  try {
    const url = `${STEAM_XML}/id/${encodeURIComponent(vanity)}?xml=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CS2-Coaching-Panel/1.0' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const xml = await res.text()
    const match = xml.match(/<steamID64>\s*(\d{17})\s*<\/steamID64>/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// Fetch a profile from Leetify's public API by steam64. No API key required.
// Leetify aggregates Premier rating, Faceit level/ELO, winrate, matches and
// detailed rating stats (aim, positioning, utility) — the richest keyless source.
export async function fetchLeetifyProfile(steamId: string): Promise<LeetifyProfile | null> {
  try {
    const url = `${LEETIFY_API}/v3/profile?steam64_id=${encodeURIComponent(steamId)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.status === 404) return null
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.steam64_id) return null

    const ranks = data.ranks || {}
    const rating = data.rating || {}
    return {
      steamId: data.steam64_id,
      name: data.name || null,
      premier: typeof ranks.premier === 'number' ? ranks.premier : null,
      faceitLevel: typeof ranks.faceit === 'number' ? ranks.faceit : null,
      faceitElo: typeof ranks.faceit_elo === 'number' ? ranks.faceit_elo : null,
      winrate: typeof data.winrate === 'number' ? data.winrate : null,
      totalMatches: typeof data.total_matches === 'number' ? data.total_matches : null,
      aim: typeof rating.aim === 'number' ? rating.aim : null,
      positioning: typeof rating.positioning === 'number' ? rating.positioning : null,
      utility: typeof rating.utility === 'number' ? rating.utility : null,
      privacy: data.privacy_mode || null,
      raw: data,
    }
  } catch {
    return null
  }
}

// Fetch a Faceit player by nickname using the legacy (keyless) endpoint.
export async function fetchFaceitLegacy(nickname: string): Promise<FaceitLegacyProfile | null> {
  try {
    const url = `${FACEIT_LEGACY}/users/v1/nicknames/${encodeURIComponent(nickname)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const payload = data?.payload
    if (!payload || data?.result !== 'OK') return null

    const cs2 = payload.games?.cs2 || payload.games?.csgo || {}
    return {
      faceitId: payload.id || null,
      nickname: payload.nickname || null,
      avatar: payload.avatar || null,
      country: payload.country || null,
      elo: typeof cs2.faceit_elo === 'number' ? cs2.faceit_elo : null,
      skillLevel: typeof cs2.skill_level === 'number' ? cs2.skill_level : null,
    }
  } catch {
    return null
  }
}
