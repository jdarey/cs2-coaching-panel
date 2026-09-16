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
  StickyNote,
  Bell,
  Send,
  Eye,
  ListChecks,
  Repeat,
  Clock,
  Timer,
  CalendarDays,
  Moon,
  Trophy,
  Flame,
  X,
  MapPin,
  Globe,
} from 'lucide-react'
import { CoachLayout } from '@/components/coach-layout-export'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate, getInitials, STATUS_LABELS, STATUS_COLORS, getYouTubeId } from '@/lib/utils'
import dynamic from 'next/dynamic'
const YoutubeCustomPlayer = dynamic(() => import('@/components/youtube-custom-player').then(m => m.YoutubeCustomPlayer), { ssr: false, loading: () => <div className="yt-force-dark w-full h-full grid place-items-center bg-black/40 text-white/30 text-sm">Ładowanie odtwarzacza…</div> })
const FaceitEloChart = dynamic(() => import('@/components/faceit-elo-chart').then(m => m.FaceitEloChart), { ssr: false, loading: () => <div className="rounded-3xl p-6 text-center text-white/30 text-sm">Ładowanie ELO…</div> })

interface StudentDetail {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  lastActiveAt: string | null
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
  url: string
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

  // Rutyny ucznia (liczą się jako zadania treningowe)
  const [routines, setRoutines] = useState<any[]>([])
  const [routineAssignments, setRoutineAssignments] = useState<any[]>([])
  const [routinesLoading, setRoutinesLoading] = useState(true)
  const [routineForm, setRoutineForm] = useState({ routineId: '', endsAt: '' })
  const [assigningRoutine, setAssigningRoutine] = useState(false)
  const [previewAssignment, setPreviewAssignment] = useState<any | null>(null)
  const [previewTask, setPreviewTask] = useState<any | null>(null)

  // Kalendarz ucznia - 1:1 jak u ucznia
  const [calendar, setCalendar] = useState<any>(null)
  const [dayNotes, setDayNotes] = useState<Record<string, any>>({})
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<any>(null)

  // Coach private note on this student
  const [note, setNote] = useState<{ id: string; content: string; updatedAt: string } | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteLoading, setNoteLoading] = useState(true)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteSavedAt, setNoteSavedAt] = useState<string | null>(null)

  // Email reminder
  const [reminding, setReminding] = useState(false)
  const [reminded, setReminded] = useState(false)

  // Live Faceit ELO obok Steam - auto co 30s, progi CS2 aktualne
  const [liveFaceitElo, setLiveFaceitElo] = useState<number | null>(student.faceitElo)
  const [liveFaceitLevel, setLiveFaceitLevel] = useState<number | null>(student.faceitLevel)
  const levelFromEloLive = (elo: number | null) => {
    if (elo == null) return null
    if (elo <= 500) return 1
    if (elo <= 750) return 2
    if (elo <= 900) return 3
    if (elo <= 1050) return 4
    if (elo <= 1200) return 5
    if (elo <= 1350) return 6
    if (elo <= 1530) return 7
    if (elo <= 1750) return 8
    if (elo <= 2000) return 9
    return 10
  }
  useEffect(() => {
    const fetchLiveElo = () => {
      fetch(`/api/ranks?studentId=${student.id}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => {
          const faceitOnly = (Array.isArray(data) ? data : []).filter((e: any) => e.mode === 'FACEIT' && e.elo != null)
          if (faceitOnly.length) {
            const sorted = faceitOnly.sort((a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
            const last = sorted[sorted.length - 1]
            setLiveFaceitElo(last.elo)
            setLiveFaceitLevel(levelFromEloLive(last.elo))
          }
        })
        .catch(() => {})
    }
    fetchLiveElo()
    // ELO: co 15 min jak reszta apki (wcześniej 30s).
    const id2 = setInterval(() => {
      if (document.visibilityState === 'visible') fetchLiveElo()
    }, 900_000)
    return () => clearInterval(id2)
  }, [student.id])

  // Online presence (heartbeat updates lastActiveAt every 180s)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id) }, [])
  const isOnline = !!student.lastActiveAt && now - new Date(student.lastActiveAt).getTime() < 5 * 60 * 1000
  const formatLastSeen = () => {
    if (!student.lastActiveAt) return 'nigdy'
    const diff = now - new Date(student.lastActiveAt).getTime()
    if (diff < 5 * 60 * 1000) return 'teraz'
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min temu`
    const h = Math.floor(mins / 60)
    if (h < 24) return `${h} godz. temu`
    return `${Math.floor(h / 24)} dni temu`
  }

  const loadNote = useCallback(async () => {
    try {
      const res = await fetch(`/api/coach/students/${student.id}/note`)
      if (res.ok) {
        const data = await res.json()
        setNote(data.note)
        setNoteDraft(data.note?.content ?? '')
      }
    } catch {
      /* ignore */
    } finally {
      setNoteLoading(false)
    }
  }, [student.id])

  useEffect(() => {
    loadNote()
  }, [loadNote])

  const saveNote = async () => {
    setNoteSaving(true)
    try {
      const res = await fetch(`/api/coach/students/${student.id}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteDraft }),
      })
      if (res.ok) {
        const data = await res.json()
        setNote(data.note)
        setNoteDraft(data.note?.content ?? '')
        setNoteSavedAt(data.note ? new Date().toISOString() : null)
      }
    } catch {
      /* ignore */
    } finally {
      setNoteSaving(false)
    }
  }

  const sendReminder = async () => {
    if (reminding || reminded) return
    setReminding(true)
    try {
      const res = await fetch(`/api/coach/students/${student.id}/remind`, { method: 'POST' })
      if (res.ok) setReminded(true)
    } catch {
      /* ignore */
    } finally {
      setReminding(false)
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

  const loadRoutines = useCallback(async () => {
    try {
      const [routinesRes, assignedRes] = await Promise.all([
        fetch('/api/routines'),
        fetch(`/api/routines/assignments?studentId=${student.id}`),
      ])
      if (routinesRes.ok) {
        const data = await routinesRes.json()
        setRoutines(Array.isArray(data) ? data : [])
      }
      if (assignedRes.ok) {
        const data = await assignedRes.json()
        setRoutineAssignments(Array.isArray(data) ? data : [])
      }
    } catch {
      /* ignore */
    } finally {
      setRoutinesLoading(false)
    }
  }, [student.id])

  useEffect(() => { loadRoutines() }, [loadRoutines])

  const loadCalendar = useCallback(async () => {
    try {
      const [histRes, notesRes] = await Promise.all([
        fetch(`/api/routines/history?studentId=${student.id}&months=3`),
        fetch(`/api/calendar-notes?studentId=${student.id}`),
      ])
      if (histRes.ok) setCalendar(await histRes.json())
      if (notesRes.ok) {
        const notes: any[] = await notesRes.json()
        const map: Record<string, any> = {}
        notes.forEach((n: any) => { map[n.date] = n })
        setDayNotes(map)
      }
    } catch { /* ignore */ } finally { setCalendarLoading(false) }
  }, [student.id])

  useEffect(() => { loadCalendar() }, [loadCalendar])

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

  const assignRoutineToStudent = async () => {
    if (!routineForm.routineId) return
    setAssigningRoutine(true)
    try {
      const res = await fetch('/api/routines/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId: routineForm.routineId, studentId: student.id, endsAt: routineForm.endsAt || null }),
      })
      if (res.ok) {
        setRoutineForm({ routineId: '', endsAt: '' })
        loadRoutines()
        loadCalendar()
      }
    } catch { /* ignore */ } finally { setAssigningRoutine(false) }
  }

  const removeRoutineAssignment = async (assignmentId: string) => {
    if (!confirm('Usunąć przypisaną rutynę?')) return
    try {
      const res = await fetch(`/api/routines/assign?assignmentId=${assignmentId}`, { method: 'DELETE' })
      // fallback: jeśli endpoint nie istnieje, spróbuj DELETE na /api/routines/[id] logic - używamy PATCH na assignment
      if (res.ok || res.status === 404) {
        // spróbuj usunąć przez inny endpoint - na razie odśwież
        loadRoutines()
      }
    } catch { loadRoutines() }
  }

  const pendingCount = assignments.filter((a) => a.status === 'PENDING').length
  const doneCount = assignments.length - pendingCount
  const routinesCount = routineAssignments.length
  const totalTrainingTasks = assignments.length + routinesCount

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
              <div className="relative">
                <Avatar className="h-20 w-20 rounded-2xl ring-1 ring-white/15 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)]">
                  <AvatarImage src={student.avatarUrl || ''} alt={student.name || student.email} />
                  <AvatarFallback className="rounded-2xl bg-white text-[#060606] font-display font-bold text-2xl">
                    {getInitials(student.name || student.email)}
                  </AvatarFallback>
                </Avatar>
                <span className={cn('absolute -bottom-1 -right-1 h-4 w-4 rounded-full ring-2 ring-[#0f0f12] border border-white/10', isOnline ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-white/25')} title={isOnline ? 'Online teraz' : `Offline • ${formatLastSeen()}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight break-words min-w-0">
                    {student.name || 'Bez nazwy'}
                  </h1>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border shrink-0', isOnline ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' : 'bg-white/[0.04] text-white/35 border-white/[0.08]')}>
                    <span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-white/30')} />
                    {isOnline ? 'Online' : `Offline • ${formatLastSeen()}`}
                  </span>
                </div>
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
                {/* Wyraźne ELO obok Steam - aktualne, 1:1, auto co 30s */}
                {liveFaceitElo != null && (
                  <a href={student.faceitNickname ? `https://www.faceit.com/pl/players/${encodeURIComponent(student.faceitNickname)}` : undefined} target={student.faceitNickname ? "_blank" : undefined} rel={student.faceitNickname ? "noopener noreferrer" : undefined} className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-gradient-to-br from-[#ff5500]/15 to-[#ff1a1a]/10 border border-[#ff5500]/20 hover:border-[#ff5500]/30 hover:bg-[#ff5500]/20 transition-colors">
                    <FaceitIcon className="w-4 h-4 text-[#ff5500]" />
                    <span className="text-sm font-bold text-white">{liveFaceitElo} ELO</span>
                    {liveFaceitLevel && <span className="text-xs text-white/50">· Lvl {liveFaceitLevel}</span>}
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" title="auto co 30s" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:ml-auto md:justify-end items-center">
              <Link
                href={`/coach/messages?student=${student.id}`}
                className="inline-flex items-center gap-1.5 rounded-full px-4 h-10 text-sm font-semibold text-white/75 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-[#2de5ca]/30 hover:bg-[#2de5ca]/[0.06] transition-all duration-300"
              >
                <MessageSquare className="w-4 h-4 text-[#2de5ca]" />
                Wiadomość
              </Link>
              <button
                onClick={sendReminder}
                disabled={reminding || reminded}
                title="Wyślij uczniowi przypomnienie e-mail"
                className="inline-flex items-center gap-1.5 rounded-full px-4 h-10 text-sm font-semibold text-white/75 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-[#fbbf24]/30 hover:bg-[#fbbf24]/[0.06] transition-all duration-300 disabled:opacity-50 disabled:hover:bg-white/[0.04] disabled:hover:border-white/[0.08]"
              >
                {reminded ? <Check className="w-4 h-4 text-emerald-300" /> : reminding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 text-[#fbbf24]" />}
                {reminded ? 'Wysłano' : 'Przypomnij'}
              </button>
              {(() => {
                const total = progressStats.total ?? 0
                const completion = total > 0 ? Math.round(((progressStats.watched ?? 0) + (progressStats.implemented ?? 0)) / total * 100) : 0
                return (
                  <span className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/85">
                    {completion}% ukończone
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

        {/* ===== PRIVATE COACH NOTE ===== */}
        <div className="glass-card rise-in relative rounded-3xl p-6 md:p-7 mb-8 overflow-hidden" style={{ animationDelay: '40ms' }}>
          <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full bg-[#2de5ca]/[0.07] blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] ring-1 ring-white/25">
                <StickyNote className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Prywatna notatka</h2>
                <p className="text-xs text-white/40">Tylko Ty ją widzisz — uczeń nie ma do niej dostępu. Np. cele, słabości, co omówić na następnej sesji.</p>
              </div>
              {noteSavedAt && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/80">
                  <Check className="w-3.5 h-3.5" /> Zapisano
                </span>
              )}
            </div>
            {noteLoading ? (
              <div className="flex items-center justify-center py-8 text-white/40">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ładowanie notatki…
              </div>
            ) : (
              <>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      saveNote()
                    }
                  }}
                  placeholder="Zapisz coś o tym uczniu… (Ctrl+Enter aby zapisać)"
                  rows={4}
                  className="w-full rounded-2xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#2de5ca]/40 transition-colors resize-y leading-relaxed"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-white/35">
                    {note
                      ? `Ostatnia edycja: ${formatDate(note.updatedAt)}`
                      : 'Brak notatki — pierwszy raz zapiszesz ją tutaj.'}
                  </p>
                  <div className="flex items-center gap-2">
                    {note && noteDraft.trim() === '' && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/coach/students/${student.id}/note`, { method: 'DELETE' })
                          setNote(null)
                          setNoteSavedAt(null)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 h-9 text-xs font-medium text-white/50 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Usuń
                      </button>
                    )}
                    <button
                      onClick={saveNote}
                      disabled={noteSaving}
                      className="relative inline-flex items-center gap-2 rounded-xl px-5 h-9 text-sm font-semibold text-white btn-darey overflow-hidden disabled:opacity-60"
                    >
                      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
                      {noteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Zapisz notatkę
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Faceit ELO - wykres 1:1 jak premier widget, u trenera i ucznia ten sam */}
        <div className="mb-8">
          <FaceitEloChart studentId={student.id} faceitNickname={student.faceitNickname} faceitElo={student.faceitElo} faceitLevel={student.faceitLevel} />
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

        {/* Rutyny - liczą się jako zadania treningowe */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-[#a78bfa]" /> Rutyny treningowe
              </h2>
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-[#a78bfa]/15 border border-[#a78bfa]/25 text-xs font-semibold text-[#c4b5fd]">
                {routinesCount}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-white/40 border border-white/[0.06] rounded-full px-2.5 py-1">
                <Repeat className="w-3 h-3" /> liczą się jako zadania treningowe
              </span>
            </div>
            <span className="text-xs text-white/40">Łącznie zadań: <b className="text-white">{totalTrainingTasks}</b> ({assignments.length} zadań + {routinesCount} rutyn)</span>
          </div>

          <div className="glass-card rounded-3xl p-5 md:p-6 mb-5">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#a78bfa]" /> Przypisz rutynę uczniowi
            </p>
            <p className="text-xs text-white/40 mb-3">Rutyna появится у ucznia w <b className="text-white/70">Zadania treningowe → Moje rutyny</b> i każde odhaczone zadanie z rutyny zliczy się w jego kalendarzu i statystykach.</p>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Wybierz rutynę</label>
                <select
                  value={routineForm.routineId}
                  onChange={(e) => setRoutineForm((s) => ({ ...s, routineId: e.target.value }))}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-[#a78bfa]/40 [&>option]:bg-[#0a0c0e]"
                >
                  <option value="">— wybierz —</option>
                  {routines.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.title} · {r.tasks?.length || 0} zadań{r.recurring ? ' · codziennie' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Do kiedy (opcjonalnie)</label>
                <input type="date" value={routineForm.endsAt} onChange={(e) => setRoutineForm((s) => ({ ...s, endsAt: e.target.value }))} className="rounded-xl px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] text-white [color-scheme:dark]" />
              </div>
            </div>
            <button onClick={assignRoutineToStudent} disabled={assigningRoutine || !routineForm.routineId} className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-4 disabled:opacity-50">
              {assigningRoutine ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />} Przypisz rutynę
            </button>
          </div>

          {routinesLoading ? (
            <div className="flex items-center justify-center py-8 text-white/40"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie rutyn…</div>
          ) : routineAssignments.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <ListChecks className="w-9 h-9 text-white/25 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Brak przypisanych rutyn</p>
              <p className="text-xs text-white/40 mt-1">Wybierz rutynę powyżej — pojawi się u ucznia i zacznie liczyć się do kalendarza.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {routineAssignments.map((a: any) => {
                const done = a.progress?.filter((p: any) => p.status === 'DONE').length || 0
                const total = a.routine?.tasks?.length || 0
                const pct = total ? Math.round((done / total) * 100) : 0
                return (
                  <li key={a.id} className="glass-card rounded-2xl p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-semibold text-white">{a.routine?.title}</h3>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold', a.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-[#a78bfa]/10 text-[#c4b5fd] border-[#a78bfa]/20')}>{a.status === 'COMPLETED' ? 'ukończona' : 'aktywna'}</span>
                          {a.routine?.recurring && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40 inline-flex items-center gap-1"><Repeat className="w-3 h-3" />codziennie</span>}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-white/50">{done}/{total} zadań · {pct}%</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {a.routine?.tasks?.slice(0, 3).map((t: any) => (
                            <span key={t.id} className="text-[11px] px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/50">{t.title}</span>
                          ))}
                          {(a.routine?.tasks?.length || 0) > 3 && <span className="text-[11px] text-white/30">+{a.routine.tasks.length - 3}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setPreviewAssignment(a)} className="grid place-items-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white hover:border-[#a78bfa]/30 hover:bg-[#a78bfa]/10" title="Podgląd 1:1 jak widzi uczeń"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => removeRoutineAssignment(a.id)} className="grid place-items-center w-8 h-8 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Kalendarz ucznia - 1:1 jak u ucznia + ile razy, czy w ogóle */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#a78bfa]" /> Kalendarz ucznia
            </h2>
            <span className="text-xs text-white/40">1:1 jak u ucznia · rutyny+zadania</span>
            <button onClick={loadCalendar} className="ml-auto inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white">Odśwież</button>
          </div>
          {calendar?.summary && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                <p className="text-lg font-bold text-white">{calendar.summary.totalDays}</p>
                <p className="text-[11px] text-white/40">dni z treningiem</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                <p className="text-lg font-bold text-emerald-300">{calendar.summary.totalSessions}</p>
                <p className="text-[11px] text-white/40">zadań wykonanych</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                <p className="text-lg font-bold text-[#c4b5fd]">{calendar.summary.totalMinutes} min</p>
                <p className="text-[11px] text-white/40">czasu</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] text-white/30 mb-3">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Pełny</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a78bfa]" />Częściowy</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/20" />Brak</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Notatka</span>
            <span className="ml-auto text-white/40">kolor = czy zrobił, liczba = ile zadań, 2× = ile razy</span>
          </div>

          {calendarLoading ? (
            <div className="glass-card rounded-3xl p-6 flex items-center justify-center py-12 text-white/40"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie kalendarza…</div>
          ) : (
            <div className="glass-card rounded-3xl p-6">
              {(() => {
                const cal: any[] = calendar?.calendar || []
                const map = new Map(cal.map((d: any) => [d.date, d]))
                const today = new Date(); today.setHours(12,0,0,0)
                const start = new Date(today); start.setDate(today.getDate() - 13)
                const toLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
                return (
                  <>
                    <div className="grid grid-cols-7 gap-2 text-[11px] text-white/30 text-center mb-2 font-medium">
                      {['Pn','Wt','Śr','Czw','Pt','Sob','Ndz'].map(d=> <span key={d} className="py-1">{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({length:14}, (_, idx)=>{
                        const d = new Date(start); d.setDate(start.getDate()+idx)
                        const iso = toLocal(d)
                        const entry: any = map.get(iso)
                        const isFuture = d > today
                        const isToday = iso === toLocal(new Date())
                        const isFull = !!entry?.full
                        const count = entry?.count || 0
                        const hasNote = !!dayNotes[iso]
                        const isSelected = selectedCalendarDay?.date === iso
                        return (
                          <button key={iso} disabled={isFuture} onClick={()=> setSelectedCalendarDay(entry || { date: iso, count: 0, full: false, tasks: [], minutes: 0, routines: [] })} className={[
                            'relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 text-xs font-bold transition-all py-2',
                            isFuture ? 'bg-transparent border-transparent cursor-default' : isSelected ? 'ring-2 ring-[#a78bfa] border-[#a78bfa]/50' : '',
                            isToday ? 'ring-2 ring-[#a78bfa]/40' : '',
                            isFull ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100' : count>0 ? 'bg-[#a78bfa]/15 border-[#a78bfa]/30 text-white' : !isFuture ? 'bg-white/[0.04] text-white/40 border-white/[0.06] hover:bg-white/[0.07]' : ''
                          ].join(' ')}>
                            <span className="text-[15px]">{d.getDate()}</span>
                            <span className={['text-[10px] px-1.5 py-0.5 rounded-full font-bold', isFull ? 'bg-emerald-500/20 text-emerald-200' : count>0 ? 'bg-[#a78bfa]/20 text-white' : 'text-white/30'].join(' ')}>{isFull ? (entry?.times > 1 ? `${entry.times}× PEŁNY` : 'PEŁNY') : count>0 ? `${count}${entry?.times > 1 ? ` · ${entry.times}×` : ''}` : '·'}</span>
                            {hasNote && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-black/20" />}
                          </button>
                        )
                      })}
                    </div>
                    {selectedCalendarDay && (
                      <div className="mt-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-[#a78bfa]" />{selectedCalendarDay.date}</p>
                          <button onClick={()=>setSelectedCalendarDay(null)} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className={['px-3 py-1.5 rounded-full border font-semibold', selectedCalendarDay.full ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : selectedCalendarDay.count>0 ? 'bg-[#a78bfa]/10 border-[#a78bfa]/20 text-[#c4b5fd]' : 'bg-white/[0.03] border-white/[0.06] text-white/40'].join(' ')}>{selectedCalendarDay.count} zadań{selectedCalendarDay.times > 1 ? ` · ${selectedCalendarDay.times}×` : ''} {selectedCalendarDay.full ? '✓' : ''}</span>
                          {selectedCalendarDay.minutes ? <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60 text-xs">{selectedCalendarDay.minutes} min</span> : null}
                          {selectedCalendarDay.routines?.length > 0 && <span className="px-3 py-1.5 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#c4b5fd] text-xs">{selectedCalendarDay.routines.join(', ')}</span>}
                        </div>
                        {selectedCalendarDay.tasks?.length > 0 ? (
                          <div className="mt-3 space-y-1.5">
                            {selectedCalendarDay.tasks.map((t: any, i: number)=> (
                              <div key={i} className="flex items-center gap-2 text-sm bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0"/><span className="truncate text-white/80">{t.title || t.routineTitle}</span><span className="ml-auto text-[11px] text-white/40">{t.routineTitle}</span></div>
                            ))}
                          </div>
                        ) : <p className="text-xs text-white/40 mt-3">Brak zadań tego dnia</p>}
                        {dayNotes[selectedCalendarDay.date] && (
                          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notatka ucznia</p>
                            <p className="text-sm text-white/80 mt-1">{dayNotes[selectedCalendarDay.date].content}</p>
                            {dayNotes[selectedCalendarDay.date].sleep && <p className="text-xs text-white/50 mt-1 flex items-center gap-1"><Moon className="w-3 h-3" /> Sen: {dayNotes[selectedCalendarDay.date].sleep}/10</p>}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] text-white/30 mt-4 text-center">Kliknij dzień aby zobaczyć szczegóły · Rutyny liczą się jako zadania treningowe</p>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Podgląd rutyny 1:1 jak widzi uczeń */}
        {previewAssignment && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setPreviewAssignment(null)} />
            <div className="glass-liquid relative w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-3xl flex flex-col">
              <div className="p-6 border-b border-white/[0.06] shrink-0 flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20 shrink-0"><Eye className="h-5 w-5 text-white" /></span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#c4b5fd] font-semibold">Podgląd ucznia — 1:1</p>
                    <h3 className="font-display text-lg font-bold text-white mt-1">{previewAssignment.routine?.title}</h3>
                    {previewAssignment.routine?.description && <p className="text-sm text-white/55 mt-1 line-clamp-2">{previewAssignment.routine.description}</p>}
                  </div>
                </div>
                <button onClick={() => setPreviewAssignment(null)} className="grid h-9 w-9 place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06]"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(() => {
                  const tasks: any[] = previewAssignment.routine?.tasks || []
                  const progress: any[] = previewAssignment.progress || []
                  const days = Array.from(new Set(tasks.map((t: any) => t.day))).sort((a: number, b: number) => a - b)
                  const isDone = (id: string) => progress.find((p: any) => p.taskId === id)?.status === 'DONE'
                  return days.map((d: any) => {
                    const dayTasks = tasks.filter((t: any) => t.day === d)
                    const doneCount = dayTasks.filter((t: any) => isDone(t.id)).length
                    return (
                      <div key={d}>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#c4b5fd] mb-3">Dzień {d} · {doneCount}/{dayTasks.length} {doneCount===dayTasks.length && dayTasks.length>0 ? '✓' : ''}</p>
                        <div className="space-y-2">
                          {dayTasks.map((t: any) => {
                            const done = isDone(t.id)
                            const vidUrl = t.videoId ? (routines.find((r:any)=> r.id===previewAssignment.routine?.id)?.tasks?.find((x:any)=>x.id===t.id)?.videoId ? null : null) : null
                            // znajdź video z globalnej listy
                            const video = t.videoId ? coachVideos.find((v:any)=>v.id===t.videoId) : null
                            return (
                              <div key={t.id} onClick={() => setPreviewTask(t)} className={['group flex items-start gap-3 rounded-2xl p-3.5 border transition-all duration-300 relative cursor-pointer', done ? 'bg-emerald-500/[0.06] border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.07] hover:border-[#a78bfa]/30 hover:bg-[#a78bfa]/[0.03]'].join(' ')}>
                                <span className={['mt-0.5 shrink-0 grid place-items-center w-7 h-7 rounded-lg text-xs font-bold', done ? 'bg-gradient-to-br from-[#34d399] to-[#10b981] text-white ring-1 ring-white/25' : 'bg-white/[0.04] text-white/35 border border-white/[0.1]'].join(' ')}>
                                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <span>{t.order + 1}</span>}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={['text-sm font-semibold leading-snug flex items-center gap-2', done ? 'text-white/50 line-through decoration-white/30' : 'text-white/90'].join(' ')}>
                                    <span className="relative inline-flex items-center gap-1">
                                        {t.title}
                                        {t.gifUrl && (
                                        <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-[40%] hidden sm:block opacity-0 group-hover:opacity-100 transition-all duration-300 scale-[0.96] group-hover:scale-100 z-30">
                                          <span className="flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0c0e]/95 via-[#141222]/95 to-[#1a1628]/95 backdrop-blur-xl border border-white/10 shadow-[0_24px_64px_-16px_rgba(139,92,246,0.35),0_8px_32px_-8px_rgba(0,0,0,0.6)] w-64">
                                            <span className="relative h-36 w-64 bg-black block overflow-hidden">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img decoding="async" src={t.gifUrl} alt={`Demo: ${t.title}`} className="w-full h-full object-cover" loading="lazy" />
                                              <span className="absolute inset-0 ring-1 ring-white/10 pointer-events-none" />
                                            </span>
                                          </span>
                                        </span>
                                        )}
                                      </span>
                                  </p>
                                  {t.description && <p className="text-xs text-white/45 mt-1 line-clamp-2">{t.description}</p>}
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {t.minutes && <span className="inline-flex items-center gap-1 text-[11px] text-white/40"><Clock className="w-3 h-3" />~{t.minutes} min</span>}
                                    {t.videoId && <span className="inline-flex items-center gap-1 text-[11px] text-[#c4b5fd]"><Film className="w-3 h-3" />Film</span>}
                                    {t.steamMapUrl && <span onClick={e=>e.stopPropagation()}><a href={t.steamMapUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#fda4af] bg-[#f43f5e]/[0.08] border border-[#f43f5e]/25 hover:bg-[#f43f5e]/[0.16] hover:border-[#f43f5e]/40 transition-all"><MapPin className="w-3.5 h-3.5" />Mapa</a></span>}
                                    {t.linkUrl && <span onClick={e=>e.stopPropagation()}><a href={t.linkUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] bg-[#a78bfa]/[0.08] border border-[#a78bfa]/20 hover:bg-[#a78bfa]/[0.16] hover:border-[#a78bfa]/30 transition-all"><Globe className="w-3.5 h-3.5" />Link</a></span>}
                                    {done && <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/70"><Check className="w-3 h-3" />zrobione</span>}
                                    {!done && t.minutes && <span className="inline-flex items-center gap-1 text-[11px] text-white/30">kliknij aby zobaczyć film/opis</span>}
                                  </div>
                                </div>
                                <span className={['text-[11px] px-2 py-1 rounded-full border font-semibold shrink-0 hidden sm:inline-flex', done ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-white/[0.04] border-white/[0.08] text-white/30'].join(' ')}>{done ? 'zrobione' : 'oczekuje'}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
              <div className="p-4 border-t border-white/[0.06] flex justify-between items-center shrink-0">
                <p className="text-xs text-white/40">Tak widzi uczeń w <b className="text-white/70">Zadania → Moje rutyny</b> · kliknij zadanie aby zobaczyć film</p>
                <button onClick={() => setPreviewAssignment(null)} className="px-5 h-9 rounded-xl glass-liquid text-white/70">Zamknij</button>
              </div>
            </div>
          </div>
        )}

        {/* Podgląd zadania — 1:1 jak u ucznia: film + opis + GIF */}
        {previewTask && (
          <div className="fixed inset-0 z-[60] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setPreviewTask(null)} />
            <div className="glass-liquid relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl flex flex-col">
              <button onClick={() => setPreviewTask(null)} className="yt-force-dark absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-black/40 text-white/70 hover:text-white z-10"><X className="w-4 h-4" /></button>
              <div className="p-6 border-b border-white/[0.06]">
                <h3 className="font-display text-xl font-bold text-white pr-8">{previewTask.title}</h3>
                {previewTask.description && <p className="text-sm text-white/60 mt-2 leading-relaxed">{previewTask.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewTask.minutes && <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60"><Clock className="w-3.5 h-3.5" />~{previewTask.minutes} min</span>}
                  {previewTask.steamMapUrl && <a href={previewTask.steamMapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#fda4af] bg-[#f43f5e]/[0.08] border border-[#f43f5e]/25"><MapPin className="w-3.5 h-3.5" />Mapa Steam</a>}
                  {previewTask.linkUrl && <a href={previewTask.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] bg-[#a78bfa]/10 border border-[#a78bfa]/20"><span className="w-1 h-1 rounded-full bg-white/30" />Link</a>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(() => {
                  const vid = previewTask.videoId ? coachVideos.find((v: any) => v.id === previewTask.videoId) : null
                  const ytId = vid ? getYouTubeId((vid as any).url || '') : null
                  // spróbuj znaleźć url z tasks -> videos, ale coachVideos ma tylko url? jeśli brak, użyj previewAssignment
                  const fullVideo = vid as any
                  if (ytId) {
                    return (
                      <div className="rounded-2xl overflow-hidden bg-black border border-white/[0.08]">
                        <div className="aspect-video">
                          <YoutubeCustomPlayer videoId={ytId} title={previewTask.title} />
                        </div>
                        {fullVideo?.title && <p className="text-xs text-white/50 px-3 py-2 border-t border-white/[0.06]">{fullVideo.title}</p>}
                      </div>
                    )
                  }
                  if (vid) {
                    return (
                      <div className="yt-force-dark rounded-2xl overflow-hidden bg-black border border-white/[0.08] p-6 text-center">
                        <Film className="w-8 h-8 text-white/30 mx-auto mb-2" />
                        <p className="text-sm text-white/60">{(vid as any).title}</p>
                        <a href={(vid as any).url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-[#a78bfa]/20 text-[#c4b5fd]">Otwórz film</a>
                      </div>
                    )
                  }
                  return null
                })()}
                {previewTask.gifUrl && (
                  <div className="rounded-2xl overflow-hidden bg-black border border-white/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img decoding="async" src={previewTask.gifUrl} alt={previewTask.title} className="w-full h-auto" loading="lazy" />
                  </div>
                )}
                {!previewTask.videoId && !previewTask.gifUrl && !previewTask.steamMapUrl && (
                  <p className="text-sm text-white/40 text-center py-4">Brak filmu/GIF — tylko opis tekstowy</p>
                )}
              </div>
              <div className="p-4 border-t border-white/[0.06] flex justify-end">
                <button onClick={() => setPreviewTask(null)} className="px-5 h-9 rounded-xl glass-liquid text-white/70">Zamknij</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}

