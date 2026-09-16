// Aktywność ucznia — tylko seria dni. Ranga strony i osiągnięcia usunięte,
// został sam streak (używany na dashboardzie). ELO to osobny system (Faceit).

// Consecutive days with activity, counting backwards from today (or yesterday).
// Dni liczone w Europe/Warsaw (serwer działa w UTC — inaczej aktywność
// z niedzieli 23:30 wpadała w poniedziałek i zrywała serię).
const warsawDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function shiftKey(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number)
  // Południe UTC to zawsze ten sam dzień kalendarzowy w Warszawie (niezależnie od DST).
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return warsawDay.format(dt)
}

export function getStreak(activityDates: (string | Date)[]): number {
  if (activityDates.length === 0) return 0
  const days = new Set(activityDates.map((d) => warsawDay.format(new Date(d))))
  let streak = 0
  let cursor = warsawDay.format(new Date())
  // If no activity today, allow a streak that ended yesterday.
  if (!days.has(cursor)) cursor = shiftKey(cursor, -1)
  while (days.has(cursor)) {
    streak++
    cursor = shiftKey(cursor, -1)
  }
  return streak
}
