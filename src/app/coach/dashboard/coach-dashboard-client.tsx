'use client'

import { cn, formatDate, formatDateTime, getInitials, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { Tilt3D } from '@/components/tilt-3d'
import { Plus, Users, BookOpen, Video, Tag, ArrowRight, UserCheck, Sparkles, Activity } from 'lucide-react'
import Link from 'next/link'
import type { MouseEvent } from 'react'

interface Stats {
  studentsCount: number
  sessionsCount: number
  videosCount: number
  tagsCount: number
  recentSessions: any[]
  recentStudents: any[]
}

interface CoachDashboardClientProps {
  initialStats: Stats
}

function handleCardMouse(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function CoachDashboardClient({ initialStats }: CoachDashboardClientProps) {
  const { studentsCount, sessionsCount, videosCount, tagsCount, recentSessions, recentStudents } = initialStats

  const effectiveness = 78

  const statCards = [
    { name: 'Uczniowie', value: studentsCount, icon: Users, href: '/coach/students', gradient: 'from-[#60a5fa] to-[#22d3ee]' },
    { name: 'Sesje', value: sessionsCount, icon: BookOpen, href: '/coach/sessions', gradient: 'from-[#34d399] to-[#16a34a]' },
    { name: 'Filmy', value: videosCount, icon: Video, href: '/coach/videos', gradient: 'from-[#162ED3] to-[#0C169C]' },
    { name: 'Tagi', value: tagsCount, icon: Tag, href: '/coach/tags', gradient: 'from-[#fbbf24] to-[#f97316]' },
  ]

  const ringRadius = 52
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (effectiveness / 100) * ringCircumference

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* =========================== STICKY HEADER =========================== */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-6 pb-5 mb-8 bg-[#010104]/70 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="relative hidden sm:block">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#5E74FF] to-[#0C169C] blur-xl opacity-40 animate-aurora-slow" />
                <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#5E74FF] to-[#0C169C] ring-1 ring-white/30 shadow-lg shadow-[#0C169C]/30">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="font-display text-display font-bold text-gradient-violet">
                  Dashboard trenera
                </h1>
                <p className="mt-1.5 text-sm text-white/55 max-w-md">
                  Przegląd Twojego panelu — uczniowie, sesje i materiały w&nbsp;jednym miejscu.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/coach/sessions"
                className={cn(
                  'shimmer-line group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white',
                  'btn-darey shadow-lg shadow-[#0C169C]/30',
                  'ring-1 ring-white/20 hover:shadow-xl hover:shadow-[#0C169C]/40 hover:-translate-y-0.5 transition-all duration-300',
                )}
              >
                <Plus className="h-4 w-4" />
                Nowa sesja
              </Link>
              <Link
                href="/coach/videos"
                className={cn(
                  'shimmer-line group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold',
                  'bg-white/[0.04] text-white/85 ring-1 ring-white/[0.10] hover:ring-[#5E74FF]/25 hover:bg-white/[0.07]',
                  'backdrop-blur-xl hover:-translate-y-0.5 transition-all duration-300',
                )}
              >
                <Plus className="h-4 w-4" />
                Dodaj film
              </Link>
            </div>
          </div>
        </div>

        {/* =========================== EFFECTIVENESS HERO RING =========================== */}
        <Tilt3D
          wrapperClassName="rise-in mb-8"
          wrapperStyle={{ animationDelay: '0.04s' }}
          className="glass-liquid relative overflow-hidden rounded-3xl p-6 sm:p-8"
          maxTilt={6}
        >
          <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#0C169C]/20 blur-3xl animate-aurora pointer-events-none" />
          <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-[#162ED3]/15 blur-3xl animate-aurora-slow pointer-events-none" />

          <div className="relative grid lg:grid-cols-[auto_1fr] items-center gap-8">
            {/* SVG ring */}
            <div className="relative mx-auto lg:mx-0 grid place-items-center">
              <svg width="160" height="160" viewBox="0 0 120 120" className="-rotate-90 drop-shadow-[0_0_24px_rgba(22,46,211,0.35)]">
                <defs>
                  <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9DB4FF" />
                    <stop offset="50%" stopColor="#162ED3" />
                    <stop offset="100%" stopColor="#0C169C" />
                  </linearGradient>
                </defs>
                <circle
                  cx="60" cy="60" r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="10"
                />
                <circle
                  cx="60" cy="60" r={ringRadius}
                  fill="none"
                  stroke="url(#ringGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-4xl font-bold text-gradient-mesh count-glow leading-none">
                    {effectiveness}%
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                    Realizacja
                  </div>
                </div>
              </div>
            </div>

            {/* Text block */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/55 ring-1 ring-white/[0.08]">
                <Activity className="h-3 w-3 text-[#9DB4FF]" />
                Skuteczność treningowa
              </div>
              <h2 className="font-display mt-3 text-2xl sm:text-3xl font-semibold text-gradient-violet">
                Twoje wskaźniki rosną
              </h2>
              <p className="mt-2 text-sm text-white/55 leading-relaxed max-w-xl">
                Średnia realizacja sesji przez uczniów. Utrzymuj regularność, dołączaj nowe
                materiały i obserwuj jak Twoi&nbsp;podopieczni robią postępy.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <Link
                  href="/coach/sessions"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/[0.08] hover:ring-[#5E74FF]/25 hover:bg-white/[0.08] transition-all"
                >
                  Szczegóły <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/coach/students"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/[0.08] hover:ring-[#5E74FF]/25 hover:bg-white/[0.08] transition-all"
                >
                  Postępy uczniów <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </Tilt3D>

        {/* =========================== STATS GRID =========================== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, i) => (
            <Tilt3D
              key={stat.name}
              wrapperClassName="rise-in"
              wrapperStyle={{ animationDelay: `${0.08 + i * 0.06}s` }}
              className="h-full rounded-3xl"
              maxTilt={10}
            >
              <Link
                href={stat.href}
                onMouseMove={handleCardMouse}
                className={cn(
                  'glass-liquid spotlight group relative flex h-full flex-col overflow-hidden rounded-3xl p-6',
                  'transition-all duration-500',
                  'border border-white/[0.06] hover:border-[#5E74FF]/25',
                )}
              >
                <div className="layer-1 flex items-start justify-between">
                  <div className="relative grid h-12 w-12 place-items-center rounded-2xl ring-1 ring-white/30 shadow-lg shadow-black/30">
                    <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br opacity-95', stat.gradient)} />
                    <stat.icon className="relative h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/25 group-hover:text-[#9DB4FF] group-hover:translate-x-0.5 transition-all duration-300" />
                </div>
                <div className="layer-2 mt-5">
                  <p className="font-display text-3xl font-bold text-white count-glow tabular-nums">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-white/55 group-hover:text-white/70 transition-colors">
                    {stat.name}
                  </p>
                </div>
                <div className={cn('pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40', stat.gradient)} />
              </Link>
            </Tilt3D>
          ))}
        </div>

        {/* =========================== SESSIONS + STUDENTS =========================== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Recent Sessions */}
          <Tilt3D
            wrapperClassName="rise-in lg:col-span-2"
            wrapperStyle={{ animationDelay: '0.34s' }}
            className="glass-liquid relative overflow-hidden rounded-3xl p-6"
            maxTilt={5}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/30">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Ostatnie sesje</h3>
              </div>
              <Link
                href="/coach/sessions"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/[0.08] hover:ring-[#5E74FF]/25 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                Wszystkie <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#34d399] to-[#16a34a] opacity-25 blur-xl" />
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(52,211,153,0.35),transparent_70%)]" />
                  <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#34d399]/60 to-[#16a34a]/40 ring-1 ring-white/20">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                </div>
                <p className="text-sm text-white/55">Brak sesji. Utwórz swoją pierwszą sesję.</p>
                <Link
                  href="/coach/sessions"
                  className="shimmer-line relative inline-flex items-center gap-2 overflow-hidden rounded-full mt-4 px-4 py-2 text-xs font-semibold text-white btn-darey ring-1 ring-white/20 shadow-lg shadow-[#0C169C]/25 hover:-translate-y-0.5 transition-all"
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
                    <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/30 shadow-lg shadow-[#16a34a]/20">
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white">
                        {session.title}
                      </p>
                      <p className="truncate text-xs text-white/45 mt-0.5">
                        {session.student?.name || session.student?.email || 'Uczeń'}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-white/45">
                        <span className="inline-flex items-center gap-1">
                          <Video className="h-3 w-3" /> {session._count?.videos ?? 0} filmów
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3" /> {session._count?.tags ?? 0} tagów
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                          STATUS_COLORS[session.status] || 'bg-white/5 text-white/60 ring-white/10',
                        )}
                      >
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
          </Tilt3D>

          {/* Recent Students */}
          <Tilt3D
            wrapperClassName="rise-in"
            wrapperStyle={{ animationDelay: '0.42s' }}
            className="glass-liquid relative overflow-hidden rounded-3xl p-6"
            maxTilt={5}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#22d3ee] ring-1 ring-white/30">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white/90">Ostatni uczniowie</h3>
              </div>
              <Link
                href="/coach/students"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 ring-1 ring-white/[0.08] hover:ring-[#5E74FF]/25 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                Wszyscy <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentStudents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
                <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#60a5fa] to-[#22d3ee] opacity-25 blur-xl" />
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(96,165,250,0.35),transparent_70%)]" />
                  <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#60a5fa]/60 to-[#22d3ee]/40 ring-1 ring-white/20">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                </div>
                <p className="text-sm text-white/55">Brak uczniów. Dodaj pierwszego ucznia.</p>
                <Link
                  href="/coach/students"
                  className="shimmer-line relative inline-flex items-center gap-2 overflow-hidden rounded-full mt-4 px-4 py-2 text-xs font-semibold text-white btn-darey ring-1 ring-white/20 shadow-lg shadow-[#0C169C]/25 hover:-translate-y-0.5 transition-all"
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
                      href="/coach/students"
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
                          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#5E74FF] to-[#0C169C] text-sm font-semibold text-white ring-1 ring-white/30 shadow-lg shadow-[#0C169C]/25">
                            {initial}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white">
                          {student.name || student.email}
                        </p>
                        <p className="truncate text-[11px] text-white/45 mt-0.5">{student.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-white/85 tabular-nums">
                          {student._count?.videoProgress ?? 0}
                        </p>
                        <p className="text-[11px] text-white/45">filmów</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Tilt3D>
        </div>

        {/* =========================== CTA CARD =========================== */}
        <Tilt3D
          wrapperClassName="rise-in"
          wrapperStyle={{ animationDelay: '0.5s' }}
          className="glass-tinted relative overflow-hidden rounded-3xl p-8 sm:p-10"
          maxTilt={5}
        >
          <div className="absolute -top-20 -right-10 h-64 w-64 rounded-full bg-[#162ED3]/25 blur-3xl animate-aurora pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#0C169C]/20 blur-3xl animate-aurora-slow pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/65 ring-1 ring-white/[0.08]">
                <Sparkles className="h-3 w-3 text-[#9DB4FF]" /> Szybkie akcje
              </div>
              <h3 className="font-display mt-3 text-2xl sm:text-3xl font-bold text-gradient-violet max-w-xl">
                Rozbuduj swoją bibliotekę treningów
              </h3>
              <p className="mt-2 text-sm text-white/55 max-w-xl">
                Dodaj nowe sesje, materiały wideo, tagi i&nbsp;uczniów. Każdy element
                wzbogaca panel i&nbsp;przyspiesza codzienną pracę.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/coach/sessions"
                className="shimmer-line relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold text-white btn-darey ring-1 ring-white/20 shadow-lg shadow-[#0C169C]/30 hover:-translate-y-0.5 transition-all"
              >
                <Plus className="h-4 w-4" /> Nowa sesja
              </Link>
              <Link
                href="/coach/videos"
                className="inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold text-white/85 bg-white/[0.04] ring-1 ring-white/[0.10] hover:ring-[#5E74FF]/25 hover:bg-white/[0.08] hover:-translate-y-0.5 backdrop-blur-xl transition-all"
              >
                <Video className="h-4 w-4" /> Dodaj film
              </Link>
              <Link
                href="/coach/tags"
                className="inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold text-white/85 bg-white/[0.04] ring-1 ring-white/[0.10] hover:ring-[#5E74FF]/25 hover:bg-white/[0.08] hover:-translate-y-0.5 backdrop-blur-xl transition-all"
              >
                <Tag className="h-4 w-4" /> Dodaj tag
              </Link>
              <Link
                href="/coach/students"
                className="inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-3 text-sm font-semibold text-white/85 bg-white/[0.04] ring-1 ring-white/[0.10] hover:ring-[#5E74FF]/25 hover:bg-white/[0.08] hover:-translate-y-0.5 backdrop-blur-xl transition-all"
              >
                <UserCheck className="h-4 w-4" /> Dodaj ucznia
              </Link>
            </div>
          </div>
        </Tilt3D>
      </div>
    </CoachLayout>
  )
}
