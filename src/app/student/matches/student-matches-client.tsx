'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn, formatDateTime } from '@/lib/utils'
import {
  Swords, Trophy, Trash2, Loader2, Plus, TrendingUp, TrendingDown, Minus,
  Crosshair, Inbox, Sparkles, Check, RefreshCw, Bot, Calendar, ChevronDown, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface Match {
  id: string
  map: string
  result: string
  eloChange: number
  kills: number | null
  deaths: number | null
  reflection: string | null
  source: string
  externalId: string | null
  faceitUrl: string | null
  leetifyUrl: string | null
  createdAt: string
  leetifyRating: number | null
  preaim: number | null
  reactionMs: number | null
  accuracyEnemySpotted: number | null
  accuracyHead: number | null
  sprayAccuracy: number | null
  coachReviewed: boolean
  syncSource: string | null
}

interface MatchStatus {
  faceitKeyConfigured: boolean
  studentNicknames: Record<string, string | null>
}

export function StudentMatchesClient() {
  const [matches, setMatches] = useState<Match[]>([])
  const [status, setStatus] = useState<MatchStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string; source?: string | null } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/matches')
      if (res.ok) {
        const data = await res.json()
        setMatches(Array.isArray(data) ? data : data.matches || [])
        setStatus(data.status || null)
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

  const stats = useMemo(() => {
    const wins = matches.filter((m) => m.result === 'WIN').length
    const losses = matches.filter((m) => m.result === 'LOSS').length
    const draws = matches.filter((m) => m.result === 'DRAW').length
    const total = matches.length
    const wr = total > 0 ? Math.round((wins / total) * 100) : 0
    // Current streak
    let streak = 0
    for (const m of matches) {
      if (m.result === 'WIN') streak++
      else break
    }
    const eloTotal = matches.reduce((acc, m) => acc + m.eloChange, 0)
    return { wins, losses, draws, total, wr, streak, eloTotal }
  }, [matches])

  const syncFaceit = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/matches/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncMsg({ ok: false, text: data.error || 'Nie udało się zsynchronizować' })
        return
      }
      if (data.created.length > 0) {
        setMatches((prev) => [...data.created, ...prev])
      }
      setSyncMsg({
        ok: true,
        source: data.source || null,
        text:
          data.created.length > 0
            ? `Zaimportowano ${data.created.length} nowych meczów (${data.skipped} już było)`
            : `Brak nowych meczów — ${data.skipped} już zsynchronizowanych. Kliknij ponownie później.`,
      })
    } catch {
      setSyncMsg({ ok: false, text: 'Wystąpił błąd serwera' })
    } finally {
      setSyncing(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Usunąć ten mecz z logu?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/matches/${id}`, { method: 'DELETE' })
      if (res.ok) setMatches((prev) => prev.filter((m) => m.id !== id))
    } catch {
      /* ignore */
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 space-y-8">
        <PageHeader
          icon={Swords}
          label="Codzienny tracking"
          title="Log meczów"
          subtitle={'Twoje zsynchronizowane mecze z pełnymi statystykami. Kliknij „Synchronizuj”, a ostatnie mecze pojawią się automatycznie.'}
        >
          <button
            onClick={syncFaceit}
            disabled={syncing}
            className="group relative inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-semibold text-white btn-darey animate-btn-gradient overflow-hidden disabled:opacity-60"
          >
            <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />}
            {syncing ? 'Synchronizuję…' : 'Synchronizuj z Faceitem'}
          </button>
        </PageHeader>

        {/* Honesty banner — the log can only show real Faceit matches when a
            Faceit API key is configured. Leetify fallback is incomplete. */}
        {status && !status.faceitKeyConfigured && matches.length > 0 && (
          <div className="animate-rise-in rounded-2xl px-5 py-4 text-sm border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-orange-500/[0.04] flex items-start gap-3" style={{ animationDelay: '0ms' }}>
            <Bot className="w-4 h-4 shrink-0 text-amber-300 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-amber-200">Ten log może nie pokazywać wszystkich Twoich ostatnich meczów</p>
              <p className="text-white/60 text-[13px] leading-relaxed">
                Mecze pobierane są teraz z Leetify (zapasowe źródło), a Leetify zawiera tylko mecze dodane ręcznie.
                Aby log zawsze pokazywał dokładnie 5 ostatnich meczów z Faceita, trener musi dodać darmowy klucz API Faceit
                w <span className="text-white/80 font-medium">Ustawieniach trenera</span> (developers.faceit.com).
              </p>
            </div>
          </div>
        )}

        {syncMsg && (
          <div
            className={cn(
              'animate-rise-in rounded-2xl px-5 py-3.5 text-sm flex items-center gap-3 border',
              syncMsg.ok
                ? 'bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-200'
                : 'bg-amber-500/[0.08] border-amber-500/25 text-amber-200',
            )}
            style={{ animationDelay: '0ms' }}
          >
            {syncMsg.ok ? <Check className="w-4 h-4 shrink-0" /> : <Bot className="w-4 h-4 shrink-0" />}
            <span className="flex-1">
              {syncMsg.text}
              {syncMsg.source === 'LEETIFY' && (
                <span className="ml-2 text-amber-200/90">— źródło: Leetify (może być niekompletne)</span>
              )}
              {syncMsg.source === 'FACEIT_API' && (
                <span className="ml-2 text-emerald-200/90">— źródło: Faceit API (na żywo)</span>
              )}
            </span>
            <button onClick={() => setSyncMsg(null)} className="text-white/50 hover:text-white transition shrink-0" aria-label="Zamknij">
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 grid-cols-2 sm:grid-cols-5">
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/20">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-emerald-300">{stats.wins}</p>
                <p className="text-[11px] text-white/45">Wygrane</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-[#f87171] to-[#ef4444] ring-1 ring-white/20">
                <Crosshair className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-red-300">{stats.losses}</p>
                <p className="text-[11px] text-white/45">Przegrane</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-[#c4b5fd]">{stats.wr}%</p>
                <p className="text-[11px] text-white/45">Winrate</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-1 ring-white/20">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-amber-300">{stats.eloTotal > 0 ? `+${stats.eloTotal}` : stats.eloTotal}</p>
                <p className="text-[11px] text-white/45">ELO łącznie</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] ring-1 ring-white/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-[#c4b5fd]">{stats.streak}</p>
                <p className="text-[11px] text-white/45">Seria wygranych</p>
              </div>
            </div>
          </div>
        </section>

        <div>
          {/* Matches feed */}
          <div className="space-y-3">
            {loading ? (
              <div className="glass-liquid rounded-3xl flex items-center justify-center py-20 text-white/40">
                <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie meczów…
              </div>
            ) : matches.length === 0 ? (
              <div className="glass-liquid rounded-3xl py-16 px-6 text-center">
                <Swords className="w-12 h-12 mx-auto mb-4 text-white/25" />
                <p className="text-white/55">Nie masz jeszcze zsynchronizowanych meczów.</p>
                <p className="text-sm text-white/35 mt-1">Kliknij „Synchronizuj z Faceitem" — ostatnie mecze z pełnymi statystykami pojawią się automatycznie.</p>
                <Link href="/student/settings" className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#c4b5fd] hover:text-white transition-colors">
                  <Calendar className="w-3.5 h-3.5" /> Ustaw Steam ID w ustawieniach
                </Link>
              </div>
            ) : (
              matches.map((m, i) => {
                const win = m.result === 'WIN'
                const draw = m.result === 'DRAW'
                return (
                  <div
                    key={m.id}
                    className={cn(
                      'glass-liquid rise-in spotlight-card group relative rounded-3xl p-5 overflow-hidden transition-all duration-300',
                      win && 'border-l-2 border-l-emerald-500/50',
                      m.result === 'LOSS' && 'border-l-2 border-l-red-500/40',
                    )}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          'shrink-0 grid place-items-center w-12 h-12 rounded-2xl ring-1',
                          win
                            ? 'bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-white/20'
                            : m.result === 'LOSS'
                              ? 'bg-gradient-to-br from-[#f87171] to-[#ef4444] ring-white/20'
                              : 'bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-white/20',
                        )}
                      >
                        {win ? <Trophy className="w-5 h-5 text-white" /> : m.result === 'LOSS' ? <Crosshair className="w-5 h-5 text-white" /> : <Minus className="w-5 h-5 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-lg font-bold">{m.map}</span>
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border',
                            win ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
                              : m.result === 'LOSS' ? 'text-red-300 bg-red-500/10 border-red-500/25'
                                : 'text-amber-300 bg-amber-500/10 border-amber-500/25',
                          )}>
                            {win ? 'Wygrana' : m.result === 'LOSS' ? 'Przegrana' : 'Remis'}
                          </span>
                          {m.eloChange !== 0 && (
                            <span className={cn(
                              'inline-flex items-center gap-0.5 text-xs font-bold tabular-nums',
                              m.eloChange > 0 ? 'text-[#34d399]' : 'text-red-300',
                            )}>
                              {m.eloChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {m.eloChange > 0 ? '+' : ''}{m.eloChange} ELO
                            </span>
                          )}
                          {m.source === 'FACEIT' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#c4b5fd] bg-[#a78bfa]/[0.1] border border-[#a78bfa]/25 rounded-full px-2 py-0.5">
                              <Bot className="w-3 h-3" /> Faceit
                            </span>
                          )}
                          {m.source === 'PREMIER' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-500/[0.1] border border-sky-500/25 rounded-full px-2 py-0.5">
                              <Trophy className="w-3 h-3" /> Premier
                            </span>
                          )}
                          {m.coachReviewed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/[0.1] border border-amber-500/25 rounded-full px-2 py-0.5">
                              <Sparkles className="w-3 h-3" /> Analiza trenera
                            </span>
                          )}
                          {m.faceitUrl && (
                            <a
                              href={m.faceitUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/60 hover:text-[#8cffef] bg-white/[0.04] border border-white/[0.08] hover:border-[#2de5ca]/30 rounded-full px-2.5 py-1 transition"
                            >
                              <ExternalLink className="w-3 h-3" /> Mecz na Faceit
                            </a>
                          )}
                          {!m.faceitUrl && m.leetifyUrl && (
                            <a
                              href={m.leetifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/60 hover:text-[#8cffef] bg-white/[0.04] border border-white/[0.08] hover:border-[#2de5ca]/30 rounded-full px-2.5 py-1 transition"
                            >
                              <ExternalLink className="w-3 h-3" /> Mecz na Leetify
                            </a>
                          )}
                          <span className="text-[11px] text-white/35 ml-auto">{formatDateTime(m.createdAt)}</span>
                        </div>

                        {(m.kills != null || m.deaths != null) && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-white/45">
                            <span className="inline-flex items-center gap-1"><Crosshair className="w-3 h-3 text-[#c4b5fd]" /> {m.kills ?? '—'}</span>
                            <span className="text-white/20">/</span>
                            <span className="inline-flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-300/70" /> {m.deaths ?? '—'}</span>
                            {m.kills != null && m.deaths != null && m.deaths > 0 && (
                              <span className="tabular-nums text-white/50">K/D {(m.kills / m.deaths).toFixed(2)}</span>
                            )}
                          </div>
                        )}

                        {m.source === 'FACEIT' && (m.preaim != null || m.reactionMs != null || m.accuracyHead != null || m.sprayAccuracy != null || m.accuracyEnemySpotted != null) && (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {m.reactionMs != null && (
                              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Reakcja</p>
                                <p className={cn('text-sm font-bold tabular-nums', m.reactionMs > 350 ? 'text-red-300' : 'text-[#34d399]')}>{m.reactionMs} ms</p>
                              </div>
                            )}
                            {m.preaim != null && (
                              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Pre-aim</p>
                                <p className="text-sm font-bold text-[#38bdf8] tabular-nums">{m.preaim.toFixed(1)}%</p>
                              </div>
                            )}
                            {m.accuracyHead != null && (
                              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Celność w głowę</p>
                                <p className="text-sm font-bold text-[#fbbf24] tabular-nums">{m.accuracyHead.toFixed(1)}%</p>
                              </div>
                            )}
                            {m.sprayAccuracy != null && (
                              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Spray</p>
                                <p className="text-sm font-bold text-[#a78bfa] tabular-nums">{m.sprayAccuracy.toFixed(1)}%</p>
                              </div>
                            )}
                            {m.accuracyEnemySpotted != null && (
                              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Celność</p>
                                <p className="text-sm font-bold text-[#34d399] tabular-nums">{m.accuracyEnemySpotted.toFixed(1)}%</p>
                              </div>
                            )}
                          </div>
                        )}

                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Link
                          href={`/student/matches/${m.id}`}
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold text-white/60 hover:text-white glass hover:border-[#a78bfa]/30 transition opacity-0 group-hover:opacity-100"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Szczegóły
                        </Link>
                        <button
                          onClick={() => remove(m.id)}
                          disabled={deletingId === m.id}
                          className="grid h-9 w-9 place-items-center rounded-xl text-white/40 hover:text-red-300 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                          aria-label="Usuń mecz"
                        >
                          {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}
