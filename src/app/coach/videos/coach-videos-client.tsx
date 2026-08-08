'use client'

import { useState } from 'react'
import { formatDate, getVideoThumbnail, getVideoEmbedUrl, cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Search, MoreHorizontal, Trash2, Edit, ExternalLink, Play, Loader2, Tag, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Video {
  id: string
  title: string
  url: string
  thumbnail: string | null
  description: string | null
  duration: number | null
  source: string
  isActive: boolean
  tags: { tag: { id: string; name: string; color: string } }[]
  _count: { progress: number }
}

interface Tag {
  id: string
  name: string
  color: string
}

interface CoachVideosClientProps {
  initialVideos: Video[]
  initialTags: Tag[]
}

export function CoachVideosClient({ initialVideos, initialTags }: CoachVideosClientProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [tags] = useState<Tag[]>(initialTags)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'youtube' | 'vimeo' | 'drive' | 'other'>('all')
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    tagIds: [] as string[],
  })
  const { toast } = useToast()

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'all' || v.source === activeTab
    return matchesSearch && matchesTab
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.url.trim()) return

    setIsLoading(true)

    try {
      const url = editingVideo ? `/api/videos/${editingVideo.id}` : '/api/videos'
      const method = editingVideo ? 'PUT' : 'POST'

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

      if (editingVideo) {
        setVideos((prev) => prev.map((v) => (v.id === editingVideo.id ? data : v)))
        toast({ title: 'Sukces', description: 'Film zaktualizowany' })
      } else {
        setVideos((prev) => [data, ...prev])
        toast({ title: 'Sukces', description: 'Film dodany' })
      }

      setDialogOpen(false)
      resetForm()
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten film?')) return

    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setVideos((prev) => prev.filter((v) => v.id !== videoId))
      toast({ title: 'Sukces', description: 'Film usunięty' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    }
  }

  const openEditDialog = (video: Video) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      url: video.url,
      description: video.description || '',
      tagIds: video.tags.map((t) => t.tag.id),
    })
    setDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingVideo(null)
    resetForm()
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ title: '', url: '', description: '', tagIds: [] })
  }

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <CoachLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Baza filmów</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj filmami treningowymi do przypisywania uczniom</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj film
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVideo ? 'Edytuj film' : 'Nowy film treningowy'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tytuł *</Label>
                  <Input
                    id="title"
                    placeholder="np. Jak poprawić crosshair placement"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL filmu *</Label>
                  <Input
                    id="url"
                    placeholder="https://youtube.com/watch?v=... lub vimeo.com/... lub drive.google.com/..."
                    value={formData.url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Obsługiwane: YouTube, Vimeo, Google Drive, linki bezpośrednie</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Opis (opcjonalnie)</Label>
                  <Input
                    id="description"
                    placeholder="Krótki opis co uczeń się nauczy..."
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    maxLength={2000}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagi</Label>
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
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingVideo ? 'Zapisz' : 'Dodaj film'}
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
              placeholder="Szukaj filmu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'youtube' | 'vimeo' | 'drive' | 'other')} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">Wszystkie</TabsTrigger>
              <TabsTrigger value="youtube">YouTube</TabsTrigger>
              <TabsTrigger value="vimeo">Vimeo</TabsTrigger>
              <TabsTrigger value="drive">Drive</TabsTrigger>
              <TabsTrigger value="other">Inne</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Videos Grid */}
        {filteredVideos.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              {search || activeTab !== 'all' ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Nie znaleziono filmów</p>
                </>
              ) : (
                <>
                  <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych filmów</p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pierwszy film
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-video bg-muted">
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {formatDuration(video.duration)}
                    </Badge>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs capitalize">{video.source}</Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold line-clamp-1">{video.title}</h3>
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {video.tags.map((t) => (
                      <Badge key={t.tag.id} variant="secondary" className={cn('text-xs', t.tag.color && `bg-[${t.tag.color}] text-white border-[${t.tag.color}]`)}>
                        {t.tag.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {video._count.progress} przypisań
                    </span>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <a href={video.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Otwórz w nowej karcie
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(video)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(video.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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