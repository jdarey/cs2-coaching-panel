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
import { Video, BookOpen, CheckCircle, Clock, PlayCircle, ArrowLeft, MessageSquare, Save, ExternalLink, Play, Loader2, Target, Trophy, Filter, X, ArrowRight } from 'lucide-react'
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Moje sesje</h1>
            <p className="text-muted-foreground mt-1">Wszystkie sesje treningowe z trenerem</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Szukaj sesji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Wszystkie statusy</option>
            <option value="DRAFT">Szkic</option>
            <option value="ACTIVE">Aktywna</option>
            <option value="COMPLETED">Zakończona</option>
            <option value="ARCHIVED">Zarchiwizowana</option>
          </select>
        </div>

        {filteredSessions.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              {search || statusFilter !== 'all' ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Nie znaleziono sesji</p>
                </>
              ) : (
                <>
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych sesji</p>
                  <p className="text-sm text-muted-foreground">Twój trener poinformuje Cię o nowej sesji</p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={session.coach.avatarUrl || ''} alt={session.coach.name || ''} />
                            <AvatarFallback>{getInitials(session.coach.name || 'T')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold truncate">{session.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{session.coach.name || session.coach.email}</p>
                          </div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline" className={cn(STATUS_COLORS[session.status])}>
                            {STATUS_LABELS[session.status]}
                          </Badge>
                          {session.scheduledAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(session.scheduledAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/student/sessions/${session.id}`}>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Otwórz
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span>{session.tags.length} tagów</span>
                        {session.tags.length > 0 && (
                          <div className="flex items-center gap-1 ml-2">
                            {session.tags.slice(0, 3).map((st) => (
                              <Badge key={st.tag.id} variant="secondary" className={cn('text-xs', st.tag.color && `bg-[${st.tag.color}] text-white border-[${st.tag.color}]`)}>
                                {st.tag.name}
                              </Badge>
                            ))}
                            {session.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{session.tags.length - 3}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span>{session.videos.length} filmów</span>
                      </div>
                      <span className="flex-1" />
                      <span>{formatDate(session.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}

import { Calendar, Search } from 'lucide-react'