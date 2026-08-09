'use client'

import { useEffect, useRef, useState } from 'react'
import {
  formatDate,
  formatDateTime,
  STATUS_LABELS,
  STATUS_COLORS,
  VIDEO_STATUS_LABELS,
  VIDEO_STATUS_COLORS,
  cn,
} from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Film,
  Clock,
  Play,
  CheckCircle2,
  CalendarClock,
  BookOpen,
  TrendingUp,
  Settings,
  ArrowRight,
  Sparkles,
  LogOut,
  GraduationCap,
  Plus,
} from 'lucide-react'
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
  total: { label: 'Wszystkie filmy', icon: Film, accent: 'from-[#8b7bff] to-[#5a4fff]', ring: 'rgba(124,111,255,0.45)' },
  pending: { label: 'Do oglądania', icon: Clock, accent: 'from-[#fbbf24] to-[#f97316]', ring: 'rgba(245,158,11,0.4)' },
  watching: { label: 'W trakcie', icon: Play, accent: 'from-[#60a5fa] to-[#22d3ee]', ring: 'rgba(59,130,246,0.4)' },
  done: { label: 'Zakończone', icon: CheckCircle2, accent: 'from-[#34d399] to-[#16a34a]', ring: 'rgba(34,197,94,0.4)' },
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
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({ ref: null } as any)
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

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

  const handleCardMouse = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#06070d]">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-5">
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
      {/* ===== Ambient background ===== */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Aurora blobs */}
        <div
          className="absolute -top-32 -left-24 w-[560px] h-[560px] rounded-full blur-[120px] opacity-50 animate-aurora"
          style={{ background: 'radial-gradient(circle, rgba(124,111,255,0.35) 0%, transparent 65%)' }}
        />
        <div
          className="absolute top-1/3 -right-32 w-[640px] h-[640px] rounded-full blur-[140px] opacity-40 animate-aurora-slow"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-40 left-1/3 w-[520px] h-[520px] rounded-full blur-[120px] opacity-30 animate-aurora"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%)' }}
        />

        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)' }}
        />

        {/* Noise */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
            backgroundSize: '180px',
          }}
        />
      </div>

      {/* ===== Navbar ===== */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl border-b border-white/[0.06] bg-[#06070d]/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] shadow-[0_8px_24px_-8px_rgba(124,111,255,0.6)]">
              <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.2} />
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
            </div>
            <div className="leading-tight">
              <p className="font-display font-bold text-base tracking-tight">CS2 Coaching</p>
              <p className="text-[11px] text-white/40 font-medium">Panel ucznia</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/70 bg-white/[0.04] border border-white/[0.07]">
              <Sparkles className="w-3.5 h-3.5 text-[#a594ff]" />
              {activeSessions} aktywnych sesji
            </span>
            <a
              href="/logout"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/75 hover:text-white bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              Wyloguj się
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
        {/* ===== Hero / Header ===== */}
        <div className="rise-in mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white/65 bg-white/[0.04] border border-white/[0.07] mb-5 backdrop-blur-xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#8b7bff] opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8b7bff]" />
            </span>
            Witaj z powrotem
          </div>
          <h1 className="font-display text-4xl md:text-[3.4rem] leading-[1.05] font-bold tracking-tight mb-3 text-gradient-violet">
            Panel ucznia
          </h1>
          <p className="text-white/45 text-lg max-w-2xl font-light">
            Twój postęp, sesje i filmy — w jednym eleganckim miejscu. Kontynuuj tam, gdzie skończyłeś.
          </p>
        </div>

        {/* ===== Coach banner ===== */}
        {coach && (
          <div
            className="rise-in mb-8 spotlight group relative rounded-3xl overflow-hidden glass-tinted p-6 md:p-7"
            style={{ animationDelay: '0.05s' }}
            onMouseMove={handleCardMouse}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 rounded-2xl ring-1 ring-white/20 shadow-[0_12px_32px_-8px_rgba(124,111,255,0.5)]">
                    <AvatarImage src={coach.avatarUrl ?? undefined} alt={coach.name ?? coach.email} />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] text-white font-display font-semibold text-lg">
                      {(coach.name ?? coach.email)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#34d399] ring-2 ring-[#0d0e14] grid place-items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#a594ff] font-semibold mb-1">Twój trener</p>
                  <h3 className="font-display text-xl font-bold">{coach.name ?? coach.email}</h3>
                  <p className="text-white/40 text-sm mt-0.5">Skontaktuj się w razie pytań</p>
                </div>
              </div>

              <div className="hidden md:block w-px h-12 bg-white/10 mx-auto" />

              <div className="flex flex-1 gap-3 md:justify-end flex-wrap">
                <Link
                  href="/student/sessions"
                  className="shimmer-line relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-white/[0.05] border border-white/10 hover:border-[#8b7bff]/40 hover:bg-white/[0.08] transition-all duration-300 overflow-hidden"
                >
                  <BookOpen className="w-4 h-4 text-[#a594ff]" />
                  Przeglądaj sesje
                </Link>
                <Link
                  href="/student/videos"
                  className="shimmer-line relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#8b7bff] to-[#5a4fff] shadow-[0_12px_32px_-8px_rgba(124,111,255,0.6)] hover:shadow-[0_16px_40px_-8px_rgba(124,111,255,0.8)] transition-all duration-300 overflow-hidden"
                >
                  <Film className="w-4 h-4" />
                  Przejdź do filmów
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ===== Stats grid ===== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {statCards.map((stat, i) => {
            const meta = STAT_META[stat.key]
            const Icon = meta.icon
            return (
              <div
                key={stat.key}
                className="spotlight group relative rounded-3xl p-6 glass-liquid hover:-translate-y-1 transition-all duration-500 rise-in overflow-hidden"
                style={{ animationDelay: `${0.08 + i * 0.06}s` }}
                onMouseMove={handleCardMouse}
              >
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-80"
                  style={{ background: `radial-gradient(circle, ${meta.ring} 0%, transparent 70%)` }}
                />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-white/45 text-[13px] font-medium tracking-wide">{meta.label}</p>
                    <p className="font-display text-[2.6rem] leading-none font-bold mt-2 count-glow">{stat.value}</p>
                  </div>
                  <div
                    className={cn(
                      'relative p-3 rounded-2xl bg-gradient-to-br shadow-lg grid place-items-center',
                      meta.accent,
                    )}
                    style={{ boxShadow: `0 12px 28px -8px ${meta.ring}` }}
                  >
                    <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/30" />
                  </div>
                </div>
                <div className="relative z-10 mt-5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r opacity-70', meta.accent)}
                    style={{
                      width: totalVideos > 0 ? `${Math.min(100, (stat.value / totalVideos) * 100)}%` : '0%',
                      transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* ===== Progress overview ===== */}
        <div className="grid gap-5 lg:grid-cols-3 mb-10">
          {/* Progress ring + breakdown */}
          <div
            className="lg:col-span-2 spotlight relative rounded-3xl p-7 glass-liquid rise-in overflow-hidden"
            style={{ animationDelay: '0.18s' }}
            onMouseMove={handleCardMouse}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-7 relative z-10">
              {/* Circular progress */}
              <div className="relative w-[140px] h-[140px] flex-shrink-0 mx-auto md:mx-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="url(#progGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(completionRate / 100) * (2 * Math.PI * 52)} ${2 * Math.PI * 52}`}
                    style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                  <defs>
                    <linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a594ff" />
                      <stop offset="55%" stopColor="#7c6fff" />
                      <stop offset="100%" stopColor="#5a4fff" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="font-display text-[2.2rem] leading-none font-bold text-gradient-mesh">{completionRate}%</p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mt-1">ukończone</p>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="flex-1 w-full">
                <h3 className="font-display text-xl font-bold mb-1">Postęp oglądania</h3>
                <p className="text-white/40 text-sm mb-5">Rozkład Twojej aktywności na filmach</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { v: pending, label: 'Do oglądania', color: '#fbbf24', key: 'pending' },
                    { v: watching, label: 'W trakcie', color: '#60a5fa', key: 'watching' },
                    { v: watched, label: 'Obejrzane', color: '#34d399', key: 'watched' },
                    { v: implemented, label: 'Wdrożone', color: '#a855f7', key: 'implemented' },
                  ].map((b) => (
                    <div
                      key={b.key}
                      className="relative rounded-2xl p-4 bg-white/[0.025] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-colors duration-300"
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px] rounded-full opacity-70"
                        style={{ background: `linear-gradient(90deg, ${b.color}, transparent)` }}
                      />
                      <p className="font-display text-2xl font-bold" style={{ color: b.color }}>{b.v}</p>
                      <p className="text-[11px] text-white/45 mt-1 leading-tight">{b.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div
            className="spotlight relative rounded-3xl p-7 glass-liquid rise-in overflow-hidden"
            style={{ animationDelay: '0.24s' }}
            onMouseMove={handleCardMouse}
          >
            <div className="flex items-center gap-2 mb-5 relative z-10">
              <div className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-[#a594ff]" />
              </div>
              <h4 className="font-display text-lg font-bold">Szybkie akcje</h4>
            </div>
            <div className="grid gap-2.5 relative z-10">
              {[
                { href: '/student/sessions', icon: BookOpen, label: 'Wszystkie sesje', sub: 'Przeglądaj swoje sesje', color: 'from-[#60a5fa] to-[#22d3ee]', ring: 'rgba(59,130,246,0.4)' },
                { href: '/student/videos', icon: Film, label: 'Filmy do oglądania', sub: 'Twoja lista filmów', color: 'from-[#fbbf24] to-[#f97316]', ring: 'rgba(245,158,11,0.4)' },
                { href: '/student/progress', icon: TrendingUp, label: 'Mój postęp', sub: 'Statystyki i wykresy', color: 'from-[#34d399] to-[#16a34a]', ring: 'rgba(34,197,94,0.4)' },
                { href: '/student/settings', icon: Settings, label: 'Ustawienia', sub: 'Profil i preferencje', color: 'from-[#a855f7] to-[#d946ef]', ring: 'rgba(168,85,247,0.4)' },
              ].map((a) => {
                const Icon = a.icon
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div
                      className={cn('relative p-2.5 rounded-xl bg-gradient-to-br grid place-items-center', a.color)}
                      style={{ boxShadow: `0 8px 22px -8px ${a.ring}` }}
                    >
                      <Icon className="w-4 h-4 text-white" strokeWidth={2.2} />
                      <div className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white group-hover:text-[#a594ff] transition-colors truncate">{a.label}</p>
                      <p className="text-[11px] text-white/45 truncate">{a.sub}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[#a594ff] group-hover:translate-x-1 transition-all duration-300" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* ===== Tabs section ===== */}
        <div
          className="spotlight relative rounded-3xl glass-liquid rise-in overflow-hidden"
          style={{ animationDelay: '0.3s' }}
          onMouseMove={handleCardMouse}
        >
          {/* Tab bar */}
          <div className="relative flex gap-1 px-4 pt-3 border-b border-white/[0.06]">
            {(
              [
                { key: 'sessions' as TabKey, label: 'Nadchodzące sesje', count: upcomingSessions.length },
                { key: 'activity' as TabKey, label: 'Ostatnia aktywność', count: recentProgress.length },
              ]
            ).map((t) => (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[t.key] = el
                }}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'relative z-10 px-5 py-3.5 text-sm font-display font-semibold transition-colors duration-300 flex items-center gap-2.5 rounded-t-xl',
                  activeTab === t.key ? 'text-white' : 'text-white/45 hover:text-white/75',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors duration-300',
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
          <div className="p-6">
            {activeTab === 'sessions' && (
              <div className="space-y-3 fade-in" key="sessions">
                {upcomingSessions.length === 0 ? (
                  <EmptyState
                    icon={CalendarClock}
                    title="Brak nadchodzących sesji"
                    sub="Twój trener poinformuje Cię o nowej sesji"
                  />
                ) : (
                  upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-[#8b7bff]/25 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative p-3 rounded-2xl bg-gradient-to-br from-[#60a5fa] to-[#22d3ee] shadow-[0_10px_28px_-8px_rgba(59,130,246,0.5)] flex-shrink-0">
                          <CalendarClock className="w-5 h-5 text-white" strokeWidth={2.2} />
                          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#a594ff] transition-colors truncate">{session.title}</h4>
                          <p className="text-sm text-white/45 mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Bez terminu'}
                          </p>
                          {session.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {session.tags.slice(0, 3).map((st) => (
                                <span
                                  key={st.tag.id}
                                  className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-white/[0.05] border border-white/[0.08] text-white/70"
                                  style={st.tag.color ? { color: st.tag.color, borderColor: `${st.tag.color}40` } : undefined}
                                >
                                  {st.tag.name}
                                </span>
                              ))}
                              {session.tags.length > 3 && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-white/[0.04] border border-white/[0.06] text-white/45">
                                  +{session.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Badge variant="outline" className={cn('text-xs px-2.5 py-1 rounded-full', STATUS_COLORS[session.status])}>
                          {STATUS_LABELS[session.status]}
                        </Badge>
                        <Link
                          href={`/student/sessions/${session.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-white bg-white/[0.04] border border-white/[0.08] hover:bg-[#7c6fff]/15 hover:border-[#7c6fff]/40 hover:text-[#a594ff] transition-all duration-300"
                        >
                          Otwórz
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-3 fade-in" key="activity">
                {recentProgress.length === 0 ? (
                  <EmptyState
                    icon={Film}
                    title="Brak ostatniej aktywności"
                    sub="Rozpocznij oglądanie filmów z sesji"
                  />
                ) : (
                  recentProgress.map((p) => (
                    <div
                      key={p.id}
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-[#8b7bff]/25 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative w-16 h-10 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                          {p.video.thumbnail ? (
                            <img src={p.video.thumbnail} alt={p.video.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[#1a1c28] to-[#0f1118]">
                              <Film className="w-4 h-4 text-white/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-[#8b7bff]/40 to-transparent" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#a594ff] transition-colors truncate">{p.video.title}</h4>
                          <p className="text-sm text-white/45 truncate">{p.session?.title}</p>
                          {typeof p.progress === 'number' && (
                            <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden max-w-xs">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#a594ff] to-[#5a4fff]"
                                style={{ width: `${p.progress}%`, transition: 'width 0.7s ease' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Badge variant="outline" className={cn('text-xs px-2.5 py-1 rounded-full', VIDEO_STATUS_COLORS[p.status])}>
                          {VIDEO_STATUS_LABELS[p.status]}
                        </Badge>
                        {p.status !== 'IMPLEMENTED' && p.session && (
                          <Link
                            href={`/student/sessions/${p.session.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-white bg-white/[0.04] border border-white/[0.08] hover:bg-[#7c6fff]/15 hover:border-[#7c6fff]/40 hover:text-[#a594ff] transition-all duration-300"
                          >
                            Kontynuuj
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== Footer hint ===== */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/35">
          <p className="font-display tracking-wide">
            {totalSessions > 0 ? `Masz ${totalSessions} sesji łącznie` : 'Brak sesji — skontaktuj się z trenerem'}
          </p>
          <p className="hidden sm:flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[#a594ff]" />
            Oscar · pamiętaj o systematyczności
          </p>
        </div>
      </main>
    </div>
  )
}

function EmptyState({ icon: Icon, title, sub }: { icon: typeof Film; title: string; sub: string }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="relative w-16 h-16 mx-auto mb-4 grid place-items-center rounded-2xl bg-white/[0.03] border border-white/[0.07]">
        <Icon className="w-7 h-7 text-white/50" strokeWidth={1.8} />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5" />
      </div>
      <h4 className="font-display text-lg font-semibold mb-1">{title}</h4>
      <p className="text-white/40 text-sm">{sub}</p>
    </div>
  )
}
