// Gamification helpers — level/XP, CS2-style ranks, streaks and achievements.
// All pure functions so both server pages and client components can use them.

export interface Rank {
  key: string
  name: string
  tier: number // 0..7
  min: number // minimum completion % for this rank
  color: string
  glow: string
}

// CS2-inspired rank ladder mapped onto training completion %.
export const RANKS: Rank[] = [
  { key: 'bronze', name: 'Nowicjusz', tier: 0, min: 0, color: '#b45309', glow: 'rgba(180,83,9,0.5)' },
  { key: 'silver', name: 'Srebrny', tier: 1, min: 12, color: '#9ca3af', glow: 'rgba(156,163,175,0.5)' },
  { key: 'gold', name: 'Złota Nova', tier: 2, min: 26, color: '#eab308', glow: 'rgba(234,179,8,0.5)' },
  { key: 'mg', name: 'Strażnik', tier: 3, min: 40, color: '#2de5ca', glow: 'rgba(45,229,202,0.5)' },
  { key: 'dg', name: 'Wyróżniony', tier: 4, min: 54, color: '#2fb6a2', glow: 'rgba(47,182,162,0.55)' },
  { key: 'le', name: 'Legendarny', tier: 5, min: 68, color: '#0099ff', glow: 'rgba(0,153,255,0.5)' },
  { key: 'sm', name: 'Najwyższy', tier: 6, min: 82, color: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
  { key: 'ge', name: 'Globalna Elita', tier: 7, min: 94, color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
]

export function getRank(completedPct: number): Rank {
  let current = RANKS[0]
  for (const r of RANKS) {
    if (completedPct >= r.min) current = r
  }
  return current
}

export function nextRank(completedPct: number): Rank | null {
  const current = getRank(completedPct)
  const idx = RANKS.findIndex((r) => r.key === current.key)
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null
}

// Level = every 8 completed units (watched/implemented videos) = 1 level.
export function getLevel(completedCount: number): { level: number; xp: number; xpToNext: number; pct: number } {
  const xpPerLevel = 8
  const level = Math.floor(completedCount / xpPerLevel) + 1
  const xp = completedCount % xpPerLevel
  return { level, xp, xpToNext: xpPerLevel, pct: Math.round((xp / xpPerLevel) * 100) }
}

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

export interface AchievementDef {
  key: string
  name: string
  desc: string
  icon: string // emoji, no extra deps
  earned: boolean
}

export interface GamificationStats {
  total: number
  pending: number
  watching: number
  watched: number
  implemented: number
  sessionsCount: number
  feedbackCount: number
  messagesSent: number
}

export function getAchievements(s: GamificationStats): AchievementDef[] {
  return [
    { key: 'first', name: 'Pierwszy krok', desc: 'Obejrzyj pierwszy film', icon: '🎯', earned: s.watched + s.implemented >= 1 },
    { key: 'five', name: 'W rytmie', desc: 'Obejrzyj 5 filmów', icon: '🔥', earned: s.watched + s.implemented >= 5 },
    { key: 'ten', name: 'Dziesiątka', desc: 'Obejrzyj 10 filmów', icon: '⚡', earned: s.watched + s.implemented >= 10 },
    { key: 'pro', name: 'Progres', desc: 'Wdróż 3 filmy w praktyce', icon: '🏆', earned: s.implemented >= 3 },
    { key: 'session', name: 'Na sesji', desc: 'Weź udział w sesji', icon: '📅', earned: s.sessionsCount >= 1 },
    { key: 'voice', name: 'Głos ucznia', desc: 'Wyślij opinię trenerowi', icon: '💬', earned: s.feedbackCount >= 1 },
    { key: 'talk', name: 'W kontakcie', desc: 'Napisz do trenera', icon: '✉️', earned: s.messagesSent >= 1 },
    { key: 'allin', name: 'Wszystko jasne', desc: 'Zakończ wszystkie filmy', icon: '👑', earned: s.total > 0 && s.pending === 0 && s.watching === 0 },
  ]
}
