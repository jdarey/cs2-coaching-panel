'use client'

import { useMemo, useState } from 'react'
import { formatDate, formatDateTime, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
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

  const handleCardMouse = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

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

  // Weekly activity (last 8 weeks)
  const weeklyActivity = useMemo(() => {
    const weeks: Record<string, { watched: number; implemented: number }> = {}
    const now = new Date()

    for (let i = 7; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i * 7)
      const weekKey = `${date.getFullYear()}-W${String(Math.ceil(date.getDate() / 7)).padStart(2, '0')}`
      weeks[weekKey] = { watched: 0, implemented: 0 }
    }

    progress
      .filter((p) => p.watchedAt && (p.status === 'WATCHED' || p.status === 'IMPLEMENTED'))
      .forEach((p) => {
        const date = new Date(p.watchedAt!)
        const weekKey = `${date.getFullYear()}-W${String(Math.ceil(date.getDate() / 7)).padStart(2, '0')}`
        if (weeks[weekKey]) {
          if (p.status === 'IMPLEMENTED') weeks[weekKey].implemented++
          else weeks[weekKey].watched++
        }
      })

    return Object.entries(weeks).map(([week, data]) => ({ week, ...data }))
  }, [progress])

  // chart data derived from weekly activity
  const chartData = useMemo(() => {
    const max = Math.max(1, ...weeklyActivity.map((w) => w.watched + w.implemented))
    return weeklyActivity.map((w, i) => ({
      idx: i,
      week: w.week,
      total: w.watched + w.implemented,
      watched: w.watched,
      implemented: w.implemented,
      pct: Math.round(((w.watched + w.implemented) / max) * 100),
    }))
  }, [weeklyActivity])

  const totalChartEvents = useMemo(() => chartData.reduce((s, c) => s + c.total, 0), [chartData])

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
        {/* Header */}
        <header className="rise-in pt-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-[#8cffef] bg-[#2de5ca]/10 border border-[#2de5ca]/20">
              <Sparkles className="w-3 h-3" />
              Panel postępu
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-semibold">Mój postęp</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-gradient-violet">
            Mój postęp
          </h1>
          <p className="mt-2 text-white/45 max-w-2xl">
            Przegląd Twoich osiągnięć i obszarów do poprawy — śledź każdy krok na drodze do mistrzostwa.
          </p>
        </header>

        {/* Hero stats row */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Obejrzane */}
          <div
            onMouseMove={handleCardMouse}
            className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '0ms' }}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2] ring-1 ring-white/30 shadow-[0_8px_24px_-8px_rgba(124,111,255,0.6)]">
                <Video className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <TrendingUp className="w-4 h-4 text-white/30" />
            </div>
            <p className="mt-6 font-display text-3xl font-bold count-glow text-white">
              {stats.watched + stats.implemented}
            </p>
            <p className="mt-1 text-sm text-white/45">Obejrzane filmy</p>
          </div>

          {/* Wdrożone */}
          <div
            onMouseMove={handleCardMouse}
            className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '80ms' }}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2fb6a2] to-[#2de5ca] ring-1 ring-white/30 shadow-[0_8px_24px_-8px_rgba(45,229,202,0.6)]">
                <Trophy className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <Award className="w-4 h-4 text-white/30" />
            </div>
            <p className="mt-6 font-display text-3xl font-bold count-glow text-white">{stats.implemented}</p>
            <p className="mt-1 text-sm text-white/45">Wdrożone do gry</p>
          </div>

          {/* % ukończenia */}
          <div
            onMouseMove={handleCardMouse}
            className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '160ms' }}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2fb6a2] to-[#2de5ca] ring-1 ring-white/30 shadow-[0_8px_24px_-8px_rgba(90,79,255,0.6)]">
                <Target className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/30">cel</span>
            </div>
            <p className="mt-6 font-display text-3xl font-bold count-glow text-white">
              {completionRate}
              <span className="text-xl text-white/40">%</span>
            </p>
            <p className="mt-1 text-sm text-white/45">Poziom ukończenia</p>
          </div>

          {/* Aktywne dni */}
          <div
            onMouseMove={handleCardMouse}
            className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-6 relative overflow-hidden cursor-default"
            style={{ animationDelay: '240ms' }}
          >
            <div className="flex items-start justify-between">
              <div className="relative w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-1 ring-white/30 shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)]">
                <Flame className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <Activity className="w-4 h-4 text-white/30" />
            </div>
            <p className="mt-6 font-display text-3xl font-bold count-glow text-white">{activeDays}</p>
            <p className="mt-1 text-sm text-white/45">Aktywne dni</p>
          </div>
        </section>

        {/* Circular + status breakdown + sessions card */}
        <section className="grid gap-5 lg:grid-cols-3">
          {/* Big circular progress */}
          <div
            onMouseMove={handleCardMouse}
            className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-8 relative overflow-hidden lg:col-span-1 flex flex-col items-center justify-center"
            style={{ animationDelay: '120ms' }}
          >
            <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#2fb6a2]/15 blur-3xl animate-aurora-slow pointer-events-none" />
            <div className="flex items-center gap-2 self-start mb-2">
              <TrendingUp className="w-4 h-4 text-[#8cffef]" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold">Postęp oglądania</span>
            </div>

            <div className="relative my-2">
              <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90 drop-shadow-[0_0_30px_rgba(124,111,255,0.25)]">
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8cffef" />
                    <stop offset="50%" stopColor="#2fb6a2" />
                    <stop offset="100%" stopColor="#2fb6a2" />
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
          <div
            onMouseMove={handleCardMouse}
            className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-7 relative overflow-hidden lg:col-span-1 flex flex-col"
            style={{ animationDelay: '180ms' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-4 h-4 text-[#8cffef]" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold">Rozkład statusów</span>
            </div>

            <div className="flex flex-col gap-5 flex-1">
              {[
                { label: 'Do oglądania', value: stats.pending, color: 'from-[#fbbf24] to-[#f59e0b]', text: 'text-amber-300', key: 'PENDING' },
                { label: 'W trakcie', value: stats.watching, color: 'from-[#2de5ca] to-[#3b82f6]', text: 'text-blue-300', key: 'WATCHING' },
                { label: 'Obejrzane', value: stats.watched, color: 'from-[#34d399] to-[#10b981]', text: 'text-emerald-300', key: 'WATCHED' },
                { label: 'Wdrożone', value: stats.implemented, color: 'from-[#2fb6a2] to-[#2de5ca]', text: 'text-fuchsia-300', key: 'IMPLEMENTED' },
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
          <div
            onMouseMove={handleCardMouse}
            className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-7 relative overflow-hidden lg:col-span-1 flex flex-col"
            style={{ animationDelay: '240ms' }}
          >
            <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-[#2fb6a2]/12 blur-3xl animate-aurora pointer-events-none" />
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-4 h-4 text-[#8cffef]" />
              <span className="text-xs uppercase tracking-[0.2em] text-white/40 font-semibold">Sesje z trenerem</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06]">
                <p className="font-display text-3xl font-bold count-glow text-white">{stats.totalSessions}</p>
                <p className="text-xs text-white/45 mt-1">Wszystkie sesje</p>
              </div>
              <div className="rounded-2xl p-4 bg-white/[0.03] border border-[#34d399]/15">
                <p className="font-display text-3xl font-bold text-emerald-300">{stats.completedSessions}</p>
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
        <section
          onMouseMove={handleCardMouse}
          className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-7 relative overflow-hidden"
          style={{ animationDelay: '120ms' }}
        >
          <div className="absolute -top-24 left-1/3 w-72 h-72 rounded-full bg-[#2fb6a2]/10 blur-3xl animate-aurora-slow pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2] ring-1 ring-white/30">
                <TrendingUp className="w-4 h-4 text-white" strokeLinecap="round" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Aktywność w czasie</h2>
                <p className="text-xs text-white/45">Ostatnie 8 tygodni — obejrzane i wdrożone</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-white/55">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8cffef]" /> Obejrzane
              </span>
              <span className="inline-flex items-center gap-1.5 text-white/55">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2de5ca]" /> Wdrożone
              </span>
            </div>
          </div>

          {totalChartEvents > 0 ? (
            <div className="relative">
              <svg viewBox="0 0 800 260" className="w-full h-[260px]" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8cffef" />
                    <stop offset="50%" stopColor="#2fb6a2" />
                    <stop offset="100%" stopColor="#2fb6a2" />
                  </linearGradient>
                  <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(124,111,255,0.35)" />
                    <stop offset="100%" stopColor="rgba(124,111,255,0)" />
                  </linearGradient>
                  <linearGradient id="chartFillImpl" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(45,229,202,0.22)" />
                    <stop offset="100%" stopColor="rgba(45,229,202,0)" />
                  </linearGradient>
                </defs>

                {[0.25, 0.5, 0.75, 1].map((t) => (
                  <line
                    key={t}
                    x1="0"
                    x2="800"
                    y1={240 - 200 * t}
                    y2={240 - 200 * t}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}

                {/* area fill */}
                {(() => {
                  const pts = chartData.map((d, i) => {
                    const x = 40 + i * ((800 - 80) / Math.max(chartData.length - 1, 1))
                    const y = 240 - (d.pct / 100) * 200
                    return { x, y, d }
                  })
                  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                  return (
                    <>
                      <path d={`${linePath} L 760 240 L 40 240 Z`} fill="url(#chartFill)" />
                      <path d={linePath} fill="none" stroke="url(#chartStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((p, i) => (
                        <g
                          key={i}
                          onMouseEnter={() => setHoverPoint(i)}
                          onMouseLeave={() => setHoverPoint(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle cx={p.x} cy={p.y} r={hoverPoint === i ? 7 : 4.5} fill="#060606" stroke="url(#chartStroke)" strokeWidth="2.5" />
                        </g>
                      ))}
                    </>
                  )
                })()}
              </svg>

              {/* tooltip */}
              {hoverPoint !== null && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-xl glass-liquid text-xs whitespace-nowrap"
                  style={{
                    left: `calc(${(40 + hoverPoint * ((800 - 80) / Math.max(chartData.length - 1, 1))) / 8}%)`,
                    top: `calc(${(240 - (chartData[hoverPoint].pct / 100) * 200) / 2.6}px)`,
                  }}
                >
                  <p className="text-white/45 font-medium">{chartData[hoverPoint].week}</p>
                  <p className="text-[#8cffef] font-display font-semibold">{chartData[hoverPoint].watched} obejrz.</p>
                  <p className="text-fuchsia-300 font-display font-semibold">{chartData[hoverPoint].implemented} wdr.</p>
                </div>
              )}

              <div className="mt-2 flex justify-between px-10 text-[10px] text-white/30 font-medium tracking-wide">
                {chartData.map((d) => (
                  <span key={d.idx}>{d.week.split('-')[1] || ''}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] px-6 py-10 flex flex-col items-center text-center">
              <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca]/30 to-[#2fb6a2]/10 ring-1 ring-white/15 mb-4">
                <Activity className="w-6 h-6 text-[#8cffef]" />
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
                  stroke="#2fb6a2"
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
            <div className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2] ring-1 ring-white/30">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Postęp po tagach błędów</h2>
              <p className="text-xs text-white/45">Które obszary gry opanowujesz najlepiej</p>
            </div>
          </div>

          {tagProgress.length === 0 ? (
            <div
              onMouseMove={handleCardMouse}
              className="glass-liquid spotlight rounded-3xl py-14 px-6 relative overflow-hidden text-center flex flex-col items-center"
            >
              <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca]/25 to-[#2fb6a2]/10 ring-1 ring-white/15 mb-4">
                <Target className="w-7 h-7 text-[#8cffef]" />
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
                  key={item.tag?.id || item.tag?.name}
                  onMouseMove={handleCardMouse}
                  className="glass-liquid spotlight rise-in tilt-hover rounded-3xl p-5 relative overflow-hidden"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="relative w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0 ring-1 ring-white/20"
                      style={{
                        background: `linear-gradient(135deg, ${item.tag?.color || '#2fb6a2'}40, ${item.tag?.color || '#2fb6a2'}10)`,
                        boxShadow: `0 8px 24px -10px ${item.tag?.color || 'rgba(124,111,255,0.5)'}80`,
                      }}
                    >
                      <Target className="w-5 h-5" style={{ color: item.tag?.color || '#8cffef' }} strokeWidth={2.2} />
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
            <div className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2] ring-1 ring-white/30">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Ostatnia aktywność</h2>
              <p className="text-xs text-white/45">Twoja najnowsza ścieżka treningowa</p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <div
              onMouseMove={handleCardMouse}
              className="glass-liquid spotlight rounded-3xl py-14 px-6 relative overflow-hidden text-center flex flex-col items-center"
            >
              <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca]/25 to-[#2fb6a2]/10 ring-1 ring-white/15 mb-4">
                <PlayCircle className="w-7 h-7 text-[#8cffef]" />
              </div>
              <p className="font-display text-base font-semibold text-white">Brak ostatniej aktywności</p>
              <p className="text-sm text-white/45 mt-1 max-w-md">
                Filmy, które obejrzysz, pojawią się tutaj w postaci interaktywnej osi czasu.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* timeline rail */}
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#2de5ca]/40 via-white/[0.08] to-transparent" />

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
                      ? 'from-[#2de5ca] to-[#2fb6a2]'
                      : p.status === 'WATCHED'
                        ? 'from-[#34d399] to-[#10b981]'
                        : p.status === 'WATCHING'
                          ? 'from-[#2de5ca] to-[#3b82f6]'
                          : 'from-[#fbbf24] to-[#f59e0b]'
                  return (
                    <li
                      key={p.id}
                      onMouseMove={handleCardMouse}
                      className="group glass-liquid spotlight rise-in tilt-hover rounded-3xl p-5 relative overflow-hidden"
                      style={{ animationDelay: `${i * 50}ms` }}
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
                            <p className="mt-3 text-sm text-white/55 italic border-l-2 border-[#2de5ca]/30 pl-3">
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
          <Sparkles className="w-3 h-3 text-[#2de5ca]/50" />
          <span className="uppercase tracking-[0.25em]">Twoja droga do mistrzostwa</span>
          <Sparkles className="w-3 h-3 text-[#2de5ca]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </StudentLayout>
  )
}
