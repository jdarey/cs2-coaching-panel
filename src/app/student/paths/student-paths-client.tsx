'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  FolderOpen,
  Film,
  Clock,
  ArrowRight,
  Sparkles,
  Flame,
  BookOpen,
  FileText,
  Trophy,
  Target,
  CalendarCheck,
  RotateCcw,
} from 'lucide-react'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn } from '@/lib/utils'

interface PathVideo {
  id: string
  description: string | null
  video: {
    id: string
    title: string
    thumbnail: string | null
    duration: number | null
    url: string
    description: string | null
  }
  status: string
  // Seconds where the student last stopped — resume point (0 = none).
  positionSeconds: number
}

interface PathModule {
  id: string
  title: string
  description: string | null
  order: number
  videos: PathVideo[]
}

interface Path {
  id: string
  title: string
  description: string | null
  createdAt: string
  modules: PathModule[]
}

const DONE_STATUSES = ['WATCHED', 'IMPLEMENTED']

// A lesson that is plain text (Google Doc / Notion link, or no media at all)
// has no thumbnail — render it as a reading card, not a video card.
const isTextLesson = (v: PathVideo) => !v.video.thumbnail

const fmtTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Viewing progress of one lesson: a completed lesson counts fully, a video
// in progress counts its watched share (position/duration), everything else
// counts zero. This is what powers the resume bars on cards and modules.
const viewingWeight = (v: PathVideo) => {
  if (DONE_STATUSES.includes(v.status)) return 1
  if (v.status === 'WATCHING' && v.positionSeconds > 0 && (v.video.duration ?? 0) > 0) {
    return Math.min(1, v.positionSeconds / (v.video.duration as number))
  }
  return 0
}

const viewingPct = (videos: PathVideo[]) =>
  videos.length ? Math.round((videos.reduce((a, v) => a + viewingWeight(v), 0) / videos.length) * 100) : 0

// Distinct gradient covers so every course feels like its own product.
const COVERS = [
  ['#2de5ca', '#0d6b5f'],
  ['#a78bfa', '#5b21b6'],
  ['#fbbf24', '#b45309'],
  ['#38bdf8', '#1e40af'],
  ['#f472b6', '#9d174d'],
]

const fmtMin = (sec: number | null | undefined) =>
  sec && sec > 0 ? `${Math.max(1, Math.round(sec / 60))} min` : null

function ProgressRing({ pct, size = 54, stroke = 5, color = '#2de5ca' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (c * Math.min(100, pct)) / 100
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[11px] font-extrabold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

interface Summary {
  totalLessons: number
  doneLessons: number
  totalSeconds: number
  doneSeconds: number
  streak: number
}

const fmtTotal = (sec: number) => {
  if (sec <= 0) return '—'
  const mins = Math.round(sec / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  return `${h} h ${mins % 60} min`
}

export function StudentPathsClient({ paths, summary }: { paths: Path[]; summary: Summary }) {
  // Auto-open the course that holds the next lesson — the learner lands on
  // the exact spot they should continue from, no hunting. A video that is
  // mid-watch with a saved position wins over the next pending lesson, so
  // "Continue learning" resumes where the student actually stopped.
  const nextLesson = useMemo(() => {
    for (const p of paths) {
      for (const m of p.modules) {
        for (const v of m.videos) {
          if (v.status === 'WATCHING' && v.positionSeconds > 0) {
            return { path: p, module: m, video: v, resume: true }
          }
        }
      }
    }
    for (const p of paths) {
      for (const m of p.modules) {
        const firstPending = m.videos.find((v) => !DONE_STATUSES.includes(v.status))
        if (firstPending) return { path: p, module: m, video: firstPending, resume: false }
      }
    }
    return null
  }, [paths])

  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (nextLesson) init[nextLesson.path.id] = true
    return init
  })

  if (!paths) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center py-12 text-white/40">
            <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie ścieżek…
          </div>
        </div>
      </StudentLayout>
    )
  }

  const allDone = (videos: PathVideo[]) => videos.length > 0 && videos.every((v) => DONE_STATUSES.includes(v.status))
  const videoCount = (p: Path) => p.modules.reduce((a, m) => a + m.videos.length, 0)
  const totalMinutes = (p: Path) =>
    p.modules.reduce((a, m) => a + m.videos.reduce((x, v) => x + (v.video.duration ?? 0), 0), 0)

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          icon={GraduationCap}
          label="Twój program"
          title="Ścieżki treningowe"
          subtitle="Kursy ułożone przez trenera — przechodź moduły po kolei i obserwuj postęp"
        />

        {/* ===== My progress strip ===== */}
        {summary.totalLessons > 0 && (
          <div className="rise-in mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ animationDelay: '0.05s' }}>
            <div className="glass-card relative overflow-hidden rounded-2xl p-4">
              <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[#2de5ca]/15 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] ring-1 ring-white/20">
                  <Target className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold leading-tight">{summary.doneLessons}<span className="text-white/40 text-sm font-semibold">/{summary.totalLessons}</span></p>
                  <p className="text-[11px] text-white/45">Lekcji ukończonych</p>
                </div>
              </div>
            </div>
            <div className="glass-card relative overflow-hidden rounded-2xl p-4">
              <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[#a78bfa]/15 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
                  <Clock className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold leading-tight">{fmtTotal(summary.doneSeconds)}</p>
                  <p className="text-[11px] text-white/45">Czas nauki</p>
                </div>
              </div>
            </div>
            <div className="glass-card relative overflow-hidden rounded-2xl p-4">
              <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[#fbbf24]/15 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#fbbf24] to-[#b45309] ring-1 ring-white/20">
                  <Trophy className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold leading-tight">
                    {summary.totalLessons ? Math.round((summary.doneLessons / summary.totalLessons) * 100) : 0}%
                  </p>
                  <p className="text-[11px] text-white/45">Program ukończony</p>
                </div>
              </div>
            </div>
            <div className="glass-card relative overflow-hidden rounded-2xl p-4">
              <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[#f472b6]/15 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f472b6] to-[#9d174d] ring-1 ring-white/20">
                  <CalendarCheck className="h-5 w-5 text-white" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold leading-tight">
                    {summary.streak > 0 ? `${summary.streak} ${summary.streak === 1 ? 'dzień' : summary.streak < 5 ? 'dni' : 'dni'}` : '—'}
                  </p>
                  <p className="text-[11px] text-white/45">Seria dni treningu</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Continue learning hero ===== */}
        {paths.length > 0 && (
          <div
            className="rise-in relative mt-8 overflow-hidden rounded-3xl border border-white/[0.08]"
            style={{
              background: 'linear-gradient(120deg, rgba(45,229,202,0.14) 0%, rgba(139,92,246,0.10) 55%, rgba(255,255,255,0.02) 100%)',
            }}
          >
            <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-[#2de5ca]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#a78bfa]/20 blur-3xl" />

            {nextLesson ? (() => {
              const textLesson = isTextLesson(nextLesson.video)
              const resuming = nextLesson.resume
              return (
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5 p-6 sm:p-7">
                  <div className="relative hidden sm:grid place-items-center h-16 w-16 shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] blur-lg opacity-50 animate-pulse" />
                    <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] ring-1 ring-white/30 shadow-[0_10px_40px_-10px_rgba(45,229,202,0.6)]">
                      {resuming ? <RotateCcw className="h-7 w-7 text-white" /> : textLesson ? <BookOpen className="h-7 w-7 text-white" /> : <PlayCircle className="h-7 w-7 text-white" />}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8cffef]/80">
                      <Flame className="h-3 w-3" /> {resuming ? 'Wznów naukę' : textLesson ? 'Kontynuuj czytanie' : 'Kontynuuj naukę'}
                    </p>
                    <h2 className="mt-1 truncate font-display text-xl sm:text-2xl font-bold">{nextLesson.video.video.title}</h2>
                    <p className="mt-0.5 text-xs text-white/45 truncate">
                      {nextLesson.path.title} · {nextLesson.module.title}
                      {resuming ? (
                        <span className="inline-flex items-center gap-1 ml-2 text-[#8cffef]/80 font-semibold">
                          <RotateCcw className="h-3 w-3" /> Wznów od {fmtTime(nextLesson.video.positionSeconds)}
                        </span>
                      ) : textLesson ? (
                        <span className="inline-flex items-center gap-1 ml-2 text-white/35">
                          <FileText className="h-3 w-3" /> lekcja tekstowa
                        </span>
                      ) : nextLesson.video.video.duration ? (
                        <span className="inline-flex items-center gap-1 ml-2 text-white/35">
                          <Clock className="h-3 w-3" /> {fmtMin(nextLesson.video.video.duration)}
                        </span>
                      ) : null}
                    </p>
                    {nextLesson.video.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#8cffef]/70 max-w-2xl">{nextLesson.video.description}</p>
                    )}
                  </div>
                  <Link
                    href={`/student/videos/${nextLesson.video.video.id}`}
                    className="group inline-flex shrink-0 items-center gap-2 rounded-2xl px-6 h-12 text-sm font-semibold text-white btn-darey shadow-[0_8px_32px_-8px_rgba(45,229,202,0.55)] hover:-translate-y-0.5 transition-all"
                  >
                    <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
                    {resuming ? (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Wznów od {fmtTime(nextLesson.video.positionSeconds)}
                      </>
                    ) : textLesson ? 'Czytaj lekcję' : 'Oglądaj teraz'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )
            })() : (
              <div className="relative z-10 flex items-center gap-4 p-6 sm:p-7">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 ring-1 ring-white/25">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/90">Wszystko ukończone 🎉</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold">Świetna robota — przerobiłeś wszystkie lekcje!</h2>
                  <p className="mt-0.5 text-xs text-white/45">Zapytaj trenera o kolejny poziom albo odśwież materiał.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 space-y-7">
          {paths.length === 0 ? (
            <div className="glass-card rise-in rounded-3xl p-10 text-center">
              <GraduationCap className="w-9 h-9 text-white/25 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Brak aktywnych ścieżek</p>
              <p className="text-xs text-white/40 mt-1">Twój trener jeszcze nie dodał programu treningowego.</p>
            </div>
          ) : (
            paths.map((p, pi) => {
              const all = p.modules.flatMap((m) => m.videos)
              const done = all.filter((v) => DONE_STATUSES.includes(v.status)).length
              const pct = all.length ? Math.round((done / all.length) * 100) : 0
              const viewPct = viewingPct(all)
              const isOpen = open[p.id]
              const [from, to] = COVERS[pi % COVERS.length]
              const mins = totalMinutes(p)

              return (
                <div
                  key={p.id}
                  className="rise-in relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02]"
                  style={{ animationDelay: `${pi * 0.07}s` }}
                >
                  {/* Course cover */}
                  <div
                    className="relative overflow-hidden px-6 pt-6 pb-5"
                    style={{ background: `linear-gradient(135deg, ${from}26 0%, ${to}33 100%)` }}
                  >
                    <div
                      className="pointer-events-none absolute -top-20 -right-14 h-56 w-56 rounded-full opacity-30 blur-3xl"
                      style={{ background: from }}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <button
                      onClick={() => setOpen((s) => ({ ...s, [p.id]: !isOpen }))}
                      className="relative z-10 flex w-full items-center gap-4 text-left"
                    >
                      <div className="relative shrink-0">
                        <div
                          className="grid h-13 w-13 place-items-center rounded-2xl ring-1 ring-white/25 shadow-lg"
                          style={{ width: 52, height: 52, background: `linear-gradient(135deg, ${from}, ${to})` }}
                        >
                          <GraduationCap className="h-6 w-6 text-white" />
                        </div>
                        {pct === 100 && (
                          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 ring-2 ring-[#0b0d12]">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate font-display text-lg sm:text-xl font-bold">{p.title}</h2>
                          {pct === 100 && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 h-6 text-[10px] font-bold text-emerald-200 bg-emerald-500/15 border border-emerald-400/25">
                              <Sparkles className="w-3 h-3" /> Ukończona
                            </span>
                          )}
                        </div>
                        {p.description && <p className="mt-0.5 text-sm text-white/50 line-clamp-1 sm:line-clamp-2">{p.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
                          <span className="inline-flex items-center gap-1">
                            <Film className="h-3 w-3" /> {videoCount(p)} lekcji
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" /> {p.modules.length} modułów
                          </span>
                          {mins > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> ≈ {Math.max(1, Math.round(mins / 60))} h {Math.max(0, Math.round((mins % 60) / 10) * 10)} min
                            </span>
                          )}
                          <span className="text-white/30">
                            {done}/{all.length} obejrzanych
                          </span>
                        </div>

                        {/* Viewing progress bar — counts mid-watch videos by
                            their watched share, not only completed lessons. */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 w-full max-w-[280px] rounded-full bg-white/[0.07] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${viewPct}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
                            />
                          </div>
                          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-white/40">{viewPct}% obejrzane</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <ProgressRing pct={pct} color={from} />
                        <ChevronDown className={cn('w-4 h-4 text-white/40 transition-transform duration-300', isOpen && 'rotate-180')} />
                      </div>
                    </button>
                  </div>

                  {/* Modules */}
                  <div className={cn('grid transition-all duration-500 ease-out', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                    <div className="overflow-hidden">
                      <div className="space-y-4 p-6">
                        {p.modules.map((m, mi) => {
                          const modDone = m.videos.filter((v) => DONE_STATUSES.includes(v.status)).length
                          const modPct = m.videos.length ? Math.round((modDone / m.videos.length) * 100) : 0
                          const modViewPct = viewingPct(m.videos)
                          return (
                            <div key={m.id || mi} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                                <span
                                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white"
                                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                                >
                                  {mi + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <h3 className="truncate text-sm font-semibold text-white">{m.title}</h3>
                                  <p className="text-[11px] text-white/40">
                                    {modDone}/{m.videos.length} lekcji
                                    {modPct > 0 && <span className="ml-2 text-white/35">{modPct}%</span>}
                                  </p>
                                  {m.description && (
                                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">{m.description}</p>
                                  )}
                                </div>
                                {allDone(m.videos) && (
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 h-5 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                                    <CheckCircle2 className="w-3 h-3" /> Moduł ukończony
                                  </span>
                                )}
                                <div className="w-20 sm:w-24 h-1.5 shrink-0 rounded-full bg-white/[0.07] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${modViewPct}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
                                  />
                                </div>
                              </div>

                              <div className="divide-y divide-white/[0.04]">
                                {m.videos.length === 0 && <p className="px-4 py-3 text-xs text-white/35">Brak lekcji w tym module</p>}
                                {m.videos.map((v, vi) => {
                                  const isDone = DONE_STATUSES.includes(v.status)
                                  const isNext = nextLesson && nextLesson.video.id === v.id && nextLesson.module.id === m.id
                                  return (
                                    <Link
                                      key={v.id}
                                      href={`/student/videos/${v.video.id}`}
                                      className={cn(
                                        'group relative flex items-center gap-3 px-4 py-3 transition-colors',
                                        isNext ? 'bg-[#2de5ca]/[0.07] hover:bg-[#2de5ca]/[0.12]' : 'hover:bg-white/[0.03]',
                                      )}
                                    >
                                      {isNext && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full" style={{ background: from }} />
                                      )}
                                      <span
                                        className={cn(
                                          'grid shrink-0 place-items-center w-7 h-7 rounded-lg text-[11px] font-bold border transition-colors',
                                          isDone
                                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                            : isNext
                                              ? 'bg-[#2de5ca]/15 border-[#2de5ca]/40 text-[#8cffef]'
                                              : 'bg-white/[0.05] border-white/[0.08] text-white/40',
                                        )}
                                      >
                                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : vi + 1}
                                      </span>
                                      {isTextLesson(v) ? (
                                        <span
                                          className="grid shrink-0 place-items-center w-14 h-9 rounded-md border border-[#a78bfa]/20 bg-[#a78bfa]/[0.08]"
                                          title="Lekcja tekstowa"
                                        >
                                          <FileText className="w-3.5 h-3.5 text-[#c4b5fd]" />
                                        </span>
                                      ) : v.video.thumbnail ? (
                                        <img src={v.video.thumbnail} alt="" className="w-14 h-9 object-cover rounded-md shrink-0" loading="lazy" />
                                      ) : (
                                        <span className="grid place-items-center w-14 h-9 rounded-md bg-white/[0.04] border border-white/[0.08] shrink-0">
                                          <Film className="w-3.5 h-3.5 text-white/30" />
                                        </span>
                                      )}
                                      <span className={cn('min-w-0 flex-1', isDone ? 'text-white/40 line-through decoration-white/20' : 'text-white/80')}>
                                        <span className="block truncate text-sm group-hover:text-white transition-colors">{v.video.title}</span>
                                        <span className="mt-0.5 flex items-center gap-1 text-[10px]">
                                          {isTextLesson(v) ? (
                                            <span className="inline-flex items-center gap-1 font-medium text-[#a78bfa]/70">
                                              <BookOpen className="h-2.5 w-2.5" /> lekcja tekstowa
                                            </span>
                                          ) : v.video.duration ? (
                                            <span className="inline-flex items-center gap-1 text-white/30">
                                              <Clock className="h-2.5 w-2.5" /> {fmtMin(v.video.duration)}
                                            </span>
                                          ) : null}
                                        </span>
                                        {v.status === 'WATCHING' && v.positionSeconds > 0 && (v.video.duration ?? 0) > 0 && (
                                          <span className="mt-1.5 flex items-center gap-2">
                                            <span className="h-1 w-16 rounded-full bg-white/[0.08] overflow-hidden">
                                              <span
                                                className="block h-full rounded-full"
                                                style={{
                                                  width: `${Math.min(100, Math.round((v.positionSeconds / (v.video.duration as number)) * 100))}%`,
                                                  background: `linear-gradient(90deg, ${from}, ${to})`,
                                                }}
                                              />
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8cffef]/80">
                                              <RotateCcw className="h-2.5 w-2.5" /> Wznów od {fmtTime(v.positionSeconds)}
                                            </span>
                                          </span>
                                        )}
                                        {v.description && (
                                          <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-white/40">{v.description}</span>
                                        )}
                                      </span>
                                      {isNext && (
                                        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 h-6 text-[10px] font-bold text-[#8cffef] bg-[#2de5ca]/15 border border-[#2de5ca]/30">
                                          Dalej <ArrowRight className="w-3 h-3" />
                                        </span>
                                      )}
                                      {isDone ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                                      ) : (
                                        <PlayCircle className="w-4 h-4 text-white/25 group-hover:text-[#8cffef] shrink-0 transition-colors" />
                                      )}
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </StudentLayout>
  )
}
