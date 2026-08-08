'use client'

import { useState } from 'react'
import { formatDate, formatDateTime, getInitials, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn, getVideoEmbedUrl } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Plus, MoreHorizontal, Trash2, Edit, Eye, Calendar, Tag, Video, Loader2, ArrowLeft, X, MessageSquare, Save, ExternalLink, Play } from 'lucide-react'
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

interface CoachSessionDetailClientProps {
  initialSession: Session
  initialProgress: Progress[]
}

export function CoachSessionDetailClient({ initialSession, initialProgress }: CoachSessionDetailClientProps) {
  const session = initialSession
  const [progress, setProgress] = useState<Progress[]>(initialProgress)
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'notes'>('overview')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Session['videos'][0] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isPrivateNote, setIsPrivateNote] = useState(false)
  const { toast } = useToast()

  const getProgressForVideo = (videoId: string) => progress.find((p) => p.videoId === videoId)

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

      // Note added successfully - would need to refresh or add optimistically
      toast({ title: 'Sukces', description: 'Notatka dodana' })
      setNewNote('')
      setIsPrivateNote(false)
      // In a real app, you'd refetch or update state optimistically
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteVideo = async (sessionVideoId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten film z sesji?')) return

    // This would require an API endpoint to remove session video
    toast({ title: 'Info', description: 'Funkcja usuwania filmu z sesji do zaimplementowania' })
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
    <CoachLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/coach/sessions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do sesji
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{session.title}</h1>
            <p className="text-muted-foreground mt-1">
              {session.student.name || session.student.email} • {formatDate(session.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(STATUS_COLORS[session.status], 'text-sm')}>
              {STATUS_LABELS[session.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edytuj sesję
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń sesję
                </DropdownMenuItem>
              </DropdownMenuContent            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Filmy do oglądania</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Tagi błędów</p>
                  <p className="text-3xl font-bold">{session.tags.length}</p>
                </div>
                <Tag className="h-8 w-8 text-muted-foreground" />
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                      <Label>Opis</Label>
                      <p className="text-muted-foreground whitespace-pre-wrap">{session.description}</p>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label>Status</Label>
                      <Badge variant="outline" className={cn(STATUS_COLORS[session.status])}>
                        {STATUS_LABELS[session.status]}
                      </Badge>
                    </div>
                    {session.scheduledAt && (
                      <div>
                        <Label>Zaplanowana na</Label>
                        <p className="text-muted-foreground">{formatDateTime(session.scheduledAt)}</p>
                      </div>
                    )}
                    {session.completedAt && (
                      <div>
                        <Label>Zakończona</Label>
                        <p className="text-muted-foreground">{formatDateTime(session.completedAt)}</p>
                      </div>
                    )}
                    <div>
                      <Label>Uczeń</Label>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={session.student.avatarUrl || ''} alt={session.student.name || ''} />
                          <AvatarFallback>{getInitials(session.student.name || 'U')}</AvatarFallback>
                        </Avatar>
                        <span>{session.student.name || session.student.email}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Tagi błędów w tej sesji</CardTitle>
                </CardHeader>
                <CardContent>
                  {session.tags.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Brak tagów w tej sesji</p>
                  ) : (
                    <div className="space-y-3">
                      {session.tags.map((st, index) => (
                        <div key={st.tag.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: st.tag.color }}
                          >
                            {st.tag.icon ? <span className="text-lg">{st.tag.icon}</span> : <Tag className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{st.tag.name}</h4>
                              <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                            </div>
                            {st.note && (
                              <p className="text-sm text-muted-foreground mt-1">{st.note}</p>
                            )}
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
                                <Badge variant="outline" className={cn(VIDEO_STATUS_COLORS[videoProgress?.status || 'PENDING'])}>
                                  {videoProgress ? VIDEO_STATUS_LABELS[videoProgress.status] : 'Do oglądania'}
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
                                  Otwórz
                                </a>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingVideo(sv)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edytuj przypisanie
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteVideo(video.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Usuń z sesji
                                  </DropdownMenuItem>
                                </DropdownMenuContent                              </DropdownMenu>
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
                <CardTitle>Dodaj notatkę</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddNote} className="space-y-4">
                  <Textarea
                    placeholder="Wpisz notatkę do sesji..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="min-h-[100px]"
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivateNote}
                        onChange={(e) => setIsPrivateNote(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">Prywatna (widoczna tylko dla trenera)</span>
                    </label>
                    <Button type="submit" disabled={isLoading || !newNote.trim()}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Dodaj notatkę
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {session.notes.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Brak notatek w tej sesji</p>
                </CardContent>
              </Card>
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
                                {note.user.role === 'COACH' ? 'Trener' : 'Uczeń'} • {formatDateTime(note.createdAt)}
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
          </TabsContent>
        </Tabs>
      </div>
    </CoachLayout>
  )
}

import { VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS } from '@/lib/utils'