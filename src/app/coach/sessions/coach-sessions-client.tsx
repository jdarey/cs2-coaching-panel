'use client'

import { useState } from 'react'
import { formatDate, formatDateTime, getInitials, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Search, MoreHorizontal, Trash2, Edit, Eye, Calendar, Tag, Video, Loader2, ArrowRight, X } from 'lucide-react'
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

  return (
    <CoachLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sesje treningowe</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj sesjami coachingowymi dla swoich uczniów</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nowa sesja
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSession ? 'Edytuj sesję' : 'Nowa sesja treningowa'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'tags' | 'videos' | 'notes')}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="details">Szczegóły</TabsTrigger>
                    <TabsTrigger value="tags">Tagi</TabsTrigger>
                    <TabsTrigger value="videos">Filmy</TabsTrigger>
                    <TabsTrigger value="notes">Notatki</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Tytuł sesji *</Label>
                      <Input
                        id="title"
                        placeholder="np. Analiza demka z 15.01"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student">Uczeń *</Label>
                      <Select value={formData.studentId} onValueChange={(v) => setFormData((prev) => ({ ...prev, studentId: v }))} disabled={isLoading || !!editingSession}>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz ucznia" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name || s.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Opis sesji</Label>
                      <Textarea
                        id="description"
                        placeholder="Cel sesji, uwagi wstępne..."
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledAt">Data sesji</Label>
                        <Input
                          id="scheduledAt"
                          type="datetime-local"
                          value={formData.scheduledAt}
                          onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v as any }))} disabled={isLoading}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Szkic</SelectItem>
                            <SelectItem value="ACTIVE">Aktywna</SelectItem>
                            <SelectItem value="COMPLETED">Zakończona</SelectItem>
                            <SelectItem value="ARCHIVED">Zarchiwizowana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tags" className="space-y-4">
                    <p className="text-sm text-muted-foreground">Wybierz tagi błędów do tej sesji. Możesz dodać notatkę do każdego tagu po zapisaniu.</p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={formData.tagIds.includes(tag.id) ? 'default' : 'outline'}
                          className={cn('cursor-pointer', tag.color && `bg-[${tag.color}] text-white border-[${tag.color}]`)}
                          onClick={() => toggleTag(tag.id)}
                          style={tag.color && !formData.tagIds.includes(tag.id) ? { borderColor: tag.color, color: tag.color } : undefined}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="videos" className="space-y-4">
                    <p className="text-sm text-muted-foreground">Wybierz filmy do przypisania do tej sesji. System zaproponuje filmy na podstawie tagów.</p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {videos.map((video) => (
                        <label key={video.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.videoIds.includes(video.id)}
                            onChange={() => toggleVideo(video.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.title}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4">
                    <p className="text-sm text-muted-foreground">Notatki do sesji zostaną dodane po utworzeniu.</p>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingSession ? 'Zapisz' : 'Utwórz sesję'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj sesji..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Wszystkie statusy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="DRAFT">Szkic</SelectItem>
              <SelectItem value="ACTIVE">Aktywna</SelectItem>
              <SelectItem value="COMPLETED">Zakończona</SelectItem>
              <SelectItem value="ARCHIVED">Zarchiwizowana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sessions List */}
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
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych sesji</p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Utwórz pierwszą sesję
                  </Button>
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
                            <AvatarImage src={session.student.avatarUrl || ''} alt={session.student.name || ''} />
                            <AvatarFallback>{getInitials(session.student.name || 'U')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold truncate">{session.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{session.student.name || session.student.email}</p>
                          </div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline" className={cn(STATUS_COLORS[session.status], 'gap-1')}>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/coach/sessions/${session.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Zobacz szczegóły
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(session)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(session.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/coach/sessions/${session.id}`}>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Otwórz
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Tags & Videos Preview */}
                    <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <span>{session.tags.length} tagów</span>
                        {session.tags.length > 0 && (
                          <div className="flex items-center gap-1 ml-2">
                            {session.tags.slice(0, 3).map((t) => (
                              <Badge key={t.tag.id} variant="secondary" className={cn('text-xs', t.tag.color && `bg-[${t.tag.color}] text-white border-[${t.tag.color}]`)}>
                                {t.tag.name}
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
    </CoachLayout>
  )
}