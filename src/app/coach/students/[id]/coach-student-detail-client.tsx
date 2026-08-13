'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Mail,
  ClipboardList,
  PlayCircle,
  MessageSquare,
  Plus,
  Inbox,
  CheckCircle2,
  Check,
  Trash2,
  Loader2,
  Film,
  Target,
  Bot,
  RefreshCw,
  TrendingDown,
  ListChecks,
  Sparkles,
} from 'lucide-react'
import { CoachLayout } from '@/components/coach-layout-export'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, getInitials, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { getRank, getLevel } from '@/lib/gamification'
import { RankEmblem } from '@/components/rank-emblem'
import { SkillProgressChart } from '@/components/skill-progress-chart'

interface StudentDetail {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  steamId: string | null
  steamVanity: string | null
  faceitNickname: string | null
  faceitElo: number | null
  faceitLevel: number | null
}

interface SessionSummary {
  id: string
  title: string
  status: string
  scheduledAt: string | null
  createdAt: string
  videosCount: number
  notesCount: number
  tags: { name: string; color: string }[]
}

interface CoachVideo {
  id: string
  title: string
  thumbnail: string | null
}

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  status: string
  completedAt: string | null
  video?: { id: string; title: string } | null
}

const PROGRESS_DOTS = [
  { key: 'total', label: 'Filmy', color: '#8b5cf6' },
  { key: 'pending', label: 'Do oglądania', color: '#fbbf24' },
  { key: 'watching', label: 'Ogląda', color: '#a78bfa' },
  { key: 'watched', label: 'Obejrzane', color: '#34d399' },
  { key: 'implemented', label: 'Wdrożone', color: '#a78bfa' },
] as const

// Official Steam brand mark (simple-icons path, filled with currentColor).
function SteamIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}

// Official FACEIT brand mark (simple-icons path).
function FaceitIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.999 2.705a.167.167 0 00-.312-.1 1141.27 1141.27 0 00-6.053 9.375H.218c-.221 0-.301.282-.11.352 7.227 2.73 17.667 6.836 23.5 9.134.15.06.39-.08.39-.18z" />
    </svg>
  )
}

export function CoachStudentDetailClient({
  student,
  progressStats,
  sessions,
  coachVideos,
}: {
  student: StudentDetail
  progressStats: Record<string, number>
  sessions: SessionSummary[]
  coachVideos: CoachVideo[]
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', videoId: '', dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI analysis state
  const [aiLoading, setAiLoading] = useState(true)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiData, setAiData] = useState<{
    profile: { name: string | null; totalMatches: number | null; winrate: number | null; rating: Record<string, number | null> }
    weaknesses: { key: string; label: string; value: number | null; advice: string }[]
    suggestedRoutine: { title: string; description: string; tasks: { title: string; day: number; minutes: number }[] } | null
    snapshots: { createdAt: string; aim: number | null; positioning: number | null; utility: number | null; clutch: number | null; opening: number | null }[]
  } | null>(null)
  const [creatingRoutine, setCreatingRoutine] = useState(false)
  const [routineCreated, setRoutineCreated] = useState<string | null>(null)

  const loadAiAnalysis = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch(`/api/coach/ai-analysis?studentId=${student.id}`)
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'Nie udało się pobrać analizy')
        setAiData(null)
      } else {
        setAiData(data)
      }
    } catch {
      setAiError('Wystąpił błąd serwera')
    } finally {
      setAiLoading(false)
    }
  }, [student.id])

  useEffect(() => {
    loadAiAnalysis()
  }, [loadAiAnalysis])

  const createSuggestedRoutine = async () => {
    if (!aiData?.suggestedRoutine) return
    setCreatingRoutine(true)
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: aiData.suggestedRoutine.title,
          description: `${aiData.suggestedRoutine.description} (automatycznie z analizy AI dla ${student.name || student.email})`,
          tasks: aiData.suggestedRoutine.tasks.map((t) => ({
            title: t.title,
            day: t.day,
            minutes: t.minutes,
          })),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setRoutineCreated(data.id)
      } else {
        setAiError(data.error || 'Nie udało się utworzyć rutyny')
      }
    } catch {
      setAiError('Wystąpił błąd serwera')
    } finally {
      setCreatingRoutine(false)
    }
  }

  const loadAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments?studentId=${student.id}`)
      if (res.ok) {
        setAssignments(await res.json())
      }
    } catch {
      /* ignore */
    } finally {
      setAssignmentsLoading(false)
    }
  }, [student.id])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  const createAssignment = async () => {
    if (!form.title.trim()) {
      setError('Podaj tytuł zadania')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          videoId: form.videoId || null,
          dueDate: form.dueDate || null,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setAssignments((prev) => [created, ...prev])
        setForm({ title: '', description: '', videoId: '', dueDate: '' })
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Nie udało się dodać zadania')
      }
    } catch {
      setError('Błąd sieci')
    } finally {
      setSaving(false)
    }
  }

  const toggleAssignment = async (a: Assignment) => {
    const next = a.status === 'DONE' ? 'PENDING' : 'DONE'
    try {
      const res = await fetch(`/api/assignments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setAssignments((prev) =>
          prev.map((x) =>
            x.id === a.id
              ? { ...x, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }
              : x,
          ),
        )
      }
    } catch {
      /* ignore */
    }
  }

  const deleteAssignment = async (id: string) => {
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAssignments((prev) => prev.filter((x) => x.id !== id))
      }
    } catch {
      /* ignore */
    }
  }

  const pendingCount = assignments.filter((a) => a.status === 'PENDING').length
  const doneCount = assignments.length - pendingCount

  // Link to the student's Steam profile: prefer the numeric steam64 (profiles/
  // URL is stable), fall back to the vanity name. steamVanity may be stored as
  // a bare name OR a full URL (e.g. https://steamcommunity.com/id/jdarey/) —
  // extract just the name so the link is never double-encoded.
  const steamUrl = student.steamId
    ? `https://steamcommunity.com/profiles/${student.steamId}`
    : student.steamVanity
      ? (() => {
          const m = student.steamVanity.match(/steamcommunity\.com\/id\/([^/\s?]+)/)
          const vanity = m ? m[1] : student.steamVanity.replace(/^https?:\/\//, '').replace(/\/$/, '')
          return `https://steamcommunity.com/id/${encodeURIComponent(vanity)}`
        })()
      : null

  // Link to the student's Faceit profile ONLY when a real nickname is known.
  // Without it the ELO badge comes from Leetify, but there is no profile to
  // open — so render a non-link badge instead of sending the user to the
  // Faceit homepage (which looked like a broken profile link).
  const faceitUrl = student.faceitNickname
    ? `https://www.faceit.com/pl/players/${encodeURIComponent(student.faceitNickname)}`
    : null

  return (
    <CoachLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link
          href="/coach/students"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Powrót do uczniów
        </Link>

        {/* Profile header */}
        <div className="glass-card rise-in relative rounded-3xl p-6 md:p-8 mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.04] via-transparent to-transparent" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-5 min-w-0">
              <Avatar className="h-20 w-20 rounded-2xl ring-1 ring-white/15 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
                <AvatarImage src={student.avatarUrl || ''} alt={student.name || student.email} />
                <AvatarFallback className="rounded-2xl bg-white text-[#060606] font-display font-bold text-2xl">
                  {getInitials(student.name || student.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight truncate">
                  {student.name || 'Bez nazwy'}
                </h1>
                <p className="mt-1.5 text-white/45 text-sm flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {student.email}
                </p>
                <p className="mt-1 text-white/35 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Uczeń od {formatDate(student.createdAt)}
                </p>
                {(student.steamId || student.steamVanity || student.faceitNickname || student.faceitElo != null || student.faceitLevel != null) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {steamUrl && (
                      <a
                        href={steamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Profil Steam"
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs font-semibold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-[#66c0f4]/40 hover:bg-[#66c0f4]/[0.08] transition-all duration-300"
                      >
                        <SteamIcon className="w-4 h-4" />
                        Steam
                      </a>
                    )}
                    {(student.faceitNickname || student.faceitElo != null || student.faceitLevel != null) &&
                      (faceitUrl ? (
                        <a
                          href={faceitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Profil Faceit: ${student.faceitNickname}`}
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs font-semibold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-[#ff5500]/40 hover:bg-[#ff5500]/[0.08] transition-all duration-300"
                        >
                          <FaceitIcon className="w-4 h-4" />
                          {student.faceitElo != null ? `${student.faceitElo} ELO` : student.faceitLevel != null ? `Poziom ${student.faceitLevel}` : 'Faceit'}
                          {student.faceitLevel != null && (
                            <span className="ml-0.5 inline-flex items-center rounded-md bg-[#ff5500]/15 border border-[#ff5500]/25 px-1.5 py-0.5 text-[10px] font-bold text-[#ff9a5c]">
                              Lv.{student.faceitLevel}
                            </span>
                          )}
                        </a>
                      ) : (
                        <span
                          title="Uczeń nie podał nicku Faceit — ELO pochodzi z Leetify. Dodaj nick w ustawieniach ucznia, aby uzyskać link do profilu."
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-xs font-semibold text-white/60 bg-white/[0.04] border border-white/[0.08] cursor-default"
                        >
                          <FaceitIcon className="w-4 h-4" />
                          {student.faceitElo != null ? `${student.faceitElo} ELO` : student.faceitLevel != null ? `Poziom ${student.faceitLevel}` : 'Faceit'}
                          {student.faceitLevel != null && (
                            <span className="ml-0.5 inline-flex items-center rounded-md bg-[#ff5500]/15 border border-[#ff5500]/25 px-1.5 py-0.5 text-[10px] font-bold text-[#ff9a5c]">
                              Lv.{student.faceitLevel}
                            </span>
                          )}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:ml-auto md:justify-end items-center">
              {(() => {
                const total = progressStats.total ?? 0
                const completion = total > 0 ? Math.round(((progressStats.watched ?? 0) + (progressStats.implemented ?? 0)) / total * 100) : 0
                const rank = getRank(completion)
                const levelInfo = getLevel((progressStats.watched ?? 0) + (progressStats.implemented ?? 0))
                return (
                  <span className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/85">
                    <RankEmblem rank={rank} size={26} glow={false} />
                    {rank.name}
                    <span className="text-white/35">·</span>
                    Lv.{levelInfo.level}
                  </span>
                )
              })()}
              {PROGRESS_DOTS.map(({ key, label, color }) => {
                const count = progressStats[key] ?? 0
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-md"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    {label}: <span className="text-white font-semibold">{count}</span>
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* ===== AI ANALYSIS ===== */}
        <div className="glass-card rise-in relative rounded-3xl p-6 md:p-7 mb-8 overflow-hidden border border-[#a78bfa]/20" style={{ animationDelay: '80ms' }}>
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[#8b5cf6]/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25 animate-pulse-ring">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Analiza AI trenera</h2>
                <p className="text-xs text-white/40">Słabości gracza na podstawie statystyk Leetify + gotowa rutyna treningowa</p>
              </div>
            </div>
            <button
              onClick={loadAiAnalysis}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 h-9 text-xs font-medium text-white/60 hover:text-white glass hover:border-[#a78bfa]/30 transition"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', aiLoading && 'animate-spin')} />
              Odśwież
            </button>
          </div>

          {aiLoading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin mr-3" /> Analizuję statystyki ucznia…
            </div>
          ) : aiError ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-5 py-4 flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-amber-300 shrink-0" />
              <p className="text-sm text-amber-200/90">{aiError}</p>
            </div>
          ) : aiData ? (
            <>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Weaknesses */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/45 bg-white/[0.03] border border-white/[0.08] rounded-full px-3 py-1">
                    <ClipboardList className="w-3 h-3 text-[#c4b5fd]" />
                    {aiData.profile.totalMatches ?? '—'} meczów
                  </span>
                  {aiData.profile.winrate != null && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-white/45 bg-white/[0.03] border border-white/[0.08] rounded-full px-3 py-1">
                      <Target className="w-3 h-3 text-[#c4b5fd]" />
                      winrate {aiData.profile.winrate}%
                    </span>
                  )}
                </div>

                {aiData.weaknesses.map((w) => (
                  <div key={w.key} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white/85">{w.label}</span>
                      <span className="text-xs font-bold tabular-nums text-red-300">{w.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden mb-2.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f87171] to-[#ef4444] transition-all duration-1000"
                        style={{ width: `${Math.min(100, w.value ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{w.advice}</p>
                  </div>
                ))}
              </div>

              {/* Suggested routine */}
              <div className="rounded-2xl border border-[#a78bfa]/25 bg-gradient-to-br from-[#a78bfa]/[0.08] to-[#8b5cf6]/[0.03] p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </span>
                  <h3 className="font-display text-lg font-bold">Proponowana rutyna</h3>
                </div>
                {aiData.suggestedRoutine ? (
                  <>
                    <p className="font-display text-base font-semibold text-[#c4b5fd]">{aiData.suggestedRoutine.title}</p>
                    <p className="mt-1 text-sm text-white/50 leading-relaxed">{aiData.suggestedRoutine.description}</p>
                    <div className="mt-4 space-y-2 flex-1">
                      {aiData.suggestedRoutine.tasks.slice(0, 5).map((t, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm">
                          <span className="grid place-items-center w-6 h-6 shrink-0 rounded-lg bg-white/[0.06] text-[11px] font-bold text-[#c4b5fd]">
                            D{t.day}
                          </span>
                          <span className="flex-1 min-w-0 truncate text-white/75">{t.title}</span>
                          <span className="text-xs text-white/35 tabular-nums whitespace-nowrap">{t.minutes} min</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/[0.08]">
                      {routineCreated ? (
                        <Link
                          href="/coach/routines"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl h-12 text-sm font-semibold text-white btn-darey overflow-hidden"
                        >
                          <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
                          <Check className="w-4 h-4" />
                          Rutyna utworzona — otwórz listę rutyn
                        </Link>
                      ) : (
                        <button
                          onClick={createSuggestedRoutine}
                          disabled={creatingRoutine}
                          className="relative w-full inline-flex items-center justify-center gap-2 rounded-2xl h-12 text-sm font-semibold text-white btn-darey overflow-hidden disabled:opacity-60"
                        >
                          <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
                          {creatingRoutine ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                          Stwórz rutynę i przypisz
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-white/40">Brak danych do wygenerowania rutyny — dodaj więcej meczów lub Steam ID ucznia.</p>
                )}
              </div>
            </div>

            {/* Progress over time */}
            {aiData.snapshots.length >= 2 && (
              <div className="mt-6 border-t border-white/[0.07] pt-6">
                <SkillProgressChart snapshots={aiData.snapshots} />
              </div>
            )}
            </>
          ) : null}
        </div>

        {/* Sessions header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Sesje ucznia</h2>
            <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-white/70">
              {sessions.length}
            </span>
          </div>
          <Link
            href="/coach/sessions"
            className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Nowa sesja
          </Link>
        </div>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 md:p-16 text-center">
            <Inbox className="w-10 h-10 text-white/25 mx-auto mb-4" />
            <p className="font-display text-lg font-semibold text-white/80">Brak sesji</p>
            <p className="mt-1 text-sm text-white/40 max-w-sm mx-auto">
              Ten uczeń nie ma jeszcze żadnych sesji. Utwórz pierwszą z poziomu listy sesji.
            </p>
            <Link
              href="/coach/sessions"
              className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-6"
            >
              <Plus className="w-4 h-4" />
              Utwórz sesję
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, i) => (
              <Link
                key={session.id}
                href={`/coach/sessions/${session.id}`}
                className="glass-card rise-in group relative block rounded-3xl p-5 md:p-6 overflow-hidden"
                style={{ animationDelay: `${0.05 + i * 0.05}s` }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-lg font-bold truncate group-hover:text-white transition-colors">
                        {session.title}
                      </h3>
                      <Badge className={cn('rounded-full', STATUS_COLORS[session.status] || 'bg-gray-100 text-gray-800')}>
                        {STATUS_LABELS[session.status] || session.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-white/45 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {session.scheduledAt ? formatDate(session.scheduledAt) : 'Data nieustalona'}
                    </p>
                    {session.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {session.tags.slice(0, 4).map((tag, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: `${tag.color}1f`, color: tag.color, border: `1px solid ${tag.color}33` }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {session.tags.length > 4 && (
                          <span className="text-[11px] text-white/40 self-center">+{session.tags.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 md:gap-6 shrink-0 text-white/45">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <PlayCircle className="w-4 h-4" />
                      {session.videosCount} filmów
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <MessageSquare className="w-4 h-4" />
                      {session.notesCount} notatek
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs">
                      <ClipboardList className="w-4 h-4" />
                      Otwórz
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Zadania treningowe */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Zadania treningowe</h2>
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-white/70">
                {assignments.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/45">
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-300" /> {pendingCount} otwartych</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {doneCount} zrobionych</span>
            </div>
          </div>

          {/* Create form */}
          <div className="glass-card rounded-3xl p-5 md:p-6 mb-5 relative overflow-hidden">
            <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#c4b5fd]" />
              Nowe zadanie dla ucznia
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                placeholder="Tytuł zadania (np. 30 min praktyki strafe'ów)"
                className="md:col-span-2 rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/40 transition-colors"
              />
              <input
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Opis / instrukcja (opcjonalnie)"
                className="md:col-span-2 rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/40 transition-colors"
              />
              <select
                value={form.videoId}
                onChange={(e) => setForm((s) => ({ ...s, videoId: e.target.value }))}
                className="rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-[#a78bfa]/40 transition-colors [&>option]:bg-[#0a0c0e]"
              >
                <option value="">Bez filmu</option>
                {coachVideos.map((v) => (
                  <option key={v.id} value={v.id}>{v.title}</option>
                ))}
              </select>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.1] text-white focus:outline-none focus:border-[#a78bfa]/40 transition-colors [color-scheme:dark]"
              />
            </div>
            {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
            <button
              onClick={createAssignment}
              disabled={saving}
              className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-4 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Dodaj zadanie
            </button>
          </div>

          {/* Assignments list */}
          {assignmentsLoading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie zadań…
            </div>
          ) : assignments.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <Target className="w-9 h-9 text-white/25 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Brak zadań</p>
              <p className="text-xs text-white/40 mt-1">Przypisz pierwszemu zadanie, aby uczeń miał plan treningowy.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {assignments.map((a) => {
                const done = a.status === 'DONE'
                return (
                  <li
                    key={a.id}
                    className={cn('glass-card rounded-2xl p-4 md:p-5 flex items-start gap-4', done && 'opacity-70')}
                  >
                    <button
                      onClick={() => toggleAssignment(a)}
                      aria-label={done ? 'Oznacz jako otwarte' : 'Oznacz jako zrobione'}
                      className={cn(
                        'relative mt-0.5 shrink-0 grid place-items-center w-8 h-8 rounded-xl transition-all duration-300',
                        done
                          ? 'bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white ring-1 ring-white/25'
                          : 'bg-white/[0.04] text-white/35 border border-white/[0.1] hover:border-[#a78bfa]/40 hover:text-[#c4b5fd]',
                      )}
                    >
                      {done ? <Check className="w-4 h-4" strokeWidth={3} /> : <ClipboardList className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn('font-display font-semibold text-white truncate', done && 'line-through decoration-white/30 text-white/50')}>
                          {a.title}
                        </h3>
                        {done && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Zrobione
                          </span>
                        )}
                      </div>
                      {a.description && <p className="mt-1 text-sm text-white/50">{a.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/45">
                        {a.video && (
                          <span className="inline-flex items-center gap-1.5">
                            <Film className="w-3.5 h-3.5" /> {a.video.title}
                          </span>
                        )}
                        {a.dueDate && (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Termin: {formatDate(a.dueDate)}
                          </span>
                        )}
                        {a.completedAt && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-300/80">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {formatDate(a.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAssignment(a.id)}
                      aria-label="Usuń zadanie"
                      className="shrink-0 grid place-items-center w-8 h-8 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </CoachLayout>
  )
}

