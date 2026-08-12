'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StudentLayout } from '@/components/student-layout'
import { Film, Clock, CalendarClock, BookOpen, ArrowRight, Sparkles, MessageSquare, Flame, Zap, Target, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { getRank, nextRank, getLevel, getStreak } from '@/lib/gamification'
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

type TabKey = 'sessions' | 'activity'

export function StudentDashboardClient({
  initialStats,
  initialSessions,
  initialProgress,
  initialCoach,
}: StudentDashboardClientProps) {
  const { totalVideos, pending, watching, watched, implemented, totalSessions } = initialStats
  const sessions = initialSessions
  const progress = initialProgress
  const coach = initialCoach

  const completionRate = totalVideos > 0 ? Math.round(((watched + implemented) / totalVideos) * 100) : 0
  const rank = getRank(completionRate)
  const next = nextRank(completionRate)
  const levelInfo = getLevel(watched + implemented)
  const streak = getStreak(progress.map((p) => p.watchedAt || p.updatedAt))

  // "Co teraz": the next video to watch, or the next upcoming session
  const nextUpVideo = progress.find((p) => p.status === 'PENDING' || p.status === 'WATCHING')
  const upcomingSessions = sessions.filter((s) => s.status === 'ACTIVE').slice(0, 4)
  const nextSession = upcomingSessions[0]

  const recentProgress = progress.slice(0, 6)

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

  const progressBreakdown = [
    { v: pending, label: 'Do oglądania', color: '#fbbf24', key: 'pending' },
    { v: watching, label: 'W trakcie', color: '#2de5ca', key: 'watching' },
    { v: watched, label: 'Obejrzane', color: '#34d399', key: 'watched' },
    { v: implemented, label: 'Wdrożone', color: '#14b8a6', key: 'implemented' },
  ]

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#060606]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#2de5ca] border-r-[#14b8a6] animate-spin" />
            <div className="absolute inset-2 rounded-full bg-[#14b8a6]/10 blur-md animate-pulse" />
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
        <div className="animate-rise-in mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-5">
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
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold glass border border-[#14b8a6]/40 text-[#8cffef]">
              <Zap className="w-3.5 h-3.5" />
              Poziom {levelInfo.level}
            </div>
          </div>
          <h1 className="font-display text-display font-bold tracking-tight mb-3 text-gradient-vantor">
            Panel ucznia
          </h1>
          <p className="text-white/45 text-lg max-w-2xl font-light tracking-wide">
            Twój postęp, sesje i filmy — w jednym miejscu. Kontynuuj tam, gdzie skończyłeś.
          </p>
        </div>

        {/* ===== ACTION ROW: next step + session countdown ===== */}
        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          {/* Next video */}
          <Link
            href={nextUpVideo ? `/student/videos/${nextUpVideo.video.id}` : '/student/videos'}
            className="animate-rise-in group glass-liquid relative overflow-hidden rounded-3xl p-6 spotlight-card"
            style={{ animationDelay: '0ms' }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
              e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
            }}
          >
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[#14b8a6]/15 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] grid place-items-center ring-1 ring-white/25">
                {nextUpVideo ? <PlayCircle className="w-6 h-6 text-white" /> : <Film className="w-6 h-6 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-widest text-[#8cffef] font-semibold mb-1">
                  {nextUpVideo ? 'Kontynuuj naukę' : 'Biblioteka filmów'}
                </p>
                <h3 className="font-display text-lg font-bold truncate">
                  {nextUpVideo ? nextUpVideo.video.title : 'Zacznij od pierwszego filmu'}
                </h3>
                <p className="text-sm text-white/45 mt-0.5">
                  {nextUpVideo ? nextUpVideo.session?.title || 'Sesja treningowa' : 'Wybierz materiał z biblioteki'}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 text-white/30 group-hover:text-[#8cffef] group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>

          {/* Next session */}
          <div className="animate-rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '60ms' }}>
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-[#2de5ca]/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#f97316] grid place-items-center ring-1 ring-white/25">
                <CalendarClock className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-widest text-amber-300 font-semibold mb-1">
                  {nextSession ? 'Najbliższa sesja' : 'Sesje'}
                </p>
                <h3 className="font-display text-lg font-bold truncate">
                  {nextSession ? nextSession.title : 'Brak zaplanowanych sesji'}
                </h3>
                <p className="text-sm text-white/45 mt-0.5">
                  {nextSession && nextSession.scheduledAt ? (
                    <Countdown target={nextSession.scheduledAt} />
                  ) : (
                    'Trener poinformuje Cię o nowej sesji'
                  )}
                </p>
              </div>
              <Link
                href="/student/sessions"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#14b8a6]/15 hover:border-[#14b8a6]/40 hover:text-[#8cffef] transition-all duration-300 shrink-0"
              >
                Sesje <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ===== PROGRESS CARD — one place for all numbers ===== */}
        <div className="animate-rise-in relative rounded-3xl p-6 md:p-8 glass-liquid overflow-hidden mb-8" style={{ animationDelay: '120ms' }}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-7 lg:gap-10 relative z-10">
            {/* Rank emblem + ring */}
            <div className="flex items-center gap-6 shrink-0">
              <RankEmblem rank={rank} size={88} />
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-1">Twoja ranga</p>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-white">{rank.name}</h2>
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="w-32 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${next ? Math.min(100, ((completionRate - rank.min) / ((next.min - rank.min) || 1)) * 100) : 100}%`,
                        background: `linear-gradient(90deg, ${rank.color}, ${next?.color || rank.color})`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/45 whitespace-nowrap">
                    {next ? `${next.min - completionRate}% do ${next.name}` : 'Maks! 👑'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/45">
                  <Zap className="w-3.5 h-3.5 text-[#2de5ca]" />
                  Poziom {levelInfo.level} · {levelInfo.xp}/{levelInfo.xpToNext} XP
                </div>
              </div>
            </div>

            {/* Circular progress */}
            <div className="hidden md:flex items-center gap-4 shrink-0 lg:border-l lg:border-white/[0.08] lg:pl-10">
              <div className="relative w-[120px] h-[120px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke="url(#dashProgress)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${(completionRate / 100) * (2 * Math.PI * 50)} ${2 * Math.PI * 50}`}
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                  <defs>
                    <linearGradient id="dashProgress" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8cffef" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="font-display text-2xl font-bold text-gradient-mesh leading-none">{completionRate}%</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/40 mt-1">ukończone</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-white/85 mb-3">Postęp oglądania</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {progressBreakdown.map((b) => (
                  <div key={b.key} className="rounded-2xl p-4 glass hover:border-white/[0.12] transition-all duration-300">
                    <p className="font-display text-2xl font-bold tabular-nums" style={{ color: b.color }}>{b.v}</p>
                    <p className="text-[11px] text-white/45 mt-1 leading-tight">{b.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Link
                  href="/student/progress"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2de5ca] hover:text-white transition-colors"
                >
                  Szczegółowe statystyki <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Coach Banner ===== */}
        {coach && (
          <div className="animate-rise-in mb-8 relative rounded-3xl overflow-hidden glass-card p-5 md:p-6" style={{ animationDelay: '180ms' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#2de5ca]/10 via-transparent to-[#2de5ca]/10" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="w-12 h-12 rounded-2xl ring-2 ring-white/20 shrink-0">
                  <AvatarImage src={coach.avatarUrl ?? undefined} alt={coach.name ?? coach.email} />
                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] text-white font-display font-semibold text-lg">
                    {(coach.name ?? coach.email)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-[#8cffef] font-semibold mb-0.5">Twój trener</p>
                  <h3 className="font-display text-xl font-bold truncate">{coach.name ?? coach.email}</h3>
                  <p className="text-white/40 text-xs mt-0.5 truncate">Skontaktuj się w razie pytań</p>
                </div>
              </div>
              <div className="flex gap-2.5 md:ml-auto flex-wrap">
                <Link
                  href="/student/messages"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:border-[#2de5ca]/40 hover:text-[#8cffef] transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 text-[#8cffef]" /> Napisz
                </Link>
                <Link
                  href="/student/sessions"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:border-[#2de5ca]/40 transition-all duration-300"
                >
                  <BookOpen className="w-4 h-4 text-[#8cffef]" /> Sesje
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ===== Tabs Section ===== */}
        <div className="animate-rise-in relative rounded-3xl glass-card overflow-hidden" style={{ animationDelay: '240ms' }}>
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
                    activeTab === t.key ? 'bg-[#14b8a6]/20 text-[#8cffef] border border-[#14b8a6]/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
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
                  <div className="text-center py-14 px-6">
                    <div className="relative w-16 h-16 mx-auto mb-4 grid place-items-center rounded-2xl glass border border-white/[0.07]">
                      <CalendarClock className="w-7 h-7 text-white/50" strokeWidth={1.8} />
                    </div>
                    <h4 className="font-display text-lg font-semibold mb-1.5">Brak nadchodzących sesji</h4>
                    <p className="text-white/40 text-sm">Twój trener poinformuje Cię o nowej sesji</p>
                  </div>
                ) : (
                  upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl glass hover:bg-white/[0.03] hover:border-[#2de5ca]/25 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#8cffef] flex-shrink-0">
                          <CalendarClock className="w-5 h-5 text-white" strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#8cffef] transition-colors truncate">{session.title}</h4>
                          <p className="text-sm text-white/45 mt-1 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Bez terminu'}
                          </p>
                          {session.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {session.tags.slice(0, 3).map((st) => (
                                <span
                                  key={st.tag.id}
                                  className="text-[11px] px-2.5 py-1 rounded-full font-medium glass border border-white/[0.08] text-white/75"
                                  style={st.tag.color ? { color: st.tag.color, borderColor: `${st.tag.color}40` } : undefined}
                                >
                                  {st.tag.name}
                                </span>
                              ))}
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
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#14b8a6]/15 hover:border-[#14b8a6]/40 hover:text-[#8cffef] transition-all duration-300"
                        >
                          Otwórz <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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
                  <div className="text-center py-14 px-6">
                    <div className="relative w-16 h-16 mx-auto mb-4 grid place-items-center rounded-2xl glass border border-white/[0.07]">
                      <Film className="w-7 h-7 text-white/50" strokeWidth={1.8} />
                    </div>
                    <h4 className="font-display text-lg font-semibold mb-1.5">Brak ostatniej aktywności</h4>
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
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.video.thumbnail} alt={p.video.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[#1a1c28] to-[#0f1118]">
                              <Film className="w-5 h-5 text-white/40" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#8cffef] transition-colors truncate">{p.video.title}</h4>
                          <p className="text-sm text-white/45 truncate">{p.session?.title}</p>
                          {typeof p.progress === 'number' && (
                            <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden max-w-xs">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#2de5ca] to-[#14b8a6]"
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
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#14b8a6]/15 hover:border-[#14b8a6]/40 hover:text-[#8cffef] transition-all duration-300"
                          >
                            Kontynuuj <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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

        {/* ===== Footer ===== */}
        <div className="mt-12 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <Sparkles className="w-3 h-3 text-[#2de5ca]/50" />
          <span className="uppercase tracking-[0.25em]">
            {totalSessions > 0 ? `${totalSessions} sesji · systematyczność to klucz` : 'Systematyczność to klucz'}
          </span>
          <Sparkles className="w-3 h-3 text-[#2de5ca]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </StudentLayout>
  )
}

// Tiny isolated countdown — ticks every second, only re-renders itself.
function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = new Date(target).getTime() - now
  if (diff <= 0) {
    return <span>Odbywa się dziś lub wkrótce</span>
  }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="tabular-nums">
      Za: {days > 0 ? `${days}d ` : ''}{pad(hours)}:{pad(minutes)}:{pad(secs)}
    </span>
  )
}
