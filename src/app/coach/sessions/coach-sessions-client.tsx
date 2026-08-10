'use client'

import { useState } from 'react'
import { formatDate, formatDateTime, getInitials, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import {
  Plus,
  Filter,
  Search,
  X,
  BookOpen,
  Calendar,
  Video,
  Tag,
  Pencil,
  Trash2,
  ArrowRight,
  Loader2,
  Eye,
  ListVideo,
} from 'lucide-react'

interface Session {
  id: string
  title: string
  description: string | null
  status: string
  scheduledAt: string | null
  completedAt: string | null
  createdAt: string
  student: { id: string; name: string | null; email: string; avatarUrl: string | null }
  tags: { tag: { id: string; name: string; color: string }; note: string | null; order: number }[]
  videos: { video: { id: string; title: string; thumbnail: string | null; tags: { tag: { id: string; name: string; color: string } }[] }; tag: { id: string; name: string; color: string } | null; order: number }[]
  _count: { videos: number; tags: number; notes: number }
}

interface Student { id: string; name: string | null; email: string }
interface Tag { id: string; name: string; color: string }
interface Video { id: string; title: string; thumbnail: string | null }

interface CoachSessionsClientProps {
  initialSessions: Session[]
  initialStudents: Student[]
  initialTags: Tag[]
  initialVideos: Video[]
}

const STATUS_FILTERS = [
  { value: 'all', label: 'Wszystkie', color: '#a855f7' },
  { value: 'DRAFT', label: 'Szkic', color: '#fbbf24' },
  { value: 'ACTIVE', label: 'Aktywna', color: '#60a5fa' },
  { value: 'COMPLETED', label: 'Zakończona', color: '#34d399' },
  { value: 'ARCHIVED', label: 'Zarchiwizowana', color: '#d946ef' },
] as const

const STATUS_PILL_STYLES: Record<string, { dot: string; text: string; ring: string; bg: string }> = {
  DRAFT: { dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30', bg: 'bg-amber-400/10' },
  ACTIVE: { dot: 'bg-blue-400', text: 'text-blue-300', ring: 'ring-blue-400/30', bg: 'bg-blue-400/10' },
  COMPLETED: { dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30', bg: 'bg-emerald-400/10' },
  ARCHIVED: { dot: 'bg-fuchsia-400', text: 'text-fuchsia-300', ring: 'ring-fuchsia-400/30', bg: 'bg-fuchsia-400/10' },
  PENDING: { dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30', bg: 'bg-amber-400/10' },
  WATCHING: { dot: 'bg-blue-400', text: 'text-blue-300', ring: 'ring-blue-400/30', bg: 'bg-blue-400/10' },
  WATCHED: { dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30', bg: 'bg-emerald-400/10' },
  IMPLEMENTED: { dot: 'bg-purple-400', text: 'text-purple-300', ring: 'ring-purple-400/30', bg: 'bg-purple-400/10' },
}

const TAG_DOT: Record<string, string> = {
  '#fbbf24': 'bg-amber-400',
  '#60a5fa': 'bg-blue-400',
  '#34d399': 'bg-emerald-400',
  '#d946ef': 'bg-fuchsia-400',
  '#a855f7': 'bg-purple-400',
  '#f472b6': 'bg-pink-400',
  '#fb7185': 'bg-rose-400',
  '#22d3ee': 'bg-cyan-400',
}

function getTagDot(color: string | undefined): string {
  if (!color) return 'bg-violet-400'
  return TAG_DOT[color.toLowerCase()] || 'bg-violet-400'
}

export function CoachSessionsClient({ initialSessions, initialStudents, initialTags, initialVideos }: CoachSessionsClientProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [students] = useState<Student[]>(initialStudents)
  const [tags] = useState<Tag[]>(initialTags)
  const [videos] = useState<Video[]>(initialVideos)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'tags' | 'videos' | 'notes'>('details')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    studentId: '',
    scheduledAt: '',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED',
    tagIds: [] as string[],
    videoIds: [] as string[],
  })

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.student.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.student.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.studentId) return

    setIsLoading(true)

    try {
      const url = editingSession ? `/api/sessions/${editingSession.id}` : '/api/sessions'
      const method = editingSession ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      if (editingSession) {
        setSessions((prev) => prev.map((s) => (s.id === editingSession.id ? data : s)))
        toast({ title: 'Sukces', description: 'Sesja zaktualizowana' })
      } else {
        setSessions((prev) => [data, ...prev])
        toast({ title: 'Sukces', description: 'Sesja utworzona' })
      }

      setDialogOpen(false)
      resetForm()
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę sesję?')) return

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast({ title: 'Sukces', description: 'Sesja usunięta' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    }
  }

  const openEditDialog = (session: Session) => {
    setEditingSession(session)
    setFormData({
      title: session.title,
      description: session.description || '',
      studentId: session.student.id,
      scheduledAt: session.scheduledAt ? new Date(session.scheduledAt).toISOString().slice(0, 16) : '',
      status: session.status as any,
      tagIds: session.tags.map((t) => t.tag.id),
      videoIds: session.videos.map((v) => v.video.id),
    })
    setActiveTab('details')
    setDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingSession(null)
    resetForm()
    setActiveTab('details')
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ title: '', description: '', studentId: '', scheduledAt: '', status: 'DRAFT', tagIds: [], videoIds: [] })
  }

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }

  const toggleVideo = (videoId: string) => {
    setFormData((prev) => ({
      ...prev,
      videoIds: prev.videoIds.includes(videoId)
        ? prev.videoIds.filter((id) => id !== videoId)
        : [...prev.videoIds, videoId],
    }))
  }

  const handleCardMouse = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const statusPillFor = (status: string) => STATUS_PILL_STYLES[status] || STATUS_PILL_STYLES.DRAFT

  const TABS: { id: 'details' | 'tags' | 'videos' | 'notes'; label: string; icon: typeof BookOpen }[] = [
    { id: 'details', label: 'Szczegóły', icon: BookOpen },
    { id: 'tags', label: 'Tagi', icon: Tag },
    { id: 'videos', label: 'Filmy', icon: ListVideo },
    { id: 'notes', label: 'Notatki', icon: Eye },
  ]

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* ===== Sticky premium header ===== */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-5 bg-[#06070d]/60 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#c084fc] opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#a855f7]" />
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-violet-300/70">Coach · Przestrzeń sesji</span>
              </div>
              <h1 className="font-display text-3xl sm:text-[2.6rem] font-bold leading-tight text-gradient-violet">
                Sesje
              </h1>
              <p className="text-sm text-white/50 max-w-xl">
                Zarządzaj sesjami coachingowymi dla swoich uczniów. Twórz, edytuj i analizuj każde spotkanie.
              </p>
            </div>
            <button
              onClick={openAddDialog}
              className="shimmer-line group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-2xl px-6 text-sm font-semibold text-white shadow-[0_8px_40px_-10px_rgba(168,85,247,0.55)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)' }}
            >
              <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />
              <Plus className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              <span className="relative">Nowa sesja</span>
            </button>
          </div>
        </div>

        {/* ===== Search + segmented status pills ===== */}
        <div className="mt-8 space-y-4 rise-in">
          {/* Search */}
          <div className="relative group">
            <div className="glass-liquid spotlight rounded-2xl flex items-center gap-2 pl-4 pr-2 h-14" onMouseMove={handleCardMouse}>
              <Filter className="h-4 w-4 shrink-0 text-violet-300/70" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj sesji, ucznia lub e-mailu..."
                className="w-full h-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="shrink-0 grid place-items-center h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Wyczyść"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span className="shrink-0 grid place-items-center h-10 w-10 rounded-xl text-white/30">
                  <Search className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>

          {/* Segmented status pills */}
          <div className="glass-liquid rounded-2xl p-1.5 flex flex-wrap gap-1">
            {STATUS_FILTERS.map((f) => {
              const active = statusFilter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-300',
                    active ? 'text-white' : 'text-white/55 hover:text-white/85'
                  )}
                >
                  {active && (
                    <span
                      className="absolute inset-0 rounded-xl ring-1 ring-inset"
                      style={{ background: `linear-gradient(135deg, ${f.color}40 0%, ${f.color}10 100%)`, borderColor: `${f.color}55`, boxShadow: `0 0 24px -6px ${f.color}99` }}
                    />
                  )}
                  <span
                    className="relative h-1.5 w-1.5 rounded-full transition-transform duration-300"
                    style={{ background: f.color, boxShadow: active ? `0 0 10px ${f.color}` : 'none', transform: active ? 'scale(1.2)' : 'scale(1)' }}
                  />
                  <span className="relative">{f.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ===== Sessions grid ===== */}
        {filteredSessions.length === 0 ? (
          <div className="mt-8 rise-in">
            <div className="glass-liquid spotlight rounded-3xl p-12 text-center" onMouseMove={handleCardMouse}>
              <div className="mx-auto mb-5 grid place-items-center h-20 w-20 rounded-3xl bg-gradient-to-br from-[#c084fc]/15 to-[#7c3aed]/5 ring-1 ring-inset ring-[#c084fc]/20">
                {search || statusFilter !== 'all' ? (
                  <Search className="h-9 w-9 text-violet-300/70" />
                ) : (
                  <ListVideo className="h-9 w-9 text-violet-300/70" />
                )}
              </div>
              {search || statusFilter !== 'all' ? (
                <p className="text-white/60 text-sm">Nie znaleziono sesji spełniających kryteria.</p>
              ) : (
                <>
                  <h3 className="font-display text-lg font-semibold text-gradient-violet">Brak sesji</h3>
                  <p className="mt-1.5 text-sm text-white/50 mb-6">Nie masz jeszcze żadnych sesji. Stwórz pierwszą już teraz.</p>
                  <button
                    onClick={openAddDialog}
                    className="shimmer-line group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-2xl px-5 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)' }}
                  >
                    <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />
                    <Plus className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                    <span className="relative">Utwórz pierwszą sesję</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSessions.map((session, idx) => {
              const pill = statusPillFor(session.status)
              return (
                <article
                  key={session.id}
                  onMouseMove={handleCardMouse}
                  className={cn(
                    'glass-liquid spotlight shimmer-line tilt-hover group relative flex flex-col rounded-3xl p-5',
                    'hover:border-[#c084fc]/25',
                    'rise-in'
                  )}
                  style={{ animationDelay: `${Math.min(idx, 8) * 70}ms` }}
                >
                  {/* Top row: title + status pill */}
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                        <span className="h-1 w-1 rounded-full bg-[#a855f7]" />
                        Sesja
                      </div>
                      <h3 className="font-display text-lg font-bold leading-snug text-white/90 transition-colors duration-300 group-hover:text-gradient-violet group-hover:text-transparent">
                        {session.title}
                      </h3>
                    </div>
                    <span className={cn(
                      'shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset',
                      pill.bg, pill.text, pill.ring
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', pill.dot)} />
                      {STATUS_LABELS[session.status] || session.status}
                    </span>
                  </div>

                  {/* Student row */}
                  <div className="relative mt-4 flex items-center gap-3">
                    <div className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-[#c084fc]/20 to-[#7c3aed]/10 ring-1 ring-inset ring-white/10 overflow-hidden">
                      {session.student.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={session.student.avatarUrl} alt={session.student.name || ''} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-violet-200">{getInitials(session.student.name || 'U')}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-xs text-white/45">
                        <BookOpen className="h-3 w-3" />
                        <span>Uczeń</span>
                      </div>
                      <p className="truncate text-sm font-medium text-white/85">
                        {session.student.name || session.student.email}
                      </p>
                    </div>
                  </div>

                  {/* Date pill */}
                  {session.scheduledAt && (
                    <div className="relative mt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] px-2.5 py-1.5 text-xs text-white/70">
                        <Calendar className="h-3.5 w-3.5 text-violet-300/80" />
                        {formatDateTime(session.scheduledAt)}
                      </span>
                    </div>
                  )}

                  {/* Tags */}
                  {session.tags.length > 0 && (
                    <div className="relative mt-3 flex flex-wrap gap-1.5">
                      {session.tags.slice(0, 4).map((t) => (
                        <span
                          key={t.tag.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] px-2 py-1 text-[11px] text-white/70"
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', getTagDot(t.tag.color))} />
                          {t.tag.name}
                        </span>
                      ))}
                      {session.tags.length > 4 && (
                        <span className="inline-flex items-center rounded-lg bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] px-2 py-1 text-[11px] text-white/45">
                          +{session.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="relative flex-1" />

                  {/* Stats row */}
                  <div className="relative mt-5 flex items-center gap-4 text-xs text-white/50">
                    <span className="inline-flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-violet-300/70" />
                      {session.videos.length} filmów
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-violet-300/70" />
                      {session.tags.length} tagów
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5 text-white/35">
                      {formatDate(session.createdAt)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="relative my-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                  {/* Action row */}
                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={() => openEditDialog(session)}
                      className="grid place-items-center h-10 w-10 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] text-white/60 hover:text-white hover:ring-[#c084fc]/25 hover:bg-[#c084fc]/10 transition-all duration-300"
                      aria-label="Edytuj"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <Link
                      href={`/coach/sessions/${session.id}`}
                      className="shimmer-line group/btn relative inline-flex h-10 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold text-white shadow-[0_6px_24px_-10px_rgba(168,85,247,0.6)] transition-transform duration-300 hover:scale-[1.01] active:scale-[0.99]"
                      style={{ background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)' }}
                    >
                      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15" />
                      <span className="relative inline-flex items-center gap-2">
                        Otwórz
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                      </span>
                    </Link>

                    <button
                      onClick={() => handleDelete(session.id)}
                      className="grid place-items-center h-10 w-10 rounded-xl bg-transparent ring-1 ring-inset ring-rose-400/15 text-rose-300/70 hover:text-rose-200 hover:bg-rose-400/10 hover:ring-rose-400/30 transition-all duration-300"
                      aria-label="Usuń sesję"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Hint "Zobacz szczegóły" */}
                  <Link
                    href={`/coach/sessions/${session.id}`}
                    className="sr-only"
                  >
                    <Eye className="h-4 w-4" /> Zobacz szczegóły
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== New-session / edit dialog ===== */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#06070d]/80 backdrop-blur-md"
            onClick={() => !isLoading && setDialogOpen(false)}
            aria-hidden
          />
          {/* Modal */}
          <div className="relative w-full max-w-3xl mt-4 rise-in">
            <div className="glass-liquid rounded-3xl overflow-hidden">
              {/* Modal header */}
              <div className="relative px-6 sm:px-8 pt-6 pb-5 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-violet-300/70">
                      <span className="h-1 w-1 rounded-full bg-[#a855f7]" />
                      {editingSession ? 'Edycja sesji' : 'Zakładanie sesji'}
                    </div>
                    <h2 className="font-display text-2xl font-bold text-gradient-violet">
                      {editingSession ? 'Edytuj sesję' : 'Nowa sesja treningowa'}
                    </h2>
                  </div>
                  <button
                    onClick={() => !isLoading && setDialogOpen(false)}
                    className="grid place-items-center h-10 w-10 rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                    aria-label="Zamknij"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6">
                {/* Premium segmented tabs */}
                <div className="relative mb-6 grid grid-cols-4 gap-1 glass-liquid rounded-2xl p-1.5">
                  {TABS.map((t) => {
                    const active = activeTab === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                          'relative inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-300',
                          active ? 'text-white' : 'text-white/55 hover:text-white/85'
                        )}
                      >
                        {active && (
                          <span
                            className="absolute inset-0 rounded-xl ring-1 ring-inset"
                            style={{ background: 'linear-gradient(135deg, #c084fc33 0%, #7c3aed1a 100%)', borderColor: '#c084fc55', boxShadow: '0 0 20px -6px #a855f7' }}
                          />
                        )}
                        <t.icon className="relative h-3.5 w-3.5" />
                        <span className="relative">{t.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* === Details tab === */}
                {activeTab === 'details' && (
                  <div className="space-y-5 rise-in">
                    <div>
                      <label htmlFor="title" className="block mb-2 text-sm font-medium text-white/80">Tytuł sesji <span className="text-violet-400">*</span></label>
                      <div className="relative">
                        <BookOpen className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300/60" />
                        <input
                          id="title"
                          placeholder="np. Analiza demka z 15.01"
                          value={formData.title}
                          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                          required
                          disabled={isLoading}
                          className="h-12 w-full rounded-xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/25 focus:border-[#a855f7]/40 transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="student" className="block mb-2 text-sm font-medium text-white/80">Uczeń <span className="text-violet-400">*</span></label>
                      <div className="relative">
                        <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300/60 z-10" />
                        <select
                          id="student"
                          value={formData.studentId}
                          onChange={(e) => setFormData((prev) => ({ ...prev, studentId: e.target.value }))}
                          disabled={isLoading || !!editingSession}
                          required
                          className="h-12 w-full appearance-none rounded-xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] pl-11 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]/25 focus:border-[#a855f7]/40 transition-all duration-300 disabled:opacity-50"
                        >
                          <option value="" className="bg-[#0b0c16]">Wybierz ucznia</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id} className="bg-[#0b0c16]">
                              {s.name || s.email}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">▾</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="description" className="block mb-2 text-sm font-medium text-white/80">Opis sesji</label>
                      <textarea
                        id="description"
                        placeholder="Cel sesji, uwagi wstępne..."
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        disabled={isLoading}
                        className="w-full rounded-xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/25 focus:border-[#a855f7]/40 transition-all duration-300 resize-none"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="scheduledAt" className="block mb-2 text-sm font-medium text-white/80">Data sesji</label>
                        <div className="relative">
                          <Calendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-300/60" />
                          <input
                            id="scheduledAt"
                            type="datetime-local"
                            value={formData.scheduledAt}
                            onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                            disabled={isLoading}
                            className="h-12 w-full rounded-xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] pl-11 pr-4 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/25 focus:border-[#a855f7]/40 transition-all duration-300 [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="status" className="block mb-2 text-sm font-medium text-white/80">Status</label>
                        <div className="relative">
                          <select
                            id="status"
                            value={formData.status}
                            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                            disabled={isLoading}
                            className="h-12 w-full appearance-none rounded-xl bg-white/[0.04] backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] px-4 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#a855f7]/25 focus:border-[#a855f7]/40 transition-all duration-300 disabled:opacity-50"
                          >
                            <option value="DRAFT" className="bg-[#0b0c16]">Szkic</option>
                            <option value="ACTIVE" className="bg-[#0b0c16]">Aktywna</option>
                            <option value="COMPLETED" className="bg-[#0b0c16]">Zakończona</option>
                            <option value="ARCHIVED" className="bg-[#0b0c16]">Zarchiwizowana</option>
                          </select>
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">▾</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* === Tags tab === */}
                {activeTab === 'tags' && (
                  <div className="space-y-4 rise-in">
                    <p className="text-sm text-white/50">Wybierz tagi błędów do tej sesji. Możesz dodać notatkę do każdego tagu po zapisaniu.</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const selected = formData.tagIds.includes(tag.id)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-300 ring-1 ring-inset',
                              selected
                                ? 'bg-[#c084fc]/15 ring-[#c084fc]/40 text-violet-100 shadow-[0_0_18px_-6px_#a855f7]'
                                : 'bg-white/[0.03] ring-white/[0.06] text-white/60 hover:text-white hover:ring-white/[0.12]'
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 rounded-full', getTagDot(tag.color))} />
                            {tag.name}
                            {selected && <X className="h-3 w-3 opacity-60" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* === Videos tab === */}
                {activeTab === 'videos' && (
                  <div className="space-y-4 rise-in">
                    <p className="text-sm text-white/50">Wybierz filmy do przypisania do tej sesji. System zaproponuje filmy na podstawie tagów.</p>
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                      {videos.map((video) => {
                        const selected = formData.videoIds.includes(video.id)
                        return (
                          <label
                            key={video.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ring-1 ring-inset',
                              selected
                                ? 'bg-[#c084fc]/10 ring-[#c084fc]/30'
                                : 'bg-white/[0.03] ring-white/[0.06] hover:bg-white/[0.05]'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleVideo(video.id)}
                              className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#a855f7] focus:ring-[#a855f7]/40 focus:ring-2"
                            />
                            <div className="grid place-items-center h-9 w-9 rounded-lg bg-gradient-to-br from-[#c084fc]/20 to-[#7c3aed]/5 ring-1 ring-inset ring-white/10">
                              <Video className="h-4 w-4 text-violet-300/80" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-white/85 text-sm">{video.title}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* === Notes tab === */}
                {activeTab === 'notes' && (
                  <div className="space-y-4 rise-in">
                    <p className="text-sm text-white/50">Notatki do sesji zostaną dodane po utworzeniu.</p>
                    <div className="glass-liquid rounded-2xl p-5 text-center">
                      <Eye className="h-8 w-8 mx-auto mb-2 text-violet-300/60" />
                      <p className="text-xs text-white/45">Po zapisaniu sesji będziesz mógł dodawać notatki do każdego tagu i filmu.</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-7 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    disabled={isLoading}
                    className="h-11 inline-flex items-center gap-1.5 rounded-xl px-5 text-sm font-medium text-white/65 bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-50"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="shimmer-line relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-sm font-semibold text-white shadow-[0_8px_30px_-10px_rgba(168,85,247,0.6)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)' }}
                  >
                    <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15" />
                    {isLoading ? (
                      <Loader2 className="relative h-4 w-4 animate-spin" />
                    ) : null}
                    <span className="relative">{editingSession ? 'Zapisz' : 'Utwórz sesję'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </CoachLayout>
  )
}
