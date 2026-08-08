'use client'

import { useState } from 'react'
import { formatDate, formatDateTime, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn, getVideoEmbedUrl } from '@/lib/utils'
import { StudentLayout } from '@/components/student-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Video, Play, ExternalLink, CheckCircle, Clock, PlayCircle, Filter, X } from 'lucide-react'
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

export function StudentVideosClient({ initialSessions, initialProgress }: StudentVideosClientProps) {
  const [sessions] = useState<Session[]>(initialSessions)
  const [progress] = useState<Progress[]>(initialProgress)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'watching' | 'watched' | 'implemented'>('all')
  const [search, setSearch] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [videoProgressDialog, setVideoProgressDialog] = useState<{ video: typeof allVideos[0]; sessionTitle: string; progress: Progress | undefined } | null>(null)
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

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Filmy do oglądania</h1>
            <p className="text-muted-foreground mt-1">Wszystkie filmy przypisane przez trenera</p>
          </div>
        </div>

        {/* Stats Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Wszystkie</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Do oglądania</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.watching}</p>
                  <p className="text-xs text-muted-foreground">W trakcie</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.watched}</p>
                  <p className="text-xs text-muted-foreground">Obejrzane</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.implemented}</p>
                  <p className="text-xs text-muted-foreground">Wdrożone</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Progress value={completionRate} className="w-48 h-2" />
                <span className="text-sm font-bold text-primary">{completionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Szukaj filmu, sesji..."
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

          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'watching', 'watched', 'implemented'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                )}
              >
                {tab === 'all' ? 'Wszystkie' : VIDEO_STATUS_LABELS[tab.toUpperCase()]}
              </button>
            ))}
          </div>

          {sessions.length > 1 && (
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Wszystkie sesje</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({formatDate(s.scheduledAt || s.createdAt)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Videos List */}
        {filteredVideos.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Nie znaleziono filmów</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || activeTab !== 'all' ? 'Spróbuj zmienić filtry' : 'Brak przypisanych filmów'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVideos.map((item) => {
              const video = item.video
              const p = item.progress
              const status = p?.status || 'PENDING'
              const prog = p?.progress || 0
              const embedUrl = getVideoEmbedUrl(video.url)

              return (
                <Card key={`${item.sessionId}-${video.id}`} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-muted">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2">
                        <Badge variant="secondary" className="text-xs">{formatDuration(video.duration)}</Badge>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs capitalize">{video.source}</Badge>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className={cn(VIDEO_STATUS_COLORS[status])}>
                          {VIDEO_STATUS_LABELS[status]}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{video.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">{item.sessionTitle}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {embedUrl && (
                            <Button asChild variant="ghost" size="icon">
                              <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                                <Play className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button asChild variant="ghost" size="icon">
                            <a href={video.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {video.tags.map((vt) => (
                          <Badge key={vt.tag.id} variant="secondary" className={cn('text-xs', vt.tag.color && `bg-[${vt.tag.color}] text-white border-[${vt.tag.color}]`)}>
                            {vt.tag.name}
                          </Badge>
                        ))}
                      </div>

                      {status !== 'PENDING' && (
                        <Progress value={prog} className="h-2 mb-3" />
                      )}

                      <div className="flex items-center gap-2">
                        {(['PENDING', 'WATCHING', 'WATCHED', 'IMPLEMENTED'] as const).map((s) => (
                          <Button
                            key={s}
                            variant={status === s ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => setVideoProgressDialog({ video: item, sessionTitle: item.sessionTitle, progress: p })}
                          >
                            {VIDEO_STATUS_LABELS[s]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Video Progress Dialog */}
        {videoProgressDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setVideoProgressDialog(null)}>
            <div className="bg-background rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold truncate">{videoProgressDialog.video.video.title}</h2>
                <Button variant="ghost" size="icon" onClick={() => setVideoProgressDialog(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{videoProgressDialog.sessionTitle}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <div className="flex gap-2">
                    {(['PENDING', 'WATCHING', 'WATCHED', 'IMPLEMENTED'] as const).map((status) => (
                      <Button
                        key={status}
                        variant={videoProgressDialog.progress?.status === status ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => handleProgressChange(
                          videoProgressDialog.video.video.id,
                          videoProgressDialog.video.sessionId,
                          status,
                          status === 'IMPLEMENTED' ? 100 : status === 'WATCHED' ? 100 : status === 'WATCHING' ? 50 : 0
                        )}
                      >
                        {VIDEO_STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Postęp (%)</label>
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
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Twoja notatka</label>
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
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button onClick={() => setVideoProgressDialog(null)} className="w-full">
                  Zamknij
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}