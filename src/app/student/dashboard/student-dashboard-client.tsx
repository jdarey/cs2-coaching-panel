'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StudentLayout } from '@/components/student-layout'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { CountUp } from '@/components/count-up'
import { EntranceGate } from '@/components/entrance-gate'
import { AnnouncementsFeed } from '@/components/community/announcements-feed'
import { LeaderboardWidget } from '@/components/community/leaderboard-widget'
import {
  Film, Clock, CalendarClock, BookOpen, ArrowRight,  Sparkles, MessageSquare, Flame, Zap, PlayCircle,
  TrendingUp, AlertTriangle, CheckCircle2, Target, ListChecks, Timer,
} from 'lucide-react'
import Link from 'next/link'
import { getRank, nextRank, getLevel, getStreak } from '@/lib/gamification'
import { RankEmblem } from '@/components/rank-emblem'

interface Session {
  id: string
  title: string
  status: string
  scheduledAt: string | null
  coach: { id: string; name: string | null; email: string; avatarUrl: string | null }
  tags: { tag: { id: string; name: string; color: string } }[]
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

interface RankEntry {
  id: string
  mode: string
  rank: string
  elo: number | null
  note: string | null
  recordedAt: string
}

interface Mistake {
  tag: { id: string; name: string; color: string } | null
  count: number
}

interface Assignment {
  id: string
  title: string
  status: string
  dueDate: string | null
  videoId: string | null
}

interface RoutineAssignment {
  id: string
  status: string
  routine: {
    id: string
    title: string
    description: string | null
    tasks: { id: string; title: string; description: string | null; videoId: string | null; day: number; minutes: number | null }[]
  }
  progress: { taskId: string; status: string }[]
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
  initialCoach: { id: string; name: string | null; email: string; avatarUrl: string | null } | null
  initialRank: RankEntry[]
  initialMistakes: Mistake[]
  initialAssignments: Assignment[]
  initialRoutines: RoutineAssignment[]
  initialPractice: {
    weeks: { label: string; minutes: number; isCurrent: boolean }[]
    totalMinutes: number
    thisWeek: number
    sessions: number
  }
  weekly: { videosDone: number; tasksDone: number; sessionsThisWeek: number; overdueAssignments: number; dueSoonAssignments: number }
}

type TabKey = 'sessions' | 'activity'

export function StudentDashboardClient({
  initialStats,
  initialSessions,
  initialProgress,
  initialCoach,
  initialRank,
  initialMistakes,
  initialAssignments,
  initialRoutines,
  initialPractice,
  weekly,
}: StudentDashboardClientProps) {
  const router = useRouter()
  useLiveRefresh(() => router.refresh())

  const { totalVideos, pending, watching, watched, implemented, totalSessions } = initialStats
  const sessions = initialSessions
  const progress = initialProgress
  const coach = initialCoach
  const rankEntries = initialRank
  const mistakes = initialMistakes
  const assignments = initialAssignments

  const completionRate = totalVideos > 0 ? Math.round(((watched + implemented) / totalVideos) * 100) : 0
  const rank = getRank(completionRate)
  const next = nextRank(completionRate)
  const levelInfo = getLevel(watched + implemented)
  const streak = getStreak(progress.map((p) => p.watchedAt || p.updatedAt))

  const nextUpVideo = progress.find((p) => p.status === 'PENDING' || p.status === 'WATCHING')
  const upcomingSessions = sessions.filter((s) => s.status === 'ACTIVE').slice(0, 4)
  const nextSession = upcomingSessions[0]
  const recentProgress = progress.slice(0, 6)

  const overdueAssignments = assignments.filter((a) => a.status === 'PENDING' && a.dueDate && new Date(a.dueDate) < new Date())
  const nextAssignment = assignments.find((a) => a.status === 'PENDING')

  const activeRoutine = initialRoutines.find((r) => r.status === 'ACTIVE')
  const routineDone = activeRoutine
    ? activeRoutine.progress.filter((p) => p.status === 'DONE').length
    : 0
  const routineTotal = activeRoutine?.routine.tasks.length ?? 0
  const routinePct = routineTotal > 0 ? Math.round((routineDone / routineTotal) * 100) : 0

  const practiceWeeks = initialPractice.weeks
  const maxPracticeWeek = Math.max(1, ...practiceWeeks.map((w) => w.minutes))

  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('sessions')
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({ sessions: null, activity: null })
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  useEffect(() => setMounted(true), [])

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
    { v: watching, label: 'W trakcie', color: '#a78bfa', key: 'watching' },
    { v: watched, label: 'Obejrzane', color: '#34d399', key: 'watched' },
    { v: implemented, label: 'Wdrożone', color: '#8b5cf6', key: 'implemented' },
  ]

  const maxMistake = Math.max(1, ...mistakes.map((m) => m.count))

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#07060c]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#a78bfa] border-r-[#8b5cf6] animate-spin" />
          </div>
          <p className="text-white/40 text-sm font-medium tracking-wide font-display">Ładowanie panelu…</p>
        </div>
      </div>
    )
  }

  return (
    <StudentLayout>
      <EntranceGate className="max-w-7xl mx-auto px-4 sm:px-6 pb-24" delay={400}>
        {/* Dashboard content — cards stagger in after the redirect overlay */}
        <div className="contents">
        {/* ===== Hero Header ===== */}
        <div className="animate-rise-in mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-medium text-white/60 glass">
              <span className="live-dot" />
              Witaj z powrotem
            </div>
            {streak > 0 && (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold glass border border-[#a78bfa]/40 text-[#c4b5fd]">
                <Flame className="w-3.5 h-3.5" />
                {streak} {streak === 1 ? 'dzień' : 'dni'} serii
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold glass border border-[#8b5cf6]/40 text-[#c4b5fd]">
              <Zap className="w-3.5 h-3.5" />
              Poziom {levelInfo.level}
            </div>
            {weekly.overdueAssignments > 0 && (
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold glass border border-red-500/40 text-red-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                {weekly.overdueAssignments} zaległych zadań
              </div>
            )}
          </div>
          <h1 className="font-display text-display font-bold tracking-tight mb-3 text-gradient-vantor">Panel ucznia</h1>
          <p className="text-white/45 text-lg max-w-2xl font-light tracking-wide">
            Dziś robisz jeden krok. Potem następny. To wszystko się sumuje.
          </p>
        </div>

        {/* ===== Społeczność: ogłoszenia + ranking tygodnia ===== */}
        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          <div className="animate-rise-in" style={{ animationDelay: '20ms' }}>
            <AnnouncementsFeed variant="student" />
          </div>
          <div className="animate-rise-in" style={{ animationDelay: '60ms' }}>
            <LeaderboardWidget variant="student" />
          </div>
        </div>

        {/* ===== DZIŚ — what matters today ===== */}
        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          <Link
            href={nextUpVideo ? `/student/videos/${nextUpVideo.video.id}` : '/student/videos'}
            className="animate-rise-in group glass-liquid relative overflow-hidden rounded-3xl p-6 spotlight-card"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
              e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
            }}
          >
            <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[#8b5cf6]/15 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] grid place-items-center ring-1 ring-white/25 animate-pulse-ring">
                {nextUpVideo ? <PlayCircle className="w-6 h-6 text-white" /> : <Film className="w-6 h-6 text-white" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-widest text-[#c4b5fd] font-semibold mb-1">
                  {nextUpVideo ? 'Kontynuuj naukę' : 'Biblioteka filmów'}
                </p>
                <h3 className="font-display text-lg font-bold truncate">
                  {nextUpVideo ? nextUpVideo.video.title : 'Zacznij od pierwszego filmu'}
                </h3>
                <p className="text-sm text-white/45 mt-0.5">
                  {nextUpVideo ? nextUpVideo.session?.title || 'Sesja treningowa' : 'Wybierz materiał z biblioteki'}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 text-white/30 group-hover:text-[#c4b5fd] group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>

          <div className="animate-rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '60ms' }}>
            <div className="absolute -bottom-16 -left-16 w-52 h-52 rounded-full bg-[#a78bfa]/10 blur-3xl pointer-events-none" />
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#8b5cf6]/15 hover:border-[#8b5cf6]/40 hover:text-[#c4b5fd] transition-all duration-300 shrink-0"
              >
                Sesje <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ===== ACTIVE ROUTINE ===== */}
        {activeRoutine && (
          <Link
            href="/student/tasks"
            className="animate-rise-in group glass-liquid relative overflow-hidden rounded-3xl p-6 mb-8 spotlight-card block transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)]"
            style={{ animationDelay: '100ms' }}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
              e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
            }}
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#8b5cf6]/15 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] grid place-items-center ring-1 ring-white/25 animate-pulse-ring">
                <ListChecks className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-[#c4b5fd] font-semibold mb-1">
                  Twoja aktywna rutyna
                </p>
                <h3 className="font-display text-lg font-bold truncate">{activeRoutine.routine.title}</h3>
                {activeRoutine.routine.description && (
                  <p className="text-sm text-white/45 mt-0.5 line-clamp-1">{activeRoutine.routine.description}</p>
                )}
              </div>
              <div className="shrink-0 sm:w-64">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/50">Postęp rutyny</span>
                  <span className="font-semibold text-white/80 tabular-nums">
                    {routineDone}/{routineTotal} · {routinePct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] transition-all duration-1000"
                    style={{ width: `${routinePct}%` }}
                  />
                </div>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 text-white/30 group-hover:text-[#c4b5fd] group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>
        )}

        {/* ===== PROGRESS + ELO TRAJECTORY ===== */}
        <div className="grid gap-6 lg:grid-cols-5 mb-8">
          {/* Progress card */}
          <div className="animate-rise-in lg:col-span-3 relative rounded-3xl p-6 md:p-7 glass-liquid border-glow overflow-hidden" style={{ animationDelay: '120ms' }}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8 relative z-10">
              <div className="flex items-center gap-5 shrink-0">
                <RankEmblem rank={rank} size={76} />
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-1">Twoja ranga</p>
                  <h2 className="font-display text-2xl font-bold text-white">{rank.name}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-28 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
                  <div className="mt-2 flex items-center gap-2 text-xs text-white/45">
                    <Zap className="w-3.5 h-3.5 text-[#a78bfa]" />
                    Poziom {levelInfo.level} · {levelInfo.xp}/{levelInfo.xpToNext} XP
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-white/85 mb-3">Postęp oglądania</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {progressBreakdown.map((b) => (
                    <div key={b.key} className="rounded-2xl p-3.5 glass hover:border-white/[0.12] transition-all duration-300">
                      <p className="font-display text-2xl font-bold tabular-nums" style={{ color: b.color }}><CountUp value={b.v} /></p>
                      <p className="text-[11px] text-white/45 mt-1 leading-tight">{b.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ELO trajectory */}
          <div className="animate-rise-in lg:col-span-2 relative rounded-3xl p-6 glass-liquid border-glow overflow-hidden" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] ring-1 ring-white/25 animate-icon-bounce">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Trajektoria rangi</h3>
              </div>
              <Link href="/student/rank" className="text-[11px] text-white/40 hover:text-[#c4b5fd] transition-colors font-medium">
                szczegóły
              </Link>
            </div>
            {rankEntries.length < 2 ? (
              <p className="text-sm text-white/40 text-center py-10">
                Dodaj pierwszy wpis rangi, aby zobaczyć wykres postępu.
                <Link href="/student/rank" className="block mt-2 text-[#c4b5fd] hover:text-white transition-colors font-medium">Przejdź do rangi →</Link>
              </p>
            ) : (
              <EloChart entries={rankEntries} />
            )}
          </div>
        </div>

        {/* ===== PRACTICE TIME ===== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Weekly minutes chart */}
          <div className="animate-rise-in lg:col-span-2 glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '170ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ef4444] ring-1 ring-white/25 animate-icon-bounce">
                  <Timer className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white/90">Moja praktyka</h3>
                  <p className="text-[11px] text-white/40">minuty treningu w ostatnich 8 tygodniach</p>
                </div>
              </div>
              <Link href="/student/tasks" className="text-[11px] text-white/40 hover:text-[#c4b5fd] transition-colors font-medium">
                zadania treningowe
              </Link>
            </div>
            {initialPractice.sessions === 0 ? (
              <p className="text-sm text-white/40 text-center py-12">
                Ukończ pierwszy trening z timerem, aby zobaczyć wykres swojego czasu.
                <Link href="/student/tasks" className="block mt-2 text-[#c4b5fd] hover:text-white transition-colors font-medium">Otwórz zadania →</Link>
              </p>
            ) : (
              <div className="flex items-end gap-2 sm:gap-3 h-40">
                {practiceWeeks.map((w, i) => {
                  const h = w.minutes > 0 ? Math.max(6, (w.minutes / maxPracticeWeek) * 130) : 3
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group" title={`${w.label}: ${w.minutes} min`}>
                      <span className="text-[10px] font-semibold tabular-nums opacity-0 group-hover:opacity-100 transition-opacity text-[#c4b5fd]">
                        {w.minutes}
                      </span>
                      <div
                        className={cn(
                          'w-full max-w-9 rounded-t-xl transition-all duration-700',
                          w.isCurrent
                            ? 'bg-gradient-to-t from-[#8b5cf6] to-[#a78bfa] ring-1 ring-white/30 shadow-[0_0_16px_rgba(139,92,246,0.5)]'
                            : 'bg-white/[0.08] group-hover:bg-[#a78bfa]/30',
                        )}
                        style={{ height: `${h}px` }}
                      />
                      <span className={cn('text-[10px] tabular-nums', w.isCurrent ? 'text-[#c4b5fd] font-semibold' : 'text-white/30')}>
                        {w.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Practice stats */}
          <div className="animate-rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] ring-1 ring-white/25">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white/90">Łącznie</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl p-4 glass">
                <p className="font-display text-3xl font-bold text-white tabular-nums"><CountUp value={initialPractice.totalMinutes} /></p>
                <p className="text-xs text-white/45 mt-1">minut treningu zalogowanych</p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl p-4 glass">
                  <p className="font-display text-2xl font-bold text-[#c4b5fd] tabular-nums"><CountUp value={initialPractice.thisWeek} /></p>
                  <p className="text-[11px] text-white/45 mt-1">min w tym tygodniu</p>
                </div>
                <div className="flex-1 rounded-2xl p-4 glass">
                  <p className="font-display text-2xl font-bold text-[#34d399] tabular-nums"><CountUp value={initialPractice.sessions} /></p>
                  <p className="text-[11px] text-white/45 mt-1">sesji praktyki</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MISTAKES + WEEKLY ===== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* My mistakes */}
          <div className="animate-rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#ef4444] ring-1 ring-white/25">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white/90">Nad czym pracujemy</h3>
            </div>
            {mistakes.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">Trener oznaczy błędy w sesjach — tu zobaczysz swój plan.</p>
            ) : (
              <div className="space-y-3">
                {mistakes.slice(0, 5).map((m) => (
                  <div key={m.tag?.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70 font-medium">{m.tag?.name}</span>
                      <span className="text-xs text-white/45 tabular-nums">{m.count}×</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.round((m.count / maxMistake) * 100)}%`, background: m.tag?.color || '#a78bfa' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments due */}
          <div className="animate-rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '240ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/25">
                  <ListChecks className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Zadania treningowe</h3>
              </div>
              <Link href="/student/tasks" className="text-[11px] text-white/40 hover:text-[#c4b5fd] transition-colors font-medium">wszystkie</Link>
            </div>
            {assignments.filter((a) => a.status === 'PENDING').length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-[#34d399]" />
                <p className="text-sm text-white/55">Brak zaległości — świetna robota!</p>
                <p className="text-xs text-white/35 mt-1">Trener doda kolejne zadanie po sesji.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {assignments.filter((a) => a.status === 'PENDING').slice(0, 4).map((a) => {
                  const overdue = a.dueDate && new Date(a.dueDate) < new Date()
                  const dueSoon = a.dueDate && !overdue && new Date(a.dueDate) < new Date(Date.now() + 3 * 86400000)
                  return (
                    <Link
                      key={a.id}
                      href={a.videoId ? `/student/videos/${a.videoId}` : '/student/tasks'}
                      className="group flex items-center gap-3 rounded-xl bg-white/[0.02] px-3.5 py-3 ring-1 ring-white/[0.05] hover:ring-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
                    >
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', overdue ? 'bg-red-400' : dueSoon ? 'bg-amber-400' : 'bg-[#a78bfa]')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white/85">{a.title}</span>
                        {a.dueDate && (
                          <span className={cn('block text-[11px] mt-0.5', overdue ? 'text-red-300' : 'text-white/40')}>
                            {overdue ? 'Po terminie' : `Do ${formatDate(a.dueDate)}`}
                          </span>
                        )}
                      </span>
                      <ArrowRight className="h-4 w-4 text-white/25 group-hover:text-[#c4b5fd] group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Weekly recap */}
          <div className="animate-rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '280ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/25">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white/90">Twój tydzień</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Filmy ukończone', value: weekly.videosDone, icon: Film, color: '#34d399' },
                { label: 'Zadania wykonane', value: weekly.tasksDone, icon: CheckCircle2, color: '#a78bfa' },
                { label: 'Nowe sesje', value: weekly.sessionsThisWeek, icon: BookOpen, color: '#fbbf24' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3.5 py-2.5 ring-1 ring-white/[0.05]">
                  <span className="flex items-center gap-2 text-sm text-white/65">
                    <row.icon className="h-4 w-4" style={{ color: row.color }} />
                    {row.label}
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
              {streak >= 3 && (
                <div className="rounded-xl bg-[#a78bfa]/[0.08] ring-1 ring-[#a78bfa]/20 px-3.5 py-2.5 text-xs text-[#c4b5fd] flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  {streak} dni serii — konsekwencja się opłaca.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Coach Banner ===== */}
        {coach && (
          <div className="animate-rise-in mb-8 relative rounded-3xl overflow-hidden glass-card p-5 md:p-6" style={{ animationDelay: '320ms' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-[#a78bfa]/10 via-transparent to-[#a78bfa]/10" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar className="w-12 h-12 rounded-2xl ring-2 ring-white/20 shrink-0">
                  <AvatarImage src={coach.avatarUrl ?? undefined} alt={coach.name ?? coach.email} />
                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white font-display font-semibold text-lg">
                    {(coach.name ?? coach.email)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-[#c4b5fd] font-semibold mb-0.5">Twój trener</p>
                  <h3 className="font-display text-xl font-bold truncate">{coach.name ?? coach.email}</h3>
                  <p className="text-white/40 text-xs mt-0.5 truncate">Skontaktuj się w razie pytań</p>
                </div>
              </div>
              <div className="flex gap-2.5 md:ml-auto flex-wrap">
                <Link href="/student/messages" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:border-[#a78bfa]/40 hover:text-[#c4b5fd] transition-all duration-300">
                  <MessageSquare className="w-4 h-4 text-[#c4b5fd]" /> Napisz
                </Link>
                <Link href="/student/sessions" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:border-[#a78bfa]/40 transition-all duration-300">
                  <BookOpen className="w-4 h-4 text-[#c4b5fd]" /> Sesje
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ===== Tabs Section ===== */}
        <div className="animate-rise-in relative rounded-3xl glass-card overflow-hidden" style={{ animationDelay: '360ms' }}>
          <div className="relative flex gap-1 px-4 pt-4 border-b border-white/[0.05]">
            {[
              { key: 'sessions' as TabKey, label: 'Nadchodzące sesje', count: upcomingSessions.length },
              { key: 'activity' as TabKey, label: 'Ostatnia aktywność', count: recentProgress.length },
            ].map((t) => (
              <button
                key={t.key}
                ref={(el) => { tabRefs.current[t.key] = el }}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'relative z-10 px-6 py-4 text-sm font-display font-semibold transition-colors duration-300 flex items-center gap-2.5 rounded-t-xl',
                  activeTab === t.key ? 'text-white' : 'text-white/45 hover:text-white/75',
                )}
              >
                {t.label}
                <span className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors duration-300',
                  activeTab === t.key ? 'bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.06]',
                )}>
                  {t.count}
                </span>
              </button>
            ))}
            <span className="tab-underline" style={{ left: underline.left, width: underline.width }} />
          </div>

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
                    <div key={session.id} className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl glass hover:bg-white/[0.03] hover:border-[#a78bfa]/25 transition-all duration-300">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex-shrink-0">
                          <CalendarClock className="w-5 h-5 text-white" strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white group-hover:text-[#c4b5fd] transition-colors truncate">{session.title}</h4>
                          <p className="text-sm text-white/45 mt-1 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Bez terminu'}
                          </p>
                          {session.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {session.tags.slice(0, 3).map((st) => (
                                <span key={st.tag.id} className="text-[11px] px-2.5 py-1 rounded-full font-medium glass border border-white/[0.08] text-white/75" style={st.tag.color ? { color: st.tag.color, borderColor: `${st.tag.color}40` } : undefined}>
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
                        <Link href={`/student/sessions/${session.id}`} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#8b5cf6]/15 hover:border-[#8b5cf6]/40 hover:text-[#c4b5fd] transition-all duration-300">
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
                    <div key={p.id} className="group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl glass hover:bg-white/[0.03] hover:border-[#a78bfa]/25 transition-all duration-300">
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
                          <h4 className="font-semibold text-white group-hover:text-[#c4b5fd] transition-colors truncate">{p.video.title}</h4>
                          <p className="text-sm text-white/45 truncate">{p.session?.title}</p>
                          {typeof p.progress === 'number' && (
                            <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden max-w-xs">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6]" style={{ width: `${p.progress}%`, transition: 'width 0.8s ease' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Badge variant="outline" className={cn('text-xs px-3 py-1.5 rounded-full', VIDEO_STATUS_COLORS[p.status])}>
                          {VIDEO_STATUS_LABELS[p.status]}
                        </Badge>
                        {p.status !== 'IMPLEMENTED' && p.session && (
                          <Link href={`/student/sessions/${p.session.id}`} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white glass hover:bg-[#8b5cf6]/15 hover:border-[#8b5cf6]/40 hover:text-[#c4b5fd] transition-all duration-300">
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

        <div className="mt-12 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="uppercase tracking-[0.25em]">
            {totalSessions > 0 ? `${totalSessions} sesji · systematyczność to klucz` : 'Systematyczność to klucz'}
          </span>
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
        </div>
      </EntranceGate>
    </StudentLayout>
  )
}

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = new Date(target).getTime() - now
  if (diff <= 0) return <span>Odbywa się dziś lub wkrótce</span>
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

/** Minimal inline ELO trajectory chart (SVG polyline + gradient area). */
function EloChart({ entries }: { entries: RankEntry[] }) {
  const data = entries
    .filter((e) => e.elo != null)
    .map((e) => ({ elo: e.elo as number, label: e.recordedAt.slice(0, 10) }))
  const W = 260
  const H = 90
  const pad = 8
  if (data.length < 2) return <p className="text-sm text-white/40 text-center py-10">Dodaj więcej wpisów, aby zobaczyć trend.</p>

  const min = Math.min(...data.map((d) => d.elo))
  const max = Math.max(...data.map((d) => d.elo))
  const range = Math.max(1, max - min)
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((d.elo - min) / range) * (H - pad * 2)
    return { x, y, ...d }
  })
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `M${pts[0].x},${H - pad} L${line.replace(/ /g, ' L')} L${pts[pts.length - 1].x},${H - pad} Z`
  const delta = data[data.length - 1].elo - data[0].elo
  const up = delta >= 0

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-display text-2xl font-bold text-white tabular-nums"><CountUp value={data[data.length - 1].elo} /></span>
        <span className={cn('inline-flex items-center gap-1 text-sm font-semibold tabular-nums', up ? 'text-[#34d399]' : 'text-red-300')}>
          <TrendingUp className={cn('h-4 w-4', !up && 'rotate-180')} />
          {up ? '+' : ''}{delta}
        </span>
        <span className="text-[11px] text-white/35 ml-auto">{data.length} wpisów</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Wykres ELO w czasie">
        <defs>
          <linearGradient id="eloArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#eloArea)" />
        <polyline points={line} fill="none" stroke={up ? '#a78bfa' : '#f87171'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="2.5" fill={up ? '#c4b5fd' : '#f87171'} />
        ))}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-white/30 tabular-nums">
        <span>{formatDate(pts[0].label)}</span>
        <span>{formatDate(pts[pts.length - 1].label)}</span>
      </div>
    </div>
  )
}
