// Aktywność ucznia — tylko seria dni. Ranga strony i osiągnięcia usunięte,
// został sam streak (używany na dashboardzie). ELO to osobny system (Faceit).

// Consecutive days with activity, counting backwards from today (or yesterday).
export function getStreak(activityDates: (string | Date)[]): number {
  if (activityDates.length === 0) return 0
  const days = new Set(activityDates.map((d) => {
    const dt = new Date(d)
    return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`
  }))
  let streak = 0
  const cursor = new Date()
  // If no activity today, allow a streak that ended yesterday.
  if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(key(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function key(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
