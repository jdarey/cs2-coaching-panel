'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy, Flame, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaderRow {
  id: string
  name: string
  avatarUrl: string | null
  minutes: number
  streak: number
  rank: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardWidget({ variant }: { variant: 'student' | 'coach' }) {
  const [rows, setRows] = useState<LeaderRow[]>([])
  const [me, setMe] = useState<LeaderRow | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/community/leaderboard')
      if (res.ok) {
        const data = await res.json()
        setRows(data.leaderboard ?? [])
        setMe(data.me ?? null)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const podium = rows.slice(0, 3)
  const rest = variant === 'coach' ? rows.slice(3, 8) : []

  return (
    <div className="glass-card rise-in relative rounded-3xl p-6 overflow-hidden">
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#fbbf24]/10 blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-1 ring-white/20">
            <Trophy className="w-4 h-4 text-white" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Ranking tygodnia</h2>
            <p className="text-[11px] text-white/40">Minuty praktyki · 7 dni</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-white/40">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ładowanie…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">
            Brak danych — pierwsze minuty praktyki zaczną budować ranking.
          </p>
        ) : (
          <>
            <div className="space-y-2.5">
              {podium.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 border transition-all',
                    r.rank === 1
                      ? 'bg-gradient-to-r from-[#fbbf24]/[0.12] to-transparent border-[#fbbf24]/30'
                      : 'bg-white/[0.03] border-white/[0.06]',
                  )}
                >
                  <span className="w-7 text-center text-lg shrink-0">{MEDALS[r.rank - 1]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{r.name}</p>
                    {r.streak > 1 && (
                      <p className="text-[11px] text-[#fbbf24]/80 flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {r.streak} dni z rzędu
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-[#fbbf24] shrink-0">{r.minutes} min</span>
                </div>
              ))}
            </div>

            {variant === 'student' && me && me.rank > 3 && (
              <div className="mt-3 rounded-2xl px-4 py-3 bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                <span className="text-sm text-white/70 font-medium truncate">Ty</span>
                <span className="text-sm font-bold tabular-nums text-[#fbbf24]">
                  #{me.rank} · {me.minutes} min
                </span>
              </div>
            )}

            {variant === 'coach' && rest.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2">
                {rest.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-7 text-center text-xs font-bold text-white/35 shrink-0">#{r.rank}</span>
                    <p className="min-w-0 flex-1 text-sm text-white/75 truncate">{r.name}</p>
                    <span className="text-xs font-semibold tabular-nums text-white/55 shrink-0">{r.minutes} min</span>
                  </div>
                ))}
              </div>
            )}

            {variant === 'student' && me && (
              <p className="mt-4 text-center text-[11px] text-white/40">
                Więcej minut niż w zeszłym tygodniu? Nie przerywaj serii! 🔥
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
