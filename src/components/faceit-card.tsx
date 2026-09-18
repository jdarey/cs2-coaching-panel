'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FaceitIcon } from '@/components/faceit-icon'
import { FACEIT_LEVEL_COLORS, FACEIT_LEVEL_GRADIENTS, levelFromElo, nextLevelInfo } from '@/lib/faceit-levels'

interface RankEntry {
  id: string
  mode: string
  elo: number | null
  recordedAt: string
}

interface FaceitStats {
  nickname: string | null
  avatar: string | null
  country: string | null
  faceitId: string | null
  elo: number | null
  skillLevel: number | null
  matches: number | null
  wins: number | null
  winrate: number | null
  avgKd: number | null
  avgHs: number | null
  currentWinStreak: number | null
  longestWinStreak: number | null
  source: string
}

/**
 * Karta FACEIT ucznia — "ala karta piłkarska / FUT":
 *  · lewa połowa: avatar w pionie, wielki ELO, plakietka poziomu w barwach lvl
 *  · prawa połowa: statystyki lifetime (mecze, winrate, K/D, HS%, seria W)
 *  · pod spodem: pasek postępu do kolejnego poziomu + sparkline ostatnich odczytów
 * ELO jest LIVE (keyless legacy przez /api/integrations/faceit), lifetime pojawia się
 * gdy trener ustawił klucz Open API. Historia/sparkline z /api/ranks.
 */
export function FaceitCard({ studentId, faceitNickname }: { studentId: string; faceitNickname: string | null }) {
  const [stats, setStats] = useState<FaceitStats | null>(null)
  const [history, setHistory] = useState<RankEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [nick, setNick] = useState<string | null>(faceitNickname)
  const autoSavedRef = useRef(0)

  // Live fetch co 15 min + przy focusie. Nick może zostać odkryty z Leetify gdy
  // uczeń go nie podał (fallback w /api/ranks?) — tu trzymamy prostą wersję:
  // bez nicku pokazujemy placeholder z CTA.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        // 1) historia z DB (do sparkline + delta)
        const rRes = await fetch(`/api/ranks?studentId=${studentId}`)
        const ranks: RankEntry[] = rRes.ok ? await rRes.json() : []
        if (cancelled) return
        const faceitOnly = (Array.isArray(ranks) ? ranks : []).filter(e => e.mode === 'FACEIT' && e.elo != null)
          .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
        setHistory(faceitOnly)

        // 2) live stats — wymagają nicku; bez nicku karta żyje z historii DB
        if (!nick) {
          if (faceitOnly.length) {
            const last = faceitOnly[faceitOnly.length - 1]
            setStats({
              nickname: null,
              avatar: null,
              country: null,
              faceitId: null,
              elo: last.elo,
              skillLevel: levelFromElo(last.elo),
              matches: null,
              wins: null,
              winrate: null,
              avgKd: null,
              avgHs: null,
              currentWinStreak: null,
              longestWinStreak: null,
              source: 'db-history',
            })
            setFailed(false)
          } else {
            setFailed(true)
          }
          return
        }
        const sRes = await fetch(`/api/integrations/faceit/stats?nickname=${encodeURIComponent(nick)}`)
        if (!sRes.ok || cancelled) {
          setLoading(false)
          setFailed(true)
          return
        }
        const data: FaceitStats = await sRes.json()
        setStats(data)
        setFailed(false)

        // 3) auto-punkt trajektorii max 1x/6h gdy ELO się zmieniło (jak w starym wykresie)
        const last = faceitOnly[faceitOnly.length - 1]
        if (data.elo != null && Date.now() - autoSavedRef.current > 6 * 3600_000) {
          const lastElo = last?.elo
          const lastTime = last ? new Date(last.recordedAt).getTime() : 0
          if (lastElo !== data.elo && (!last || Date.now() - lastTime > 6 * 3600_000)) {
            autoSavedRef.current = Date.now()
            fetch('/api/ranks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentId, mode: 'FACEIT', rank: `${data.elo} ELO`, elo: data.elo, source: 'FACEIT_LIVE', note: 'Auto (Faceit na żywo)' }),
            }).then(r => { if (r.ok) window.dispatchEvent(new CustomEvent('ranks:updated')) }).catch(() => {})
          }
        }
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, 900_000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('focus', onFocus) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, nick])

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-10 flex items-center justify-center text-white/30">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie karty Faceit…
      </div>
    )
  }

  if (failed || (!stats && history.length === 0)) {
    return (
      <div className="glass-card rounded-3xl p-10 text-center">
        <Trophy className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-sm text-white/60">Brak danych Faceit</p>
        <p className="text-xs text-white/30 mt-1">
          {faceitNickname
            ? 'Nie udało się pobrać profilu — spróbuj odświeżyć stronę'
            : 'Uczeń nie podał nicku Faceit — poproś go, aby uzupełnił go w swoim panelu'}
        </p>
      </div>
    )
  }

  const elo = stats?.elo ?? (history.length ? history[history.length - 1].elo : null)
  const level = stats?.skillLevel ?? levelFromElo(elo)
  const lvlColor = level ? FACEIT_LEVEL_COLORS[level] : '#ff5500'
  const prevElo = history.length >= 2 ? history[history.length - 2].elo : null
  const delta = elo != null && prevElo != null ? elo - prevElo : null
  const info = nextLevelInfo(elo)
  const profileUrl = stats?.nickname ? `https://www.faceit.com/pl/players/${encodeURIComponent(stats.nickname)}` : null

  // Sparkline: ostatnie 14 odczytów (bez live, który może być duplikatem)
  const spark = history.slice(-14)
  const sparkMin = spark.length ? Math.min(...spark.map(e => e.elo!)) : 0
  const sparkMax = spark.length ? Math.max(...spark.map(e => e.elo!)) : 1
  const sparkRange = Math.max(1, sparkMax - sparkMin)

  return (
    <div className="glass-card rise-in relative rounded-3xl overflow-hidden" style={{ animationDelay: '80ms' }}>
      {/* Poświata w barwach poziomu */}
      <div
        className="absolute -top-24 -right-16 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-25"
        style={{ background: `radial-gradient(circle, ${lvlColor}, transparent 70%)` }}
      />

      <div className="relative z-10 grid md:grid-cols-[minmax(0,320px)_1fr]">
        {/* ── LEWA: "tarcza" gracza ─────────────────────────────────────── */}
        <div className={cn('relative p-6 flex flex-col items-center text-center bg-gradient-to-b via-transparent', level ? FACEIT_LEVEL_GRADIENTS[level] : 'from-[#ff5500] to-[#8a2710]')}>
          <div className="absolute inset-0 bg-black/35" />
          <div className="relative z-10 flex flex-col items-center w-full">
            {/* Plakietka poziomu */}
            <div
              className="grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl font-black text-white ring-2 ring-white/30 shadow-lg"
              style={{ background: lvlColor, textShadow: '0 2px 6px rgba(0,0,0,0.55)' }}
              title={`Poziom Faceit ${level ?? '—'}`}
            >
              {level ?? '—'}
            </div>

            {/* Avatar */}
            <div className="mt-4 h-28 w-28 rounded-3xl overflow-hidden ring-2 ring-white/25 bg-black/40 grid place-items-center">
              {stats?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stats.avatar} alt={stats.nickname || 'Faceit'} className="h-full w-full object-cover" />
              ) : (
                <FaceitIcon className="w-12 h-12 text-white/70" />
              )}
            </div>

            {/* Nick */}
            <p className="mt-3 font-display text-xl font-bold text-white truncate max-w-full" title={stats?.nickname || ''}>
              {stats?.nickname || faceitNickname || '—'}
            </p>
            {stats?.country && (
              <p className="mt-0.5 text-[11px] uppercase tracking-widest text-white/60">{stats.country}</p>
            )}

            {/* Wielkie ELO */}
            <p className="mt-2 font-display text-5xl font-black tabular-nums text-white leading-none" style={{ textShadow: '0 4px 18px rgba(0,0,0,0.5)' }}>
              {elo ?? '—'}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/70 font-semibold">Faceit ELO</p>

            {delta != null && delta !== 0 && (
              <p className={cn('mt-1 text-xs font-bold tabular-nums', delta > 0 ? 'text-emerald-300' : 'text-red-300')}>
                {delta > 0 ? '▲ +' : '▼ '}{delta} od ostatniego odczytu
              </p>
            )}
          </div>
        </div>

        {/* ── PRAWA: statystyki + progres + trend ───────────────────────── */}
        <div className="p-6 flex flex-col gap-4 min-w-0">
          {/* Nagłówek sekcji */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff5500] ring-1 ring-white/15">
                <FaceitIcon className="w-5 h-5 text-white" />
              </span>
              <div>
                <h3 className="font-display font-bold text-white leading-tight">Statystyki Faceit</h3>
                <p className="text-[11px] text-white/40">
                  {stats?.source === 'legacy+open-api' ? 'Live · pełny profil' : 'Live ELO · szczegóły wymagają klucza API'}
                </p>
              </div>
            </div>
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:border-[#ff5500]/40 transition-colors shrink-0"
              >
                <ExternalLink className="w-3 h-3" /> Profil
              </a>
            )}
          </div>

          {/* Siatka statystyk */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Mecze', value: stats?.matches, fmt: (v: number) => `${v}` },
              { label: 'Winrate', value: stats?.winrate, fmt: (v: number) => `${Math.round(v)}%` },
              { label: 'K/D', value: stats?.avgKd, fmt: (v: number) => v.toFixed(2) },
              { label: 'HS %', value: stats?.avgHs, fmt: (v: number) => `${Math.round(v)}%` },
              { label: 'Seria W', value: stats?.currentWinStreak, fmt: (v: number) => `${v}` },
              { label: 'Rekord W', value: stats?.longestWinStreak, fmt: (v: number) => `${v}` },
            ].map(({ label, value, fmt }) => (
              <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{label}</p>
                <p className="mt-0.5 font-display text-lg font-bold text-white tabular-nums">
                  {value != null ? fmt(value) : '—'}
                </p>
              </div>
            ))}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Odczytów</p>
              <p className="mt-0.5 font-display text-lg font-bold text-white tabular-nums">{history.length}</p>
            </div>
          </div>

          {/* Progres do kolejnego poziomu */}
          {info && !('max' in info) && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-white/70">
                  Do poziomu <span className="font-display font-bold text-white">{info.level + 1}</span>
                </p>
                <p className="text-xs tabular-nums">
                  <span className="font-bold text-white">{elo}</span>
                  <span className="text-white/35"> / {info.next} ELO</span>
                </p>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${info.pct}%`, background: `linear-gradient(90deg, ${FACEIT_LEVEL_COLORS[info.level] ?? '#ff5500'}, ${FACEIT_LEVEL_COLORS[info.level + 1] ?? '#ff5500'})`, boxShadow: `0 0 12px ${lvlColor}66` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-white/45">
                {info.need === 0
                  ? 'Zagraj mecz — awansujesz po aktualizacji Faceit'
                  : <>Brakuje <b className="text-white/80">{info.need} ELO</b> ({Math.round(info.pct)}%)</>}
              </p>
            </div>
          )}
          {info && 'max' in info && (
            <div className="rounded-2xl bg-gradient-to-r from-[#d50000]/15 to-[#ff5500]/10 border border-[#ff5500]/25 p-4 text-center">
              <p className="text-sm font-bold text-white">Poziom 10 — maksimum! 🏆</p>
              <p className="text-[11px] text-white/50 mt-0.5">Jesteś na szczycie drabiny Faceit</p>
            </div>
          )}

          {/* Sparkline historii */}
          {spark.length >= 2 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Trend ELO — ostatnie {spark.length} odczytów</p>
              <div className="h-20 flex items-end gap-1">
                {spark.map(e => {
                  const h = 20 + ((e.elo! - sparkMin) / sparkRange) * 60
                  const l = levelFromElo(e.elo)
                  const col = l ? FACEIT_LEVEL_COLORS[l] : '#ff5500'
                  const isMax = e.elo === sparkMax
                  return (
                    <div key={e.id} className="flex-1 flex flex-col items-center gap-1 group/bar min-w-0">
                      <div
                        className="w-full rounded-t-md transition-all duration-500"
                        style={{ height: `${h}%`, minHeight: 6, background: `linear-gradient(to top, ${col}dd, ${col})`, boxShadow: isMax ? `0 0 8px ${col}66` : undefined }}
                        title={`${e.elo} ELO · ${new Date(e.recordedAt).toLocaleDateString('pl-PL', { month: '2-digit', day: '2-digit' })}`}
                      />
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-white/25 mt-1 text-center">Najedź na słupek — kolor = poziom Faceit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
