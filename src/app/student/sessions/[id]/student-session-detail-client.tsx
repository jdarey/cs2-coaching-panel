'use client'

import { useState } from 'react'
import {
  formatDate,
  formatDateTime,
  getInitials,
  STATUS_LABELS,
  STATUS_COLORS,
  VIDEO_STATUS_LABELS,
  VIDEO_STATUS_COLORS,
  cn,
  getVideoId,
  getVideoEmbedUrl,
} from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  BookOpen,
  PlayCircle,
  Clock,
  CheckCircle2,
  MessageSquare,
  Calendar,
  Send,
  ListVideo,
  Eye,
  EyeOff,
  Lock,
  ExternalLink,
  Play,
  Loader2,
  Target,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

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

interface StudentSessionDetailClientProps {
  initialSession: Session
  initialProgress: Progress[]
}

const SECTION_TABS = [
  { key: 'overview', label: 'Przegląd', icon: ListVideo },
  { key: 'videos', label: 'Filmy', icon: PlayCircle },
  { key: 'notes', label: 'Notatki', icon: MessageSquare },
] as const

export function StudentSessionDetailClient({ initialSession, initialProgress }: StudentSessionDetailClientProps) {
  const [session, setSession] = useState<Session>(initialSession)
  const [progress, setProgress] = useState<Progress[]>(initialProgress)
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'notes'>('overview')
  const [activeVideoId, setActiveVideoId] = useState<string | null>(
    initialSession.videos[0]?.video.id ?? null,
  )
  const [videoProgressDialog, setVideoProgressDialog] = useState<{ video: Session['videos'][0]; progress: Progress | undefined } | null>(null)
  const [newNote, setNewNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const getProgressForVideo = (videoId: string) => progress.find((p) => p.videoId === videoId)

  
  const handleProgressChange = async (videoId: string, status: Progress['status'], progressValue: number, note?: string) => {
    setIsLoading(true)

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          sessionId: session.id,
          status,
          progress: progressValue,
          note,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setProgress((prev) => {
        const existing = prev.find((p) => p.videoId === videoId)
        if (existing) {
          return prev.map((p) => (p.videoId === videoId ? { ...p, ...data } : p))
        }
        return [...prev, data]
      })

      toast({ title: 'Zapisano', description: 'Postęp zaktualizowany' })
      setVideoProgressDialog(null)
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

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
          isPrivate: false,
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
  const completionPct = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0

  const activeVideo = session.videos.find((sv) => sv.video.id === activeVideoId)?.video ?? null
  // In-app embed: YouTube via youtube-nocookie (no tracking cookies, no
  // direct link in the address bar), Vimeo via player.vimeo.com.
  const buildEmbedUrl = (url: string) => {
    const ytId = getVideoId(url)
    if (ytId) return `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
    return getVideoEmbedUrl(url)
  }
  const activeEmbedUrl = activeVideo ? buildEmbedUrl(activeVideo.url) : null

  const statusAccent: Record<string, string> = {
    DRAFT: 'text-white/55 bg-white/[0.06] border-white/[0.10]',
    ACTIVE: 'text-[#2de5ca] bg-[#2de5ca]/10 border-[#2de5ca]/25',
    COMPLETED: 'text-[#34d399] bg-[#34d399]/10 border-[#34d399]/25',
    ARCHIVED: 'text-white/55 bg-white/[0.06] border-white/[0.10]',
    PENDING: 'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/25',
    WATCHING: 'text-[#2de5ca] bg-[#2de5ca]/10 border-[#2de5ca]/25',
    WATCHED: 'text-[#34d399] bg-[#34d399]/10 border-[#34d399]/25',
    IMPLEMENTED: 'text-[#2de5ca] bg-[#2de5ca]/10 border-[#2de5ca]/25',
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* ===== Breadcrumb ===== */}
        <Link
          href="/student/sessions"
          className="rise-in inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-white/65 hover:text-white bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do sesji
        </Link>

        {/* ===== Hero header ===== */}
        <div
          className=" relative rounded-3xl glass-liquid p-6 sm:p-8 overflow-hidden rise-in mb-8"
          style={{ animationDelay: '0.05s' }} >
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-xl',
                  statusAccent[session.status] ?? statusAccent.DRAFT,
                )}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                </span>
                {STATUS_LABELS[session.status]}
              </span>
              {session.scheduledAt && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/65 bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
                  <Calendar className="w-3.5 h-3.5 text-[#8cffef]" />
                  {formatDateTime(session.scheduledAt)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/65 bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl">
                <Clock className="w-3.5 h-3.5 text-[#8cffef]" />
                {completedVideos}/{totalVideos} • {completionPct}%
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-gradient-violet leading-tight max-w-3xl">
              {session.title}
            </h1>

            {session.description && (
              <p className="text-white/55 text-base max-w-3xl whitespace-pre-wrap leading-relaxed">
                {session.description}
              </p>
            )}
          </div>
        </div>

        {/* ===== Top row: video player (left) + coach card (right) ===== */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Video player with sidebar list */}
          <div
            className="lg:col-span-2 relative rounded-3xl glass-liquid overflow-hidden rise-in"
            style={{ animationDelay: '0.1s' }} >
            {/* Player */}
            <div
              className="relative aspect-video w-full bg-[#060606] select-none"
              onContextMenu={(e) => e.preventDefault()}
            >
              {activeEmbedUrl ? (
                <>
                  <iframe
                    src={activeEmbedUrl}
                    title={activeVideo?.title || 'Wideo'}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  {/* Watermark: ties the video to this student so a leak is traceable */}
                  <div className="pointer-events-none absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/90 bg-black/45 backdrop-blur-md ring-1 ring-white/15">
                    <Lock className="h-3.5 w-3.5 text-[#8cffef]" />
                    <span className="max-w-[180px] truncate">{session.student.name || 'Uczeń'}</span>
                  </div>
                </>
              ) : activeVideo ? (
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[0.03] to-transparent"
                >
                  <div className="relative grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#14b8a6]">
                    <Play className="w-7 h-7 text-white" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
                  </div>
                  <p className="text-white/55 text-sm">Otwórz źródło zewnętrzne</p>
                  <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-[#8cffef] transition-colors" />
                </a>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[0.03] to-transparent">
                  <div className="grid place-items-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40">
                    <PlayCircle className="w-8 h-8" />
                  </div>
                  <p className="text-white/45 text-sm">Brak filmów w tej sesji</p>
                </div>
              )}
            </div>

            {/* Active video meta */}
            {activeVideo && (
              <div className="px-5 sm:px-6 py-4 border-t border-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-white truncate">{activeVideo.title}</h3>
                    {activeVideo.description && (
                      <p className="text-sm text-white/45 mt-1 line-clamp-2">{activeVideo.description}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] flex-shrink-0 capitalize">
                    <PlayCircle className="w-3 h-3" />
                    {activeVideo.source}
                  </span>
                </div>
              </div>
            )}

            {/* Video list sidebar (inside player card) */}
            {session.videos.length > 0 && (
              <div className="px-3 sm:px-4 pb-4">
                <div className="flex items-center gap-2 px-2 pt-2 pb-3 mb-1">
                  <ListVideo className="w-4 h-4 text-[#8cffef]" />
                  <p className="text-xs uppercase tracking-wider text-white/45 font-semibold">Lista filmów</p>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {session.videos.map((sv) => {
                    const v = sv.video
                    const vp = getProgressForVideo(v.id)
                    const pct = vp?.progress ?? 0
                    const status = (vp?.status || 'PENDING') as keyof typeof VIDEO_STATUS_LABELS
                    const isActive = v.id === activeVideoId
                    return (
                      <button
                        key={v.id}
                        onClick={() => setActiveVideoId(v.id)}
                        className={cn(
                          'group relative w-full text-left rounded-2xl p-3.5 border transition-all duration-300 overflow-hidden',
                          isActive
                            ? 'glass-tinted border-[#2de5ca]/30'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'grid place-items-center w-10 h-10 rounded-xl flex-shrink-0 transition-colors',
                              isActive
                                ? 'bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] text-white'
                                : 'bg-white/[0.04] border border-white/[0.07] text-white/55 group-hover:text-[#8cffef]',
                            )}
                          >
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', isActive ? 'text-white' : 'text-white/80')}>
                              {v.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
                                <Clock className="w-3 h-3" />
                                {formatDuration(v.duration)}
                              </span>
                              <span className={cn('text-[11px] font-medium', statusAccent[status]?.split(' ')[0])}>
                                {VIDEO_STATUS_LABELS[status]}
                              </span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="mt-2 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full btn-darey transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Coach card (right) */}
          <div
            className=" relative rounded-3xl glass-tinted p-6 overflow-hidden rise-in flex flex-col"
            style={{ animationDelay: '0.15s' }} >
            <p className="text-xs uppercase tracking-wider text-white/45 font-semibold mb-4">Twój trener</p>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 rounded-2xl ring-1 ring-white/15">
                <AvatarImage src={session.coach.avatarUrl || ''} alt={session.coach.name || ''} />
                <AvatarFallback className="bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] text-white">
                  {session.coach.name?.[0] || 'T'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-display font-semibold text-white truncate">{session.coach.name || 'Trener'}</p>
                <p className="text-sm text-white/45 truncate">{session.coach.email}</p>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Sesja utworzona</span>
                <span className="text-white/75 font-medium">{formatDate(session.createdAt)}</span>
              </div>
              {session.completedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Zakończona</span>
                  <span className="text-[#34d399] font-medium">{formatDate(session.completedAt)}</span>
                </div>
              )}
            </div>

            <a
              href={`mailto:${session.coach.email}`}
              className=" relative mt-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.07] hover:border-[#2de5ca]/30 transition-all duration-300 overflow-hidden"
            >
              <Send className="w-4 h-4" />
              Napisz wiadomość
            </a>
          </div>
        </div>

        {/* ===== Tags row ===== */}
        {session.tags.length > 0 && (
          <div className="mb-8 rise-in" style={{ animationDelay: '0.18s' }}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#8cffef]" />
              <p className="text-xs uppercase tracking-wider text-white/45 font-semibold">Tagi do poprawy</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {session.tags.map((st, index) => {
                const color = st.tag.color || '#8cffef'
                return (
                  <div
                    key={st.tag.id}
                    className="relative rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                    style={{ borderColor: `${color}33` }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="grid place-items-center w-9 h-9 rounded-xl flex-shrink-0 text-white"
                        style={{ backgroundColor: color, boxShadow: `0 8px 20px -8px ${color}` }}
                      >
                        <Target className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-white text-sm truncate" style={{ color }}>
                            {st.tag.name}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-white/[0.05] border border-white/[0.08] text-white/55 flex-shrink-0">
                            #{index + 1}
                          </span>
                        </div>
                        {st.note && (
                          <div className="mt-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                            <p className="text-[11px] font-medium text-white/45 mb-0.5">Uwaga trenera:</p>
                            <p className="text-xs text-white/75">{st.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===== Section tabs (segmented control) ===== */}
        <div className="rise-in mb-6" style={{ animationDelay: '0.22s' }}>
          <div className="inline-flex gap-1 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl">
            {SECTION_TABS.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.key
              const count = t.key === 'notes' ? session.notes.length : t.key === 'videos' ? totalVideos : null
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                    active
                      ? 'btn-darey text-white'
                      : 'text-white/55 hover:text-white hover:bg-white/[0.04]',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {count !== null && (
                    <span
                      className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full font-medium',
                        active ? 'bg-white/15 text-white' : 'bg-white/[0.05] text-white/50',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ===== OVERVIEW ===== */}
        {activeTab === 'overview' && (
          <div
            className=" relative rounded-3xl glass-liquid p-6 sm:p-7 overflow-hidden rise-in"
            style={{ animationDelay: '0.25s' }} >
            <div className="space-y-5">
              {session.scheduledAt && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/45 font-semibold mb-1.5">Zaplanowana na</p>
                  <p className="text-white/80">{formatDateTime(session.scheduledAt)}</p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45 font-semibold mb-1.5">Status</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border w-fit',
                    statusAccent[session.status] ?? statusAccent.DRAFT,
                  )}
                >
                  {STATUS_LABELS[session.status]}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/45 font-semibold mb-1.5">Statystyki sesji</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-sm text-white/45">Filmy</p>
                    <p className="text-2xl font-display font-bold text-white mt-0.5">{totalVideos}</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-sm text-white/45">Zakończone</p>
                    <p className="text-2xl font-display font-bold text-[#34d399] mt-0.5">{completedVideos}</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-sm text-white/45">Postęp</p>
                    <p className="text-2xl font-display font-bold text-[#8cffef] mt-0.5">{completionPct}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== VIDEOS ===== */}
        {activeTab === 'videos' && (
          <div className="space-y-4 rise-in" style={{ animationDelay: '0.25s' }}>
            {session.videos.length === 0 ? (
              <div
                className=" relative rounded-3xl glass-liquid p-12 overflow-hidden text-center" >
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40 mx-auto mb-3">
                  <PlayCircle className="w-7 h-7" />
                </div>
                <p className="text-white/45">Brak filmów w tej sesji</p>
              </div>
            ) : (
              session.videos.map((sv) => {
                const video = sv.video
                const videoProgress = getProgressForVideo(video.id)
                const embedUrl = getVideoEmbedUrl(video.url)
                const currentStatus = (videoProgress?.status || 'PENDING') as keyof typeof VIDEO_STATUS_LABELS
                const currentProgress = videoProgress?.progress || 0

                return (
                  <div
                    key={video.id}
                    className=" relative rounded-3xl glass-liquid overflow-hidden rise-in" >
                    <div className="grid lg:grid-cols-[auto_1fr] gap-0">
                      {/* Thumbnail */}
                      <button
                        onClick={() => {
                          setActiveVideoId(video.id)
                          setActiveTab('overview')
                        }}
                        className="relative w-full lg:w-64 aspect-video lg:aspect-auto bg-[#060606] overflow-hidden group"
                      >
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-10 h-10 text-white/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-2 right-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-white bg-black/55 backdrop-blur border border-white/10">
                            <Clock className="w-3 h-3" />
                            {formatDuration(video.duration)}
                          </span>
                        </div>
                      </button>

                      {/* Meta + controls */}
                      <div className="p-5 flex flex-col">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-display font-semibold text-white">{video.title}</h3>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0',
                              statusAccent[currentStatus],
                            )}
                          >
                            {VIDEO_STATUS_LABELS[currentStatus]}
                          </span>
                        </div>

                        {video.description && (
                          <p className="text-sm text-white/45 line-clamp-2 mb-3">{video.description}</p>
                        )}

                        {video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {video.tags.map((vt) => {
                              const color = vt.tag.color || '#8cffef'
                              return (
                                <span
                                  key={vt.tag.id}
                                  className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium border"
                                  style={{ color, borderColor: `${color}55`, backgroundColor: `${color}12` }}
                                >
                                  {vt.tag.name}
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {/* Progress bar */}
                        <div className="mt-auto">
                          <div className="flex items-center justify-between text-[11px] text-white/45 mb-1.5">
                            <span>Postęp</span>
                            <span>{currentProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden mb-4">
                            <div
                              className="h-full rounded-full btn-darey transition-all duration-500"
                              style={{ width: `${currentProgress}%` }}
                            />
                          </div>

                          {/* Segmented control */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                              {(['PENDING', 'WATCHED', 'IMPLEMENTED'] as const).map((st) => {
                                const active = currentStatus === st
                                return (
                                  <button
                                    key={st}
                                    onClick={() =>
                                      handleProgressChange(
                                        video.id,
                                        st,
                                        st === 'IMPLEMENTED' ? 100 : st === 'WATCHED' ? 100 : 0,
                                      )
                                    }
                                    className={cn(
                                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300',
                                      active
                                        ? 'btn-darey text-white'
                                        : 'text-white/55 hover:text-white hover:bg-white/[0.05]',
                                    )}
                                  >
                                    {st === 'PENDING' && <EyeOff className="w-3.5 h-3.5" />}
                                    {st === 'WATCHED' && <Eye className="w-3.5 h-3.5" />}
                                    {st === 'IMPLEMENTED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {VIDEO_STATUS_LABELS[st]}
                                  </button>
                                )
                              })}
                            </div>

                            <div className="flex items-center gap-2">
                              {embedUrl && (
                                <Link
                                  href={`/student/videos/${video.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/75 hover:text-white bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Oglądaj
                                </Link>
                              )}
                              <button
                                onClick={() => setVideoProgressDialog({ video: sv, progress: videoProgress })}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-white/[0.04] border border-white/[0.10] hover:bg-[#14b8a6]/15 hover:border-[#14b8a6]/40 hover:text-[#8cffef] transition-all duration-300"
                              >
                                {currentStatus === 'PENDING' ? 'Rozpocznij' : 'Aktualizuj'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ===== NOTES ===== */}
        {activeTab === 'notes' && (
          <div className="space-y-5 rise-in" style={{ animationDelay: '0.25s' }}>
            <div
              className=" relative rounded-3xl glass-liquid p-6 sm:p-7 overflow-hidden" >
              <form onSubmit={handleAddNote} className="space-y-4">
                <Textarea
                  placeholder="Wpisz swoją notatkę do tej sesji..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  className="min-h-[110px] rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#2de5ca]/50 focus-visible:ring-2 focus-visible:ring-[#14b8a6]/25 transition-all duration-300 resize-none"
                />
                <button
                  type="submit"
                  disabled={isLoading || !newNote.trim()}
                  className=" relative inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white btn-darey disabled:opacity-55 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Dodaj notatkę
                </button>
              </form>
            </div>

            {session.notes.length === 0 ? (
              <div
                className=" relative rounded-3xl glass-liquid p-10 overflow-hidden text-center" >
                <div className="grid place-items-center w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40 mx-auto mb-2">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-white/45 text-sm">Brak notatek. Dodaj swoją pierwszą!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {session.notes.map((note) => (
                  <div
                    key={note.id}
                    className="relative rounded-2xl p-4 bg-white/[0.025] border border-white/[0.07] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 rounded-xl ring-1 ring-white/10 flex-shrink-0">
                        <AvatarImage src={note.user.avatarUrl || ''} alt={note.user.name || ''} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] text-white">
                          {note.user.name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white text-sm">{note.user.name || 'Użytkownik'}</p>
                          <span
                            className={cn(
                              'inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
                              note.user.role === 'COACH'
                                ? 'text-[#8cffef] bg-[#8cffef]/10 border-[#8cffef]/25'
                                : 'text-white/55 bg-white/[0.04] border-white/[0.08]',
                            )}
                          >
                            {note.user.role === 'COACH' ? 'Trener' : 'Ty'}
                          </span>
                          <span className="text-[11px] text-white/40">{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-white/80 whitespace-pre-wrap mt-1.5">{note.content}</p>
                        {note.isPrivate && (
                          <span className="mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium text-[#2de5ca] bg-[#2de5ca]/10 border border-[#2de5ca]/25">
                            <Lock className="w-2.5 h-2.5" />
                            Prywatna notatka trenera
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== Video Progress Dialog ===== */}
        {videoProgressDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setVideoProgressDialog(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl glass-liquid p-6 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#14b8a6]">
                  <PlayCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-display font-bold text-white">{videoProgressDialog.video.video.title}</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/45 font-semibold mb-2">Status</label>
                  <div className="flex gap-2">
                    {(['PENDING', 'WATCHING', 'WATCHED', 'IMPLEMENTED'] as const).map((status) => {
                      const active = videoProgressDialog.progress?.status === status
                      return (
                        <button
                          key={status}
                          onClick={() =>
                            handleProgressChange(
                              videoProgressDialog.video.video.id,
                              status,
                              status === 'IMPLEMENTED' ? 100 : status === 'WATCHED' ? 100 : status === 'WATCHING' ? 50 : 0,
                            )
                          }
                          className={cn(
                            'flex-1 px-2 py-2 rounded-xl text-xs font-medium transition-all duration-300',
                            active
                              ? 'btn-darey text-white'
                              : 'text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07]',
                          )}
                        >
                          {VIDEO_STATUS_LABELS[status]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/45 font-semibold mb-2">
                    Postęp ({videoProgressDialog.progress?.progress || 0}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={videoProgressDialog.progress?.progress || 0}
                    onChange={(e) =>
                      handleProgressChange(
                        videoProgressDialog.video.video.id,
                        (videoProgressDialog.progress?.status || 'WATCHING') as Progress['status'],
                        parseInt(e.target.value),
                      )
                    }
                    className="w-full accent-[#2de5ca]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-white/45 font-semibold mb-2">
                    Twoja notatka
                  </label>
                  <Textarea
                    placeholder="Co się nauczyłeś? Co trudne?"
                    value={videoProgressDialog.progress?.note || ''}
                    onChange={(e) =>
                      handleProgressChange(
                        videoProgressDialog.video.video.id,
                        (videoProgressDialog.progress?.status || 'WATCHING') as Progress['status'],
                        videoProgressDialog.progress?.progress || 0,
                        e.target.value,
                      )
                    }
                    rows={3}
                    className="rounded-2xl bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-white/30 focus-visible:border-[#2de5ca]/50 focus-visible:ring-2 focus-visible:ring-[#14b8a6]/25 transition-all duration-300 resize-none"
                  />
                </div>

                <button
                  onClick={() => setVideoProgressDialog(null)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white/75 hover:text-white bg-white/[0.04] border border-white/[0.10] hover:bg-white/[0.07] transition-all duration-300"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
