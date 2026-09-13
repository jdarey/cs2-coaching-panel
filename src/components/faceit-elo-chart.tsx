'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Loader2, ExternalLink, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

function FaceitIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.999 2.705a.167.167 0 00-.312-.1 1141.27 1141.27 0 00-6.053 9.375H.218c-.221 0-.301.282-.11.352 7.227 2.73 17.667 6.836 23.5 9.134.15.06.39-.08.39-.18z" />
    </svg>
  )
}

interface RankEntry {
  id: string
  mode: string
  rank: string
  elo: number | null
  source: string | null
  recordedAt: string
}

const FACEIT_LEVEL_COLORS: Record<number, string> = {
  1: '#8a8a8a', 2: '#4caf50', 3: '#4caf50', 4: '#ffeb3b', 5: '#ffeb3b',
  6: '#ff9800', 7: '#ff9800', 8: '#ff5722', 9: '#f44336', 10: '#d50000',
}

// Progi CS2 aktualne 2025 (Faceit 2.0): 1:100-500, 2:501-750, 3:751-900, 4:901-1050, 5:1051-1200, 6:1201-1350, 7:1351-1530, 8:1531-1750, 9:1751-2000, 10:2001+
function levelFromElo(elo: number | null): number | null {
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

export function FaceitEloChart({ studentId, faceitNickname, faceitElo, faceitLevel, compact = false }: {
  studentId?: string
  faceitNickname?: string | null
  faceitElo?: number | null
  faceitLevel?: number | null
  compact?: boolean
}) {
  const [entries, setEntries] = useState<RankEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRanks = () => {
      const url = studentId ? `/api/ranks?studentId=${studentId}` : '/api/ranks'
      fetch(url)
        .then(r => r.ok ? r.json() : [])
        .then((data: RankEntry[]) => {
          const faceitOnly = (Array.isArray(data) ? data : []).filter(e => e.mode === 'FACEIT' && e.elo != null)
          setEntries(faceitOnly.sort((a,b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()))
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
    fetchRanks()
    const id = setInterval(fetchRanks, 30_000)
    return () => clearInterval(id)
  }, [studentId])

  const currentElo = faceitElo ?? (entries.length ? entries[entries.length - 1].elo : null)
  const currentLevel = faceitLevel ?? levelFromElo(currentElo) ?? (entries.length ? levelFromElo(entries[entries.length - 1].elo) : null)
  const prevElo = entries.length >= 2 ? entries[entries.length - 2].elo : null
  const delta = currentElo != null && prevElo != null ? currentElo - prevElo : null

  // Fallback to widget iframe if we have nickname but no history yet — widget shows live stats without needing history
  const widgetUrl = faceitNickname ? `https://widget.mxgic1337.xyz/widget?username=${encodeURIComponent(faceitNickname)}&stats=1&history=1&lang=pl` : null

  if (!faceitNickname && entries.length === 0 && !loading) {
    return (
      <div className="glass-card rounded-3xl p-6 text-center">
        <Trophy className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/60">Brak Faceit — dodaj nick w Ustawieniach → Gry i konta</p>
        <p className="text-xs text-white/30 mt-1">Wykres pojawi się po pierwszej zapisanej randze</p>
      </div>
    )
  }

  return (
    <div className={cn('glass-card rounded-3xl overflow-hidden relative', compact ? 'p-4' : 'p-6')}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#ff5500] ring-1 ring-white/15">
            <FaceitIcon className="w-5 h-5 text-white" />
          </span>
          <div>
            <h3 className="font-display font-bold text-white flex items-center gap-2">
              Faceit ELO
              {faceitNickname && <span className="text-xs font-normal text-white/40">· {faceitNickname}</span>}
            </h3>
          </div>
        </div>
        {faceitNickname && (
          <a href={`https://www.faceit.com/pl/players/${encodeURIComponent(faceitNickname)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white">
            <ExternalLink className="w-3 h-3" /> Faceit
          </a>
        )}
      </div>

      {/* Header stats - jak w premier widget */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">ELO</p>
          <p className="font-display text-xl font-bold" style={{ color: currentLevel ? FACEIT_LEVEL_COLORS[currentLevel] : '#fff' }}>
            {currentElo ?? '—'}
          </p>
          {delta != null && (
            <p className={cn('text-[11px] font-semibold', delta >= 0 ? 'text-emerald-300' : 'text-red-300')}>
              {delta > 0 ? `+${delta}` : `${delta}`} {delta !== 0 && (delta > 0 ? '▲' : '▼')}
            </p>
          )}
        </div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Poziom</p>
          <p className="font-display text-xl font-bold text-white">{currentLevel ?? '—'}</p>
          <p className="text-[11px] text-white/30">/10</p>
        </div>
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Wpisów</p>
          <p className="font-display text-xl font-bold text-white">{entries.length}</p>
          <p className="text-[11px] text-white/30">historii</p>
        </div>
      </div>

      {/* Wykres - jak w pkawai/mxgic */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-white/30"><Loader2 className="w-5 h-5 animate-spin mr-2" />Ładowanie…</div>
      ) : entries.length >= 2 ? (
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-2">Trend ELO — ostatnie {Math.min(entries.length, 12)} wpisów</p>
          <div className="h-28 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3 flex items-end gap-1 overflow-hidden">
            {(() => {
              const slice = entries.slice(-12)
              const min = Math.min(...slice.map(e => e.elo!))
              const max = Math.max(...slice.map(e => e.elo!))
              const range = Math.max(1, max - min)
              const maxVal = Math.max(...slice.map(e => e.elo!))
              const minVal = Math.min(...slice.map(e => e.elo!))
              return slice.map((e) => {
                const h = 16 + ((e.elo! - min) / range) * 72
                const lvl = levelFromElo(e.elo)
                const col = lvl ? FACEIT_LEVEL_COLORS[lvl] : '#ff5500'
                const isMax = e.elo === maxVal
                const isMin = e.elo === minVal
                return (
                  <div key={e.id} className="flex-1 flex flex-col items-center gap-1 group/bar">
                    <span className="text-[8px] text-white/0 group-hover/bar:text-white/60 transition-colors truncate max-w-full">{e.elo}</span>
                    <div className="w-full rounded-t-md transition-all duration-500 relative" style={{ height: `${h}%`, minHeight: 8, background: `linear-gradient(to top, ${col}dd, ${col})`, boxShadow: isMax ? `0 0 8px ${col}66` : undefined, opacity: isMin ? 0.7 : 1 }} />
                    <span className="text-[7px] text-white/20">{new Date(e.recordedAt).toLocaleDateString('pl-PL', { month: '2-digit', day: '2-digit' })}</span>
                  </div>
                )
              })
            })()}
          </div>
          <p className="text-[10px] text-white/25 mt-1 text-center">Najedź na słupek aby zobaczyć ELO · kolor = poziom Faceit</p>
        </div>
      ) : entries.length === 1 ? (
        <div className="mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
          <p className="text-xs text-amber-200">Jeden wpis — zagraj i zapisz kolejny aby zobaczyć trend</p>
        </div>
      ) : (
        <div className="mb-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 text-center">
          <TrendingUp className="w-6 h-6 text-white/20 mx-auto mb-1" />
          <p className="text-xs text-white/40">Brak historii — kliknij <b className="text-white/60">Pobierz Premier + Faceit</b> w rankingu aby zacząć</p>
        </div>
      )}

      {/* Hosted widget - bez opisu, tylko iframe */}
      {faceitNickname && (
        <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <iframe
            src={widgetUrl!}
            title={`Faceit widget ${faceitNickname}`}
            className="w-full h-[98px] bg-transparent"
            style={{ border: 0, background: 'transparent' }}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </div>
  )
}
