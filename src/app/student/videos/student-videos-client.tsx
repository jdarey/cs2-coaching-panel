'use client'

import { useState } from 'react'
import { formatDate, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn, getVideoEmbedUrl } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Button } from '@/components/ui/button'
import {
  Video,
  BookOpen,
  Clock,
  PlayCircle,
  ArrowRight,
  Filter,
  X,
  Loader2,
  RefreshCw,
  Play,
  ExternalLink,
  CheckCircle2,
  Hourglass,
  CircleDot,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Session {
  id: string
  title: string
  description: string | null
  status: string
  scheduledAt: string | null
  createdAt: string
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
  tags: { tag: { id: string; name: string; color: string } }[]
}

interface Progress {
  id: string
  videoId: string
  sessionId: string | null
  status: string
  progress: number
  note: string | null
  watchedAt: string | null
}

interface StudentVideosClientProps {
  initialSessions: Session[]
  initialProgress: Progress[]
}

// Premium status meta — pairs the palette hex with an icon + label.
const STATUS_META: Record<string, { color: string; icon: typeof Clock; dot: string; ring: string; glow: string }> = {
  PENDING: { color: '#fbbf24', icon: Hourglass, dot: 'bg-[#fbbf24]', ring: 'ring-[#fbbf24]/30', glow: 'rgba(251,191,36,0.35)' },
  WATCHING: { color: '#2de5ca', icon: CircleDot, dot: 'bg-[#2de5ca]', ring: 'ring-[#2de5ca]/30', glow: 'rgba(45,229,202,0.35)' },
  WATCHED: { color: '#34d399', icon: CheckCircle2, dot: 'bg-[#34d399]', ring: 'ring-[#34d399]/30', glow: 'rgba(52,211,153,0.35)' },
  IMPLEMENTED: { color: '#14b8a6', icon: CheckCircle2, dot: 'bg-[#14b8a6]', ring: 'ring-[#14b8a6]/30', glow: 'rgba(20,184,166,0.35)' },
}


export function StudentVideosClient({ initialSessions, initialProgress }: StudentVideosClientProps) {
  const [sessions] = useState<Session[]>(initialSessions)
  const [progress] = useState<Progress[]>(initialProgress)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'watching' | 'watched' | 'implemented'>('all')
  const [search, setSearch] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [videoProgressDialog, setVideoProgressDialog] = useState<{ video: typeof allVideos[0]; sessionTitle: string; progress: Progress | undefined } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const getProgressForVideo = (videoId: string, sessionId: string) =>
    progress.find((p) => p.videoId === videoId && p.sessionId === sessionId)

  // Flatten all videos with session info
  const allVideos = sessions.flatMap((session) =>
    session.videos.map((sv) => ({
      ...sv,
      sessionId: session.id,
      sessionTitle: session.title,
      sessionDate: session.scheduledAt || session.createdAt,
      progress: getProgressForVideo(sv.video.id, session.id),
    }))
  )

  const filteredVideos = allVideos.filter((item) => {
    const video = item.video
    const p = item.progress
    const status = p?.status || 'PENDING'
    const matchesSearch = video.title.toLowerCase().includes(search.toLowerCase()) ||
      video.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.sessionTitle.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'all' || status === activeTab.toUpperCase()
    const matchesSession = !selectedSessionId || item.sessionId === selectedSessionId
    return matchesSearch && matchesTab && matchesSession
  })

  const handleProgressChange = async (videoId: string, sessionId: string, status: Progress['status'], progressValue: number, note?: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, sessionId, status, progress: progressValue, note }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Zapisano', description: 'Postęp zaktualizowany' })
      setVideoProgressDialog(null)
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Stats
  const stats = {
    total: allVideos.length,
    pending: allVideos.filter((v) => !v.progress || v.progress.status === 'PENDING').length,
    watching: allVideos.filter((v) => v.progress?.status === 'WATCHING').length,
    watched: allVideos.filter((v) => v.progress?.status === 'WATCHED').length,
    implemented: allVideos.filter((v) => v.progress?.status === 'IMPLEMENTED').length,
  }

  const completionRate = stats.total > 0 ? Math.round(((stats.watched + stats.implemented) / stats.total) * 100) : 0

  const tabs = ['all', 'pending', 'watching', 'watched', 'implemented'] as const
  const tabLabel = (t: typeof tabs[number]) => (t === 'all' ? 'Wszystkie' : VIDEO_STATUS_LABELS[t.toUpperCase()])

  // SVG ring path for progress ring
  const size = 36
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* ===== Sticky premium header ===== */}
        <div
          className="sticky top-16 lg:top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-4 mb-6 bg-[#0a0a0a]"
          style={{
            background: 'linear-gradient(180deg, rgba(6,7,13,0.92) 0%, rgba(6,7,13,0.72) 60%, rgba(6,7,13,0) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] shadow-[0_8px_24px_-8px_rgba(124,111,255,0.6)] ring-1 ring-white/20">
                <Video className="h-4 w-4 text-white" strokeWidth={2.4} />
              </span>
              <span className="text-[11px] uppercase tracking-[0.22em] text-white/40 font-semibold">Biblioteka</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-violet leading-[1.05]">
              Filmy do oglądania
            </h1>
            <p className="text-sm text-white/55 max-w-xl">
              Wszystkie filmy przypisane przez Twojego trenera. Jedno kliknięcie dzieli Cię od kolejnego wniosku.
            </p>
          </div>
        </div>

        {/* ===== Stats glass strip ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Wszystkie', value: stats.total, accent: '#2de5ca', icon: BookOpen },
            { label: 'Do oglądania', value: stats.pending, accent: '#fbbf24', icon: Clock },
            { label: 'W trakcie', value: stats.watching, accent: '#2de5ca', icon: Play },
            { label: 'Ukończone', value: stats.watched + stats.implemented, accent: '#34d399', icon: CheckCircle2 },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="glass-liquid rise-in rounded-2xl p-3.5 relative overflow-hidden" style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-semibold mb-1">{stat.label}</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-white ">{stat.value}</p>
                  </div>
                  <span
                    className="grid place-items-center h-9 w-9 rounded-xl ring-1 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${stat.accent}26 0%, transparent 70%)`,
                      borderColor: `${stat.accent}40`,
                      boxShadow: `0 0 18px -6px ${stat.accent}80`,
                      color: stat.accent,
                    }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ===== Completion ring ===== */}
        <div className="glass-liquid rise-in rounded-2xl p-4 sm:p-5 mb-6 relative overflow-hidden" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center gap-4">
            <div className="relative grid place-items-center shrink-0">
              <svg width={62} height={62} viewBox="0 0 62 62" className="-rotate-90">
                <circle cx="31" cy="31" r="25" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                <circle
                  cx="31"
                  cy="31"
                  r="25"
                  fill="none"
                  stroke="url(#completionGrad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 25}
                  strokeDashoffset={2 * Math.PI * 25 * (1 - completionRate / 100)}
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                />
                <defs>
                  <linearGradient id="completionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8cffef" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute font-display text-sm font-bold tabular-nums text-white">{completionRate}%</span>
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-white text-sm">Twój progres</p>
              <p className="text-xs text-white/50 mt-0.5">
                {stats.watched + stats.implemented} z {stats.total} filmów ukończonych. Tak trzymaj.
              </p>
            </div>
          </div>
        </div>

        {/* ===== Search ===== */}
        <div className="relative mb-4 max-w-md">
          <div className="glass-liquid rounded-xl relative overflow-hidden" >
            <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Szukaj filmu, sesji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-xl bg-transparent pl-11 pr-11 text-sm text-white placeholder:text-white/40 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Wyczyść"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ===== Segmented status pills ===== */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab
            const meta = tab !== 'all' ? STATUS_META[tab.toUpperCase()] : null
            const count = tab === 'all'
              ? stats.total
              : tab === 'pending' ? stats.pending
              : tab === 'watching' ? stats.watching
              : tab === 'watched' ? stats.watched
              : stats.implemented
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-300',
                  isActive ? 'text-white' : 'text-white/55 hover:text-white',
                )}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(160deg, rgba(124,111,255,0.16) 0%, rgba(90,79,255,0.06) 40%, rgba(255,255,255,0.02) 100%)',
                        border: '1px solid rgba(124,111,255,0.32)',
                        boxShadow: '0 1px 1px rgba(255,255,255,0.08) inset, 0 14px 36px -14px rgba(124,111,255,0.5)',
                        backdropFilter: 'blur(32px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }
                }
              >
                {meta && (
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: meta.color, boxShadow: isActive ? `0 0 8px ${meta.color}` : 'none' }}
                  />
                )}
                <span className="relative">{tabLabel(tab)}</span>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    isActive ? 'bg-white/15 text-white' : 'bg-white/[0.04] text-white/45',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}

          {sessions.length > 1 && (
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value || null)}
              className="h-9 self-center rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-xs text-white/70 focus:outline-none focus:border-[#2de5ca]/30 hover:bg-white/[0.07] transition-colors cursor-pointer"
              style={{ backdropFilter: 'blur(16px)' }}
            >
              <option value="" className="bg-[#06070d]">Wszystkie sesje</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#06070d]">
                  {s.title} ({formatDate(s.scheduledAt || s.createdAt)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ===== Videos grid (or empty state) ===== */}
        {filteredVideos.length === 0 ? (
          // Empty state
          <div className="glass-liquid rounded-3xl relative overflow-hidden py-16 px-6 text-center rise-in">
            <div
              className="mx-auto mb-5 grid place-items-center h-20 w-20 rounded-3xl ring-1 ring-white/10"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(124,111,255,0.28) 0%, rgba(20,184,166,0.12) 40%, rgba(6,7,13,0) 70%)',
              }}
            >
              <Video className="h-8 w-8 text-[#8cffef]" strokeWidth={2} />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-1.5">Nie znaleziono filmów</h3>
            <p className="text-sm text-white/50 max-w-sm mx-auto">
              {search || activeTab !== 'all'
                ? 'Spróbuj zmienić filtry, aby zobaczyć więcej wyników.'
                : 'Twój trener nie przypisał jeszcze żadnych filmów do tej biblioteki.'}
            </p>
            {(search || activeTab !== 'all') && (
              <button
                onClick={() => { setSearch(''); setActiveTab('all'); setSelectedSessionId(null) }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white btn-darey hover:shadow-[0_12px_32px_-8px_rgba(124,111,255,0.55)] transition-shadow"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Wyczyść filtry
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVideos.map((item, idx) => {
              const video = item.video
              const p = item.progress
              const status = p?.status || 'PENDING'
              const prog = p?.progress || 0
              const embedUrl = getVideoEmbedUrl(video.url)
              const meta = STATUS_META[status]
              const StatusIcon = meta.icon

              const ringOffset = circumference * (1 - prog / 100)

              return (
                <div
                  key={`${item.sessionId}-${video.id}`}
                  className="glass-liquid rise-in rounded-3xl relative overflow-hidden group hover:border-[#2de5ca]/25" style={{
                    animationDelay: `${Math.min(idx * 60, 600)}ms`,
                    // override hover border to violet glow when hovered
                    ['--hover-border' as string]: 'rgba(45,229,202,0.25)',
                  }}
                >
                  {/* ===== Thumbnail (16:9) ===== */}
                  <div className="relative aspect-video rounded-3xl overflow-hidden ring-1 ring-white/10">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center bg-gradient-to-br from-[#0c0f1a] to-[#070810]">
                        <Play className="h-11 w-11 text-white/20" strokeWidth={1.6} />
                      </div>
                    )}

                    {/* gradient overlay on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: 'linear-gradient(180deg, rgba(45,229,202,0.40) 0%, rgba(6,7,13,0) 60%)' }}
                    />

                    {/* Status badge pill — top-left */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 backdrop-blur-md"
                        style={{
                          background: `${meta.color}1f`,
                          color: meta.color,
                          boxShadow: `0 0 14px -4px ${meta.glow}`,
                          borderColor: `${meta.color}55`,
                          ['--tw-ring-color' as string]: `${meta.color}40`,
                        }}
                      >
                        <StatusIcon className="h-3 w-3" strokeWidth={2.4} />
                        {VIDEO_STATUS_LABELS[status]}
                      </span>
                    </div>

                    {/* Duration — bottom-right */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white/85 bg-black/55 backdrop-blur-md ring-1 ring-white/10 tabular-nums">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDuration(video.duration)}
                      </span>
                    </div>

                    {/* Source — top-right */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold text-white/70 bg-black/45 backdrop-blur-md ring-1 ring-white/10 capitalize">
                        {video.source}
                      </span>
                    </div>

                    {/* Play overlay (center) — only when playable embed URL */}
                    {embedUrl && (
                      <a
                        href={embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 grid place-items-center"
                        aria-label={`Odtwórz: ${video.title}`}
                      >
                        <span className="grid place-items-center h-14 w-14 rounded-full bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] shadow-[0_18px_40px_-10px_rgba(124,111,255,0.75)] ring-1 ring-white/30 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500">
                          <Play className="h-6 w-6 text-white translate-x-0.5" fill="currentColor" />
                        </span>
                      </a>
                    )}
                  </div>

                  {/* ===== Body ===== */}
                  <div className="p-4">
                    {/* Title — turns violet on hover, clamps to 2 lines */}
                    <h3 className="font-display text-lg font-bold leading-snug text-white transition-colors duration-300 group-hover:text-[#8cffef] line-clamp-2">
                      {video.title}
                    </h3>

                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/45">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="truncate">{item.sessionTitle}</span>
                    </div>

                    {/* Tags */}
                    {video.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {video.tags.map((vt) => (
                          <span
                            key={vt.tag.id}
                            className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ring-1"
                            style={{
                              background: `${vt.tag.color}14`,
                              color: vt.tag.color,
                              borderColor: `${vt.tag.color}30`,
                              ['--tw-ring-color' as string]: `${vt.tag.color}25`,
                            }}
                          >
                            {vt.tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: progress ring OR flat bar + action */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      {/* Progress indicator */}
                      {status !== 'PENDING' ? (
                        <div className="flex items-center gap-2"
                          title={`Postęp: ${prog}%`}
                        >
                          <div className="relative grid place-items-center">
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
                              <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={meta.color}
                                strokeWidth={stroke}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={ringOffset}
                                style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 4px ${meta.glow})` }}
                              />
                            </svg>
                            <span className="absolute text-[9px] font-bold tabular-nums text-white">{prog}%</span>
                          </div>
                          <span className="text-[11px] text-white/45 font-medium leading-tight">
                            {status === 'WATCHED' ? 'Obejrzane' : status === 'IMPLEMENTED' ? 'Wdrożone' : 'W trakcie'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${prog}%`, background: 'linear-gradient(90deg, #fbbf24, #f97316)' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Open progress dialog */}
                      <button
                        onClick={() => setVideoProgressDialog({ video: item, sessionTitle: item.sessionTitle, progress: p })}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold text-white bg-white/[0.04] border border-white/[0.08] hover:bg-[#2de5ca]/15 hover:border-[#2de5ca]/30 hover:text-white transition-all duration-300 relative overflow-hidden"
                      >
                        <PlayCircle className="h-3.5 w-3.5 text-[#8cffef]" strokeWidth={2.2} />
                        <span>Oceń</span>
                        <ArrowRight className="h-3 w-3 opacity-60 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>

                    {/* Quick external link */}
                    <div className="mt-2.5 pt-2.5 border-t border-white/[0.05]">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-white/45 hover:text-[#8cffef] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Otwórz źródło
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== Video Progress Dialog ===== */}
        {videoProgressDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(6,7,13,0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={() => setVideoProgressDialog(null)}
          >
            <div
              className="glass-liquid rounded-3xl relative overflow-hidden w-full max-w-md max-h-[90vh] overflow-y-auto rise-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dialog header */}
              <div className="flex items-start justify-between gap-3 p-5 border-b border-white/[0.06]">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#8cffef] font-semibold mb-1">Twoja ocena</p>
                  <h2 className="font-display text-lg font-bold text-white line-clamp-2">{videoProgressDialog.video.video.title}</h2>
                  <p className="text-xs text-white/45 mt-1 flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> {videoProgressDialog.sessionTitle}
                  </p>
                </div>
                <button
                  onClick={() => setVideoProgressDialog(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-white/55 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Dialog body */}
              <div className="p-5 space-y-5">
                {/* Status grid */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.16em] text-white/40 font-semibold mb-2.5">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['PENDING', 'WATCHING', 'WATCHED', 'IMPLEMENTED'] as const).map((s) => {
                      const m = STATUS_META[s]
                      const Icon = m.icon
                      const isSel = videoProgressDialog.progress?.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => handleProgressChange(
                            videoProgressDialog.video.video.id,
                            videoProgressDialog.video.sessionId,
                            s,
                            s === 'IMPLEMENTED' ? 100 : s === 'WATCHED' ? 100 : s === 'WATCHING' ? 50 : 0
                          )}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-300 ring-1',
                            isSel ? 'text-white' : 'text-white/55 hover:text-white',
                          )}
                          style={
                            isSel
                              ? {
                                  background: `linear-gradient(160deg, ${m.color}26 0%, ${m.color}0a 60%, transparent 100%)`,
                                  borderColor: `${m.color}55`,
                                  boxShadow: `0 1px 1px rgba(255,255,255,0.08) inset, 0 10px 28px -12px ${m.glow}`,
                                  ['--tw-ring-color' as string]: `${m.color}55`,
                                }
                              : {
                                  background: 'rgba(255,255,255,0.025)',
                                  borderColor: 'rgba(255,255,255,0.06)',
                                  ['--tw-ring-color' as string]: 'rgba(255,255,255,0.06)',
                                }
                          }
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} style={{ color: isSel ? m.color : undefined }} />
                          <span>{VIDEO_STATUS_LABELS[s]}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-[11px] uppercase tracking-[0.16em] text-white/40 font-semibold">Postęp (%)</label>
                    <span className="font-display text-sm font-bold tabular-nums text-white">{videoProgressDialog.progress?.progress || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={videoProgressDialog.progress?.progress || 0}
                    onChange={(e) => handleProgressChange(
                      videoProgressDialog.video.video.id,
                      videoProgressDialog.video.sessionId,
                      videoProgressDialog.progress?.status || 'WATCHING',
                      parseInt(e.target.value)
                    )}
                    className="w-full accent-[#2de5ca] cursor-pointer"
                    style={{ height: '6px' }}
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.16em] text-white/40 font-semibold mb-2.5">Twoja notatka</label>
                  <textarea
                    placeholder="Co się nauczyłeś? Co trudne?"
                    value={videoProgressDialog.progress?.note || ''}
                    onChange={(e) => handleProgressChange(
                      videoProgressDialog.video.video.id,
                      videoProgressDialog.video.sessionId,
                      videoProgressDialog.progress?.status || 'WATCHING',
                      videoProgressDialog.progress?.progress || 0,
                      e.target.value
                    )}
                    rows={3}
                    className="w-full rounded-xl bg-white/[0.025] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#2de5ca]/40 transition-colors resize-none"
                  />
                </div>

                {/* Save spinner */}
                {isSaving && (
                  <div className="flex items-center justify-center gap-2 text-xs text-white/55">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8cffef]" />
                    Zapisywanie…
                  </div>
                )}

                {/* Close */}
                <button
                  onClick={() => setVideoProgressDialog(null)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white btn-darey hover:shadow-[0_14px_36px_-10px_rgba(124,111,255,0.55)] transition-shadow"
                >
                  Zamknij
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
