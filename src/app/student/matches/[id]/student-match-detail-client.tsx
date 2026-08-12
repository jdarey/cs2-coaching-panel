'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { StudentLayout } from '@/components/student-layout'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { cn, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft, Loader2, Swords, Trophy, Crosshair, TrendingUp, TrendingDown, Minus,
  Bot, Crown, Target, Timer, Shield, Flame, Zap, AlertTriangle, Sparkles, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'

interface MatchDetail {
  id: string
  map: string
  result: string
  eloChange: number
  kills: number | null
  deaths: number | null
  reflection: string | null
  source: string
  platformMatchId: string | null
  faceitUrl: string | null
  leetifyUrl: string | null
  createdAt: string
  leetifyRating: number | null
  preaim: number | null
  reactionMs: number | null
  accuracyEnemySpotted: number | null
  accuracyHead: number | null
  sprayAccuracy: number | null
  student: { id: string; name: string | null; email: string; avatarUrl: string | null; steamId: string | null }
}

interface PlayerStats {
  steam64Id: string | null
  name: string | null
  team: number | null
  kills: number | null
  deaths: number | null
  assists: number | null
  kdRatio: number | null
  hsPercent: number | null
  adr: number | null
  dpr: number | null
  rating: number | null
  mvps: number | null
  score: number | null
  total_damage?: number
  rounds_count?: number
  rounds_won?: number
  rounds_lost?: number
  total_hs_kills?: number
  preaim?: number
  reaction_time?: number
  accuracy?: number
  accuracy_enemy_spotted?: number
  accuracy_head?: number
  spray_accuracy?: number
  counter_strafing_shots_good_ratio?: number
  utility_on_death_avg?: number
  flashbang_thrown?: number
  flashbang_hit_foe?: number
  flashbang_leading_to_kill?: number
  he_thrown?: number
  molotov_thrown?: number
  smoke_thrown?: number
  multi1k?: number
  multi2k?: number
  multi3k?: number
  multi4k?: number
  multi5k?: number
  trade_kills_attempts?: number
  trade_kills_succeed?: number
  traded_death_attempts?: number
  traded_deaths_succeed?: number
  rounds_survived_percentage?: number
}

interface MatchDetails {
  matchId: string
  finishedAt: string
  map: string
  teamScores: { teamNumber: number; score: number }[]
  players: PlayerStats[]
  myStats: PlayerStats | null
}

interface DetailData {
  match: MatchDetail
  details: MatchDetails | null
}

function Stat({ label, value, icon: Icon, accent, hint }: { label: string; value: string; icon: any; accent?: string; hint?: string }) {
  return (
    <div className="glass-liquid relative overflow-hidden rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium truncate">{label}</p>
      </div>
      <p className={cn('font-display text-xl font-bold tabular-nums', accent ? '' : 'text-white')} style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-white/35 mt-0.5">{hint}</p>}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-card rise-in relative rounded-3xl p-6 overflow-hidden">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h2 className="font-display text-lg font-semibold text-white/90">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export function StudentMatchDetailClient() {
  const params = useParams<{ id: string }>()
  const matchId = params.id
  const { data: session } = useSession()
  const isCoach = (session?.user as any)?.role === 'COACH'
  const Layout = isCoach ? CoachLayout : StudentLayout
  const backHref = isCoach ? '/coach/matches' : '/student/matches'
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAllPlayers, setShowAllPlayers] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/detail`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Nie udało się pobrać meczu')
        return
      }
      setData(json)
    } catch {
      setError('Wystąpił błąd serwera')
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20 flex items-center justify-center text-white/40">
          <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie meczu…
        </div>
      </Layout>
    )
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
          <div className="glass-card rounded-3xl p-10 text-center">
            <AlertTriangle className="w-10 h-10 text-red-300/60 mx-auto mb-4" />
            <p className="font-display text-lg font-semibold text-white/80">{error || 'Mecz nie znaleziony'}</p>
            <Link href={backHref} className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-6">
              <ArrowLeft className="w-4 h-4" /> Wróć do logu meczów
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  const { match, details } = data
  const win = match.result === 'WIN'
  const draw = match.result === 'DRAW'
  const me = details?.myStats
  const players = details?.players || []
  const myTeam = me?.team
  const myPlayers = players.filter((p) => p.team === myTeam)
  const enemyPlayers = players.filter((p) => p.team !== myTeam && p.team != null)
  const myScore = details?.teamScores.find((t) => t.teamNumber === myTeam)?.score
  const enemyScore = details?.teamScores.find((t) => t.teamNumber !== myTeam)?.score

  const pct = (v: number | undefined | null) => (v == null ? null : (v * 100).toFixed(1) + '%')

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24 space-y-8">
        <PageHeader
          icon={Swords}
          label={match.source === 'FACEIT' ? 'Szczegóły meczu Faceit' : 'Szczegóły meczu'}
          title={`${match.map} · ${win ? 'Wygrana' : match.result === 'LOSS' ? 'Przegrana' : 'Remis'}`}
          subtitle={`${formatDateTime(match.createdAt)}${myScore != null && enemyScore != null ? ` · Wynik ${myScore}:${enemyScore}` : ''}`}
        >
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full px-5 h-11 text-sm font-semibold text-white/80 glass hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Log meczów
          </Link>
        </PageHeader>

        {/* ===== HERO: score + result ===== */}
        <div className="glass-card rise-in relative rounded-3xl p-6 md:p-8 overflow-hidden">
          <div className={cn('absolute inset-0 opacity-60 pointer-events-none', win ? 'bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent' : match.result === 'LOSS' ? 'bg-gradient-to-r from-red-500/10 via-transparent to-transparent' : 'bg-gradient-to-r from-amber-500/10 via-transparent to-transparent')} />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className={cn('shrink-0 grid place-items-center w-16 h-16 rounded-3xl ring-1', win ? 'bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-white/20' : match.result === 'LOSS' ? 'bg-gradient-to-br from-[#f87171] to-[#ef4444] ring-white/20' : 'bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-white/20')}>
                {win ? <Trophy className="w-7 h-7 text-white" /> : match.result === 'LOSS' ? <Crosshair className="w-7 h-7 text-white" /> : <Minus className="w-7 h-7 text-white" />}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-1">{details?.map || match.map}</p>
                {myScore != null && enemyScore != null ? (
                  <div className="flex items-center gap-3">
                    <span className={cn('font-display text-4xl font-bold tabular-nums', win ? 'text-emerald-300' : 'text-red-300')}>{myScore}</span>
                    <span className="text-white/25 font-display text-2xl">:</span>
                    <span className={cn('font-display text-4xl font-bold tabular-nums', !win && !draw ? 'text-emerald-300' : 'text-red-300')}>{enemyScore}</span>
                  </div>
                ) : (
                  <p className="font-display text-2xl font-bold">{match.result === 'WIN' ? 'Wygrana' : match.result === 'LOSS' ? 'Przegrana' : 'Remis'}</p>
                )}
                {match.eloChange !== 0 && (
                  <p className={cn('text-sm font-bold mt-1 tabular-nums flex items-center gap-1', match.eloChange > 0 ? 'text-[#34d399]' : 'text-red-300')}>
                    {match.eloChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {match.eloChange > 0 ? '+' : ''}{match.eloChange} ELO
                  </p>
                )}
              </div>
            </div>
            <div className="md:ml-auto flex flex-wrap items-center gap-2">
              {match.source === 'FACEIT' && (
                <span className="inline-flex items-center gap-2 text-xs text-[#c4b5fd] bg-[#a78bfa]/[0.1] border border-[#a78bfa]/25 rounded-full px-3 py-1.5">
                  <Bot className="w-3.5 h-3.5" /> Mecz z Faceita
                </span>
              )}
              {match.faceitUrl && (
                <a
                  href={match.faceitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white btn-darey rounded-full px-4 py-1.5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Zobacz mecz na Faceit
                </a>
              )}
              {!match.faceitUrl && match.leetifyUrl && (
                <a
                  href={match.leetifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-white/70 glass rounded-full px-4 py-1.5 hover:text-white transition-all duration-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Zobacz na Leetify
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ===== KEY STATS ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Kills" value={String(me?.kills ?? match.kills ?? '—')} icon={Crosshair} accent="#c4b5fd" />
          <Stat label="Deaths" value={String(me?.deaths ?? match.deaths ?? '—')} icon={TrendingDown} accent="#f87171" />
          <Stat label="K/D" value={me?.kdRatio != null ? me.kdRatio.toFixed(2) : match.kills != null && match.deaths ? (match.kills / match.deaths).toFixed(2) : '—'} icon={Swords} accent="#34d399" />
          <Stat label="HS" value={me?.hsPercent != null ? me.hsPercent.toFixed(1) + '%' : match.accuracyHead != null ? match.accuracyHead.toFixed(1) + '%' : '—'} icon={Target} accent="#fbbf24" />
          <Stat label="ADR" value={me?.adr != null ? Math.round(me.adr).toString() : '—'} icon={Flame} accent="#f97316" hint="śr. obrażenia na rundę" />
          <Stat label="Rating" value={me?.rating != null ? me.rating.toFixed(3) : match.leetifyRating != null ? match.leetifyRating.toFixed(3) : '—'} icon={Zap} accent="#a78bfa" hint="Leetify" />
        </div>

        {me && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Assists" value={String(me.assists ?? '—')} icon={Crown} />
            <Stat label="MVPs" value={String(me.mvps ?? '—')} icon={Trophy} accent="#fbbf24" />
            <Stat label="DMG łącznie" value={me.total_damage != null ? String(Math.round(me.total_damage)) : '—'} icon={Flame} accent="#fb923c" />
            <Stat label="DPR" value={me.dpr != null ? me.dpr.toFixed(1) : '—'} icon={Timer} accent="#38bdf8" hint="śr. obrażenia na śmierć" />
          </div>
        )}

        {/* ===== DETAILED SECTIONS ===== */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Aim & accuracy */}
          <Section title="Celność i aim" icon={Target}>
            <div className="space-y-3">
              {[
                { label: 'Pre-aim', value: me?.preaim != null ? me.preaim.toFixed(1) + '%' : match.preaim != null ? match.preaim.toFixed(1) + '%' : null },
                { label: 'Reakcja', value: me?.reaction_time != null ? Math.round(me.reaction_time * 1000) + ' ms' : match.reactionMs != null ? match.reactionMs + ' ms' : null, bad: me?.reaction_time != null && me.reaction_time > 0.35 },
                { label: 'Celność ogólna', value: pct(me?.accuracy), },
                { label: 'Celność (widziany wróg)', value: me?.accuracy_enemy_spotted != null ? pct(me.accuracy_enemy_spotted) : match.accuracyEnemySpotted != null ? match.accuracyEnemySpotted.toFixed(1) + '%' : null },
                { label: 'Celność w głowę', value: pct(me?.accuracy_head) },
                { label: 'Spray', value: me?.spray_accuracy != null ? pct(me.spray_accuracy) : match.sprayAccuracy != null ? match.sprayAccuracy.toFixed(1) + '%' : null },
                { label: 'Counter-strafing (dobre strzały)', value: pct(me?.counter_strafing_shots_good_ratio) },
              ].map((row) => row.value != null && (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5">
                  <span className="text-sm text-white/60">{row.label}</span>
                  <span className={cn('text-sm font-bold tabular-nums', (row as any).bad ? 'text-red-300' : 'text-white/90')}>{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Utility */}
          <Section title="Utility i granaty" icon={Shield}>
            <div className="space-y-3">
              {[
                { label: 'Flashy rzucone', value: me?.flashbang_thrown },
                { label: 'Flashy oślepiające wrogów', value: me?.flashbang_hit_foe },
                { label: 'Flashy prowadzące do fraga', value: me?.flashbang_leading_to_kill },
                { label: 'HE rzucone', value: me?.he_thrown },
                { label: 'Molotovy rzucone', value: me?.molotov_thrown },
                { label: 'Smoki rzucone', value: me?.smoke_thrown },
                { label: 'Utility przy śmierci (avg)', value: me?.utility_on_death_avg != null ? Math.round(me.utility_on_death_avg) + ' $' : null },
              ].map((row) => row.value != null && (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5">
                  <span className="text-sm text-white/60">{row.label}</span>
                  <span className="text-sm font-bold text-white/90 tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Multi-kills */}
          <Section title="Serie fragów" icon={Flame}>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: '1k', value: me?.multi1k, color: '#a78bfa' },
                { label: '2k', value: me?.multi2k, color: '#38bdf8' },
                { label: '3k', value: me?.multi3k, color: '#34d399' },
                { label: '4k', value: me?.multi4k, color: '#fbbf24' },
                { label: '5k', value: me?.multi5k, color: '#f87171' },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                  <p className="font-display text-2xl font-bold tabular-nums" style={{ color: m.color }}>{m.value ?? '—'}</p>
                  <p className="text-[10px] text-white/40 font-medium mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
            {me?.rounds_count != null && (
              <div className="mt-3 flex items-center gap-4 text-xs text-white/50">
                <span>Rund: {me.rounds_count}</span>
                <span className="text-emerald-300/80">Wygrane: {me.rounds_won ?? '—'}</span>
                <span className="text-red-300/80">Przegrane: {me.rounds_lost ?? '—'}</span>
              </div>
            )}
          </Section>

          {/* Trades */}
          <Section title="Trade'y" icon={Swords}>
            <div className="space-y-3">
              {[
                { label: 'Trade kille — okazje', value: me?.trade_kills_attempts != null ? me.trade_kills_attempts : null },
                { label: 'Trade kille — udane', value: me?.trade_kills_succeed },
                { label: 'Śmierci do trade — udane', value: me?.traded_deaths_succeed },
              ].map((row) => row.value != null && (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5">
                  <span className="text-sm text-white/60">{row.label}</span>
                  <span className="text-sm font-bold text-white/90 tabular-nums">{row.value}</span>
                </div>
              ))}
              {me?.trade_kills_attempts != null && (
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2.5">
                  <span className="text-sm text-white/60">Skuteczność trade'y</span>
                  <span className={cn('text-sm font-bold tabular-nums', (me.trade_kills_succeed ?? 0) >= (me.trade_kills_attempts ?? 1) / 2 ? 'text-[#34d399]' : 'text-red-300')}>
                    {((me.trade_kills_succeed ?? 0) / Math.max(1, me.trade_kills_attempts ?? 1) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* ===== AI ANALYSIS ===== */}
        {match.reflection && (
          <div className="glass-card rise-in relative rounded-3xl p-6 overflow-hidden border border-[#a78bfa]/20">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-display text-lg font-semibold text-white/90">Analiza AI trenera</h2>
            </div>
            <p className="text-sm text-white/65 leading-relaxed">{match.reflection}</p>
          </div>
        )}

        {/* ===== PLAYERS TABLE ===== */}
        {details && players.length > 0 && (
          <div className="glass-card rise-in relative rounded-3xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] ring-1 ring-white/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-display text-lg font-semibold text-white/90">Statystyki graczy w meczu</h2>
              </div>
              {players.length > 10 && (
                <button onClick={() => setShowAllPlayers(!showAllPlayers)} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition">
                  {showAllPlayers ? 'Pokaż mniej' : 'Pokaż wszystkich'} {showAllPlayers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {myPlayers.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-emerald-300/70 font-semibold mb-2">Twoja drużyna {myScore != null ? `(${myScore})` : ''}</p>
                <PlayerTable players={myPlayers} mySteamId={me?.steam64Id ?? null} compact={!showAllPlayers} />
              </>
            )}
            {enemyPlayers.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-red-300/70 font-semibold mt-6 mb-2">Przeciwnicy {enemyScore != null ? `(${enemyScore})` : ''}</p>
                <PlayerTable players={enemyPlayers} mySteamId={me?.steam64Id ?? null} compact={!showAllPlayers} />
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

function PlayerTable({ players, mySteamId, compact }: { players: PlayerStats[]; mySteamId: string | null; compact: boolean }) {
  const shown = compact ? players.slice(0, 5) : players
  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-white/35">
            <th className="py-2 pr-3 font-medium">Gracz</th>
            <th className="py-2 pr-3 font-medium text-center">K</th>
            <th className="py-2 pr-3 font-medium text-center">D</th>
            <th className="py-2 pr-3 font-medium text-center">A</th>
            <th className="py-2 pr-3 font-medium text-center">K/D</th>
            <th className="py-2 pr-3 font-medium text-center hidden sm:table-cell">HS%</th>
            <th className="py-2 pr-3 font-medium text-center hidden md:table-cell">ADR</th>
            <th className="py-2 pr-3 font-medium text-center hidden md:table-cell">Rating</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((p, i) => {
            const isMe = p.steam64Id != null && p.steam64Id === mySteamId
            return (
              <tr key={p.steam64Id || i} className={cn('border-t border-white/[0.04]', isMe && 'bg-[#a78bfa]/[0.08]')}>
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2 min-w-0">
                    {isMe && <Crown className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" />}
                    <span className={cn('truncate max-w-[140px]', isMe ? 'font-bold text-[#c4b5fd]' : 'text-white/80')}>{p.name || '—'}</span>
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-center tabular-nums text-white/85">{p.kills ?? '—'}</td>
                <td className="py-2.5 pr-3 text-center tabular-nums text-white/85">{p.deaths ?? '—'}</td>
                <td className="py-2.5 pr-3 text-center tabular-nums text-white/50">{p.assists ?? '—'}</td>
                <td className={cn('py-2.5 pr-3 text-center tabular-nums font-semibold', (p.kdRatio ?? 0) >= 1 ? 'text-[#34d399]' : 'text-red-300')}>{p.kdRatio != null ? p.kdRatio.toFixed(2) : '—'}</td>
                <td className="py-2.5 pr-3 text-center tabular-nums text-white/60 hidden sm:table-cell">{p.hsPercent != null ? p.hsPercent.toFixed(0) + '%' : '—'}</td>
                <td className="py-2.5 pr-3 text-center tabular-nums text-white/60 hidden md:table-cell">{p.adr != null ? Math.round(p.adr) : '—'}</td>
                <td className={cn('py-2.5 pr-3 text-center tabular-nums font-semibold hidden md:table-cell', (p.rating ?? 0) > 0 ? 'text-[#c4b5fd]' : 'text-white/40')}>{p.rating != null ? p.rating.toFixed(2) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
