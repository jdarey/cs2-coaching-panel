'use client'

import { useEffect, useState, useCallback } from 'react'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn, formatDate, spotlightHandler } from '@/lib/utils'
import { Trophy, Loader2, TrendingUp, Trash2, BarChart3 } from 'lucide-react'
import { FaceitEloChart } from '@/components/faceit-elo-chart'

interface RankEntry {
  id: string
  mode: string
  rank: string
  elo: number | null
  source: string | null
  note: string | null
  recordedAt: string
}

const SOURCE_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  FACEIT_LIVE: { label: 'Faceit na żywo', color: '#ff9a5c', dot: '#ff5500' },
  LEETIFY: { label: 'Leetify', color: '#a78bfa', dot: '#8b5cf6' },
  MANUAL: { label: 'Ręcznie', color: '#94a3b8', dot: '#64748b' },
}

export function StudentRankClient() {
  const [loading, setLoading] = useState(true)
  const [rankEntries, setRankEntries] = useState<RankEntry[]>([])
  const [steamProfile, setSteamProfile] = useState<{ name: string; avatar: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const rRes = await fetch('/api/ranks')
      const r = rRes.ok ? await rRes.json() : []
      setRankEntries(r ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteRank = async (id: string) => {
    try {
      await fetch(`/api/ranks/${id}`, { method: 'DELETE' })
      setRankEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
  }, [load])

  // Auto-zapis z wykresu (live Faceit): odśwież listę bez przeładowania strony
  useEffect(() => {
    const onUpdate = () => load()
    window.addEventListener('ranks:updated', onUpdate)
    return () => window.removeEventListener('ranks:updated', onUpdate)
  }, [load])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center text-white/40">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Ładowanie rangi…
      </div>
    )
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
        <PageHeader
          icon={Trophy}
          label="Twoja kariera"
          title="Moja ranga"
          subtitle="Każdy obejrzany i wdrożony film przybliża Cię do kolejnej rangi. Jak w grze — ale na serio."
        />

        {/* Faceit ELO */}
        <div className="mb-10">
          <FaceitEloChart />
        </div>

        {/* Rank tracking — real in-game rank / ELO over time */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="section-pill"><TrendingUp className="w-3.5 h-3.5" /> Twoja ranga w grze</span>
          </div>
          <div className="glass-card border-glow rounded-3xl p-6 md:p-7 relative overflow-hidden">
            {/* Chart + history */}
            <div className="flex-1 min-w-0">
              {rankEntries.length >= 2 && rankEntries.some((e) => e.elo != null) ? (
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-widest text-white/40 font-semibold mb-3">Trend ELO</p>
                  <div className="h-32 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 flex items-end gap-1.5">
                    {(() => {
                      const withElo = rankEntries.filter((e) => e.elo != null)
                      const min = Math.min(...withElo.map((e) => e.elo!))
                      const max = Math.max(...withElo.map((e) => e.elo!))
                      const range = Math.max(1, max - min)
                      return withElo.map((e) => (
                        <div key={e.id} className="flex-1 flex flex-col items-center gap-1 group/bar">
                          <span className="text-[9px] text-white/40 opacity-0 group-hover/bar:opacity-100 transition-opacity">{e.elo}</span>
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-[#8b5cf6] to-[#a78bfa] transition-all duration-500"
                            style={{ height: `${18 + ((e.elo! - min) / range) * 82}%`, minHeight: 12 }}
                          />
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              ) : null}

              {steamProfile && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img decoding="async" src={steamProfile.avatar} alt="Steam" className="w-10 h-10 rounded-xl ring-1 ring-white/15" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{steamProfile.name}</p>
                    <p className="text-[11px] text-white/40">Połączony profil Steam</p>
                  </div>
                </div>
              )}

              {rankEntries.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] px-6 py-10 text-center">
                  <BarChart3 className="w-8 h-8 text-white/25 mx-auto mb-3" />
                  <p className="text-sm text-white/60 font-medium">Brak wpisów</p>
                  <p className="text-xs text-white/40 mt-1">Rangi dodawane automatycznie z Faceit (live) i Leetify (po kliknięciu Pobierz rangę w Ustawieniach).</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {[...rankEntries].reverse().map((e) => (
                    <li
                      key={e.id}
                      className="group flex items-center gap-3 rounded-xl px-4 py-3 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                      onMouseMove={spotlightHandler}
                    >
                      <div className="relative w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/20 shrink-0">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{e.rank}</p>
                        <p className="text-[11px] text-white/40">
                          {e.mode === 'PREMIER' ? 'Premier' : 'Faceit'} · {formatDate(e.recordedAt)}
                          {e.note ? ` · ${e.note}` : ''}
                        </p>
                        {e.source && SOURCE_LABELS[e.source] && (
                          <span
                            className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              color: SOURCE_LABELS[e.source].color,
                              background: `${SOURCE_LABELS[e.source].dot}1a`,
                              border: `1px solid ${SOURCE_LABELS[e.source].dot}33`,
                            }}
                          >
                            <span className="w-1 h-1 rounded-full" style={{ background: SOURCE_LABELS[e.source].dot }} />
                            {SOURCE_LABELS[e.source].label}
                          </span>
                        )}
                      </div>
                      {e.elo != null && (
                        <span className="font-display text-sm font-bold text-[#c4b5fd]">{e.elo}</span>
                      )}
                      <button
                        onClick={() => deleteRank(e.id)}
                        aria-label="Usuń wpis"
                        className="grid place-items-center w-8 h-8 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}