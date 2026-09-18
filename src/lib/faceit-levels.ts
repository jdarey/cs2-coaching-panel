// Wspólne progi/kolory poziomów FACEIT (CS2, Faceit 2.0 — stan 2025/2026).
// 1:100-500, 2:501-750, 3:751-900, 4:901-1050, 5:1051-1200,
// 6:1201-1350, 7:1351-1530, 8:1531-1750, 9:1751-2000, 10:2001+
// Dotychczas duplikowane w faceit-elo-chart.tsx i coach-student-detail-client.tsx.

export const FACEIT_LEVEL_COLORS: Record<number, string> = {
  1: '#8a8a8a',
  2: '#4caf50',
  3: '#4caf50',
  4: '#ffeb3b',
  5: '#ffeb3b',
  6: '#ff9800',
  7: '#ff9800',
  8: '#ff5722',
  9: '#f44336',
  10: '#d50000',
}

export function levelFromElo(elo: number | null): number | null {
  if (elo == null) return null
  if (elo <= 500) return 1
  if (elo <= 750) return 2
  if (elo <= 900) return 3
  if (elo <= 1050) return 4
  if (elo <= 1200) return 5
  if (elo <= 1350) return 6
  if (elo <= 1530) return 7
  if (elo <= 1750) return 8
  if (elo <= 2000) return 9
  return 10
}

// Dolna granica bieżącego poziomu i próg wejścia na kolejny.
// Zwraca null gdy elo nieznane albo poziom 10 (maks).
export function nextLevelInfo(
  elo: number | null,
): { level: number; next: number; min: number; need: number; pct: number } | { max: true } | null {
  const lvl = levelFromElo(elo)
  if (elo == null || lvl == null) return null
  if (lvl >= 10) return { max: true }
  const MIN: Record<number, number> = { 1: 100, 2: 501, 3: 751, 4: 901, 5: 1051, 6: 1201, 7: 1351, 8: 1531, 9: 1751 }
  const NEXT: Record<number, number> = { 1: 501, 2: 751, 3: 901, 4: 1051, 5: 1201, 6: 1351, 7: 1531, 8: 1751, 9: 2001 }
  const min = MIN[lvl]
  const next = NEXT[lvl]
  const need = Math.max(0, next - elo)
  const pct = Math.min(100, Math.max(0, ((elo - min) / Math.max(1, next - min)) * 100))
  return { level: lvl, next, min, need, pct }
}

// Klasa Tailwind tła "shielda" poziomu ( ala FUT card) — od szarego (lvl 1)
// po głęboką czerwień (lvl 10). Używane w FaceitCard.
export const FACEIT_LEVEL_GRADIENTS: Record<number, string> = {
  1: 'from-[#4b5563] to-[#1f2937]',
  2: 'from-[#2e7d32] to-[#1b4d1e]',
  3: 'from-[#388e3c] to-[#1b4d1e]',
  4: 'from-[#f9a825] to-[#8a6d1a]',
  5: 'from-[#fbc02d] to-[#8a6d1a]',
  6: 'from-[#fb8c00] to-[#8a4b0f]',
  7: 'from-[#f57c00] to-[#8a4b0f]',
  8: 'from-[#f4511e] to-[#8a2710]',
  9: 'from-[#e53935] to-[#7f1d1d]',
  10: 'from-[#c62828] to-[#5c1010]',
}
