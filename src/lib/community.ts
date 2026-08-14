// Shared community helpers: daily practice streaks and weekly minutes.

export function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/**
 * Count consecutive days with practice, ending today (or yesterday if today
 * has none yet — the streak is not broken until a full day passes without
 * training).
 */
export function computeStreak(practiceDates: Date[]): number {
  if (practiceDates.length === 0) return 0
  const days = new Set(practiceDates.map((d) => startOfDay(d).getTime()))
  const today = startOfDay(new Date()).getTime()
  const dayMs = 24 * 60 * 60 * 1000

  let cursor = days.has(today) ? today : today - dayMs
  if (!days.has(cursor)) return 0

  let streak = 0
  while (days.has(cursor)) {
    streak += 1
    cursor -= dayMs
  }
  return streak
}

/** Total practice minutes within the last `days` days. */
export function weeklyMinutes(dates: Date[], days = 7): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return dates.filter((d) => d.getTime() >= cutoff).length
}
