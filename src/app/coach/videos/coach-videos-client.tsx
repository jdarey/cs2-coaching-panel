'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Play,
  Loader2,
  X,
  Clock,
  Film,
  Link as LinkIcon,
  Tag as TagIcon,
  Layers,
  Sparkles,
  UserPlus,
  Check,
  ChevronDown,
  Copy,
  BookOpen,
} from 'lucide-react'

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
  _count: { progress: number; sessionVideos: number }
}

interface Tag {
  id: string
  name: string
  color: string
}

interface Student {
  id: string
  name: string | null
  email: string
}

interface Session {
  id: string
  title: string
  studentId: string
  status: string
}

interface CoachVideosClientProps {
  initialVideos: Video[]
  initialTags: Tag[]
  initialStudents: Student[]
  initialSessions: Session[]
}

export function CoachVideosClient({ initialVideos, initialTags, initialStudents, initialSessions }: CoachVideosClientProps) {
  const [videos, setVideos] = useState<Video[]>(initialVideos)
  const [tags] = useState<Tag[]>(initialTags)
  const [students] = useState<Student[]>(initialStudents)
  const [sessions] = useState<Session[]>(initialSessions)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [assigningVideo, setAssigningVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'youtube' | 'vimeo' | 'drive' | 'other'>('all')
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    description: '',
    tagIds: [] as string[],
  })
  const [assignFormData, setAssignFormData] = useState({
    studentId: '',
    sessionId: '',
    createNewSession: false,
    newSessionTitle: '',
  })
  const { toast } = useToast()

  const filteredVideos = videos.filter((v) => {
    const q = search.toLowerCase()
    const matchesSearch =
      v.title.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q) ||
      v.tags.some((t) => t.tag.name.toLowerCase().includes(q))
    const matchesTab = activeTab === 'all' || v.source === activeTab
    const matchesTag = !activeTag || v.tags.some((t) => t.tag.id === activeTag)
    return matchesSearch && matchesTab && matchesTag
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
        toast({ title: 'Sukces', description: 'Film dodany do bazy' })
      }

      setDialogOpen(false)
      resetForm()
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigningVideo || !assignFormData.studentId) return

    setIsLoading(true)

    try {
      let sessionId = assignFormData.sessionId

      // Create new session if requested
      if (assignFormData.createNewSession && assignFormData.newSessionTitle.trim()) {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: assignFormData.newSessionTitle,
            studentId: assignFormData.studentId,
            status: 'DRAFT',
            videoIds: [assigningVideo.id],
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
          return
        }
        sessionId = data.id
      }

      // If no session selected and not creating new, find or create a session
      if (!sessionId) {
        const existingSession = sessions.find(
          (s) => s.studentId === assignFormData.studentId && s.status !== 'ARCHIVED'
        )
        if (existingSession) {
          sessionId = existingSession.id
        } else {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Sesja z ${assigningVideo.title}`,
              studentId: assignFormData.studentId,
              status: 'DRAFT',
              videoIds: [assigningVideo.id],
            }),
          })
          const data = await res.json()
          if (!res.ok) {
            toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
            return
          }
          sessionId = data.id
        }
      }

      // Add video to session
      const res = await fetch(`/api/coach/sessions/${sessionId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: assigningVideo.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Sukces', description: `Film przypisany do ucznia ${students.find(s => s.id === assignFormData.studentId)?.name || assignFormData.studentId}` })
      // Keep the local count in sync so the grid reflects the new assignment
      setVideos((prev) =>
        prev.map((v) =>
          v.id === assigningVideo.id
            ? { ...v, _count: { ...v._count, sessionVideos: v._count.sessionVideos + 1 } }
            : v
        )
      )
      setAssignDialogOpen(false)
      resetAssignForm()
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten film? Usunie się on z bazy i ze wszystkich sesji.')) return

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

  const openAssignDialog = (video: Video) => {
    setAssigningVideo(video)
    resetAssignForm()
    setAssignDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ title: '', url: '', description: '', tagIds: [] })
  }

  const resetAssignForm = () => {
    setAssignFormData({ studentId: '', sessionId: '', createNewSession: false, newSessionTitle: '' })
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

  const detectSource = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
    if (url.includes('vimeo.com')) return 'vimeo'
    if (url.includes('drive.google.com')) return 'drive'
    return 'other'
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    const source = detectSource(url)
    setFormData((prev) => ({ ...prev, url, source }))
  }

  
  const tabs = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'vimeo', label: 'Vimeo' },
    { value: 'drive', label: 'Drive' },
    { value: 'other', label: 'Inne' },
  ] as const

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader
          icon={Film}
          label="Biblioteka"
          title="Filmy"
          subtitle="Baza filmów treningowych — dodawaj, taguj i przypisuj uczniom"
        >
          <button
            onClick={openAddDialog}
            className="group relative inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-semibold text-white btn-primary-gradient"
          >
            <Plus className="h-4 w-4" />
            Dodaj film
          </button>
        </PageHeader>

        {/* Premium glass search + tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md animate-rise-in" style={{ animationDelay: '60ms' }}>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj filmu po tytule lub opisie..."
              className="glass-liquid h-12 w-full rounded-2xl pl-11 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#8b5cf6]/30 transition"
              aria-label="Szukaj filmów"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition"
                aria-label="Wyczyść wyszukiwanie"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            className="glass-liquid relative flex items-center gap-1 rounded-2xl p-1 overflow-x-auto animate-rise-in"
            style={{ animationDelay: '120ms' }}
          >
            {tabs.map((t) => {
              const active = activeTab === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className={cn(
                    'relative h-10 px-4 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                    active ? 'text-white' : 'text-white/55 hover:text-white/80'
                  )}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#a78bfa]/25 to-[#6d28d9]/25 ring-1 ring-[#a78bfa]/30" />
                  )}
                  <span className="relative">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8 animate-rise-in" style={{ animationDelay: '160ms' }}>
            <button
              onClick={() => setActiveTag('')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-xs font-medium transition-all',
                !activeTag
                  ? 'text-white ring-1 ring-[#a78bfa]/40 bg-[#a78bfa]/10'
                  : 'glass-liquid text-white/60 hover:text-white'
              )}
            >
              Wszystkie
            </button>
            {tags.map((tag) => {
              const selected = activeTag === tag.id
              return (
                <button
                  key={tag.id}
                  onClick={() => setActiveTag(selected ? '' : tag.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-xs font-medium transition-all',
                    selected ? 'text-white' : 'glass-liquid text-white/60 hover:text-white'
                  )}
                  style={selected ? { backgroundColor: `${tag.color}26`, boxShadow: `inset 0 0 0 1px ${tag.color}` } : undefined}
                >
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Videos grid */}
        {filteredVideos.length === 0 ? (
          <div
            className="glass-liquid animate-rise-in rounded-3xl p-16 text-center" >
            {search || activeTab !== 'all' ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55">Nie znaleziono filmów pasujących do kryteriów</p>
                <p className="text-white/35 text-sm mt-1">Spróbuj zmienić filtr lub wyczyść wyszukiwanie</p>
              </>
            ) : (
              <>
                <Play className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55 mb-5">Nie masz jeszcze żadnych filmów w bazie</p>
                <button
                  onClick={openAddDialog}
                  className="inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey"
                >
                  <Plus className="h-4 w-4" />
                  Dodaj pierwszy film
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVideos.map((video, i) => {
              return (
                <article
                  key={video.id}
                  className="glass-liquid rise-in spotlight-card group relative flex flex-col rounded-3xl overflow-hidden"
                  style={{ animationDelay: `${i * 70}ms` }}
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
                    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden rounded-3xl ring-1 ring-white/10">
                    <div className="absolute inset-0">
                      {video.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                          <Play className="h-10 w-10 text-white/25" />
                        </div>
                      )}
                      {/* Gradient hover overlay */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#a78bfa]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Duration pill bottom-right */}
                    <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11px] font-medium backdrop-blur-xl bg-black/50 ring-1 ring-white/15 text-white">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </div>

                    {/* Quick assign button on hover */}
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={() => openAssignDialog(video)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-medium text-white btn-darey transition-all"
                        aria-label={`Przypisz "${video.title}" do ucznia`}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Przypisz
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5 pt-3">
                    <h3 className="font-display text-lg font-bold leading-snug line-clamp-2 text-white/90 group-hover:text-gradient-violet transition-colors rounded">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="mt-1.5 text-sm text-white/45 line-clamp-2">{video.description}</p>
                    )}

                    {/* Tags */}
                    {video.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {video.tags.map((t) => (
                          <span
                            key={t.tag.id}
                            className="inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[11px] font-medium glass-liquid"
                            style={{
                              color: t.tag.color,
                              borderColor: t.tag.color ? `${t.tag.color}40` : undefined,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: t.tag.color }}
                            />
                            {t.tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats + actions */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t border-white/[0.06] pt-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {video._count.progress} przypisań
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <TagIcon className="h-3.5 w-3.5" />
                          {video.tags.length} tagów
                        </span>
                        {video._count.sessionVideos > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {video._count.sessionVideos} sesji
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditDialog(video)}
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-white hover:border-[#a78bfa]/25 transition"
                          aria-label="Edytuj film"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-red-300 hover:border-red-500/30 transition"
                          aria-label="Usuń film"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Custom glass add/edit dialog */}
        {dialogOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
              onClick={() => setDialogOpen(false)}
              aria-hidden="true"
            />
            <div
              className="glass-liquid relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-7 animate-rise-in" role="dialog"
              aria-modal="true"
              aria-labelledby="video-dialog-title"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <Sparkles className="h-5 w-5 text-[#c4b5fd]" />
                </span>
                <div>
                  <h2 id="video-dialog-title" className="font-display text-xl font-bold text-gradient-violet">
                    {editingVideo ? 'Edytuj film' : 'Nowy film treningowy'}
                  </h2>
                  <p className="text-xs text-white/45">
                    {editingVideo ? 'Zaktualizuj dane filmu w bazie' : 'Dodaj nowy film do bazy treningowej'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-xs font-medium text-white/55">
                    Tytuł *
                  </label>
                  <div className="relative">
                    <Film className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="title"
                      placeholder="np. Jak poprawić crosshair placement na Mirage"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      required
                      disabled={isLoading}
                      className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                    />
                  </div>
                </div>

                {/* URL */}
                <div className="space-y-1.5">
                  <label htmlFor="url" className="text-xs font-medium text-white/55">
                    URL filmu *
                  </label>
                  <div className="relative">
                    <LinkIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="url"
                      placeholder="https://youtube.com/watch?v=... lub vimeo.com/... lub drive.google.com/..."
                      value={formData.url}
                      onChange={handleUrlChange}
                      required
                      disabled={isLoading}
                      className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                    />
                  </div>
                  <p className="text-xs text-white/40">
                    Obsługiwane: YouTube, Vimeo, Google Drive, linki bezpośrednie. Źródło wykrywane automatycznie.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-medium text-white/55">
                    Opis (opcjonalnie)
                  </label>
                  <textarea
                    id="description"
                    placeholder="Krótki opis co uczeń się nauczy z tego filmu..."
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    maxLength={2000}
                    disabled={isLoading}
                    rows={3}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition resize-none"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/55">Tagi</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const selected = formData.tagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-3 h-9 text-xs font-medium transition-all',
                            selected
                              ? 'text-white ring-1'
                              : 'glass-liquid text-white/65 hover:text-white'
                          )}
                          style={
                            selected
                              ? {
                                  backgroundColor: `${tag.color}26`,
                                  borderColor: tag.color,
                                  boxShadow: `0 0 0 1px ${tag.color}`,
                                }
                              : undefined
                          }
                        >
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                          {selected && <Check className="h-3 w-3" />}
                        </button>
                      )
                    })}
                  </div>
                  {tags.length === 0 && (
                    <p className="text-xs text-white/40">Brak dostępnych tagów. Dodaj tagi w sekcji <a href="/coach/tags" className="text-[#c4b5fd] hover:underline">Tagi</a>.</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    disabled={isLoading}
                    className="inline-flex items-center rounded-2xl px-5 h-11 text-sm font-medium text-white/65 hover:text-white glass-liquid transition"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !formData.title.trim() || !formData.url.trim()}
                    className=" relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {editingVideo ? 'Zapisz zmiany' : 'Dodaj film do bazy'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Assign to student dialog */}
        {assignDialogOpen && assigningVideo && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
              onClick={() => setAssignDialogOpen(false)}
              aria-hidden="true"
            />
            <div
              className="glass-liquid relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-7 animate-rise-in" role="dialog"
              aria-modal="true"
              aria-labelledby="assign-dialog-title"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <UserPlus className="h-5 w-5 text-[#c4b5fd]" />
                </span>
                <div>
                  <h2 id="assign-dialog-title" className="font-display text-xl font-bold text-gradient-violet">
                    Przypisz film do ucznia
                  </h2>
                  <p className="text-xs text-white/45 mt-1 line-clamp-1">{assigningVideo.title}</p>
                </div>
              </div>

              <form onSubmit={handleAssign} className="space-y-4">
                {/* Student select */}
                <div className="space-y-1.5">
                  <label htmlFor="studentId" className="text-xs font-medium text-white/55">
                    Uczeń *
                  </label>
                  <div className="relative">
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <select
                      id="studentId"
                      value={assignFormData.studentId}
                      onChange={(e) => setAssignFormData((prev) => ({ ...prev, studentId: e.target.value, sessionId: '' }))}
                      required
                      disabled={isLoading}
                      className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-4 pr-10 text-sm text-white appearance-none outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                    >
                      <option value="">Wybierz ucznia...</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Session select */}
                <div className="space-y-1.5">
                  <label htmlFor="sessionId" className="text-xs font-medium text-white/55">
                    Sesja (opcjonalnie)
                  </label>
                  <div className="relative">
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <select
                      id="sessionId"
                      value={assignFormData.sessionId}
                      onChange={(e) => setAssignFormData((prev) => ({ ...prev, sessionId: e.target.value }))}
                      disabled={isLoading || !assignFormData.studentId}
                      className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-4 pr-10 text-sm text-white appearance-none outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                    >
                      <option value="">Automatycznie (znajdź lub utwórz)</option>
                      {assignFormData.studentId &&
                        sessions
                          .filter((s) => s.studentId === assignFormData.studentId && s.status !== 'ARCHIVED')
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title} ({s.status})
                            </option>
                          ))}
                    </select>
                  </div>
                  <p className="text-xs text-white/40">
                    Jeśli nie wybierzesz, system znajdzie aktywną sesję ucznia lub stworzy nową.
                  </p>
                </div>

                {/* Create new session option */}
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignFormData.createNewSession}
                      onChange={(e) => setAssignFormData((prev) => ({ ...prev, createNewSession: e.target.checked }))}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-white/20 bg-white/[0.03] text-[#a78bfa] focus:ring-2 focus:ring-[#8b5cf6]/30 transition"
                    />
                    <span className="text-xs font-medium text-white/75">Utwórz nową sesję</span>
                  </label>
                  {assignFormData.createNewSession && (
                    <div className="space-y-1.5 ml-6">
                      <label htmlFor="newSessionTitle" className="text-xs font-medium text-white/55">
                        Tytuł nowej sesji
                      </label>
                      <input
                        id="newSessionTitle"
                        placeholder="np. Analiza demka - Mirage CT side"
                        value={assignFormData.newSessionTitle}
                        onChange={(e) => setAssignFormData((prev) => ({ ...prev, newSessionTitle: e.target.value }))}
                        disabled={isLoading}
                        className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-4 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setAssignDialogOpen(false)}
                    disabled={isLoading}
                    className="inline-flex items-center rounded-2xl px-5 h-11 text-sm font-medium text-white/65 hover:text-white glass-liquid transition"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !assignFormData.studentId || (assignFormData.createNewSession && !assignFormData.newSessionTitle.trim())}
                    className=" relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Przypisz do ucznia
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}