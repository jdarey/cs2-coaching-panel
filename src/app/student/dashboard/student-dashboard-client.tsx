'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tilt3D } from '@/components/tilt-3d'
import { StudentLayout } from '@/components/student-layout'
import { Film, Clock, Play, CheckCircle2, CalendarClock, BookOpen, TrendingUp, Settings, ArrowRight, Sparkles, Plus, MessageSquare, MessageSquareHeart, Flame, Trophy, Target, Zap } from 'lucide-react'
import Link from 'next/link'
import { getRank, nextRank, getLevel, getStreak, getAchievements } from '@/lib/gamification'
import { RankEmblem } from '@/components/rank-emblem'

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
  updatedAt: string
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
  total: { label: 'Wszystkie filmy', icon: Film, accent: 'from-[#2de5ca] to-[#2fb6a2]', ring: 'rgba(45,229,202,0.45)' },
  pending: { label: 'Do oglądania', icon: Clock, accent: 'from-[#fbbf24] to-[#f97316]', ring: 'rgba(251,191,36,0.4)' },
  watching: { label: 'W trakcie', icon: Play, accent: 'from-[#2de5ca] to-[#8cffef]', ring: 'rgba(45,229,202,0.4)' },
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
  const rank = getRank(completionRate)
  const next = nextRank(completionRate)
  const levelInfo = getLevel(watched + implemented)
  const streak = getStreak(progress.map((p) => p.watchedAt || p.updatedAt))
  const achievements = getAchievements({
    total: totalVideos,
    pending,
    watching,
    watched,
    implemented,
    sessionsCount: totalSessions,
    feedbackCount: 0,
    messagesSent: 0,
  })
  const earnedCount = achievements.filter((a) => a.earned).length
  const nextUp = progress.find((p) => p.status === 'PENDING')

  const statCards: { key: StatKey; value: number }[] = [
    { key: 'total', value: totalVideos },
    { key: 'pending', value: pending },
    { key: 'watching', value: watching },
    { key: 'done', value: watched + implemented },
  ]

  const recentProgress = progress.slice(0, 6)
  const upcomingSessions = sessions.filter((s) => s.status === 'ACTIVE').slice(0, 4)
  const nextSession = upcomingSessions[0]

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('sessions')
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({ sessions: null, activity: null })
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
      <div className="fixed inset-0 flex items-center justify-center bg-[#060606]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#2de5ca] border-r-[#2fb6a2] animate-spin" />
            <div className="absolute inset-2 rounded-full bg-[#2fb6a2]/10 blur-md animate-pulse" />
          </div>
          <p className="text-white/40 text-sm font-medium tracking-wide font-display">Ładowanie panelu…</p>
        </div>
      </div>
    )
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* ===== Hero Header ===== */}
        <div className="animate-rise-in mb-10 md:mb-16">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium text-white/60 glass">
              <span className="live-dot" />
              Witaj z powrotem
            </div>
            {streak > 0 && (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold glass border border-[#2de5ca]/40 text-[#2de5ca]">
                <Flame className="w-3.5 h-3.5" />
                {streak} {streak === 1 ? 'dzień' : 'dni'} serii
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold glass border border-[#2fb6a2]/40 text-[#8cffef]">
              <Zap className="w-3.5 h-3.5" />
              Poziom {levelInfo.level}
            </div>
          </div>
          <h1 className="font-display text-display font-bold tracking-tight mb-4 text-gradient-vantor">
            Panel ucznia
          </h1>
          <p className="text-white/45 text-lg md:text-xl max-w-2xl font-light tracking-wide">
            Twój postęp, sesje i filmy — w jednym eleganckim miejscu. Kontynuuj tam, gdzie skończyłeś.
          </p>
        </div>

        {/* ===== Marquee Band ===== */}
        <div className="marquee animate-rise-in mb-10 py-3 border-y border-white/[0.06]" style={{ animationDelay: '30ms' }}>
          <div className="marquee-track text-sm font-display font-semibold text-white/30">
            {[0, 1].map((n) => (
              <span key={n} className="flex items-center gap-10">
                <span>PODNOSIMY TWÓJ LEVEL</span><span className="text-[#2de5ca]">✦</span>
                <span>AIM TRAINING</span><span className="text-[#2de5ca]">✦</span>
                <span>ANALIZA MECZÓW</span><span className="text-[#2de5ca]">✦</span>
                <span>GRANIE W ZESPOLE</span><span className="text-[#2de5ca]">✦</span>
                <span>MIKRO I MAKRO</span><span className="text-[#2de5ca]">✦</span>
              </span>
            ))}
          </div>
        </div>

        {/* ===== RANK CARD — the „wow” centerpiece ===== */}
        <div className="animate-rise-in mb-10">
          <div className="bento-card p-6 md:p-8 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30" style={{ background: 'radial-gradient(50% 50% at 50% 100%, #2fb6a2 0%, rgba(47,182,162,0.25) 70%, transparent 100%)' }} />
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
              {/* Rank emblem + name */}
              <div className="flex items-center gap-6">
                <RankEmblem rank={rank} size={96} />
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-1">Twoja ranga treningowa</p>
                  <h2 className="font-display text-3xl md:text-4xl font-bold text-white">{rank.name}</h2>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-40 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${next ? Math.min(100, ((completionRate - rank.min) / ((next.min - rank.min) || 1)) * 100) : 100}%`,
                          background: `linear-gradient(90deg, ${rank.color}, ${next?.color || rank.color})`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/45">
                      {next ? `${next.min - completionRate}% do rangi ${next.name}` : 'Maksymalna ranga!'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Level + XP */}
              <div className="lg:border-l lg:border-white/[0.08] lg:pl-8">
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-4xl font-bold text-[#2de5ca]">{levelInfo.level}</p>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">poziom</p>
                </div>
                <div className="mt-3 w-44 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#2fb6a2] to-[#2de5ca] transition-all duration-1000" style={{ width: `${levelInfo.pct}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-white/40">{levelInfo.xp}/{levelInfo.xpToNext} XP do kolejnego poziomu</p>
              </div>

              {/* Next mission + session countdown */}
              <div className="lg:ml-auto flex flex-col gap-3">
                <Link
                  href={nextUp ? '/student/videos' : '/student/sessions'}
                  className="btn-darey inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold self-start"
                >
                  <Target className="w-4 h-4" />
                  {nextUp ? 'Następny krok: obejrzyj film' : 'Zaplanuj następny trening'}
                </Link>
                {nextSession && nextSession.scheduledAt && (
                  <div className="inline-flex items-center gap-2 text-xs text-white/55">
                    <CalendarClock className="w-4 h-4 text-[#2de5ca]" />
                    <Countdown target={nextSession.scheduledAt} label={nextSession.title} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Achievements strip */}
          <div className="mt-6 flex items-center gap-2 mb-4">
            <span className="section-pill"><Trophy className="w-3.5 h-3.5" /> Osiągnięcia</span>
            <span className="text-xs text-white/40">{earnedCount}/{achievements.length} zdobytych</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {achievements.map((a) => (
              <div
                key={a.key}
                title={`${a.name} — ${a.desc}`}
                className={`bento-card flex flex-col items-center justify-center gap-2 p-4 text-center transition-all duration-300 ${a.earned ? 'border-[#2de5ca]/30' : 'opacity-40 grayscale'}`}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-[10px] font-semibold text-white/70 leading-tight">{a.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Coach Banner ===== */}
        {coach && (
          <Tilt3D
            wrapperClassName="animate-rise-in animate-rise-in-delay-1 mb-10"
            wrapperStyle={{ animationDelay: '60ms' }}
            className="relative rounded-3xl overflow-hidden glass-card p-6 md:p-8"
            maxTilt={5}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#2de5ca]/10 via-transparent to-[#2de5ca]/10" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-18 h-18 rounded-2xl ring-2 ring-white/20 shadow-[0_16px_40px_-10px_rgba(45,229,202,0.6)]">
                    <AvatarImage src={coach.avatarUrl ?? undefined} alt={coach.name ?? coach.email} />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2] text-white font-display font-semibold text-xl">
                      {(coach.name ?? coach.email)[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#34d399] ring-3 ring-[#060606] grid place-items-center">
                    <span className="w-2 h-2 rounded-full bg-white/90" />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-[#8cffef] font-semibold mb-1.5">Twój trener</p>
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
                  <BookOpen className="w-4.5 h-4.5 text-[#8cffef]" />
                  Przeglądaj sesje
                </Link>
                <Link
                  href="/student/videos"
                  className="btn-darey relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
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
                      <stop offset="0%" stopColor="#8cffef" />
                      <stop offset="55%" stopColor="#2fb6a2" />
                      <stop offset="100%" stopColor="#2fb6a2" />
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
                    { v: watching, label: 'W trakcie', color: '#2de5ca', key: 'watching' },
                    { v: watched, label: 'Obejrzane', color: '#34d399', key: 'watched' },
                    { v: implemented, label: 'Wdrożone', color: '#2fb6a2', key: 'implemented' },
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
                <Sparkles className="w-4 h-4 text-[#8cffef]" />
              </div>
              <h4 className="font-display text-lg font-bold">Szybkie akcje</h4>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 relative z-10">
              {[
                { href: '/student/messages', icon: MessageSquare, label: 'Wiadomości', sub: 'Czat z trenerem', color: 'from-[#2de5ca] to-[#2fb6a2]', ring: 'rgba(45,229,202,0.4)' },
                { href: '/student/feedback', icon: MessageSquareHeart, label: 'Moja opinia', sub: 'Podziel się spostrzeżeniami', color: 'from-[#8cffef] to-[#2de5ca]', ring: 'rgba(45,229,202,0.4)' },
                { href: '/student/sessions', icon: BookOpen, label: 'Wszystkie sesje', sub: 'Przeglądaj swoje sesje', color: 'from-[#2de5ca] to-[#8cffef]', ring: 'rgba(45,229,202,0.4)' },
                { href: '/student/videos', icon: Film, label: 'Filmy do oglądania', sub: 'Twoja lista filmów', color: 'from-[#fbbf24] to-[#f97316]', ring: 'rgba(251,191,36,0.4)' },
                { href: '/student/progress', icon: TrendingUp, label: 'Mój postęp', sub: 'Statystyki i wykresy', color: 'from-[#34d399] to-[#16a34a]', ring: 'rgba(52,211,153,0.4)' },
                { href: '/student/settings', icon: Settings, label: 'Ustawienia', sub: 'Profil i preferencje', color: 'from-[#2fb6a2] to-[#2de5ca]', ring: 'rgba(47,182,162,0.4)' },
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
                      <p className="text-sm font-semibold text-white group-hover:text-[#8cffef] transition-colors truncate">{a.label}</p>
                      <p className="text-[11px] text-white/45 truncate">{a.sub}</p>
                    </div>
                    <ArrowRight className="w-4.5 h-4.5 text-white/30 group-hover:text-[#8cffef] group-hover:translate-x-1 transition-all duration-300" />
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
                    activeTab === t.key ? 'bg-[#2fb6a2]/20 text-[#8cffef] border border-[#2fb6a2]/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
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
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl glass hover:bg-white/[0.03] hover:border-[#2de5ca]/25 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#8cffef] shadow-[0_12px_32px_-8px_rgba(45,229,202,0.5)] flex-shrink-0">
                          <CalendarClock className="w-5.5 h-5.5 text-white" strokeWidth={2.2} />
                          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#8cffef] transition-colors truncate">{session.title}</h4>
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
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#2fb6a2]/15 hover:border-[#2fb6a2]/40 hover:text-[#8cffef] transition-all duration-300"
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
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl glass hover:bg-white/[0.03] hover:border-[#2de5ca]/25 transition-all duration-300"
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
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-[#2de5ca]/40 to-transparent" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#8cffef] transition-colors truncate">{p.video.title}</h4>
                          <p className="text-sm text-white/45 truncate">{p.session?.title}</p>
                          {typeof p.progress === 'number' && (
                            <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.05] overflow-hidden max-w-xs">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#2de5ca] to-[#2fb6a2] shadow-[0_0_12px_rgba(45,229,202,0.5)]"
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
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#2fb6a2]/15 hover:border-[#2fb6a2]/40 hover:text-[#8cffef] transition-all duration-300"
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
            <Plus className="w-4 h-4 text-[#2de5ca]" />
            Systematyczność to klucz do sukcesu
          </p>
        </div>

        {/* ===== XL footer brand (Vantor Logo-XL style) ===== */}
        <footer className="mt-20 select-none pointer-events-none">
          <div className="text-center font-display font-bold leading-none tracking-tighter text-[13vw] lg:text-[9rem] text-transparent bg-clip-text bg-gradient-to-b from-white/[0.14] to-transparent">
            CS2
          </div>
          <div className="text-center font-display font-bold leading-none tracking-tighter text-[13vw] lg:text-[9rem] text-transparent bg-clip-text bg-gradient-to-b from-white/[0.14] to-transparent -mt-[4vw] lg:-mt-10">
            COACHING
          </div>
        </footer>
      </div>
    </StudentLayout>
  )
}

// Tiny isolated countdown — ticks every second, only re-renders itself.
function Countdown({ target, label }: { target: string; label: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = new Date(target).getTime() - now
  if (diff <= 0) {
    return <span>Sesja „{label}” — dziś lub wkrótce</span>
  }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="tabular-nums">
      Sesja za: {days > 0 ? `${days}d ` : ''}{pad(hours)}:{pad(minutes)}:{pad(secs)}
    </span>
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