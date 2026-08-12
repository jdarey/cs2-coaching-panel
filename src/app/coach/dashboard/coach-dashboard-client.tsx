'use client'

import { cn, formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { Plus, Users, BookOpen, Video, ArrowRight, Activity, MessageSquare, MessageSquareHeart } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  studentsCount: number
  sessionsCount: number
  videosCount: number
  tagsCount: number
  effectiveness: number
  recentSessions: any[]
  recentStudents: any[]
}

interface CoachDashboardClientProps {
  initialStats: Stats
}

export function CoachDashboardClient({ initialStats }: CoachDashboardClientProps) {
  const { studentsCount, sessionsCount, videosCount, tagsCount, effectiveness, recentSessions, recentStudents } = initialStats

  const statCards = [
    { name: 'Uczniowie', value: studentsCount, icon: Users, href: '/coach/students', gradient: 'from-[#2de5ca] to-[#8cffef]', hint: 'aktywni podopieczni' },
    { name: 'Sesje', value: sessionsCount, icon: BookOpen, href: '/coach/sessions', gradient: 'from-[#34d399] to-[#16a34a]', hint: 'zaplanowane treningi' },
    { name: 'Filmy', value: videosCount, icon: Video, href: '/coach/videos', gradient: 'from-[#14b8a6] to-[#147a6b]', hint: 'w bibliotece' },
    { name: 'Tagi', value: tagsCount, icon: Activity, href: '/coach/tags', gradient: 'from-[#fbbf24] to-[#f97316]', hint: 'kategorie błędów' },
  ]

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* =========================== PAGE HEADER =========================== */}
        <PageHeader
          icon={Activity}
          title="Dashboard trenera"
          subtitle="Uczniowie, sesje i materiały w jednym miejscu."
        >
          <Link
            href="/coach/sessions"
            className={cn(
              'group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white',
              'btn-darey',
              'ring-1 ring-white/20 hover:-translate-y-0.5 transition-all duration-300',
            )}
          >
            <Plus className="h-4 w-4" />
            Nowa sesja
          </Link>
          <Link
            href="/coach/videos"
            className={cn(
              'group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold',
              'bg-white/[0.04] text-white/85 ring-1 ring-white/[0.10] hover:ring-[#2de5ca]/25 hover:bg-white/[0.07]',
              'backdrop-blur-xl hover:-translate-y-0.5 transition-all duration-300',
            )}
          >
            <Plus className="h-4 w-4" />
            Dodaj film
          </Link>
        </PageHeader>

        {/* =========================== EFFECTIVENESS HERO =========================== */}
        <div className="rise-in mb-8 glass-liquid relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{ animationDelay: '0.04s' }}>
          <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#147a6b]/20 blur-3xl animate-aurora pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            {/* Big number */}
            <div className="flex items-center gap-5">
              <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8cffef] to-[#14b8a6] ring-1 ring-white/30 shadow-lg shadow-black/30">
                <Activity className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-display text-5xl font-bold text-gradient-mesh leading-none tabular-nums">
                  {effectiveness}%
                </p>
                <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/45">
                  Realizacja treningów
                </p>
              </div>
            </div>

            {/* Text + actions */}
            <div className="flex-1 text-left">
              <h2 className="font-display mt-2 md:mt-0 text-xl sm:text-2xl font-semibold text-gradient-vantor">
                Skuteczność treningowa
              </h2>
              <p className="mt-1.5 text-sm text-white/55 leading-relaxed max-w-xl">
                Ile przypisanych filmów Twoi uczniowie faktycznie obejrzeli i wdrożyli.
                {effectiveness < 50 && sessionsCount > 0 && ' Warto przypomnieć uczniom o zaległościach.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href="/coach/students"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/[0.08] hover:ring-[#2de5ca]/25 hover:bg-white/[0.08] transition-all"
                >
                  Postępy uczniów <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/coach/messages"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/[0.08] hover:ring-[#2de5ca]/25 hover:bg-white/[0.08] transition-all"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Napisz do uczniów
                </Link>
                <Link
                  href="/coach/feedback"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/[0.08] hover:ring-[#2de5ca]/25 hover:bg-white/[0.08] transition-all"
                >
                  <MessageSquareHeart className="h-3.5 w-3.5" /> Opinie uczniów
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* =========================== STATS GRID =========================== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, i) => (
            <div key={stat.name} className="rise-in h-full" style={{ animationDelay: `${0.08 + i * 0.06}s` }}>
              <Link
                href={stat.href}
                className={cn(
                  'glass-liquid group relative flex h-full flex-col overflow-hidden rounded-3xl p-6',
                  'transition-all duration-500 border border-white/[0.06] hover:border-[#2de5ca]/25',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="relative grid h-12 w-12 place-items-center rounded-2xl ring-1 ring-white/30 shadow-lg shadow-black/30">
                    <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-95', stat.gradient)} />
                    <stat.icon className="relative h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/25 group-hover:text-[#8cffef] group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
                <div className="mt-5">
                  <p className="font-display text-3xl font-bold text-white tabular-nums">{stat.value}</p>
                  <p className="mt-1 text-sm text-white/55 group-hover:text-white/70 transition-colors">{stat.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">{stat.hint}</p>
                </div>
                <div className={cn('pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40', stat.gradient)} />
              </Link>
            </div>
          ))}
        </div>

        {/* =========================== SESSIONS + STUDENTS =========================== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Recent Sessions */}
          <div className="rise-in lg:col-span-2 glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '0.34s' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/30">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Ostatnie sesje</h3>
              </div>
              <Link
                href="/coach/sessions"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/[0.08] hover:ring-[#2de5ca]/25 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                Wszystkie <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-white/55">Brak sesji. Utwórz swoją pierwszą sesję.</p>
                <Link
                  href="/coach/sessions"
                  className="relative inline-flex items-center gap-2 overflow-hidden rounded-full mt-4 px-4 py-2 text-xs font-semibold text-white btn-darey ring-1 ring-white/20 hover:-translate-y-0.5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Utwórz sesję
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/coach/sessions/${session.id}`}
                    className={cn(
                      'group relative flex items-center gap-4 rounded-2xl p-3.5',
                      'bg-white/[0.02] ring-1 ring-white/[0.05] hover:ring-white/[0.12]',
                      'hover:bg-white/[0.04] transition-all duration-300',
                    )}
                  >
                    <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/30">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white">{session.title}</p>
                      <p className="truncate text-xs text-white/45 mt-0.5">
                        {session.student?.name || session.student?.email || 'Uczeń'}
                      </p>
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

          {/* Recent Students */}
          <div className="rise-in glass-liquid relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: '0.42s' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#8cffef] ring-1 ring-white/30">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Uczniowie</h3>
              </div>
              <Link
                href="/coach/students"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/[0.08] hover:ring-[#2de5ca]/25 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                Wszyscy <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-white/55">Brak uczniów. Dodaj pierwszego ucznia.</p>
                <Link
                  href="/coach/students"
                  className="relative inline-flex items-center gap-2 overflow-hidden rounded-full mt-4 px-4 py-2 text-xs font-semibold text-white btn-darey ring-1 ring-white/20 hover:-translate-y-0.5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Dodaj ucznia
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentStudents.map((student) => {
                  const initial = (student.name || student.email || 'U').charAt(0).toUpperCase()
                  return (
                    <Link
                      key={student.id}
                      href={`/coach/students/${student.id}`}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-2xl p-3',
                        'bg-white/[0.02] ring-1 ring-white/[0.05] hover:ring-white/[0.12]',
                        'hover:bg-white/[0.04] transition-all duration-300',
                      )}
                    >
                      <div className="relative h-11 w-11 shrink-0">
                        {student.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={student.avatarUrl}
                            alt={student.name || student.email || 'Uczeń'}
                            className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/15"
                          />
                        ) : (
                          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] text-sm font-semibold text-white ring-1 ring-white/30">
                            {initial}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white">{student.name || student.email}</p>
                        <p className="truncate text-[11px] text-white/45 mt-0.5">{student.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white/85 tabular-nums">{student._count?.videoProgress ?? 0}</p>
                        <p className="text-[11px] text-white/45">filmów</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* =========================== FOOTER =========================== */}
        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <span className="uppercase tracking-[0.25em]">Twoja drużyna, Twój postęp</span>
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </CoachLayout>
  )
}
