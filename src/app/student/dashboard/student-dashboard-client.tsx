'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tilt3D } from '@/components/tilt-3d'
import { Film, Clock, Play, CheckCircle2, CalendarClock, BookOpen, TrendingUp, Settings, ArrowRight, Sparkles, LogOut, GraduationCap, Plus, Target, Trophy, Zap, Shield, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  description: string | null
  status: string
  scheduledAt: string | null
  coach: { id: string; name: string | null; email: string; avatarUrl: string | null }
  tags: { tag: { id: string; name: string; color: string } }[]
  videos: { video: { id: string; title: string; thumbnail: string | null } }[]
  _count: { videos: number }
}

interface Progress {
  id: string
  status: string
  progress: number
  note: string | null
  watchedAt: string | null
  video: { id: string; title: string; thumbnail: string | null; tags: { tag: { id: string; name: string; color: string } }[] }
  session?: { id: string; title: string }
}

interface Coach {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface Stats {
  totalVideos: number
  pending: number
  watching: number
  watched: number
  implemented: number
  totalSessions: number
  activeSessions: number
}

interface StudentDashboardClientProps {
  initialStats: Stats
  initialSessions: Session[]
  initialProgress: Progress[]
  initialCoach: Coach | null
}

type StatKey = 'total' | 'pending' | 'watching' | 'done'
type TabKey = 'sessions' | 'activity'

const STAT_META: Record<StatKey, { label: string; icon: typeof Film; accent: string; ring: string }> = {
  total: { label: 'Wszystkie filmy', icon: Film, accent: 'from-[#8b7bff] to-[#5a4fff]', ring: 'rgba(139,123,255,0.45)' },
  pending: { label: 'Do oglądania', icon: Clock, accent: 'from-[#fbbf24] to-[#f97316]', ring: 'rgba(251,191,36,0.4)' },
  watching: { label: 'W trakcie', icon: Play, accent: 'from-[#60a5fa] to-[#22d3ee]', ring: 'rgba(96,165,250,0.4)' },
  done: { label: 'Zakończone', icon: CheckCircle2, accent: 'from-[#34d399] to-[#16a34a]', ring: 'rgba(52,211,153,0.4)' },
}

export function StudentDashboardClient({
  initialStats,
  initialSessions,
  initialProgress,
  initialCoach,
}: StudentDashboardClientProps) {
  const { totalVideos, pending, watching, watched, implemented, totalSessions, activeSessions } = initialStats
  const sessions = initialSessions
  const progress = initialProgress
  const coach = initialCoach

  const completionRate = totalVideos > 0 ? Math.round(((watched + implemented) / totalVideos) * 100) : 0

  const statCards: { key: StatKey; value: number }[] = [
    { key: 'total', value: totalVideos },
    { key: 'pending', value: pending },
    { key: 'watching', value: watching },
    { key: 'done', value: watched + implemented },
  ]

  const recentProgress = progress.slice(0, 6)
  const upcomingSessions = sessions.filter((s) => s.status === 'ACTIVE').slice(0, 4)

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('sessions')
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({ sessions: null, activity: null })
  const [underline, setUnderline] = useState({ left: 0, width: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const update = () => {
      const el = tabRefs.current[activeTab]
      if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeTab, mounted])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleCardMouse = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#06070d]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#8b7bff] border-r-[#5a4fff] animate-spin" />
            <div className="absolute inset-2 rounded-full bg-[#7c6fff]/10 blur-md animate-pulse" />
          </div>
          <p className="text-white/40 text-sm font-medium tracking-wide font-display">Ładowanie panelu…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#06070d] text-white font-sans antialiased overflow-x-hidden">
      {/* Cursor follower glow */}
      <div
        className="fixed pointer-events-none z-0 w-[300px] h-[300px] rounded-full blur-[80px] opacity-30 transition-all duration-500"
        style={{
          transform: `translate(-50%, -50%)`,
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          background: 'radial-gradient(circle, rgba(139,123,255,0.25) 0%, transparent 70%)',
        }}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* ===== Hero Header ===== */}
        <div className="animate-rise-in mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-white/60 glass mb-6 backdrop-blur-xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#8b7bff] opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8b7bff]" />
            </span>
            Witaj z powrotem
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.02] font-bold tracking-tight mb-4 text-gradient-premium">
            Panel ucznia
          </h1>
          <p className="text-white/45 text-lg md:text-xl max-w-2xl font-light tracking-wide">
            Twój postęp, sesje i filmy — w jednym eleganckim miejscu. Kontynuuj tam, gdzie skończyłeś.
          </p>
        </div>

        {/* ===== Coach Banner ===== */}
        {coach && (
          <Tilt3D
            wrapperClassName="animate-rise-in animate-rise-in-delay-1 mb-10"
            wrapperStyle={{ animationDelay: '60ms' }}
            className="relative rounded-3xl overflow-hidden glass-card p-6 md:p-8"
            maxTilt={5}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#8b7bff]/10 via-transparent to-[#c084fc]/10" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-18 h-18 rounded-2xl ring-2 ring-white/20 shadow-[0_16px_40px_-10px_rgba(139,123,255,0.6)]">
                    <AvatarImage src={coach.avatarUrl ?? undefined} alt={coach.name ?? coach.email} />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] text-white font-display font-semibold text-xl">
                      {(coach.name ?? coach.email)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#34d399] ring-3 ring-[#06070d] grid place-items-center">
                    <span className="w-2 h-2 rounded-full bg-white/90" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[#a594ff] font-semibold mb-1.5">Twój trener</p>
                  <h3 className="font-display text-2xl font-bold">{coach.name ?? coach.email}</h3>
                  <p className="text-white/40 text-sm mt-1">Skontaktuj się w razie pytań</p>
                </div>
              </div>

              <div className="hidden md:block w-px h-14 bg-white/10 mx-auto" />

              <div className="flex flex-1 gap-3 md:justify-end flex-wrap">
                <Link
                  href="/student/sessions"
                  className="shimmer-sweep relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-white glass hover:border-white/[0.15] transition-all duration-300 overflow-hidden"
                >
                  <BookOpen className="w-4.5 h-4.5 text-[#a594ff]" />
                  Przeglądaj sesje
                </Link>
                <Link
                  href="/student/videos"
                  className="shimmer-sweep relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white btn-primary-gradient transition-all duration-300 overflow-hidden"
                >
                  <Film className="w-4.5 h-4.5" />
                  Przejdź do filmów
                  <ArrowRight className="w-4.5 h-4.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Tilt3D>
        )}

        {/* ===== Stats Grid ===== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {statCards.map((stat, i) => {
            const meta = STAT_META[stat.key]
            const Icon = meta.icon
            return (
              <Tilt3D
                key={stat.key}
                wrapperClassName="animate-rise-in"
                wrapperStyle={{ animationDelay: `${80 + i * 60}ms` }}
                className="h-full rounded-3xl"
                maxTilt={9}
              >
              <div
                className="group relative h-full rounded-3xl p-6 glass-card overflow-hidden"
                onMouseMove={handleCardMouse}
              >
                <div
                  className="absolute -top-12 -right-12 w-36 h-36 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
                  style={{ background: `radial-gradient(circle, ${meta.ring} 0%, transparent 70%)` }}
                />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-white/45 text-[13px] font-medium tracking-wide">{meta.label}</p>
                    <p className="font-display text-4xl leading-none font-bold mt-2 animate-count-glow">{stat.value}</p>
                  </div>
                  <div
                    className={cn(
                      'relative p-4 rounded-2xl bg-gradient-to-br shadow-lg grid place-items-center',
                      meta.accent,
                    )}
                    style={{ boxShadow: `0 14px 36px -10px ${meta.ring}` }}
                  >
                    <Icon className="w-5.5 h-5.5 text-white" strokeWidth={2.2} />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30" />
                  </div>
                </div>
                <div className="relative z-10 mt-6 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r opacity-80', meta.accent)}
                    style={{
                      width: totalVideos > 0 ? `${Math.min(100, (stat.value / totalVideos) * 100)}%` : '0%',
                      transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
              </Tilt3D>
            )
          })}
        </div>

        {/* ===== Progress Overview ===== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-10">
          {/* Progress Ring + Breakdown */}
          <Tilt3D
            wrapperClassName="animate-rise-in lg:col-span-2"
            wrapperStyle={{ animationDelay: '180ms' }}
            className="relative rounded-3xl p-7 md:p-8 glass-card overflow-hidden"
            maxTilt={4}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-7 md:gap-10 relative z-10">
              {/* Circular Progress */}
              <div className="relative w-[160px] h-[160px] flex-shrink-0 mx-auto md:mx-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <circle
                    cx="70"
                    cy="70"
                    r="60"
                    fill="none"
                    stroke="url(#dashProgress)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(completionRate / 100) * (2 * Math.PI * 60)} ${2 * Math.PI * 60}`}
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                  <defs>
                    <linearGradient id="dashProgress" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a594ff" />
                      <stop offset="55%" stopColor="#7c6fff" />
                      <stop offset="100%" stopColor="#5a4fff" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="font-display text-3xl md:text-4xl leading-none font-bold text-gradient-mesh">{completionRate}%</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1.5">ukończone</p>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="flex-1 w-full">
                <h3 className="font-display text-xl font-bold mb-1">Postęp oglądania</h3>
                <p className="text-white/40 text-sm mb-6">Rozkład Twojej aktywności na filmach</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { v: pending, label: 'Do oglądania', color: '#fbbf24', key: 'pending' },
                    { v: watching, label: 'W trakcie', color: '#60a5fa', key: 'watching' },
                    { v: watched, label: 'Obejrzane', color: '#34d399', key: 'watched' },
                    { v: implemented, label: 'Wdrożone', color: '#a855f7', key: 'implemented' },
                  ].map((b) => (
                    <div
                      key={b.key}
                      className="relative rounded-2xl p-5 glass hover:border-white/[0.12] transition-all duration-300"
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-[2.5px] rounded-full opacity-70"
                        style={{ background: `linear-gradient(90deg, ${b.color}, transparent)` }}
                      />
                      <p className="font-display text-3xl font-bold" style={{ color: b.color }}>{b.v}</p>
                      <p className="text-[11px] text-white/45 mt-1.5 leading-tight">{b.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Tilt3D>

          {/* Quick Actions */}
          <Tilt3D
            wrapperClassName="animate-rise-in"
            wrapperStyle={{ animationDelay: '240ms' }}
            className="relative rounded-3xl p-7 glass-card overflow-hidden"
            maxTilt={4}
          >
            <div className="flex items-center gap-2 mb-5 relative z-10">
              <div className="p-2 rounded-lg glass">
                <Sparkles className="w-4 h-4 text-[#a594ff]" />
              </div>
              <h4 className="font-display text-lg font-bold">Szybkie akcje</h4>
            </div>
            <div className="grid gap-3 relative z-10">
              {[
                { href: '/student/sessions', icon: BookOpen, label: 'Wszystkie sesje', sub: 'Przeglądaj swoje sesje', color: 'from-[#60a5fa] to-[#22d3ee]', ring: 'rgba(96,165,250,0.4)' },
                { href: '/student/videos', icon: Film, label: 'Filmy do oglądania', sub: 'Twoja lista filmów', color: 'from-[#fbbf24] to-[#f97316]', ring: 'rgba(251,191,36,0.4)' },
                { href: '/student/progress', icon: TrendingUp, label: 'Mój postęp', sub: 'Statystyki i wykresy', color: 'from-[#34d399] to-[#16a34a]', ring: 'rgba(52,211,153,0.4)' },
                { href: '/student/settings', icon: Settings, label: 'Ustawienia', sub: 'Profil i preferencje', color: 'from-[#a855f7] to-[#d946ef]', ring: 'rgba(168,85,247,0.4)' },
              ].map((a) => {
                const Icon = a.icon
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group relative flex items-center gap-4 p-4 rounded-2xl glass hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div
                      className={cn('relative p-3 rounded-xl bg-gradient-to-br grid place-items-center', a.color)}
                      style={{ boxShadow: `0 10px 28px -8px ${a.ring}` }}
                    >
                      <Icon className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
                      <div className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-[#a594ff] transition-colors truncate">{a.label}</p>
                      <p className="text-[11px] text-white/45 truncate">{a.sub}</p>
                    </div>
                    <ArrowRight className="w-4.5 h-4.5 text-white/30 group-hover:text-[#a594ff] group-hover:translate-x-1 transition-all duration-300" />
                  </Link>
                )
              })}
            </div>
          </Tilt3D>
        </div>

        {/* ===== Tabs Section ===== */}
        <Tilt3D
          wrapperClassName="animate-rise-in"
          wrapperStyle={{ animationDelay: '300ms' }}
          className="relative rounded-3xl glass-card overflow-hidden"
          maxTilt={3}
        >
          {/* Tab bar */}
          <div className="relative flex gap-1 px-4 pt-4 border-b border-white/[0.05]">
            {[
              { key: 'sessions' as TabKey, label: 'Nadchodzące sesje', count: upcomingSessions.length },
              { key: 'activity' as TabKey, label: 'Ostatnia aktywność', count: recentProgress.length },
            ].map((t) => (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[t.key] = el
                }}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'relative z-10 px-6 py-4 text-sm font-display font-semibold transition-colors duration-300 flex items-center gap-2.5 rounded-t-xl',
                  activeTab === t.key ? 'text-white' : 'text-white/45 hover:text-white/75',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors duration-300',
                    activeTab === t.key ? 'bg-[#7c6fff]/20 text-[#a594ff] border border-[#7c6fff]/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
            <span className="tab-underline" style={{ left: underline.left, width: underline.width }} />
          </div>

          {/* Tab content */}
          <div className="p-6 md:p-8">
            {activeTab === 'sessions' && (
              <div className="space-y-4 animate-fade-up" key="sessions">
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="relative w-20 h-20 mx-auto mb-5 grid place-items-center rounded-2xl glass border border-white/[0.07]">
                      <CalendarClock className="w-8 h-8 text-white/50" strokeWidth={1.8} />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5" />
                    </div>
                    <h4 className="font-display text-lg font-semibold mb-2">Brak nadchodzących sesji</h4>
                    <p className="text-white/40 text-sm">Twój trener poinformuje Cię o nowej sesji</p>
                  </div>
                ) : (
                  upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl glass hover:bg-white/[0.03] hover:border-[#8b7bff]/25 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-[#60a5fa] to-[#22d3ee] shadow-[0_12px_32px_-8px_rgba(96,165,250,0.5)] flex-shrink-0">
                          <CalendarClock className="w-5.5 h-5.5 text-white" strokeWidth={2.2} />
                          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#a594ff] transition-colors truncate">{session.title}</h4>
                          <p className="text-sm text-white/45 mt-1 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Bez terminu'}
                          </p>
                          {session.tags.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {session.tags.slice(0, 3).map((st) => (
                                <span
                                  key={st.tag.id}
                                  className="text-[11px] px-2.5 py-1 rounded-full font-medium glass border border-white/[0.08] text-white/75"
                                  style={st.tag.color ? { color: st.tag.color, borderColor: `${st.tag.color}40` } : undefined}
                                >
                                  {st.tag.name}
                                </span>
                              ))}
                              {session.tags.length > 3 && (
                                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium glass border border-white/[0.06] text-white/45">
                                  +{session.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Badge variant="outline" className={cn('text-xs px-3 py-1.5 rounded-full', STATUS_COLORS[session.status])}>
                          {STATUS_LABELS[session.status]}
                        </Badge>
                        <Link
                          href={`/student/sessions/${session.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#7c6fff]/15 hover:border-[#7c6fff]/40 hover:text-[#a594ff] transition-all duration-300"
                        >
                          Otwórz
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4 animate-fade-up" key="activity">
                {recentProgress.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <div className="relative w-20 h-20 mx-auto mb-5 grid place-items-center rounded-2xl glass border border-white/[0.07]">
                      <Film className="w-8 h-8 text-white/50" strokeWidth={1.8} />
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5" />
                    </div>
                    <h4 className="font-display text-lg font-semibold mb-2">Brak ostatniej aktywności</h4>
                    <p className="text-white/40 text-sm">Rozpocznij oglądanie filmów z sesji</p>
                  </div>
                ) : (
                  recentProgress.map((p) => (
                    <div
                      key={p.id}
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl glass hover:bg-white/[0.03] hover:border-[#8b7bff]/25 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative w-20 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                          {p.video.thumbnail ? (
                            <img src={p.video.thumbnail} alt={p.video.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[#1a1c28] to-[#0f1118]">
                              <Film className="w-5 h-5 text-white/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-[#8b7bff]/40 to-transparent" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#a594ff] transition-colors truncate">{p.video.title}</h4>
                          <p className="text-sm text-white/45 truncate">{p.session?.title}</p>
                          {typeof p.progress === 'number' && (
                            <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.05] overflow-hidden max-w-xs">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#a594ff] to-[#5a4fff]"
                                style={{ width: `${p.progress}%`, transition: 'width 0.8s ease' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Badge variant="outline" className={cn('text-xs px-3 py-1.5 rounded-full', VIDEO_STATUS_COLORS[p.status])}>
                          {VIDEO_STATUS_LABELS[p.status]}
                        </Badge>
                        {p.status !== 'IMPLEMENTED' && p.session && (
                          <Link
                            href={`/student/sessions/${p.session.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#7c6fff]/15 hover:border-[#7c6fff]/40 hover:text-[#a594ff] transition-all duration-300"
                          >
                            Kontynuuj
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}              </div>
            )}
          </div>
        </Tilt3D>


        {/* ===== Footer hint ===== */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <p className="font-display tracking-wide">
            {totalSessions > 0 ? `Masz ${totalSessions} sesji łącznie` : 'Brak sesji — skontaktuj się z trenerem'}
          </p>
          <p className="hidden sm:flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#a594ff]" />
            Systematyczność to klucz do sukcesu
          </p>
        </div>
      </main>
    </div>
  )
}

function EmptyState({ icon: Icon, title, sub }: { icon: typeof Film; title: string; sub: string }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="relative w-20 h-20 mx-auto mb-5 grid place-items-center rounded-2xl glass border border-white/[0.07]">
        <Icon className="w-8 h-8 text-white/50" strokeWidth={1.8} />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5" />
      </div>
      <h4 className="font-display text-lg font-semibold mb-2">{title}</h4>
      <p className="text-white/40 text-sm">{sub}</p>
    </div>
  )
}