// Match-log ownership logic — pure functions so they can be unit tested.
//
// Every synced match stores the steam64 it was synced from (syncedSteamId).
// When a student changes their Steam link, matches that came from a different
// account must disappear from the log, otherwise another player's matches leak
// in. Legacy rows created before this field existed have NULL and are treated
// as unknown — they are purged too so the log can never show stale data from
// an account the student no longer uses.

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
