'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { CountUp } from '@/components/count-up'
import {
  Plus, Users, BookOpen, Video, ArrowRight, Activity, MessageSquare, MessageSquareHeart,
  AlertTriangle, Clock3, CalendarClock, CheckCircle2,
  Inbox, Flame, ListChecks,
} from 'lucide-react'

type Reason = { key: string; label: string }

interface AttentionStudent {
  id: string
  name: string | null
  email: string | null
  avatarUrl: string | null
  unread: number
  pending: number
  overdue: number
  inactiveDays: number
  hasUpcoming: boolean
  score: number
  reasons: Reason[]
  videoCount: number
}

interface CoachDashboardInitial {
  studentsCount: number
  sessionsCount: number
  videosCount: number
  tagsCount: number
  effectiveness: number
  assignmentRate: number
  overdueAssignments: number
  attentionNeeding: number
  attention: AttentionStudent[]
  routinesSummary: {
    id: string
    title: string
    taskTotal: number
    assignmentTotal: number
    activeAssignments: number
    completedAssignments: number
    doneTasks: number
    pct: number
    students: string[]
  }[]
  recentSessions: any[]
  sessionsThisWeek: number
  doneThisWeek: number
  activeStudents: number
  upcomingCount: number
}

const REASON_STYLE: Record<string, string> = {
  unread: 'bg-[#a78bfa]/[0.12] text-[#c4b5fd] ring-[#a78bfa]/30',
  overdue: 'bg-red-500/[0.12] text-red-300 ring-red-500/30',
  pending: 'bg-white/[0.05] text-white/60 ring-white/10',
  nosession: 'bg-amber-500/[0.12] text-amber-300 ring-amber-500/30',
  inactive: 'bg-sky-500/[0.12] text-sky-300 ring-sky-500/30',
}

export function CoachDashboardClient({ initial }: { initial: CoachDashboardInitial }) {
  const router = useRouter()
  useLiveRefresh(() => router.refresh())

  const {
    studentsCount, sessionsCount, videosCount, tagsCount, effectiveness,
    assignmentRate, overdueAssignments, attentionNeeding, attention, routinesSummary,
    recentSessions, sessionsThisWeek, doneThisWeek, activeStudents, upcomingCount,
  } = initial

  const statCards = [
    { name: 'Uczniowie', value: studentsCount, icon: Users, href: '/coach/students', gradient: 'from-[#a78bfa] to-[#8b5cf6]', hint: `${activeStudents} aktywnych w tym tygodniu` },
    { name: 'Sesje', value: sessionsCount, icon: BookOpen, href: '/coach/sessions', gradient: 'from-[#34d399] to-[#16a34a]', hint: `${upcomingCount} nadchodzących` },
    { name: 'Filmy', value: videosCount, icon: Video, href: '/coach/videos', gradient: 'from-[#8b5cf6] to-[#6d28d9]', hint: 'w bibliotece' },
    { name: 'Tagi', value: tagsCount, icon: Activity, href: '/coach/tags', gradient: 'from-[#fbbf24] to-[#f97316]', hint: 'kategorie błędów' },
  ]

  const alertCards = [
    { count: overdueAssignments, label: 'zadań po terminie', href: '/coach/students', icon: Clock3, tone: 'text-red-300 bg-red-500/[0.12] ring-red-500/25' },
    { count: attentionNeeding, label: 'uczniów wymaga uwagi', href: '/coach/students', icon: AlertTriangle, tone: 'text-amber-300 bg-amber-500/[0.12] ring-amber-500/25' },
    { count: upcomingCount, label: 'nadchodzących sesji', href: '/coach/sessions', icon: CalendarClock, tone: 'text-[#c4b5fd] bg-[#a78bfa]/[0.12] ring-[#a78bfa]/25' },
    { count: studentsCount - activeStudents, label: 'nieaktywnych 7 dni', href: '/coach/students', icon: Inbox, tone: 'text-sky-300 bg-sky-500/[0.12] ring-sky-500/25' },
  ]

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader
          icon={Activity}
          title="Dashboard trenera"
          subtitle="Kto potrzebuje uwagi, co działa i co rośnie — w jednym miejscu."
        >
          <Link
            href="/coach/sessions"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white btn-darey animate-btn-gradient animate-shimmer ring-1 ring-white/20 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            Nowa sesja
          </Link>
          <Link
            href="/coach/videos"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold bg-white/[0.04] text-white/85 ring-1 ring-white/[0.10] hover:ring-[#a78bfa]/30 hover:bg-white/[0.07] backdrop-blur-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            Dodaj film
          </Link>
        </PageHeader>

        {/* ===== ATTENTION ALERTS ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {alertCards.map((a, i) => (
            <Link
              key={a.label}
              href={a.href}
              className="rise-in group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 animate-icon-bounce', a.tone)}>
                <a.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-display text-xl font-bold leading-none tabular-nums"><CountUp value={a.count} /></span>
                <span className="block text-[11px] text-white/45 mt-1 leading-tight">{a.label}</span>
              </span>
            </Link>
          ))}
        </div>

        {/* ===== PRIORITY QUEUE — who needs you now ===== */}
        <div className="rise-in glass-liquid border-glow relative overflow-hidden rounded-3xl p-6 mb-8" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white/90">Kolejka priorytetów</h3>
              <span className="text-[11px] text-white/35 font-medium">— kto potrzebuje Cię teraz</span>
            </div>
            <Link href="/coach/students" className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/[0.08] hover:ring-[#a78bfa]/30 hover:text-white hover:bg-white/[0.07] transition-all">
              Wszyscy uczniowie <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {attention.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-[#34d399]" />
              <p className="text-sm text-white/60">Brak uczniów. Dodaj pierwszego ucznia, aby zacząć.</p>
            </div>
          ) : attention.filter((a) => a.score > 0).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-[#34d399]" />
              <p className="text-sm text-white/60">Wszystko pod kontrolą — nikt nie czeka na reakcję.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {attention.filter((a) => a.score > 0).slice(0, 6).map((s, i) => (
                <Link
                  key={s.id}
                  href={`/coach/students/${s.id}`}
                  className={cn(
                    'group relative flex flex-wrap items-center gap-3 rounded-2xl p-3.5 ring-1 transition-all duration-300',
                    'bg-white/[0.02] ring-white/[0.05] hover:bg-white/[0.04] hover:ring-white/[0.12]',
                    i === 0 && 'ring-[#a78bfa]/25 bg-[#a78bfa]/[0.04]',
                  )}
                >
                  <div className="relative h-10 w-10 shrink-0">
                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatarUrl} alt={s.name || s.email || 'Uczeń'} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-sm font-semibold text-white ring-1 ring-white/25">
                        {(s.name || s.email || 'U')[0]?.toUpperCase()}
                      </div>
                    )}
                    {s.unread > 0 && (
                      <span className="absolute -top-1 -right-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#a78bfa] px-1 text-[9px] font-bold text-white ring-2 ring-[#0a0c0e]">
                        {s.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white">{s.name || s.email}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{s.videoCount} filmów przypisanych</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.reasons.map((r) => (
                      <span key={r.key} className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset', REASON_STYLE[r.key] || REASON_STYLE.pending)}>
                        {r.label}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ===== EFFECTIVENESS + PULSE ===== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <div className="rise-in lg:col-span-2 glass-liquid relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{ animationDelay: '140ms' }}>
            <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#6d28d9]/20 blur-3xl animate-aurora pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/30 shadow-lg shadow-black/30 animate-icon-bounce">
                  <Activity className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="font-display text-5xl font-bold text-gradient-mesh leading-none tabular-nums"><CountUp value={effectiveness} />%</p>
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/45">Realizacja treningów</p>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-xl font-semibold text-gradient-vantor">Skuteczność treningowa</h2>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed max-w-xl">
                  Ile przypisanych filmów Twoi uczniowie faktycznie obejrzeli i wdrożyli.
                  {effectiveness < 50 && sessionsCount > 0 && ' Warto przypomnieć uczniom o zaległościach.'}
                </p>
                {/* Assignment progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-white/45 mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#34d399]" /> Zadania treningowe</span>
                    <span className="tabular-nums font-semibold text-white/70">{assignmentRate}% ukończone</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] transition-all duration-1000" style={{ width: `${assignmentRate}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly pulse */}
          <div className="rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-1 ring-white/25">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white/90">Puls tygodnia</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Sesje utworzone', value: sessionsThisWeek, icon: BookOpen, color: '#34d399' },
                { label: 'Zadania ukończone', value: doneThisWeek, icon: CheckCircle2, color: '#a78bfa' },
                { label: 'Aktywni uczniowie', value: activeStudents, icon: Users, color: '#fbbf24' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3.5 py-2.5 ring-1 ring-white/[0.05]">
                  <span className="flex items-center gap-2 text-sm text-white/65">
                    <row.icon className="h-4 w-4" style={{ color: row.color }} />
                    {row.label}
                  </span>
                  <span className="font-display text-lg font-bold tabular-nums" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== STATS GRID ===== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, i) => (
            <div key={stat.name} className="rise-in h-full" style={{ animationDelay: `${220 + i * 50}ms` }}>
              <Link
                href={stat.href}
                className="glass-liquid group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-all duration-500 border border-white/[0.06] hover:border-[#a78bfa]/25"
              >
                <div className="flex items-start justify-between">
                  <div className="relative grid h-12 w-12 place-items-center rounded-2xl ring-1 ring-white/30 shadow-lg shadow-black/30">
                    <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-95', stat.gradient)} />
                    <stat.icon className="relative h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/25 group-hover:text-[#c4b5fd] group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
                <div className="mt-5">
                  <p className="font-display text-3xl font-bold text-white tabular-nums"><CountUp value={stat.value} /></p>
                  <p className="mt-1 text-sm text-white/55 group-hover:text-white/70 transition-colors">{stat.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">{stat.hint}</p>
                </div>
                <div className={cn('pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40', stat.gradient)} />
              </Link>
            </div>
          ))}
        </div>

        {/* ===== MISTAKE TRENDS + RECENT ===== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Routines overview */}
          <div className="rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '420ms' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25">
                  <ListChecks className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Rutyny</h3>
              </div>
              <Link href="/coach/routines" className="text-[11px] text-white/40 hover:text-[#c4b5fd] transition-colors font-medium">
                zobacz wszystkie
              </Link>
            </div>
            {routinesSummary.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-8">Brak rutyn. Stwórz program treningowy rozłożony na dni.</p>
            ) : (
              <div className="space-y-3">
                {routinesSummary.slice(0, 5).map((r) => (
                  <Link key={r.id} href="/coach/routines" className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/70 font-medium truncate pr-2 group-hover:text-white transition-colors">{r.title}</span>
                      <span className="text-xs text-white/50 tabular-nums whitespace-nowrap">
                        {r.activeAssignments > 0 ? `${r.activeAssignments} aktywnych` : r.completedAssignments > 0 ? `${r.completedAssignments} ukończ.` : `${r.assignmentTotal} przypisań`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] transition-all duration-1000" style={{ width: `${Math.max(4, r.pct)}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="rise-in lg:col-span-2 glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '460ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/30">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Ostatnie sesje</h3>
              </div>
              <Link href="/coach/sessions" className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/[0.08] hover:ring-[#a78bfa]/30 hover:text-white hover:bg-white/[0.07] transition-all">
                Wszystkie <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {recentSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-white/55">Brak sesji. Utwórz swoją pierwszą sesję.</p>
                <Link href="/coach/sessions" className="relative inline-flex items-center gap-2 overflow-hidden rounded-full mt-4 px-4 py-2 text-xs font-semibold text-white btn-darey ring-1 ring-white/20 hover:-translate-y-0.5 transition-all">
                  <Plus className="h-3.5 w-3.5" /> Utwórz sesję
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/coach/sessions/${session.id}`}
                    className="group relative flex items-center gap-4 rounded-2xl p-3.5 bg-white/[0.02] ring-1 ring-white/[0.05] hover:ring-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
                  >
                    <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/30">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white">{session.title}</p>
                      <p className="truncate text-xs text-white/45 mt-0.5">{session.student?.name || session.student?.email || 'Uczeń'}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-white/45">
                        <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> {session._count?.videos ?? 0} filmów</span>
                        <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" /> {session._count?.tags ?? 0} tagów</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', STATUS_COLORS[session.status] || 'bg-white/5 text-white/60 ring-white/10')}>
                        {STATUS_LABELS[session.status] || session.status}
                      </span>
                      <span className="hidden sm:block text-[11px] text-white/45 tabular-nums">
                        {session.scheduledAt ? formatDateTime(session.scheduledAt) : formatDate(session.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <span className="uppercase tracking-[0.25em]">Twoja drużyna, Twój postęp</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </CoachLayout>
  )
}
