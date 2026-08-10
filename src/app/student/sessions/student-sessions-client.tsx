'use client'

import { useState } from 'react'
import { formatDate, formatDateTime, getInitials, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn, getVideoEmbedUrl } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Video, BookOpen, CheckCircle, Clock, PlayCircle, ArrowLeft, MessageSquare, Save, ExternalLink, Play, Loader2, Target, Trophy, Filter, X, ArrowRight, Calendar, Search } from 'lucide-react'
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
  _count: { videos: number; tags: number; notes: number }
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

interface StudentSessionsClientProps {
  initialSessions: Session[]
  initialProgress: Progress[]
}

const STATUS_HEX: Record<string, string> = {
  DRAFT: '#8cffef',
  ACTIVE: '#2de5ca',
  COMPLETED: '#34d399',
  ARCHIVED: '#94a3b8',
  PENDING: '#fbbf24',
  WATCHING: '#2de5ca',
  WATCHED: '#34d399',
  IMPLEMENTED: '#2fb6a2',
}

const STATUS_DOT: Record<string, string> = {
  DRAFT: '#2de5ca',
  ACTIVE: '#2de5ca',
  COMPLETED: '#34d399',
  ARCHIVED: '#94a3b8',
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'DRAFT', label: 'Szkic' },
  { value: 'ACTIVE', label: 'Aktywna' },
  { value: 'COMPLETED', label: 'Zakończona' },
  { value: 'ARCHIVED', label: 'Zarchiwizowana' },
]


export function StudentSessionsClient({ initialSessions, initialProgress }: StudentSessionsClientProps) {
  const [sessions] = useState<Session[]>(initialSessions)
  const [progress] = useState<Progress[]>(initialProgress)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { toast } = useToast()

  const getProgressForVideo = (videoId: string, sessionId: string) =>
    progress.find((p) => p.videoId === videoId && p.sessionId === sessionId)

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.coach.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.coach.email.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleProgressChange = async (videoId: string, sessionId: string, status: Progress['status'], progressValue: number, note?: string) => {
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
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* ===== Sticky premium header ===== */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 pb-5 bg-[#0a0a0a]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2] shadow-[0_8px_24px_-8px_rgba(124,111,255,0.6)]">
                <BookOpen className="w-5 h-5 text-white" strokeWidth={2.2} />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
              </div>
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-violet leading-none">
                  Moje sesje
                </h1>
                <p className="mt-1.5 text-sm text-white/45">Wszystkie sesje treningowe z trenerem</p>
              </div>
            </div>

            <div className="relative mt-4">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-40 h-2 rounded-full bg-[#2de5ca]/25 blur-xl animate-aurora-slow" />
            </div>
          </div>
        </div>

        {/* ===== Controls: glass search + segmented status filter ===== */}
        <div className="mt-6 flex flex-col lg:flex-row gap-4">
          {/* Glass search input */}
          <div className="relative flex-1 max-w-md group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-[#8cffef] transition-colors duration-300" />
            <input
              type="text"
              placeholder="Szukaj sesji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-liquid h-12 w-full rounded-xl pl-11 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#2de5ca]/40 transition-all duration-300"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-300"
                aria-label="Wyczyść"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Segmented glass status filter */}
          <div className="glass-liquid flex items-center gap-1 rounded-xl p-1.5 overflow-x-auto">
            {FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value
              const dot = opt.value === 'all' ? null : STATUS_DOT[opt.value]
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-all duration-300',
                    active ? 'text-white' : 'text-white/45 hover:text-white/80',
                  )}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(135deg, rgba(124,111,255,0.22) 0%, rgba(90,79,255,0.10) 100%)',
                          boxShadow: '0 1px 1px rgba(255,255,255,0.08) inset, 0 8px 24px -10px rgba(124,111,255,0.5)',
                          border: '1px solid rgba(124,111,255,0.35)',
                        }
                      : { border: '1px solid transparent' }
                  }
                >
                  {dot && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: dot, boxShadow: `0 0 8px ${dot}` }}
                    />
                  )}
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ===== Session list / empty state ===== */}
        {filteredSessions.length === 0 ? (
          <div className="glass-liquid rise-in mt-8 rounded-3xl p-10 sm:p-14 text-center" >
            <div className="mx-auto mb-6 grid place-items-center w-20 h-20 rounded-3xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,111,255,0.25) 0%, rgba(90,79,255,0.10) 100%)', border: '1px solid rgba(124,111,255,0.3)' }}>
              <div className="absolute inset-0 text-gradient-mesh opacity-40 blur-2xl animate-aurora" style={{ background: 'linear-gradient(135deg, #8cffef 0%, #2fb6a2 45%, #2fb6a2 100%)' }} />
              {search || statusFilter !== 'all' ? (
                <Search className="relative w-9 h-9 text-[#8cffef]" strokeWidth={1.8} />
              ) : (
                <BookOpen className="relative w-9 h-9 text-[#8cffef]" strokeWidth={1.8} />
              )}
            </div>
            <h3 className="font-display text-2xl font-bold text-white">
              {search || statusFilter !== 'all' ? 'Brak wyników' : 'Brak sesji'}
            </h3>
            <p className="mt-2 text-sm text-white/45 max-w-md mx-auto">
              {search || statusFilter !== 'all'
                ? 'Nie znaleziono sesji spełniających kryteria. Zmień filtr lub wyszukiwaną frazę.'
                : 'Nie masz jeszcze żadnych sesji. Twój trener poinformuje Cię o nowej sesji.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredSessions.map((session, i) => {
              const statusHex = STATUS_HEX[session.status] || '#8cffef'
              const tagCount = session.tags.length
              const videoCount = session.videos.length
              return (
                <div
                  key={session.id} className="glass-liquid rise-in group relative rounded-3xl p-6 hover:border-[#2de5ca]/25"
                  style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: avatar + title block */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Coach avatar with gradient ring glow */}
                      <div className="relative shrink-0">
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#2de5ca]/45 to-[#2fb6a2]/25 opacity-60 blur-md group-hover:opacity-100 transition-opacity duration-500" />
                        <Avatar className="relative h-12 w-12 rounded-xl ring-1 ring-white/15">
                          <AvatarImage src={session.coach.avatarUrl || ''} alt={session.coach.name || ''} />
                          <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2] text-white font-display font-semibold">
                            {getInitials(session.coach.name || 'T')}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-display text-xl font-bold text-white transition-colors duration-300 group-hover:text-[#8cffef] truncate">
                            {session.title}
                          </h3>
                          {/* Status pill */}
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium"
                            style={{
                              color: statusHex,
                              background: `${statusHex}14`,
                              border: `1px solid ${statusHex}40`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: statusHex, boxShadow: `0 0 8px ${statusHex}` }}
                            />
                            {STATUS_LABELS[session.status] || session.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-white/45 truncate">{session.coach.name || session.coach.email}</p>

                        {/* Tags */}
                        {tagCount > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {session.tags.slice(0, 4).map((st) => {
                              const c = st.tag.color || '#8cffef'
                              return (
                                <span
                                  key={st.tag.id}
                                  className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md font-medium backdrop-blur-md"
                                  style={{
                                    color: c,
                                    background: `${c}12`,
                                    border: `1px solid ${c}33`,
                                  }}
                                >
                                  {st.tag.name}
                                </span>
                              )
                            })}
                            {tagCount > 4 && (
                              <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-md font-medium text-white/55 bg-white/[0.05] border border-white/[0.08]">
                                +{tagCount - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Otwórz button */}
                    <Link
                      href={`/student/sessions/${session.id}`}
                      className="relative shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/85 hover:text-white bg-white/[0.04] hover:bg-gradient-to-r hover:from-[#2de5ca]/20 hover:to-[#2fb6a2]/10 border border-white/[0.08] hover:border-[#2de5ca]/30 transition-all duration-300 overflow-hidden group/btn"
                    >
                      <span className="relative">Otwórz</span>
                      <ArrowRight className="relative w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Link>
                  </div>

                  {/* Stats row */}
                  <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-white/40" />
                      {tagCount} tagów
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-white/40" />
                      {videoCount} filmów
                    </span>
                    {session.scheduledAt ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/40" />
                        {formatDateTime(session.scheduledAt)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-white/40" />
                        {formatDate(session.createdAt)}
                      </span>
                    )}
                    {videoCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 ml-auto text-[#8cffef]/80">
                        <PlayCircle className="w-3.5 h-3.5" />
                        Obejrzyj materiały
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
