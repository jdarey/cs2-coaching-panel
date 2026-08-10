'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Play,
  ExternalLink,
  Loader2,
  X,
  Clock,
  Film,
  Youtube,
  Video as VideoIcon,
  HardDrive,
  Link as LinkIcon,
  Tag as TagIcon,
  Layers,
  Sparkles,
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

const SOURCE_META: Record<string, { label: string; Icon: typeof Youtube }> = {
  youtube: { label: 'YouTube', Icon: Youtube },
  vimeo: { label: 'Vimeo', Icon: VideoIcon },
  drive: { label: 'Drive', Icon: HardDrive },
  other: { label: 'Link', Icon: LinkIcon },
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
    const matchesSearch =
      v.title.toLowerCase().includes(search.toLowerCase()) ||
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

  const handleCardMouse = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
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
        {/* Sticky gradient header */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-6 pt-4 bg-transparent">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#06070d] via-[#06070d]/85 to-transparent" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="rise-in">
              <div className="flex items-center gap-3">
                <span className="relative grid h-11 w-11 place-items-center rounded-2xl glass-tinted">
                  <Film className="h-5 w-5 text-[#d8b4fe]" />
                </span>
                <div>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-violet">
                    Filmy
                  </h1>
                  <p className="text-sm text-white/45 mt-0.5">
                    Baza filmów treningowych do przypisywania uczniom
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={openAddDialog}
              className="shimmer-line relative overflow-hidden group inline-flex items-center gap-2 rounded-2xl px-5 h-12 text-sm font-semibold text-white bg-gradient-to-r from-[#c084fc] to-[#7c3aed] shadow-[0_10px_40px_-12px_rgba(124,58,237,0.6)] hover:shadow-[0_14px_50px_-12px_rgba(124,58,237,0.85)] transition-shadow"
            >
              <Plus className="h-4 w-4" />
              Dodaj film
            </button>
          </div>
        </div>

        {/* Premium glass search + tabs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md rise-in" style={{ animationDelay: '60ms' }}>
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj filmu..."
              className="glass-liquid h-12 w-full rounded-2xl pl-11 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#a855f7]/30 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition"
                aria-label="Wyczyść"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div
            className="glass-liquid relative flex items-center gap-1 rounded-2xl p-1 overflow-x-auto rise-in"
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
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#c084fc]/25 to-[#7c3aed]/25 ring-1 ring-[#c084fc]/30" />
                  )}
                  <span className="relative">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Videos grid */}
        {filteredVideos.length === 0 ? (
          <div
            className="glass-liquid spotlight rise-in rounded-3xl p-16 text-center"
            onMouseMove={handleCardMouse}
          >
            {search || activeTab !== 'all' ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55">Nie znaleziono filmów</p>
              </>
            ) : (
              <>
                <Play className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55 mb-5">Nie masz jeszcze żadnych filmów</p>
                <button
                  onClick={openAddDialog}
                  className="inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white bg-gradient-to-r from-[#c084fc] to-[#7c3aed]"
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
              const Src = SOURCE_META[video.source] || SOURCE_META.other
              return (
                <article
                  key={video.id}
                  onMouseMove={handleCardMouse}
                  className="glass-liquid spotlight rise-in group relative flex flex-col rounded-3xl overflow-hidden transition-transform duration-500 hover:-translate-y-1.5"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden">
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 overflow-hidden m-3">
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
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#c084fc]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Source badge top-left */}
                    <div className="absolute top-5 left-5 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11px] font-medium backdrop-blur-xl bg-black/40 ring-1 ring-white/15 text-white/85">
                      <Src.Icon className="h-3.5 w-3.5" />
                      {Src.label}
                    </div>

                    {/* Duration pill bottom-right */}
                    <div className="absolute bottom-5 right-5 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11px] font-medium backdrop-blur-xl bg-black/50 ring-1 ring-white/15 text-white">
                      <Clock className="h-3 w-3" />
                      {formatDuration(video.duration)}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5 pt-3">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display text-lg font-bold leading-snug line-clamp-2 text-white/90 group-hover:text-gradient-violet transition-colors"
                    >
                      {video.title}
                    </a>
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
                    <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <div className="flex items-center gap-3 text-xs text-white/45">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {video._count.progress} przypisań
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <TagIcon className="h-3.5 w-3.5" />
                          {video.tags.length} tagów
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditDialog(video)}
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-white hover:border-[#c084fc]/25 transition"
                          aria-label="Edytuj"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-white hover:border-[#c084fc]/25 transition"
                          aria-label="Odtwórz"
                        >
                          <Play className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-red-300 hover:border-red-500/30 transition"
                          aria-label="Usuń"
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
      </div>

      {/* Custom glass add/edit dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={() => setDialogOpen(false)}
          />
          <div
            className="glass-liquid spotlight relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-7 rise-in"
            onMouseMove={handleCardMouse}
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                <Sparkles className="h-5 w-5 text-[#d8b4fe]" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-gradient-violet">
                  {editingVideo ? 'Edytuj film' : 'Nowy film treningowy'}
                </h2>
                <p className="text-xs text-white/45">
                  {editingVideo ? 'Zaktualizuj dane filmu' : 'Dodaj nowy film do bazy'}
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
                    placeholder="np. Jak poprawić crosshair placement"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#c084fc]/40 focus:ring-2 focus:ring-[#a855f7]/25 transition"
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                    required
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#c084fc]/40 focus:ring-2 focus:ring-[#a855f7]/25 transition"
                  />
                </div>
                <p className="text-xs text-white/40">
                  Obsługiwane: YouTube, Vimeo, Google Drive, linki bezpośrednie
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="description" className="text-xs font-medium text-white/55">
                  Opis (opcjonalnie)
                </label>
                <textarea
                  id="description"
                  placeholder="Krótki opis co uczeń się nauczy..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={2000}
                  disabled={isLoading}
                  rows={3}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#c084fc]/40 focus:ring-2 focus:ring-[#a855f7]/25 transition resize-none"
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
                          'rounded-lg px-2.5 h-8 text-xs font-medium transition-all',
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
                          className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="inline-flex items-center rounded-2xl px-5 h-11 text-sm font-medium text-white/65 hover:text-white glass-liquid transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="shimmer-line relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white bg-gradient-to-r from-[#c084fc] to-[#7c3aed] disabled:opacity-60 transition"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {editingVideo ? 'Zapisz' : 'Dodaj film'}
                </button>
              </div>
            </form>

            {/* External link hint */}
            {editingVideo && (
              <a
                href={editingVideo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white/70 transition"
              >
                <ExternalLink className="h-3 w-3" />
                Otwórz w nowej karcie
              </a>
            )}
          </div>
        </div>
      )}
    </CoachLayout>
  )
}
