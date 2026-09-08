// Match-log ownership logic — pure functions so they can be unit tested.
//
// Every synced match stores the steam64 it was synced from (syncedSteamId).
// When a student changes their Steam link, matches that came from a different
// account must disappear from the log, otherwise another player's matches leak
// in. Legacy rows created before this field existed have NULL and are treated
// as unknown — they are purged too so the log can never show stale data from
// an account the student no longer uses.

import { prisma } from '@/lib/prisma'
import {
  fetchLeetifyProfile,
  fetchLeetifyRecentMatches,
  fetchFaceitRecentMatches,
  resolveStudentSteamId,
  resolveFaceitNickname,
  type LeetifyMatch,
} from '@/lib/gaming'
import { analyzeMatch, matchVerdict, recordSkillSnapshot, toPercent, type LeetifyProfileLike } from '@/lib/ai-coach'

/** True when a stored match must be removed because it wasn't synced from the current Steam account. */
export function shouldPurgeMatch(
  syncedSteamId: string | null | undefined,
  currentSteamId: string,
): boolean {
  // Untagged legacy rows are unknown — purge to be safe.
  if (!syncedSteamId) return true
  return syncedSteamId !== currentSteamId
}

/**
 * Prisma `where` clause that matches every match belonging to `studentId`
 * which must be purged when syncing from `currentSteamId`.
 *
 * Note: Prisma's `not` does NOT match NULL, so legacy untagged rows must be
 * matched with an explicit `syncedSteamId: null` branch.
 */
export function purgeMatchesWhere(studentId: string, currentSteamId: string) {
  return {
    studentId,
    OR: [{ syncedSteamId: null }, { syncedSteamId: { not: currentSteamId } }],
  }
}

// ---------------------------------------------------------------------------
// Shared per-student Faceit match sync (used by POST /api/matches/sync and by
// the weekly cron /api/cron/matches-sync — one code path, no drift).
// ---------------------------------------------------------------------------

export interface StudentMatchSyncResult {
  studentId: string
  name: string | null
  ok: boolean
  error?: string
  created: number
  skipped: number
  purged: number
  /** Stale fallback rows removed after a successful Faceit sync. */
  trimmed?: number
  profile?: { name: string | null; totalMatches: number | null; winrate: number | null }
  verdicts?: { id: string; map: string; result: string; verdict: string }[]
  createdMatches?: any[]
  /** Where the matches actually came from — drives the honesty banner in the UI. */
  source?: 'FACEIT_API' | 'LEETIFY' | null
  /** Whether a Faceit API key is configured anywhere (env or coach settings). */
  faceitKeyConfigured?: boolean
}

export async function syncStudentMatches(studentId: string): Promise<StudentMatchSyncResult> {
  const base = { studentId, created: 0, skipped: 0, purged: 0 }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, steamId: true, steamVanity: true, faceitNickname: true, coachId: true },
  })
  if (!student) {
    return { ...base, name: null, ok: false, error: 'Nie znaleziono ucznia' }
  }

  // Steam identifier is used for the Leetify AI profile / fallback. Faceit
  // matches themselves come from the official Faceit API (Leetify only indexes
  // demos users manually upload, so it is NOT a reliable source for matches).
  const steamId = await resolveStudentSteamId(
    { steamId: student.steamId ?? null, steamVanity: student.steamVanity ?? null },
    async (resolved) => {
      await prisma.user.update({ where: { id: studentId }, data: { steamId: resolved } })
    },
  )

  // Best-effort Leetify profile — feeds the AI verdicts (season averages).
  // Missing profile does NOT block the match sync anymore.
  const aiProfile: LeetifyProfileLike = { aim: null, positioning: null, utility: null, clutch: null, opening: null, stats: {} }
  let profileName: string | null = null
  let totalMatches: number | null = null
  let winrate: number | null = null
  if (steamId) {
    const profile = await fetchLeetifyProfile(steamId)
    if (profile?.raw) {
      const raw = profile.raw as any
      aiProfile.aim = typeof raw.rating?.aim === 'number' ? raw.rating.aim : null
      aiProfile.positioning = typeof raw.rating?.positioning === 'number' ? raw.rating.positioning : null
      aiProfile.utility = typeof raw.rating?.utility === 'number' ? raw.rating.utility : null
      aiProfile.clutch = typeof raw.rating?.clutch === 'number' ? raw.rating.clutch : null
      aiProfile.opening = typeof raw.rating?.opening === 'number' ? raw.rating.opening : null
      aiProfile.stats = (raw.stats || {}) as Record<string, number>
      profileName = raw.name || null
      totalMatches = raw.total_matches ?? null
      winrate = toPercent(raw.winrate ?? null)
    }
  }
  await recordSkillSnapshot(studentId, aiProfile)

  // ---- Source 1: official Faceit API (primary) -----------------------------
  // Needs a Faceit nickname (or Steam to discover it) + an API key
  // (env FACEIT_API_KEY or the coach's CoachSettings.faceitApiKey).
  let faceitKey: string | null = null
  if (process.env.FACEIT_API_KEY) {
    faceitKey = process.env.FACEIT_API_KEY
  } else if (student.coachId) {
    const settings = await prisma.coachSettings.findUnique({
      where: { coachId: student.coachId },
      select: { faceitApiKey: true },
    })
    faceitKey = settings?.faceitApiKey || null
  }

  let matches: LeetifyMatch[] = []
  let sourceUsed: 'FACEIT_API' | 'LEETIFY' | null = null
  if (faceitKey) {
    let nickname = student.faceitNickname
    if (!nickname && steamId) {
      nickname = await resolveFaceitNickname(steamId)
    }
    if (nickname) {
      matches = await fetchFaceitRecentMatches(nickname, faceitKey, 5)
      if (matches.length > 0) sourceUsed = 'FACEIT_API'
    }
  }

  // ---- Source 2: Leetify (fallback only) -----------------------------------
  // Leetify only indexes matches the user manually uploaded (Faceit demos are
  // now paid), so this fallback is INHERENTLY incomplete — the UI must say so.
  if (matches.length === 0 && steamId) {
    matches = await fetchLeetifyRecentMatches(steamId, 5)
    if (matches.length > 0) sourceUsed = 'LEETIFY'
  }

  if (matches.length === 0) {
    const hint = !faceitKey
      ? 'Brak klucza API Faceit — dodaj go w Ustawieniach coacha (lub zmienną FACEIT_API_KEY), a uczniom uzupełnij nick Faceit.'
      : 'Nie znaleziono meczów Faceit dla tego nicku. Sprawdź, czy nick jest poprawny i czy gracz gra w CS2.'
    return { ...base, name: student.name, ok: false, error: hint, source: null, faceitKeyConfigured: Boolean(faceitKey) }
  }

  // Purge matches synced from a DIFFERENT Steam account (or untagged legacy
  // rows), so a student who changed their Steam link never keeps another
  // player's matches in the log. Only meaningful when we know the Steam id.
  let purgedCount = 0
  if (steamId) {
    const purged = await prisma.matchLog.deleteMany({ where: purgeMatchesWhere(studentId, steamId) })
    purgedCount = purged.count
  }

  let created = 0
  let skipped = 0
  const createdMatches: any[] = []
  const verdicts: { id: string; map: string; result: string; verdict: string }[] = []
  for (const m of matches) {
    // Dedupe per student: the same Faceit lobby appears in the history of
    // every participant, so a globally-unique externalId must be scoped to
    // this student's log.
    // Dedupe on BOTH ids: the same Faceit match may already exist in the log
    // with a Leetify externalId (synced before the Faceit key) but the same
    // platformMatchId — without this we'd create a visible duplicate.
    const existing = await prisma.matchLog.findFirst({
      where: {
        studentId,
        OR: [{ externalId: m.externalId }, { platformMatchId: m.platformMatchId }],
      },
      select: { id: true },
    })
    if (existing) {
      // Upgrade the old row to the accurate Faceit data (kills/deaths/date)
      // instead of skipping it — keeps the log exact now that we have the key.
      await prisma.matchLog.updateMany({
        where: { id: existing.id },
        data: {
          kills: m.kills ?? undefined,
          deaths: m.deaths ?? undefined,
          createdAt: new Date(m.finishedAt),
          syncSource: sourceUsed ?? undefined,
        },
      })
      skipped++
      continue
    }
    const isFaceit = m.dataSource === 'faceit'
    const row = await prisma.matchLog.create({
      data: {
        studentId,
        map: m.map,
        result: m.outcome,
        eloChange: 0,
        kills: m.kills,
        deaths: m.deaths,
        reflection: analyzeMatch(aiProfile, m),
        source: isFaceit ? 'FACEIT' : 'PREMIER',
        externalId: m.externalId,
        platformMatchId: m.platformMatchId,
        syncedSteamId: steamId ?? null,
        syncSource: sourceUsed ?? undefined,
        createdAt: new Date(m.finishedAt),
        leetifyRating: m.leetifyRating,
        preaim: m.preaim,
        reactionMs: m.reactionTimeMs,
        accuracyEnemySpotted: m.accuracyEnemySpotted,
        accuracyHead: m.accuracyHead,
        sprayAccuracy: m.sprayAccuracy,
      },
    })
    created++
    createdMatches.push({ ...row, createdAt: row.createdAt.toISOString() })
    verdicts.push({
      id: row.id,
      map: row.map,
      result: row.result,
      verdict: matchVerdict(aiProfile, m),
    })
  }

  // Keep the log exact: when we have the real Faceit history, trim stale
  // fallback rows (Leetify) that are outside the last-5 window, so the log
  // shows exactly the 5 most recent Faceit matches — never a mix of sources.
  let trimmed = 0
  if (sourceUsed === 'FACEIT_API' && matches.length > 0) {
    const keepIds = matches.map((m) => m.externalId)
    const stale = await prisma.matchLog.findMany({
      where: {
        studentId,
        OR: [{ syncSource: null }, { syncSource: 'LEETIFY' }],
        externalId: { notIn: keepIds },
      },
      select: { id: true },
    })
    if (stale.length > 0) {
      const del = await prisma.matchLog.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } })
      trimmed = del.count
    }
  }

  return {
    ...base,
    name: student.name,
    ok: true,
    created,
    skipped,
    purged: purgedCount,
    trimmed,
    profile: { name: profileName, totalMatches, winrate },
    verdicts,
    createdMatches,
    source: sourceUsed,
    faceitKeyConfigured: Boolean(faceitKey),
  }
}
