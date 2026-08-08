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
import { Video, BookOpen, CheckCircle, Clock, PlayCircle, ArrowLeft, MessageSquare, Save, ExternalLink, Play, Loader2, Target, Trophy } from 'lucide-react'
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

export function StudentSessionDetailClient({ initialSession, initialProgress }: StudentSessionDetailClientProps) {
  const session = initialSession
  const [progress, setProgress] = useState<Progress[]>(initialProgress)
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'notes'>('overview')
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

      toast({ title: 'Sukces', description: 'Notatka dodana' })
      setNewNote('')
      setIsLoading(false)
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
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

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/student/sessions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do sesji
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{session.title}</h1>
            <p className="text-muted-foreground mt-1">
              {session.coach.name || session.coach.email} • {formatDate(session.createdAt)}
            </p>
          </div>
          <Badge variant="outline" className={cn(STATUS_COLORS[session.status], 'text-sm')}>
            {STATUS_LABELS[session.status]}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Filmy w sesji</p>
                  <p className="text-3xl font-bold">{totalVideos}</p>
                </div>
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zakończone</p>
                  <p className="text-3xl font-bold text-green-600">{completedVideos}</p>
                </div>
                <Badge variant="secondary" className="text-green-600 bg-green-100 border-green-200">
                  {totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tagi do poprawy</p>
                  <p className="text-3xl font-bold">{session.tags.length}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notatki</p>
                  <p className="text-3xl font-bold">{session.notes.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'videos' | 'notes')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Przegląd</TabsTrigger>
            <TabsTrigger value="videos">Filmy ({totalVideos})</TabsTrigger>
            <TabsTrigger value="notes">Notatki ({session.notes.length})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Session Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informacje o sesji</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {session.description && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Opis sesji</label>
                      <p className="text-muted-foreground whitespace-pre-wrap mt-1">{session.description}</p>
                    </div>
                  )}
                  {session.scheduledAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Zaplanowana na</label>
                      <p className="text-muted-foreground mt-1">{formatDateTime(session.scheduledAt)}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant="outline" className={cn(STATUS_COLORS[session.status], 'mt-1')}>
                      {STATUS_LABELS[session.status]}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Trener</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={session.coach.avatarUrl || ''} alt={session.coach.name || ''} />
                        <AvatarFallback>{session.coach.name?.[0] || 'T'}</AvatarFallback>
                      </Avatar>
                      <span>{session.coach.name || session.coach.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags with Coach Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Błędy do poprawy</CardTitle>
                </CardHeader>
                <CardContent>
                  {session.tags.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Brak tagów w tej sesji</p>
                  ) : (
                    <div className="space-y-4">
                      {session.tags.map((st, index) => (
                        <div key={st.tag.id} className="p-4 rounded-lg border">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                              style={{ backgroundColor: st.tag.color }}
                            >
                              {st.tag.icon ? <span className="text-xl">{st.tag.icon}</span> : <Target className="h-6 w-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{st.tag.name}</h4>
                                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                              </div>
                              {st.note && (
                                <div className="mt-2 p-3 rounded bg-muted/50">
                                  <p className="text-sm font-medium text-muted-foreground">Uwaga trenera:</p>
                                  <p className="text-sm mt-1">{st.note}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-4">
            {session.videos.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Brak filmów w tej sesji</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {session.videos.map((sv, index) => {
                  const video = sv.video
                  const videoProgress = getProgressForVideo(video.id)
                  const embedUrl = getVideoEmbedUrl(video.url)
                  const currentStatus = videoProgress?.status || 'PENDING'
                  const currentProgress = videoProgress?.progress || 0

                  return (
                    <Card key={video.id} className="overflow-hidden">
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
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold truncate">{video.title}</h3>
                                <Badge variant="outline" className={cn(VIDEO_STATUS_COLORS[currentStatus])}>
                                  {VIDEO_STATUS_LABELS[currentStatus]}
                                </Badge>
                              </div>
                              {video.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {video.tags.map((vt) => (
                                  <Badge key={vt.tag.id} variant="secondary" className={cn('text-xs', vt.tag.color && `bg-[${vt.tag.color}] text-white border-[${vt.tag.color}]`)}>
                                    {vt.tag.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {embedUrl && (
                                <Button asChild variant="outline" size="sm">
                                  <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                                    <Play className="mr-2 h-4 w-4" />
                                    Podgląd
                                  </a>
                                </Button>
                              )}
                              <Button asChild variant="outline" size="sm">
                                <a href={video.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Oglądaj na YouTube
                                </a>
                              </Button>
                              <Button
                                variant={currentStatus === 'PENDING' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setVideoProgressDialog({ video: sv, progress: videoProgress })}
                              >
                                {currentStatus === 'PENDING' ? 'Rozpocznij' : 'Aktualizuj'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Moje notatki</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddNote} className="space-y-4 mb-6">
                  <Textarea
                    placeholder="Wpisz swoją notatkę do tej sesji..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="min-h-[100px]"
                  />
                  <Button type="submit" disabled={isLoading || !newNote.trim()}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Dodaj notatkę
                  </Button>
                </form>

                {session.notes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Brak notatek. Dodaj swoją pierwszą!</p>
                ) : (
                  <div className="space-y-4">
                    {session.notes.map((note) => (
                      <Card key={note.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={note.user.avatarUrl || ''} alt={note.user.name || ''} />
                                  <AvatarFallback className="text-xs">{note.user.name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{note.user.name || 'Użytkownik'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {note.user.role === 'COACH' ? 'Trener' : 'Ty'} • {formatDateTime(note.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <p className="whitespace-pre-wrap">{note.content}</p>
                              {note.isPrivate && (
                                <Badge variant="secondary" className="mt-2 text-xs bg-purple-100 text-purple-800 border-purple-200">
                                  Prywatna notatka trenera
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Video Progress Dialog */}
        {videoProgressDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setVideoProgressDialog(null)}>
            <div className="bg-background rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">{videoProgressDialog.video.video.title}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <div className="flex gap-2">
                    {(['PENDING', 'WATCHING', 'WATCHED', 'IMPLEMENTED'] as const).map((status) => (
                      <Button
                        key={status}
                        variant={videoProgressDialog.progress?.status === status ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => handleProgressChange(videoProgressDialog.video.video.id, status, status === 'IMPLEMENTED' ? 100 : status === 'WATCHED' ? 100 : status === 'WATCHING' ? 50 : 0)}
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
                    onChange={(e) => handleProgressChange(videoProgressDialog.video.video.id, videoProgressDialog.progress?.status || 'WATCHING', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Twoja notatka</label>
                  <Textarea
                    placeholder="Co się nauczyłeś? Co trudne?"
                    value={videoProgressDialog.progress?.note || ''}
                    onChange={(e) => handleProgressChange(videoProgressDialog.video.video.id, videoProgressDialog.progress?.status || 'WATCHING', videoProgressDialog.progress?.progress || 0, e.target.value)}
                    rows={3}
                  />
                </div>
                <Button variant="outline" onClick={() => setVideoProgressDialog(null)} className="w-full">
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