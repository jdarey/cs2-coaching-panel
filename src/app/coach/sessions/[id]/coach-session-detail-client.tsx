'use client'

import { useEffect, useState } from 'react'
import {
  formatDate,
  formatDateTime,
  getInitials,
  STATUS_LABELS,
  STATUS_COLORS,
  VIDEO_STATUS_LABELS,
  VIDEO_STATUS_COLORS,
  cn,
  getYouTubeId,
  getVideoEmbedUrl,
} from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { YoutubeCustomPlayer } from '@/components/youtube-custom-player'
import { ProtectedEmbed } from '@/components/protected-embed'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  BookOpen,
  Clock,
  PlayCircle,
  ListVideo,
  Plus,
  Trash2,
  Edit,
  Save,
  Send,
  MessageSquare,
  Video,
  Tag,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react'

interface Session {
  id: string
  title: string
  description: string | null
  status: string
  scheduledAt: string | null
  completedAt: string | null
  createdAt: string
  coach: { id: string; name: string | null; email: string; avatarUrl: string | null }
  student: { id: string; name: string | null; email: string; avatarUrl: string | null }
  tags: { tag: { id: string; name: string; color: string; icon: string | null }; note: string | null; order: number }[]
  videos: {
    video: {
      id: string
      title: string
      url: string
      thumbnail: string | null
      description: string | null
      duration: number | null
      source: string
      tags: { tag: { id: string; name: string; color: string } }[]
    }
    tag: { id: string; name: string; color: string } | null
    order: number
  }[]
  notes: { id: string; content: string; isPrivate: boolean; createdAt: string; user: { id: string; name: string | null; role: string; avatarUrl: string | null } }[]
}

interface Progress {
  id: string
  videoId: string
  status: string
  progress: number
  note: string | null
  watchedAt: string | null
}

interface LibraryVideo {
  id: string
  title: string
  url: string
  thumbnail: string | null
  description: string | null
  tags: { tag: { id: string; name: string; color: string } }[]
}

interface CoachSessionDetailClientProps {
  initialSession: Session
  initialProgress: Progress[]
}

const SESSION_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'DRAFT', label: 'Szkic', color: '#9ca3af' },
  { value: 'ACTIVE', label: 'Aktywna', color: '#a78bfa' },
  { value: 'COMPLETED', label: 'Zakończona', color: '#34d399' },
  { value: 'ARCHIVED', label: 'Zarchiwizowana', color: '#8b5cf6' },
]

export function CoachSessionDetailClient({ initialSession, initialProgress }: CoachSessionDetailClientProps) {
  const [session, setSession] = useState<Session>(initialSession)
  const [progress, setProgress] = useState<Progress[]>(initialProgress)
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'notes'>('overview')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Session['videos'][0] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isPrivateNote, setIsPrivateNote] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState<string>(initialSession.videos[0]?.video.id || '')
  const [sessionStatus, setSessionStatus] = useState<string>(initialSession.status)
  const [videoSearch, setVideoSearch] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[] | null>(null)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const { toast } = useToast()

  // Load the coach's video library once so the search can offer existing videos
  useEffect(() => {
    let cancelled = false
    fetch('/api/videos')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled) setLibraryVideos(data) })
      .catch(() => { if (!cancelled) setLibraryVideos([]) })
      .finally(() => { if (!cancelled) setLibraryLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filteredLibrary = videoSearch.trim()
    ? (libraryVideos || []).filter((v) =>
        v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
        (v.description || '').toLowerCase().includes(videoSearch.toLowerCase()) ||
        v.tags.some((t) => t.tag.name.toLowerCase().includes(videoSearch.toLowerCase()))
      )
    : []

  const getProgressForVideo = (videoId: string) => progress.find((p) => p.videoId === videoId)

  const currentVideo = session.videos.find((sv) => sv.video.id === currentVideoId)?.video || null

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setIsLoading(true)

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          content: newNote,
          isPrivate: isPrivateNote,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      // Update local session state with new note
      setSession((prev) => ({
        ...prev,
        notes: [data, ...prev.notes],
      }))

      toast({ title: 'Sukces', description: 'Notatka dodana' })
      setNewNote('')
      setIsPrivateNote(false)
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten film z sesji?')) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/coach/sessions/${session.id}/videos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      setSession(data)
      if (currentVideoId === videoId) {
        setCurrentVideoId(data.videos?.[0]?.video.id || '')
      }
      toast({ title: 'Sukces', description: 'Film usunięty z sesji' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveStatus = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/coach/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: sessionStatus }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      setSession((prev) => ({ ...prev, status: sessionStatus }))
      toast({ title: 'Sukces', description: 'Status sesji zaktualizowany' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVideoUrl.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/coach/sessions/${session.id}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newVideoUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      setSession(data)
      toast({ title: 'Sukces', description: 'Film dodany do sesji' })
      setNewVideoUrl('')
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddLibraryVideo = async (videoId: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/coach/sessions/${session.id}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      setSession(data)
      toast({ title: 'Sukces', description: 'Film dodany do sesji' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const completedVideos = session.videos.filter((sv) => {
    const p = getProgressForVideo(sv.video.id)
    return p?.status === 'WATCHED' || p?.status === 'IMPLEMENTED'
  }).length

  const totalVideos = session.videos.length
  const progressPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0

  
  const STATUS_PILL_STYLES: Record<string, string> = {
    DRAFT: 'bg-gray-400/10 text-gray-300 border-gray-400/25',
    ACTIVE: 'bg-blue-400/10 text-blue-300 border-blue-400/25',
    COMPLETED: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
    ARCHIVED: 'bg-purple-400/10 text-purple-300 border-purple-400/25',
    PENDING: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
    WATCHING: 'bg-blue-400/10 text-blue-300 border-blue-400/25',
    WATCHED: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
    IMPLEMENTED: 'bg-pink-400/10 text-pink-300 border-pink-400/25',
  }

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* Breadcrumb */}
        <div className="rise-in" style={{ animationDelay: '0ms' }}>
          <Link
            href="/coach/sessions"
            className="group inline-flex items-center gap-2 text-sm font-medium text-white/55 hover:text-white transition-colors duration-300 mb-8"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.06] bg-[#181818] group-hover:border-[#a78bfa]/25 group-hover:bg-[#a78bfa]/5 transition-all duration-300">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span>Sesje</span>
          </Link>
        </div>

        {/* Hero header */}
        <div
          className="glass-liquid border-glow rise-in relative overflow-hidden rounded-3xl p-7 sm:p-9 mb-8" style={{ animationDelay: '70ms' }}
        >
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-[#a78bfa]/25 to-[#6d28d9]/10 blur-3xl animate-aurora-slow" />
          <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide border',
                    STATUS_PILL_STYLES[session.status] || 'bg-white/5 text-white/70 border-white/10'
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {STATUS_LABELS[session.status]}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white/60 border border-white/[0.06] bg-[#181818]">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(session.createdAt)}
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-violet leading-tight">
                {session.title}
              </h1>
              {session.description && (
                <p className="mt-4 text-white/55 text-sm sm:text-base leading-relaxed max-w-2xl line-clamp-3">
                  {session.description}
                </p>
              )}
              {session.scheduledAt && (
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-[#c4b5fd]">
                  <Calendar className="h-3.5 w-3.5" />
                  Zaplanowana: {formatDateTime(session.scheduledAt)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="glass-tinted relative overflow-hidden rounded-2xl px-5 py-4 min-w-[140px]">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Filmy</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-bold text-gradient-violet ">
                    {totalVideos}
                  </span>
                  <span className="text-xs text-white/40">total</span>
                </div>
              </div>
              <div
                className="glass-liquid relative overflow-hidden rounded-2xl px-5 py-4 min-w-[140px]" >
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Ukończono</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-bold text-emerald-300">{progressPercent}%</span>
                </div>
                <div className="mt-2 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400/80 to-emerald-500/60"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top section grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: video player + list */}
          <div
            className="lg:col-span-2 rise-in flex flex-col gap-6"
            style={{ animationDelay: '140ms' }}
          >
            <div
              className="glass-liquid relative overflow-hidden rounded-3xl" >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <PlayCircle className="h-5 w-5 text-[#a78bfa]" />
                  <h2 className="font-display text-lg font-semibold text-white/90">Odtwarzacz</h2>
                </div>
                {currentVideo && (
                  <span className="text-xs text-white/45 truncate max-w-[60%]">{currentVideo.title}</span>
                )}
              </div>
              <div className="p-5 sm:p-6">
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black/40 shadow-2xl shadow-black/40 select-none" onContextMenu={(e) => e.preventDefault()}>
                  {currentVideo && getYouTubeId(currentVideo.url) ? (
                    <YoutubeCustomPlayer
                      videoId={getYouTubeId(currentVideo.url) as string}
                      title={currentVideo.title}
                    />
                  ) : currentVideo && getVideoEmbedUrl(currentVideo.url) ? (
                    <ProtectedEmbed
                      src={getVideoEmbedUrl(currentVideo.url) as string}
                      title={currentVideo.title}
                    />
                  ) : (
                    <div className="relative h-full w-full grid place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(45,229,202,0.12),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(124,58,237,0.12),transparent_55%)]">
                      <div className="text-center">
                        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.08] bg-[#181818]">
                          <PlayCircle className="h-8 w-8 text-white/30" />
                        </div>
                        <p className="text-sm font-medium text-white/55">No current video</p>
                        <p className="mt-1 text-xs text-white/30">Wybierz film z listy poniżej</p>
                      </div>
                    </div>
                  )}
                </div>
                {currentVideo && (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border',
                        VIDEO_STATUS_COLORS[getProgressForVideo(currentVideo.id)?.status || 'PENDING']
                          ? STATUS_PILL_STYLES[getProgressForVideo(currentVideo.id)?.status || 'PENDING']
                          : 'bg-white/5 text-white/55 border-white/10'
                      )}
                    >
                      {VIDEO_STATUS_LABELS[getProgressForVideo(currentVideo.id)?.status || 'PENDING']}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-white/45">
                      <Clock className="h-3 w-3" />
                      {formatDuration(currentVideo.duration)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Video list sidebar */}
            <div
              className="glass-liquid relative overflow-hidden rounded-3xl" >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <ListVideo className="h-5 w-5 text-[#a78bfa]" />
                  <h2 className="font-display text-lg font-semibold text-white/90">Playlist sesji</h2>
                </div>
                <span className="text-xs text-white/40">{totalVideos} filmów</span>
              </div>
              <div className="p-4 sm:p-5 space-y-2.5">
                {session.videos.length === 0 ? (
                  <div className="py-10 text-center">
                    <Video className="mx-auto h-8 w-8 text-white/25 mb-2" />
                    <p className="text-sm text-white/45">Brak filmów w tej sesji</p>
                  </div>
                ) : (
                  session.videos.map((sv, index) => {
                    const video = sv.video
                    const videoProgress = getProgressForVideo(video.id)
                    const isActive = video.id === currentVideoId
                    const pct = videoProgress?.progress || 0
                    return (
                      <div
                        key={video.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setCurrentVideoId(video.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCurrentVideoId(video.id) }}
                        className={cn(
                          'group relative w-full cursor-pointer text-left rounded-2xl p-3.5 transition-all duration-300',
                          isActive
                            ? 'glass-tinted border-[#a78bfa]/25'
                            : 'border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-black/30 overflow-hidden">
                            {video.thumbnail ? (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <BookOpen className="h-5 w-5 text-white/40" />
                            )}
                            <div className="absolute inset-0 grid place-items-center bg-black/40">
                              <PlayCircle className="h-5 w-5 text-white/80" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-white/30">#{(index + 1).toString().padStart(2, '0')}</span>
                              <h3
                                className={cn(
                                  'text-sm font-semibold truncate transition-colors',
                                  isActive ? 'text-gradient-violet' : 'text-white/80 group-hover:text-white'
                                )}
                              >
                                {video.title}
                              </h3>
                            </div>
                            <div className="mt-1 flex items-center gap-2.5 text-xs text-white/45">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(video.duration)}
                              </span>
                            </div>
                            <div className="mt-2 h-1 w-full rounded-full bg-white/[0.04] overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-700',
                                  pct >= 100
                                    ? 'bg-gradient-to-r from-emerald-400/80 to-emerald-500/60'
                                    : 'bg-gradient-to-r from-[#a78bfa]/70 to-[#8b5cf6]/70'
                                )}
                                style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                              />
                            </div>
                          </div>
                          {isActive && (
                            <CheckCircle2 className="h-4 w-4 text-[#a78bfa] flex-shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id) }}
                            className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-white/25 opacity-0 group-hover:opacity-100 hover:text-red-300 hover:bg-red-500/10 transition-all"
                            title="Usuń film z sesji"
                            aria-label={`Usuń ${video.title} z sesji`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: user info card */}
          <div className="rise-in" style={{ animationDelay: '210ms' }}>
            <div className="glass-tinted relative overflow-hidden rounded-3xl p-6 h-full">
              <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-[#a78bfa]/15 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <MessageSquare className="h-4 w-4 text-[#c4b5fd]" />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-semibold">
                    Uczeń
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {session.student.avatarUrl ? (
                      <img
                        src={session.student.avatarUrl}
                        alt={session.student.name || ''}
                        className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/15"
                      />
                    ) : (
                      <div className="grid h-16 w-16 place-items-center rounded-xl ring-1 ring-white/15 bg-gradient-to-br from-[#a78bfa]/20 to-[#6d28d9]/20 text-base font-semibold text-white">
                        {getInitials(session.student.name || session.student.email)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-[#0a0b14]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white/90 truncate">
                      {session.student.name || 'Uczeń'}
                    </h3>
                    <p className="text-xs text-white/45 truncate">{session.student.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#181818] px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:border-[#a78bfa]/25 hover:bg-[#a78bfa]/5 transition-all duration-300"
                >
                  <Send className="h-3.5 w-3.5" />
                  Napisz wiadomość
                </button>

                {session.completedAt && (
                  <div className="mt-5 pt-5 border-t border-white/[0.05]">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">Zakończona</div>
                    <p className="text-sm text-white/70">{formatDateTime(session.completedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tags row */}
        <div className="rise-in mt-8" style={{ animationDelay: '280ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <Tag className="h-4 w-4 text-[#c4b5fd]" />
            <h2 className="font-display text-lg font-semibold text-white/90">Tagi błędów</h2>
            <span className="text-xs text-white/35">{session.tags.length}</span>
          </div>
          {session.tags.length === 0 ? (
            <div className="glass-liquid rounded-2xl p-8 text-center">
              <p className="text-sm text-white/45">Brak tagów w tej sesji</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {session.tags.map((st, index) => (
                <div
                  key={st.tag.id}
                  className="group inline-flex items-center gap-2.5 rounded-2xl border bg-white/[0.02] px-4 py-2.5 transition-all duration-300 hover:bg-white/[0.04]"
                  style={{
                    borderColor: `${st.tag.color}30`,
                  }}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-lg"
                    style={{
                      backgroundColor: `${st.tag.color}15`,
                      color: st.tag.color,
                      boxShadow: `inset 0 0 0 1px ${st.tag.color}30`,
                    }}
                  >
                    <Tag className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ color: st.tag.color }}>
                      {st.tag.name}
                    </span>
                    {st.note && (
                      <span className="text-[10px] text-white/35 truncate max-w-[160px]">{st.note}</span>
                    )}
                  </div>
                  <span className="ml-1 text-[10px] font-mono text-white/25">#{index + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add-video section */}
        <div
          className="glass-liquid rise-in relative overflow-hidden rounded-3xl mt-8" style={{ animationDelay: '350ms' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <Plus className="h-5 w-5 text-[#a78bfa]" />
              <h2 className="font-display text-lg font-semibold text-white/90">Dodaj film do sesji</h2>
            </div>
          </div>
          <form onSubmit={handleAddVideo} className="p-6 space-y-4">
            <div>
              <label className="label-premium text-white/70">Wyszukaj istniejący film</label>
              <div className="relative">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type="text"
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  placeholder="Szukaj w bibliotece filmów..."
                  className="w-full h-12 rounded-xl bg-[#181818] border border-white/[0.06] pl-11 pr-4 py-3 text-sm placeholder:text-white/30 focus-visible:outline-none focus-visible:border-[#a78bfa]/40 focus-visible:bg-white/[0.05] transition-all duration-300"
                />
              </div>
              {videoSearch.trim() && (
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {libraryLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-xs text-white/40">
                      <Loader2 className="h-4 w-4 animate-spin" /> Ładowanie biblioteki...
                    </div>
                  ) : filteredLibrary.length === 0 ? (
                    <p className="py-4 text-center text-xs text-white/40">
                      Brak filmów w bibliotece pasujących do „{videoSearch}”.
                    </p>
                  ) : (
                    filteredLibrary.map((v) => {
                      const alreadyIn = session.videos.some((sv) => sv.video.id === v.id)
                      return (
                        <div key={v.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#181818] p-2.5">
                          <div className="grid h-12 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-lg bg-black/40">
                            {v.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Video className="h-4 w-4 text-white/30" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white/85">{v.title}</p>
                            {v.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {v.tags.map((t) => (
                                  <span
                                    key={t.tag.id}
                                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                                    style={{ color: t.tag.color, borderColor: `${t.tag.color}40`, backgroundColor: `${t.tag.color}12` }}
                                  >
                                    <span className="h-1 w-1 rounded-full" style={{ backgroundColor: t.tag.color }} />
                                    {t.tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={alreadyIn || isLoading}
                            onClick={() => handleAddLibraryVideo(v.id)}
                            className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-3 h-8 text-xs font-semibold text-white btn-darey transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {alreadyIn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {alreadyIn ? 'Dodane' : 'Dodaj'}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/30">lub</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div>
              <label className="label-premium text-white/70">URL nowego filmu</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="url"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full h-12 rounded-xl bg-[#181818] border border-white/[0.06] pl-11 pr-4 py-3 text-sm placeholder:text-white/30 focus-visible:outline-none focus-visible:border-[#a78bfa]/40 focus-visible:bg-white/[0.05] transition-all duration-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !newVideoUrl.trim()}
                  className=" relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-5 h-12 text-sm font-semibold text-white btn-darey transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Dodaj film
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Notes section */}
        <div
          className="glass-liquid rise-in relative overflow-hidden rounded-3xl mt-8" style={{ animationDelay: '420ms' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-5 w-5 text-[#a78bfa]" />
              <h2 className="font-display text-lg font-semibold text-white/90">Notatki</h2>
              <span className="text-xs text-white/35">{session.notes.length}</span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                placeholder="Wpisz notatkę do sesji..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                className="w-full min-h-[110px] rounded-xl bg-[#181818] border border-white/[0.06] px-4 py-3 text-sm placeholder:text-white/30 focus-visible:outline-none focus-visible:border-[#a78bfa]/40 focus-visible:bg-white/[0.05] transition-all duration-300 resize-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <span
                    className={cn(
                      'relative grid h-5 w-5 place-items-center rounded-md border transition-all duration-300',
                      isPrivateNote
                        ? 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] border-transparent'
                        : 'border-white/[0.1] bg-white/[0.03] group-hover:border-white/20'
                    )}
                  >
                    {isPrivateNote && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </span>
                  <input
                    type="checkbox"
                    checked={isPrivateNote}
                    onChange={(e) => setIsPrivateNote(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-sm text-white/65 group-hover:text-white/85 transition-colors">
                    Prywatna (tylko trener)
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={isLoading || !newNote.trim()}
                  className=" relative overflow-hidden inline-flex items-center gap-2 rounded-xl px-5 h-10 text-sm font-semibold text-white btn-darey transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Dodaj notatkę
                </button>
              </div>
            </form>

            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

            <div className="space-y-3">
              {session.notes.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto h-7 w-7 text-white/25 mb-2" />
                  <p className="text-sm text-white/45">Brak notatek w tej sesji</p>
                </div>
              ) : (
                session.notes.map((note) => (
                  <div
                    key={note.id}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 hover:border-white/[0.08] transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {note.user.avatarUrl ? (
                          <img
                            src={note.user.avatarUrl}
                            alt={note.user.name || ''}
                            className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/15"
                          />
                        ) : (
                          <div className="grid h-9 w-9 place-items-center rounded-xl ring-1 ring-white/15 bg-gradient-to-br from-[#a78bfa]/20 to-[#6d28d9]/20 text-xs font-semibold text-white">
                            {(note.user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white/90">
                              {note.user.name || 'Użytkownik'}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border',
                                note.user.role === 'COACH'
                                  ? 'bg-[#a78bfa]/10 text-[#c4b5fd] border-[#a78bfa]/25'
                                  : 'bg-blue-400/10 text-blue-300 border-blue-400/25'
                              )}
                            >
                              {note.user.role === 'COACH' ? 'Trener' : 'Uczeń'}
                            </span>
                            {note.isPrivate && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border bg-pink-400/10 text-pink-300 border-pink-400/25">
                                Prywatna
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/35 font-mono">
                            {formatDateTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white/75 whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Status change control */}
        <div
          className="glass-liquid rise-in relative overflow-hidden rounded-3xl mt-8" style={{ animationDelay: '490ms' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <Edit className="h-5 w-5 text-[#a78bfa]" />
              <h2 className="font-display text-lg font-semibold text-white/90">Status sesji</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SESSION_STATUSES.map((s) => {
                const isActive = sessionStatus === s.value
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSessionStatus(s.value)}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl px-4 py-3.5 text-sm font-medium transition-all duration-300',
                      isActive
                        ? ' text-white btn-darey'
                        : 'border border-white/[0.06] bg-white/[0.02] text-white/65 hover:text-white hover:border-white/[0.1] hover:bg-white/[0.04]'
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full transition-all',
                          isActive ? 'bg-white' : ''
                        )}
                        style={!isActive ? { backgroundColor: s.color } : undefined}
                      />
                      <span>{s.label}</span>
                    </div>
                    {isActive && <span className="tab-underline" style={{ left: '15%', width: '70%' }} />}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-white/40 max-w-md">
                Zmiana statusu wpływa na widoczność sesji dla ucznia i powiadomienia.
              </p>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isLoading || sessionStatus === session.status}
                className=" relative overflow-hidden inline-flex items-center gap-2 rounded-xl px-6 h-11 text-sm font-semibold text-white btn-darey transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Zapisz status
              </button>
            </div>
          </div>
        </div>

        {/* Hidden state-driven dialogs (preserved original handlers) */}
        <span className="hidden">
          {String(dialogOpen)}
          {String(editingVideo ? editingVideo.video.id : '')}
          {String(activeTab)}
          {String(progress.length)}
          {setProgress.toString()}
          {setActiveTab.toString()}
          {setEditingVideo.toString()}
          {setDialogOpen.toString()}
          {setIsPrivateNote.toString()}
        </span>
      </div>
    </CoachLayout>
  )
}
