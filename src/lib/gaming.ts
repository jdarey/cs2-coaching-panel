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
// Accepts: https://steamcommunity.com/id/xxx, .../user/xxx (new Steam format),
// .../profiles/7656119..., a bare vanity name, or a numeric steam64.
// Steam's short share links (s.team/p/xxx) are detected as type 'short' and
// must be resolved with resolveSteamShortLink() (they don't contain the id).
export function parseSteamIdentifier(identifier: string): { type: 'vanity' | 'steam64' | 'short' | null; value: string } {
  const trimmed = identifier.trim()
  if (!trimmed) return { type: null, value: '' }

  const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/)
  if (idMatch) return { type: 'steam64', value: idMatch[1] }

  // Both /id/ and /user/ are vanity URLs; the XML endpoint works with /id/ for both.
  const vanityMatch = trimmed.match(/steamcommunity\.com\/(?:id|user)\/([^/\s?#]+)/)
  if (vanityMatch) return { type: 'vanity', value: vanityMatch[1] }

  // Steam short share link: https://s.team/p/xxxxxxxx (or without protocol)
  if (/^(?:https?:\/\/)?s\.team\/p\/[a-zA-Z0-9_-]+/i.test(trimmed)) {
    const shortMatch = trimmed.match(/s\.team\/p\/([a-zA-Z0-9_-]+)/i)
    return { type: 'short', value: shortMatch ? shortMatch[1] : trimmed }
  }

  if (/^\d{17}$/.test(trimmed)) return { type: 'steam64', value: trimmed }

  // bare vanity name
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) return { type: 'vanity', value: trimmed }

  return { type: null, value: trimmed }
}

// Resolve a Steam short share link (s.team/p/xxx) to a numeric steam64 by
// following the redirect chain (Steam redirects to the full profile URL).
// Returns null if it can't be resolved. No API key required.
export async function resolveSteamShortLink(shortCode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://s.team/p/${encodeURIComponent(shortCode)}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'CS2-Coaching-Panel/1.0' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const finalUrl = res.url || ''
    const steam64 = finalUrl.match(/profiles\/(\d{17})/)
    if (steam64) return steam64[1]
    const vanity = finalUrl.match(/(?:id|user)\/([^/\s?#]+)/)
    if (vanity) return resolveSteamVanity(vanity[1])
    return null
  } catch {
    return null
  }
}

// Resolve any Steam identifier (URL / vanity / short link / steam64) to a
// numeric steam64 ID. Returns null when the identifier isn't a Steam profile
// or couldn't be resolved.
export async function resolveSteamIdentifier(identifier: string): Promise<string | null> {
  const parsed = parseSteamIdentifier(identifier)
  if (parsed.type === 'steam64') return parsed.value
  if (parsed.type === 'vanity') return resolveSteamVanity(parsed.value)
  if (parsed.type === 'short') return resolveSteamShortLink(parsed.value)
  return null
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

export interface LeetifyMatch {
  externalId: string
  dataSource: string | null // 'faceit' | 'matchmaking' | 'matchmaking_competitive' | ...
  map: string
  outcome: 'WIN' | 'LOSS' | 'DRAW'
  score: [number, number] | null
  leetifyRating: number | null
  preaim: number | null
  reactionTimeMs: number | null
  accuracyEnemySpotted: number | null
  accuracyHead: number | null
  sprayAccuracy: number | null
  finishedAt: string
}

// Normalize a CS2 map id to its display name (de_dust2 -> Dust2, de_boulder -> Boulder).
export function normalizeMapName(raw: string): string {
  const name = raw.replace(/^de_/, '').trim()
  if (!name) return raw
  // two-part names like mirage, dust2, inferno -> capitalised
  return name
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join('')
}

// Fetch the player's recent matches from Leetify's public API (keyless) by
// steam64. Leetify aggregates ALL matchmaking — including Faceit — with per
// match stats (preaim, reaction, accuracy, score). Faceit matches are
// preferred; when fewer than `limit` exist, other matchmaking fills the rest.
export async function fetchLeetifyRecentMatches(steamId: string, limit = 5): Promise<LeetifyMatch[]> {
  try {
    const url = `${LEETIFY_API}/v3/profile?steam64_id=${encodeURIComponent(steamId)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    const games: any[] = Array.isArray(data?.recent_matches) ? data.recent_matches : []

    const mapMatch = (g: any): LeetifyMatch => ({
      externalId: g.id || `${g.finished_at}-${g.map_name}`,
      dataSource: g.data_source || null,
      map: normalizeMapName(g.map_name || 'Inna'),
      outcome: g.outcome === 'win' ? 'WIN' : g.outcome === 'loss' ? 'LOSS' : 'DRAW',
      score: Array.isArray(g.score) && g.score.length === 2 ? [g.score[0], g.score[1]] : null,
      leetifyRating: typeof g.leetify_rating === 'number' ? g.leetify_rating : null,
      preaim: typeof g.preaim === 'number' ? g.preaim : null,
      reactionTimeMs: typeof g.reaction_time_ms === 'number' ? g.reaction_time_ms : null,
      accuracyEnemySpotted: typeof g.accuracy_enemy_spotted === 'number' ? g.accuracy_enemy_spotted : null,
      accuracyHead: typeof g.accuracy_head === 'number' ? g.accuracy_head : null,
      sprayAccuracy: typeof g.spray_accuracy === 'number' ? g.spray_accuracy : null,
      finishedAt: g.finished_at || new Date().toISOString(),
    })

    const all = games.map(mapMatch)
    // Faceit first, then fill with other matchmaking if needed
    const faceitMatches = all.filter((_, i) => games[i]?.data_source === 'faceit')
    if (faceitMatches.length >= limit) return faceitMatches.slice(0, limit)
    const others = all.filter((_, i) => games[i]?.data_source !== 'faceit')
    return [...faceitMatches, ...others].slice(0, limit)
  } catch {
    return []
  }
}

export interface LeetifyMatchDetails {
  matchId: string
  dataSource: string | null
  dataSourceMatchId: string | null // Faceit match id / Premier share code
  finishedAt: string
  map: string
  teamScores: { teamNumber: number; score: number }[]
  players: {
    steam64Id: string
    name: string | null
    team: number | null
    kills: number | null
    deaths: number | null
    assists: number | null
    kdRatio: number | null
    hsPercent: number | null
    adr: number | null
    dpr: number | null
    rating: number | null
    mvps: number | null
    leetifyRating: number | null
    score: number | null
    [key: string]: unknown
  }[]
}

// Fetch full per-player match details from Leetify's public API (keyless).
// Endpoint: GET /v2/matches/{gameId} — returns rich per-player stats (kills,
// deaths, HS%, ADR, DPR, utility, counter-strafing, trades, multi-kills…).
export async function fetchLeetifyMatchDetails(gameId: string): Promise<LeetifyMatchDetails | null> {
  try {
    const url = `${LEETIFY_API}/v2/matches/${encodeURIComponent(gameId)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.id) return null

    const players = (Array.isArray(data.stats) ? data.stats : []).map((s: any) => ({
      steam64Id: s.steam64_id || null,
      name: s.name || null,
      team: typeof s.initial_team_number === 'number' ? s.initial_team_number : null,
      kills: typeof s.total_kills === 'number' ? s.total_kills : null,
      deaths: typeof s.total_deaths === 'number' ? s.total_deaths : null,
      assists: typeof s.total_assists === 'number' ? s.total_assists : null,
      kdRatio: typeof s.kd_ratio === 'number' ? s.kd_ratio : null,
      hsPercent: typeof s.accuracy_head === 'number' ? s.accuracy_head * 100 : null,
      adr: typeof s.total_damage === 'number' && typeof s.rounds_count === 'number' && s.rounds_count > 0 ? s.total_damage / s.rounds_count : null,
      dpr: typeof s.dpr === 'number' ? s.dpr : null,
      rating: typeof s.leetify_rating === 'number' ? s.leetify_rating : null,
      mvps: typeof s.mvps === 'number' ? s.mvps : null,
      leetifyRating: typeof s.leetify_rating === 'number' ? s.leetify_rating : null,
      score: typeof s.score === 'number' ? s.score : null,
      ...s,
    }))

    return {
      matchId: data.id,
      dataSource: data.data_source || null,
      dataSourceMatchId: data.data_source_match_id || null,
      finishedAt: data.finished_at || '',
      map: normalizeMapName(data.map_name || 'Inna'),
      teamScores: Array.isArray(data.team_scores)
        ? data.team_scores.map((t: any) => ({ teamNumber: t.team_number, score: t.score }))
        : [],
      players,
    }
  } catch {
    return null
  }
}

// Discover a player's Faceit nickname from their Leetify match history. Leetify
// indexes Faceit matches and stores each player's in-game Faceit name — the
// Steam nickname often differs (e.g. 'jdarey' vs 'jdareyy'). This lets us
// query the live Faceit legacy API (accurate ELO) even when the user never
// entered their Faceit nickname.
export async function resolveFaceitNickname(steamId: string): Promise<string | null> {
  try {
    const url = `${LEETIFY_API}/v3/profile?steam64_id=${encodeURIComponent(steamId)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const games: any[] = Array.isArray(data?.recent_matches) ? data.recent_matches : []
    const faceitMatch = games.find((g) => g?.data_source === 'faceit')
    if (!faceitMatch?.id) return null

    const detail = await fetchLeetifyMatchDetails(faceitMatch.id)
    if (!detail) return null
    const me = detail.players.find((p) => p.steam64Id === steamId)
    return me?.name || null
  } catch {
    return null
  }
}

// Best-effort Faceit ELO lookup, keyless:
//  1. Live Faceit legacy by nickname (saved nickname, or one discovered from
//     the player's Leetify match history — Steam nick != Faceit nick often).
//  2. Leetify as fallback (can be stale, e.g. ZywOo: 4000 vs live 3437).
// Returns the live ELO/level and the nickname that was used (if any).
export async function fetchBestFaceitElo(
  steamId: string | null,
  savedNickname: string | null,
): Promise<{ elo: number | null; level: number | null; nickname: string | null; source: 'faceit' | 'leetify' | null }> {
  // 1) Live Faceit — saved nickname first, otherwise auto-discover it
  let nickname = savedNickname
  if (!nickname && steamId) {
    nickname = await resolveFaceitNickname(steamId)
  }
  if (nickname) {
    const legacy = await fetchFaceitLegacy(nickname)
    if (legacy && legacy.elo != null) {
      return { elo: legacy.elo, level: legacy.skillLevel, nickname: legacy.nickname || nickname, source: 'faceit' }
    }
  }
  // 2) Leetify fallback (stale but better than nothing)
  if (steamId) {
    const leetify = await fetchLeetifyProfile(steamId)
    if (leetify) {
      return {
        elo: leetify.faceitElo,
        level: leetify.faceitLevel,
        nickname,
        source: 'leetify',
      }
    }
  }
  return { elo: null, level: null, nickname, source: null }
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
