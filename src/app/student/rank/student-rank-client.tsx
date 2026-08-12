'use client'

import { useEffect, useState, useCallback } from 'react'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn, formatDate, spotlightHandler } from '@/lib/utils'
import { RANKS, getRank, nextRank, getLevel, getStreak, getAchievements } from '@/lib/gamification'
import { RankEmblem } from '@/components/rank-emblem'
import { Trophy, Flame, Zap, Loader2, Crown, TrendingUp, Plus, Trash2, BarChart3 } from 'lucide-react'

interface RankEntry {
  id: string
  mode: string
  rank: string
  elo: number | null
  note: string | null
  recordedAt: string
}

type P = {
  id: string
  status: string
  watchedAt: string | null
  updatedAt: string
  progress: number
}

export function StudentRankClient() {
  const [progress, setProgress] = useState<P[]>([])
  const [sessionsCount, setSessionsCount] = useState(0)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [messagesSent, setMessagesSent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rankEntries, setRankEntries] = useState<RankEntry[]>([])
  const [newRank, setNewRank] = useState({ mode: 'PREMIER', rank: '', elo: '' as string, note: '' })
  const [savingRank, setSavingRank] = useState(false)
  const [autoFetch, setAutoFetch] = useState({ loading: false, message: '' as string | null, error: '' as string | null })
  const [steamProfile, setSteamProfile] = useState<{ name: string; avatar: string } | null>(null)

  const fetchFromGaming = async () => {
    setAutoFetch({ loading: true, message: null, error: null })
    try {
      const res = await fetch(`/api/user/profile`)
      if (!res.ok) {
        setAutoFetch({ loading: false, message: null, error: 'Brak powiązanych kont. Dodaj Steam lub Faceit w Ustawieniach.' })
        return
      }
      const me = await res.json()
      const identifier = me.steamVanity || me.steamId || me.faceitNickname
      if (!identifier) {
        setAutoFetch({ loading: false, message: null, error: 'Dodaj link do Steam lub nick Faceit w Ustawieniach → Gry i konta.' })
        return
      }

      // Unified keyless integration: Premier + Faceit in one call, no API keys
      const r = await fetch(`/api/integrations/leetify?identifier=${encodeURIComponent(identifier)}`)
      const data = await r.json()
      if (!r.ok) {
        setAutoFetch({ loading: false, message: null, error: data.error || 'Nie udało się pobrać rangi' })
        return
      }

      if (data.steamId) {
        setSteamProfile({ name: data.name || identifier, avatar: '' })
      }

      let saved = 0
      const parts: string[] = []
      if (data.premier != null) {
        parts.push(`Premier: ${data.premier}`)
        const save = await fetch('/api/ranks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'PREMIER', rank: `${data.premier} Premier`, elo: data.premier, note: 'Pobrano automatycznie (Leetify)' }),
        })
        if (save.ok) {
          saved++
          const entry = await save.json()
          setRankEntries((prev) => [...prev, entry])
        }
      }
      if (data.faceitElo != null || data.faceitLevel != null) {
        parts.push(data.faceitElo != null ? `Faceit ELO: ${data.faceitElo}` : `Poziom: ${data.faceitLevel}`)
        const save = await fetch('/api/ranks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'FACEIT',
            rank: data.faceitElo != null ? `${data.faceitElo} ELO` : `Poziom ${data.faceitLevel}`,
            elo: data.faceitElo,
            note: 'Pobrano automatycznie (Leetify)',
          }),
        })
        if (save.ok) {
          saved++
          const entry = await save.json()
          setRankEntries((prev) => [...prev, entry])
        }
      }
      setAutoFetch({
        loading: false,
        message: parts.length > 0 ? `Pobrano: ${parts.join(' · ')}${saved > 0 ? ' ✓' : ''}` : 'Profil znaleziony, brak danych o rangach',
        error: null,
      })
    } catch {
      setAutoFetch({ loading: false, message: null, error: 'Błąd sieci przy pobieraniu rangi' })
    }
  }

  const load = useCallback(async () => {
    try {
      const [pRes, sRes, fRes, mRes, rRes] = await Promise.all([
        fetch('/api/progress'),
        fetch('/api/sessions'),
        fetch('/api/feedback'),
        fetch('/api/messages'),
        fetch('/api/ranks'),
      ])
      const p = pRes.ok ? await pRes.json() : []
      setProgress(p ?? [])
      const s = sRes.ok ? await sRes.json() : []
      setSessionsCount(Array.isArray(s) ? s.length : 0)
      const f = fRes.ok ? await fRes.json() : { feedback: [] }
      setFeedbackCount(f.feedback?.length ?? 0)
      const m = mRes.ok ? await mRes.json() : { conversations: [] }
      setMessagesSent((m.conversations?.[0]?.lastMessage?.senderId === undefined ? 0 : 0))
      const r = rRes.ok ? await rRes.json() : []
      setRankEntries(r ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const addRank = async () => {
    if (!newRank.rank.trim()) return
    setSavingRank(true)
    try {
      const res = await fetch('/api/ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: newRank.mode,
          rank: newRank.rank.trim(),
          elo: newRank.elo ? Number(newRank.elo) : null,
          note: newRank.note || null,
        }),
      })
      if (res.ok) {
        const entry = await res.json()
        setRankEntries((prev) => [...prev, entry])
        setNewRank({ mode: 'PREMIER', rank: '', elo: '', note: '' })
      }
    } catch {
      /* ignore */
    } finally {
      setSavingRank(false)
    }
  }

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

  const total = progress.length
  const watched = progress.filter((p) => p.status === 'WATCHED').length
  const implemented = progress.filter((p) => p.status === 'IMPLEMENTED').length
  const pending = progress.filter((p) => p.status === 'PENDING').length
  const watching = progress.filter((p) => p.status === 'WATCHING').length
  const completionRate = total > 0 ? Math.round(((watched + implemented) / total) * 100) : 0

  const rank = getRank(completionRate)
  const next = nextRank(completionRate)
  const levelInfo = getLevel(watched + implemented)
  const streak = getStreak(progress.map((p) => p.watchedAt || p.updatedAt))
  const achievements = getAchievements({ total, pending, watching, watched, implemented, sessionsCount, feedbackCount, messagesSent })
  const earnedCount = achievements.filter((a) => a.earned).length
  const currentIdx = RANKS.findIndex((r) => r.key === rank.key)

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

      {/* Current rank hero */}
      <div className="bento-card p-6 md:p-8 relative overflow-hidden mb-8">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30" style={{ background: `radial-gradient(50% 50% at 50% 100%, ${rank.color} 0%, ${rank.glow} 70%, transparent 100%)` }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <RankEmblem rank={rank} size={110} />
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-1">Aktualna ranga</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white">{rank.name}</h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 max-w-sm h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${next ? Math.min(100, ((completionRate - rank.min) / ((next.min - rank.min) || 1)) * 100) : 100}%`,
                    background: `linear-gradient(90deg, ${rank.color}, ${next?.color || rank.color})`,
                  }}
                />
              </div>
              <span className="text-sm text-white/55">
                {next ? `${next.min - completionRate}% do ${next.name}` : 'Maksymalna ranga! 👑'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="bento-card px-4 py-3 text-center">
              <p className="font-display text-2xl font-bold text-[#a78bfa]">{levelInfo.level}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Poziom</p>
            </div>
            <div className="bento-card px-4 py-3 text-center">
              <p className="font-display text-2xl font-bold text-[#a78bfa]">{streak}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1 flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> Seria</p>
            </div>
            <div className="bento-card px-4 py-3 text-center">
              <p className="font-display text-2xl font-bold text-[#a78bfa]">{completionRate}%</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Postęp</p>
            </div>
          </div>
        </div>
        <div className="relative mt-6 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#a78bfa]" />
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] transition-all duration-1000" style={{ width: `${levelInfo.pct}%` }} />
          </div>
          <span className="text-xs text-white/45">{levelInfo.xp}/{levelInfo.xpToNext} XP</span>
        </div>
      </div>

      {/* Rank ladder */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="section-pill"><Crown className="w-3.5 h-3.5" /> Drabinka rang</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RANKS.map((r, i) => {
            const isCurrent = i === currentIdx
            const isPassed = i < currentIdx
            return (
              <div
                key={r.key}
                className={cn(
                  'bento-card flex items-center gap-4 p-4 transition-all duration-300',
                  isCurrent && 'border-[#a78bfa]/40',
                  !isCurrent && !isPassed && 'opacity-45 grayscale',
                )}
              >
                <RankEmblem rank={r} size={44} glow={false} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isCurrent ? 'text-white' : 'text-white/70')}>{r.name}</p>
                  <p className="text-[11px] text-white/40">{r.min}% ukończenia</p>
                </div>
                {isCurrent && <span className="ml-auto shrink-0 text-[10px] font-bold text-[#a78bfa]">TWOJA</span>}
                {isPassed && <span className="ml-auto shrink-0 text-[#a78bfa]">✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rank tracking — real in-game rank / ELO over time */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="section-pill"><TrendingUp className="w-3.5 h-3.5" /> Twoja ranga w grze</span>
        </div>
        <div className="glass-card rounded-3xl p-6 md:p-7 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Add entry form */}
            <div className="lg:w-72 shrink-0">
              <p className="text-sm font-semibold text-white mb-3">Zapisz swój postęp</p>

              {/* Auto-fetch from gaming accounts */}
              <div className="mb-4 rounded-2xl p-4 bg-white/[0.02] border border-[#a78bfa]/15">
                <p className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#c4b5fd]" /> Pobierz automatycznie
                </p>
                <button
                  onClick={() => fetchFromGaming()}
                  disabled={autoFetch.loading}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border border-[#a78bfa]/25 bg-[#a78bfa]/[0.06] text-white hover:border-[#a78bfa]/50 disabled:opacity-50 transition-all duration-200"
                >
                  {autoFetch.loading ? (
                    <span className="inline-flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pobieranie…</span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2"><TrendingUp className="w-3.5 h-3.5" /> Pobierz Premier + Faceit</span>
                  )}
                </button>
                {autoFetch.message && <p className="mt-2 text-[11px] text-emerald-300/90">{autoFetch.message}</p>}
                {autoFetch.error && <p className="mt-2 text-[11px] text-red-300/90">{autoFetch.error}</p>}
                <p className="mt-2 text-[10px] text-white/35 leading-snug">
                  Bez kluczy API — wystarczy podlinkować Steam w Ustawieniach → Gry i konta.
                </p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(['PREMIER', 'FACEIT'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setNewRank((s) => ({ ...s, mode: m }))}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-200',
                        newRank.mode === m
                          ? 'text-white border-[#a78bfa]/40 bg-[#a78bfa]/[0.1]'
                          : 'text-white/50 border-white/[0.08] bg-white/[0.02] hover:text-white/80',
                      )}
                    >
                      {m === 'PREMIER' ? 'Premier' : 'Faceit'}
                    </button>
                  ))}
                </div>
                <input
                  value={newRank.rank}
                  onChange={(e) => setNewRank((s) => ({ ...s, rank: e.target.value }))}
                  placeholder="Ranga / poziom (np. 15000 ELO, Lvl 7)"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/40 transition-colors"
                />
                <input
                  value={newRank.elo}
                  onChange={(e) => setNewRank((s) => ({ ...s, elo: e.target.value }))}
                  placeholder="ELO / liczba punktów (opcjonalnie)"
                  inputMode="numeric"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/40 transition-colors"
                />
                <input
                  value={newRank.note}
                  onChange={(e) => setNewRank((s) => ({ ...s, note: e.target.value }))}
                  placeholder="Notatka (opcjonalnie)"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/40 transition-colors"
                />
                <button
                  onClick={addRank}
                  disabled={savingRank || !newRank.rank.trim()}
                  className="btn-darey relative inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {savingRank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Zapisz rangę
                </button>
              </div>
            </div>

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
                  <img src={steamProfile.avatar} alt="Steam" className="w-10 h-10 rounded-xl ring-1 ring-white/15" />
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
                  <p className="text-xs text-white/40 mt-1">Zapisz swoją pierwszą rangę, aby śledzić realny postęp w grze.</p>
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

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="section-pill"><Trophy className="w-3.5 h-3.5" /> Osiągnięcia</span>
          <span className="text-xs text-white/40">{earnedCount}/{achievements.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((a) => (
            <div
              key={a.key}
              className={cn(
                'bento-card flex items-start gap-3 p-4 transition-all duration-300',
                a.earned ? 'border-[#a78bfa]/30' : 'opacity-40 grayscale',
              )}
            >
              <span className="text-2xl">{a.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/85 leading-tight">{a.name}</p>
                <p className="text-[11px] text-white/40 mt-1 leading-snug">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </StudentLayout>
  )
}
