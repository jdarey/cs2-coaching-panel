'use client'

import { useMemo, useState } from 'react'
import { formatDate, formatDateTime, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn, spotlightHandler } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { CountUp } from '@/components/count-up'
import {
  TrendingUp,
  Trophy,
  Target,
  Clock,
  PlayCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calendar,
  Video,
  Flame,
  Activity,
  Award,
} from 'lucide-react'

interface Progress {
  id: string
  status: string
  progress: number
  note: string | null
  watchedAt: string | null
  video: { id: string; title: string; tags: { tag: { id: string; name: string; color: string } }[] }
  session?: { id: string; title: string; scheduledAt: string | null }
}

interface Session {
  id: string
  title: string
  status: string
  scheduledAt: string | null
  createdAt: string
}

interface Tag {
  id: string
  name: string
  color: string
  icon: string | null
}

interface StudentProgressClientProps {
  initialProgress: Progress[]
  initialSessions: Session[]
  initialTags: Tag[]
}

export function StudentProgressClient({ initialProgress, initialSessions, initialTags }: StudentProgressClientProps) {
  const progress = initialProgress
  const sessions = initialSessions
  const tags = initialTags

  
  // Overall stats
  const stats = useMemo(
    () => ({
      total: progress.length,
      pending: progress.filter((p) => p.status === 'PENDING').length,
      watching: progress.filter((p) => p.status === 'WATCHING').length,
      watched: progress.filter((p) => p.status === 'WATCHED').length,
      implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === 'COMPLETED').length,
    }),
    [progress, sessions],
  )

  const completionRate = stats.total > 0 ? Math.round(((stats.watched + stats.implemented) / stats.total) * 100) : 0

  // Active days = unique days with watchedAt present
  const activeDays = useMemo(() => {
    const set = new Set<string>()
    progress.forEach((p) => {
      if (p.watchedAt) {
        const d = new Date(p.watchedAt)
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      }
    })
    return set.size
  }, [progress])

  // Tag progress
  const tagProgress = useMemo(() => {
    const map: Record<string, { total: number; completed: number; watching: number }> = {}

    progress.forEach((p) => {
      p.video.tags.forEach((vt) => {
        const tagId = vt.tag.id
        if (!map[tagId]) map[tagId] = { total: 0, completed: 0, watching: 0 }
        map[tagId].total++
        if (p.status === 'WATCHED' || p.status === 'IMPLEMENTED') map[tagId].completed++
        if (p.status === 'WATCHING') map[tagId].watching++
      })
    })

    return Object.entries(map)
      .map(([tagId, data]) => {
        const tag = tags.find((t) => t.id === tagId)
        return {
          tag,
          ...data,
          rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        }
      })
      .sort((a, b) => b.rate - a.rate)
  }, [progress, tags])

  // Weekly activity (last 8 weeks) - poprawione: tydzień = poniedziałek-niedziela, etykieta to data poniedziałku
  const weeklyActivity = useMemo(() => {
    const toMondayKey = (d: Date) => {
      const x = new Date(d)
      x.setHours(12, 0, 0, 0)
      const day = x.getDay()
      const diff = x.getDate() - day + (day === 0 ? -6 : 1)
      x.setDate(diff)
      return x.toISOString().slice(0, 10)
    }
    const formatLabel = (iso: string) => {
      const d = new Date(iso + 'T12:00:00')
      return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
    }
    const weeks: Record<string, { watched: number; implemented: number; label: string }> = {}
    const now = new Date()
    // 8 poniedziałków wstecz
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const key = toMondayKey(d)
      const monday = new Date(key + 'T12:00:00')
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
      const label = `${monday.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}`
      weeks[key] = { watched: 0, implemented: 0, label }
    }
    progress
      .filter((p) => p.watchedAt && (p.status === 'WATCHED' || p.status === 'IMPLEMENTED'))
      .forEach((p) => {
        const key = toMondayKey(new Date(p.watchedAt!))
        if (weeks[key]) {
          if (p.status === 'IMPLEMENTED') weeks[key].implemented++
          else weeks[key].watched++
        }
      })
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({ week: key, ...data }))
  }, [progress])

  // chart data derived from weekly activity
  const chartData = useMemo(() => {
    const max = Math.max(1, ...weeklyActivity.map((w) => w.watched + w.implemented))
    return weeklyActivity.map((w, i) => ({
      idx: i,
      week: w.week,
      label: (w as any).label,
      total: w.watched + w.implemented,
      watched: w.watched,
      implemented: w.implemented,
      pct: Math.round(((w.watched + w.implemented) / max) * 100),
    }))
  }, [weeklyActivity])

  const totalChartEvents = useMemo(() => chartData.reduce((s, c) => s + c.total, 0), [chartData])
  const maxWeekVal = useMemo(() => Math.max(1, ...chartData.map(c => c.total)), [chartData])

  // Recent activity
  const recentActivity = progress.slice(0, 10)

  // circular progress geometry
  const RING_R = 86
  const RING_C = 2 * Math.PI * RING_R
  const ringOffset = RING_C - (completionRate / 100) * RING_C

  // hoverable chart point state
  const [hoverPoint, setHoverPoint] = useState<number | null>(null)

  // status accent colors
  const statusAccent: Record<string, string> = {
    PENDING: 'text-amber-300',
    WATCHING: 'text-blue-300',
    WATCHED: 'text-emerald-300',
    IMPLEMENTED: 'text-fuchsia-300',
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 space-y-8">
        <PageHeader
          icon={TrendingUp}
          label="Panel postępu"
          title="Mój postęp"
          subtitle="Przegląd Twoich osiągnięć i obszarów do poprawy — śledź każdy krok na drodze do mistrzostwa."
        />

        {/* Hero stats row */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Obejrzane */}
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '0ms' }}
            onMouseMove={spotlightHandler}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/30">
                <Video className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <TrendingUp className="w-4 h-4 text-white/30" />
            </div>
            <p className="mt-6 font-display text-3xl font-bold text-white">
              {stats.watched + stats.implemented}
            </p>
            <p className="mt-1 text-sm text-white/45">Obejrzane filmy</p>
          </div>

          {/* Wdrożone */}
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '80ms' }}
            onMouseMove={spotlightHandler}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] ring-1 ring-white/30">
                <Trophy className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <Award className="w-4 h-4 text-white/30" />
            </div>
            <p className="mt-6 font-display text-3xl font-bold text-white"><CountUp value={stats.implemented} /></p>
            <p className="mt-1 text-sm text-white/45">Wdrożone do gry</p>
          </div>

          {/* % ukończenia */}
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '160ms' }}
            onMouseMove={spotlightHandler}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] ring-1 ring-white/30">
                <Target className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/30">cel</span>
            </div>
            <p className="mt-6 font-display text-3xl font-bold text-white">
              {completionRate}
              <span className="text-xl text-white/40">%</span>
            </p>
            <p className="mt-1 text-sm text-white/45">Poziom ukończenia</p>
          </div>

          {/* Aktywne dni */}
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '240ms' }}
            onMouseMove={spotlightHandler}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-1 ring-white/30">
                <Flame className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <Activity className="w-4 h-4 text-white/30" />
            </div>
            <p className="mt-6 font-display text-3xl font-bold text-white">{activeDays}</p>
            <p className="mt-1 text-sm text-white/45">Aktywne dni</p>
          </div>
        </section>

        {/* Circular + status breakdown + sessions card */}
        <section className="grid gap-5 lg:grid-cols-3">
          {/* Big circular progress */}
          <div className="glass-liquid border-glow rise-in rounded-3xl p-8 relative overflow-hidden lg:col-span-1 flex flex-col items-center justify-center"
            style={{ animationDelay: '120ms' }}
          >
            <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#8b5cf6]/15 blur-3xl animate-aurora-slow pointer-events-none" />
            <div className="flex items-center gap-2 self-start mb-2">
              <TrendingUp className="w-4 h-4 text-[#c4b5fd]" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold">Postęp oglądania</span>
            </div>

            <div className="relative my-2">
              <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <circle cx="110" cy="110" r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" />
                <circle
                  cx="110"
                  cy="110"
                  r={RING_R}
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-5xl font-bold text-gradient-mesh">{completionRate}%</span>
                <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold">ukończono</span>
              </div>
            </div>

            <p className="mt-3 text-sm text-white/45 text-center">
              <span className="text-white/70 font-medium">{stats.watched + stats.implemented}</span> z{' '}
              <span className="text-white/70 font-medium">{stats.total}</span> filmów obejrzanych
            </p>
          </div>

          {/* Status breakdown card */}
          <div className="glass-liquid rise-in rounded-3xl p-7 relative overflow-hidden lg:col-span-1 flex flex-col"
            style={{ animationDelay: '180ms' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-[#c4b5fd]" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold">Rozkład statusów</span>
            </div>

            <div className="flex flex-col gap-5 flex-1">
              {[
                { label: 'Do oglądania', value: stats.pending, color: 'from-[#fbbf24] to-[#f59e0b]', text: 'text-amber-300', key: 'PENDING' },
                { label: 'W trakcie', value: stats.watching, color: 'from-[#a78bfa] to-[#3b82f6]', text: 'text-blue-300', key: 'WATCHING' },
                { label: 'Obejrzane', value: stats.watched, color: 'from-[#34d399] to-[#10b981]', text: 'text-emerald-300', key: 'WATCHED' },
                { label: 'Wdrożone', value: stats.implemented, color: 'from-[#8b5cf6] to-[#a78bfa]', text: 'text-fuchsia-300', key: 'IMPLEMENTED' },
              ].map((row) => {
                const pct = stats.total > 0 ? Math.round((row.value / stats.total) * 100) : 0
                return (
                  <div key={row.key}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm text-white/70 font-medium">{row.label}</span>
                      <span className="text-sm font-display font-semibold">
                        <span className={statusAccent[row.key] || 'text-white/70'}>{row.value}</span>
                        <span className="text-white/30 text-xs ml-1.5">{pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', row.color)}
                        style={{ width: `${pct}%`, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sessions card */}
          <div className="glass-liquid rise-in rounded-3xl p-7 relative overflow-hidden lg:col-span-1 flex flex-col"
            style={{ animationDelay: '240ms' }}
          >
            <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-[#8b5cf6]/12 blur-3xl animate-aurora pointer-events-none" />
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-4 h-4 text-[#c4b5fd]" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold">Sesje z trenerem</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06]">
                <p className="font-display text-3xl font-bold text-white"><CountUp value={stats.totalSessions} /></p>
                <p className="text-xs text-white/45 mt-1">Wszystkie sesje</p>
              </div>
              <div className="rounded-2xl p-4 bg-white/[0.03] border border-[#34d399]/15">
                <p className="font-display text-3xl font-bold text-emerald-300"><CountUp value={stats.completedSessions} /></p>
                <p className="text-xs text-white/45 mt-1">Zakończone</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-end">
              <div className="flex items-center gap-2 mb-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span className="text-white/70 font-medium">Realizacja sesji</span>
                <span className="ml-auto font-display font-semibold text-emerald-300">
                  {stats.totalSessions > 0 ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#34d399] to-[#10b981]"
                  style={{
                    width: `${stats.totalSessions > 0 ? (stats.completedSessions / stats.totalSessions) * 100 : 0}%`,
                    transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Activity chart */}
        <section className="glass-liquid rise-in rounded-3xl p-7 relative overflow-hidden"
          style={{ animationDelay: '120ms' }}
        >
          <div className="absolute -top-24 left-1/3 w-72 h-72 rounded-full bg-[#8b5cf6]/10 blur-3xl animate-aurora-slow pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/30">
                <TrendingUp className="w-4 h-4 text-white" strokeLinecap="round" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Aktywność w czasie</h2>
                <p className="text-xs text-white/45">Ostatnie 8 tygodni — obejrzane i wdrożone</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-white/55">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c4b5fd]" /> Obejrzane
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/55">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]" /> Wdrożone
              </span>
            </div>
          </div>

          {totalChartEvents > 0 ? (
            <div>
              {/* Podsumowanie nad wykresem - od razu widać liczby */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                  <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Razem</p>
                  <p className="font-display text-xl font-bold text-white mt-1">{totalChartEvents}</p>
                  <p className="text-[11px] text-white/30">filmów / 8 tyg.</p>
                </div>
                <div className="rounded-2xl bg-[#c4b5fd]/10 border border-[#c4b5fd]/20 p-3 text-center">
                  <p className="text-[11px] uppercase tracking-widest text-[#c4b5fd]/70 font-semibold">Obejrzane</p>
                  <p className="font-display text-xl font-bold text-[#c4b5fd]">{chartData.reduce((s,c)=>s+c.watched,0)}</p>
                  <p className="text-[11px] text-white/30">średnio {Math.round(chartData.reduce((s,c)=>s+c.watched,0)/8)}/tydz.</p>
                </div>
                <div className="rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 p-3 text-center">
                  <p className="text-[11px] uppercase tracking-widest text-[#a78bfa]/70 font-semibold">Wdrożone</p>
                  <p className="font-display text-xl font-bold text-[#a78bfa]">{chartData.reduce((s,c)=>s+c.implemented,0)}</p>
                  <p className="text-[11px] text-white/30">średnio {Math.round(chartData.reduce((s,c)=>s+c.implemented,0)/8)}/tydz.</p>
                </div>
              </div>

              {/* Słupkowy wykres - dużo bardziej czytelny niż linia */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="flex gap-2 h-[180px] items-end">
                  {/* oś Y */}
                  <div className="flex flex-col justify-between h-full py-1 pr-2 text-right shrink-0" style={{ width: 24 }}>
                    <span className="text-[10px] text-white/30 font-medium">{maxWeekVal}</span>
                    <span className="text-[10px] text-white/30 font-medium">{Math.ceil(maxWeekVal/2)}</span>
                    <span className="text-[10px] text-white/30 font-medium">0</span>
                  </div>
                  <div className="flex-1 flex gap-2 h-full items-end">
                    {chartData.map((d, i) => {
                      const isHover = hoverPoint === i
                      const hTotal = maxWeekVal > 0 ? (d.total / maxWeekVal) * 100 : 0
                      const hWatched = d.total > 0 ? (d.watched / d.total) * 100 : 0
                      const isEmpty = d.total === 0
                      return (
                        <div key={d.idx} className="flex-1 flex flex-col items-center gap-2 min-w-0" onMouseEnter={() => setHoverPoint(i)} onMouseLeave={() => setHoverPoint(null)}>
                          <div className="relative w-full flex flex-col justify-end items-center" style={{ height: 140 }}>
                            {/* liczba nad słupkiem */}
                            <span className={`text-[11px] font-bold tabular-nums mb-1 ${isEmpty ? 'text-white/20' : isHover ? 'text-white' : 'text-white/60'}`}>{d.total || '·'}</span>
                            {/* słupek */}
                            <div className={`w-full max-w-[48px] mx-auto rounded-t-xl overflow-hidden flex flex-col justify-end border ${isEmpty ? 'bg-white/[0.03] border-white/[0.04] border-dashed' : isHover ? 'border-white/20 shadow-[0_4px_16px_rgba(139,92,246,0.3)]' : 'border-white/10'} transition-all`} style={{ height: isEmpty ? 24 : `${Math.max(12, hTotal)}%`, minHeight: isEmpty ? 24 : 12 }}>
                              {!isEmpty && (
                                <>
                                  <div className="w-full bg-gradient-to-t from-[#a78bfa] to-[#8b5cf6]" style={{ height: `${100 - hWatched}%`, minHeight: d.implemented > 0 ? 6 : 0 }} title={`${d.implemented} wdroż.`} />
                                  <div className="w-full bg-gradient-to-t from-[#c4b5fd] to-[#ddd6fe]" style={{ height: `${hWatched}%`, minHeight: d.watched > 0 ? 6 : 0 }} title={`${d.watched} obejrz.`} />
                                </>
                              )}
                            </div>
                            {/* tooltip on hover */}
                            {isHover && (
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none px-3 py-2 rounded-xl bg-[#0a0c0e] border border-white/15 shadow-xl whitespace-nowrap">
                                <p className="text-[11px] font-semibold text-white">{d.label} <span className="text-white/40 font-normal">{d.week}</span></p>
                                <p className="text-xs text-[#c4b5fd] mt-1">● {d.watched} obejrzane</p>
                                <p className="text-xs text-[#a78bfa]">● {d.implemented} wdrożone</p>
                                <p className="text-[11px] text-white/30 mt-1 border-t border-white/10 pt-1">Razem: <b className="text-white">{d.total}</b></p>
                              </div>
                            )}
                          </div>
                          <span className={`text-[10px] font-medium truncate w-full text-center ${isHover ? 'text-white' : 'text-white/40'}`}>{d.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* oś X label */}
                <div className="mt-3 flex items-center justify-between text-[10px] text-white/25 px-7">
                  <span>8 tyg. temu</span>
                  <span>dziś</span>
                </div>
              </div>

              {/* Tabela tygodni - pełna przejrzystość */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="grid grid-cols-[1fr_70px_70px_60px] gap-2 px-4 py-2 text-[10px] uppercase tracking-widest text-white/30 font-semibold bg-white/[0.03] border-b border-white/[0.06]">
                  <span>Tydzień (pon.)</span>
                  <span className="text-center">Obejrzane</span>
                  <span className="text-center">Wdrożone</span>
                  <span className="text-right">Razem</span>
                </div>
                {chartData.map((d) => (
                  <div key={d.idx} className={`grid grid-cols-[1fr_70px_70px_60px] gap-2 px-4 py-2.5 text-sm items-center border-b border-white/[0.03] last:border-0 ${d.total > 0 ? 'bg-white/[0.01] hover:bg-white/[0.04]' : ''}`}>
                    <span className="text-white/70 font-medium">{d.label} <span className="text-white/25 text-xs ml-1">{d.week}</span></span>
                    <span className="text-center"><span className="inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-xs font-bold bg-[#c4b5fd]/15 text-[#c4b5fd] border border-[#c4b5fd]/20">{d.watched}</span></span>
                    <span className="text-center"><span className="inline-flex min-w-[28px] justify-center rounded-full px-2 py-0.5 text-xs font-bold bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/20">{d.implemented}</span></span>
                    <span className="text-right font-display font-bold text-white">{d.total || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] px-6 py-10 flex flex-col items-center text-center">
              <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa]/30 to-[#8b5cf6]/10 ring-1 ring-white/15 mb-4">
                <Activity className="w-6 h-6 text-[#c4b5fd]" />
              </div>
              <p className="font-display text-base font-semibold text-white">Brak wystarczających danych do wykresu</p>
              <p className="text-sm text-white/45 mt-1 max-w-md">
                Zacznij oglądać filmy treningowe, aby zobaczyć swój trend aktywności w czasie.
              </p>
              {/* placeholder smooth gradient chart */}
              <svg viewBox="0 0 800 120" className="w-full h-24 mt-6 opacity-40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="phFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(124,111,255,0.3)" />
                    <stop offset="100%" stopColor="rgba(124,111,255,0)" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 90 C 120 40, 220 60, 320 50 S 520 70, 640 30 S 760 50, 800 20 L 800 120 L 0 120 Z"
                  fill="url(#phFill)"
                />
                <path
                  d="M 0 90 C 120 40, 220 60, 320 50 S 520 70, 640 30 S 760 50, 800 20"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </section>

        {/* Tags progress */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/30">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Postęp po tagach błędów</h2>
              <p className="text-xs text-white/45">Które obszary gry opanowujesz najlepiej</p>
            </div>
          </div>

          {tagProgress.length === 0 ? (
            <div className="glass-liquid rounded-3xl py-14 px-6 relative overflow-hidden text-center flex flex-col items-center"
            >
              <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa]/25 to-[#8b5cf6]/10 ring-1 ring-white/15 mb-4">
                <Target className="w-7 h-7 text-[#c4b5fd]" />
              </div>
              <p className="font-display text-base font-semibold text-white">Brak danych o tagach</p>
              <p className="text-sm text-white/45 mt-1 max-w-md">
                Oglądaj filmy, by zobaczyć swój postęp wzdłuż poszczególnych tagów błędów.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tagProgress.map((item, i) => (
                <div
                  key={item.tag?.id || item.tag?.name} className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onMouseMove={spotlightHandler}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="relative w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0 ring-1 ring-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${item.tag?.color || '#8b5cf6'}40, ${item.tag?.color || '#8b5cf6'}10)`,
                      }}
                    >
                      <Target className="w-5 h-5" style={{ color: item.tag?.color || '#c4b5fd' }} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-semibold text-white truncate">{item.tag?.name || 'Nieznany tag'}</h4>
                      <p className="text-xs text-white/45 mt-0.5">
                        <span className="text-white/70 font-medium">{item.completed}</span>
                        <span className="text-white/30">/{item.total}</span> zakończonych
                        {item.watching > 0 && (
                          <span className="ml-2 text-blue-300">{item.watching} w trakcie</span>
                        )}
                      </p>
                    </div>
                    <div className="font-display text-xl font-bold text-gradient-mesh">{item.rate}%</div>
                  </div>

                  <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full btn-darey"
                      style={{ width: `${item.rate}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity timeline */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/30">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Ostatnia aktywność</h2>
              <p className="text-xs text-white/45">Twoja najnowsza ścieżka treningowa</p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div className="glass-liquid rounded-3xl py-14 px-6 relative overflow-hidden text-center flex flex-col items-center"
            >
              <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa]/25 to-[#8b5cf6]/10 ring-1 ring-white/15 mb-4">
                <PlayCircle className="w-7 h-7 text-[#c4b5fd]" />
              </div>
              <p className="font-display text-base font-semibold text-white">Brak ostatniej aktywności</p>
              <p className="text-sm text-white/45 mt-1 max-w-md">
                Filmy, które obejrzysz, pojawią się tutaj w postaci interaktywnej osi czasu.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* timeline rail */}
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#a78bfa]/40 via-white/[0.08] to-transparent" />

              <ul className="space-y-3">
                {recentActivity.map((p, i) => {
                  const accent =
                    p.status === 'IMPLEMENTED'
                      ? 'text-fuchsia-300'
                      : p.status === 'WATCHED'
                        ? 'text-emerald-300'
                        : p.status === 'WATCHING'
                          ? 'text-blue-300'
                          : 'text-amber-300'
                  const dot =
                    p.status === 'IMPLEMENTED'
                      ? 'from-[#a78bfa] to-[#8b5cf6]'
                      : p.status === 'WATCHED'
                        ? 'from-[#34d399] to-[#10b981]'
                        : p.status === 'WATCHING'
                          ? 'from-[#a78bfa] to-[#3b82f6]'
                          : 'from-[#fbbf24] to-[#f59e0b]'
                  return (
                    <li
                      key={p.id} className="group glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden"
                      style={{ animationDelay: `${i * 50}ms` }}
                      onMouseMove={spotlightHandler}
                    >
                      <div className="flex items-start gap-4">
                        {/* node */}
                        <div className="relative flex-shrink-0 mt-1">
                          <div
                            className={cn(
                              'relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br ring-1 ring-white/25',
                              dot,
                            )}
                          >
                            <Video className="w-4 h-4 text-white" strokeWidth={2.2} />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-display font-semibold text-white truncate">{p.video.title}</h4>
                              <p className="text-xs text-white/45 truncate mt-0.5">
                                {p.session?.title || 'Sesja nieprzypisana'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span
                                className={cn(
                                  'text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]',
                                  accent,
                                )}
                              >
                                {VIDEO_STATUS_LABELS[p.status] || p.status}
                              </span>
                              {p.watchedAt && (
                                <span className="text-[11px] text-white/40 hidden sm:inline">
                                  {formatDateTime(p.watchedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          {p.progress > 0 && (
                            <div className="mt-3 max-w-sm">
                              <div className="flex items-center justify-between text-[10px] text-white/40 mb-1 font-medium uppercase tracking-wide">
                                <span>Postęp filmu</span>
                                <span className="text-white/70">{p.progress}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                                <div
                                  className="h-full rounded-full btn-darey"
                                  style={{ width: `${p.progress}%`, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }}
                                />
                              </div>
                            </div>
                          )}

                          {p.note && (
                            <p className="mt-3 text-sm text-white/55 italic border-l-2 border-[#a78bfa]/30 pl-3">
                              &ldquo;{p.note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="absolute right-5 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="w-4 h-4 text-white/40" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Footer flourish */}
        <div className="pt-4 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="uppercase tracking-[0.25em]">Twoja droga do mistrzostwa</span>
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </StudentLayout>
  )
}
