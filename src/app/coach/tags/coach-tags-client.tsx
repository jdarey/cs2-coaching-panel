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
  Loader2,
  Tag as TagIcon,
  Hash,
  Palette,
  Layers,
  Film,
  BookOpen,
  AlertTriangle,
  Target,
  Crosshair,
  Zap,
  Eye,
  Shield,
  Flame,
  Sparkles,
  X,
} from 'lucide-react'

interface Tag {
  id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  isGlobal: boolean
  _count: { videos: number; sessions: number }
}

interface CoachTagsClientProps {
  initialTags: Tag[]
}

const DEFAULT_COLORS = [
  '#2fb6a2', '#2de5ca', '#2de5ca', '#ec4899',
  '#fbbf24', '#2de5ca', '#34d399', '#8cffef',
  '#f97316', '#6366f1',
]

const ICON_OPTIONS = [
  { name: 'AlertTriangle', Icon: AlertTriangle },
  { name: 'Target', Icon: Target },
  { name: 'Crosshair', Icon: Crosshair },
  { name: 'Zap', Icon: Zap },
  { name: 'Eye', Icon: Eye },
  { name: 'Shield', Icon: Shield },
  { name: 'Flame', Icon: Flame },
  { name: 'Tag', Icon: TagIcon },
  { name: 'Hash', Icon: Hash },
  { name: 'Layers', Icon: Layers },
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'Film', Icon: Film },
]

function resolveIcon(name: string | null) {
  if (!name) return null
  const found = ICON_OPTIONS.find((o) => o.name.toLowerCase() === name.toLowerCase())
  return found ? found.Icon : null
}

function lighten(hex: string, amt = 60) {
  const c = hex.replace('#', '')
  if (c.length !== 6) return hex
  const num = parseInt(c, 16)
  let r = (num >> 16) + amt
  let g = ((num >> 8) & 0x00ff) + amt
  let b = (num & 0x0000ff) + amt
  r = Math.min(255, Math.max(0, r))
  g = Math.min(255, Math.max(0, g))
  b = Math.min(255, Math.max(0, b))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function CoachTagsClient({ initialTags }: CoachTagsClientProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLORS[0],
    icon: '',
  })
  const { toast } = useToast()

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  )

  const usedCount = tags.filter((t) => t._count.videos > 0 || t._count.sessions > 0).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags'
      const method = editingTag ? 'PUT' : 'POST'

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

      if (editingTag) {
        setTags((prev) => prev.map((t) => (t.id === editingTag.id ? data : t)))
        toast({ title: 'Sukces', description: 'Tag zaktualizowany' })
      } else {
        setTags((prev) => [data, ...prev])
        toast({ title: 'Sukces', description: 'Tag dodany' })
      }

      setDialogOpen(false)
      resetForm()
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (tagId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten tag? Zostanie usunięty z wszystkich sesji i filmów.'))
      return

    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setTags((prev) => prev.filter((t) => t.id !== tagId))
      toast({ title: 'Sukces', description: 'Tag usunięty' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    }
  }

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color,
      icon: tag.icon || '',
    })
    setDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingTag(null)
    resetForm()
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', color: DEFAULT_COLORS[0], icon: '' })
  }

  
  const stats = [
    { label: 'Wszystkie tagi', value: tags.length, Icon: Hash },
    { label: 'Używane', value: usedCount, Icon: Layers },
    { label: 'Dostępne kolory', value: DEFAULT_COLORS.length, Icon: Palette },
  ]

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {/* Gradient header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="rise-in">
            <div className="flex items-center gap-3">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl glass-tinted">
                <TagIcon className="h-5 w-5 text-[#8cffef]" />
              </span>
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-violet">
                  Tagi
                </h1>
                <p className="text-sm text-white/45 mt-0.5">
                  Zarządzaj kategoriami błędów do przypisywania filmów
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openAddDialog}
            className=" relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-12 text-sm font-semibold text-white btn-darey shadow-[0_10px_40px_-12px_rgba(124,58,237,0.6)] hover:shadow-[0_14px_50px_-12px_rgba(124,58,237,0.85)] transition-shadow rise-in"
            style={{ animationDelay: '80ms' }}
          >
            <Plus className="h-4 w-4" />
            Nowy tag
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {stats.map((s, i) => (
            <div
              key={s.label} className="glass-liquid rise-in flex items-center gap-3 rounded-2xl p-4"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                <s.Icon className="h-5 w-5 text-[#8cffef]" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold leading-none text-white">
                  {s.value}
                </p>
                <p className="text-xs text-white/45 mt-1 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-8 rise-in" style={{ animationDelay: '180ms' }}>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            placeholder="Szukaj tagu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-liquid h-12 w-full rounded-2xl pl-11 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#2fb6a2]/30 transition"
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

        {/* Tag grid */}
        {filteredTags.length === 0 ? (
          <div
            className="glass-liquid rise-in rounded-3xl p-16 text-center" >
            {search ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55">Nie znaleziono tagów</p>
              </>
            ) : (
              <>
                <TagIcon className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55 mb-5">Nie masz jeszcze żadnych tagów</p>
                <button
                  onClick={openAddDialog}
                  className="inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey"
                >
                  <Plus className="h-4 w-4" />
                  Dodaj pierwszy tag
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTags.map((tag, i) => {
              const ResolvedIcon = resolveIcon(tag.icon)
              const accent = lighten(tag.color, 60)
              return (
                <article
                  key={tag.id} className="glass-liquid rise-in group relative flex flex-col rounded-3xl p-5"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg ring-1 ring-white/15"
                      style={{
                        background: `linear-gradient(135deg, ${tag.color} 0%, ${accent} 100%)`,
                        boxShadow: `0 10px 30px -10px ${tag.color}90`,
                      }}
                    >
                      {ResolvedIcon ? <ResolvedIcon className="h-6 w-6" /> : <TagIcon className="h-6 w-6" />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditDialog(tag)}
                        className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-white hover:border-[#2de5ca]/25 transition"
                        aria-label="Edytuj"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="grid h-9 w-9 place-items-center rounded-xl text-red-300/70 hover:text-red-200 transition border border-red-500/15 hover:border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                        aria-label="Usuń"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display text-lg font-bold text-white/90 group-hover:text-gradient-violet transition-colors line-clamp-1">
                    {tag.name}
                  </h3>

                  {tag.description && (
                    <p className="mt-1 text-sm text-white/45 line-clamp-2">{tag.description}</p>
                  )}

                  {/* Usage badge */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[11px] font-medium glass-liquid text-white/65">
                      <Film className="h-3 w-3" />
                      {tag._count.videos} filmów
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[11px] font-medium glass-liquid text-white/65">
                      <BookOpen className="h-3 w-3" />
                      {tag._count.sessions} sesji
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium"
                      style={{ color: tag.isGlobal ? '#8cffef' : '#94a3b8' }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tag.isGlobal ? '#2fb6a2' : '#64748b' }}
                      />
                      {tag.isGlobal ? 'Globalny' : 'Prywatny'}
                    </span>
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
            className="glass-liquid relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-7 rise-in" >
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                <Sparkles className="h-5 w-5 text-[#8cffef]" />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-gradient-violet">
                  {editingTag ? 'Edytuj tag' : 'Nowy tag błędu'}
                </h2>
                <p className="text-xs text-white/45">
                  {editingTag ? 'Zaktualizuj kategorię' : 'Utwórz nową kategorię błędów'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-medium text-white/55">
                  Nazwa *
                </label>
                <div className="relative">
                  <TagIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    id="name"
                    name="name"
                    placeholder="np. Peeking bez info"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    maxLength={50}
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#2de5ca]/40 focus:ring-2 focus:ring-[#2fb6a2]/25 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="description" className="text-xs font-medium text-white/55">
                  Opis (opcjonalnie)
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Opis błędu..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={500}
                  disabled={isLoading}
                  rows={2}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 pl-11 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#2de5ca]/40 focus:ring-2 focus:ring-[#2fb6a2]/25 transition resize-none"
                />
              </div>

              {/* Color picker */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/55">Kolor</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => {
                    const selected = formData.color === color
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, color }))}
                        className={cn(
                          'h-9 w-9 rounded-xl ring-1 ring-white/15 transition-all',
                          selected
                            ? 'ring-2 ring-white scale-110 shadow-lg'
                            : 'hover:scale-105 hover:ring-white/30'
                        )}
                        style={{
                          backgroundColor: color,
                          boxShadow: selected ? `0 6px 20px -4px ${color}` : undefined,
                        }}
                        aria-label={color}
                        aria-pressed={selected}
                      />
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <label
                    className="relative grid h-12 w-12 cursor-pointer place-items-center overflow-hidden rounded-xl glass-liquid ring-1 ring-white/[0.08]"
                    title="Wybierz własny kolor"
                  >
                    <Palette className="h-5 w-5 text-white/50 pointer-events-none" />
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <div
                    className="h-3 w-24 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${formData.color}, ${lighten(formData.color, 60)})`,
                    }}
                  />
                  <span className="text-xs font-mono text-white/55">{formData.color}</span>
                </div>
              </div>

              {/* Icon picker */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/55">
                  Ikona Lucide (opcjonalnie)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const selected = formData.icon === opt.name
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            icon: selected ? '' : opt.name,
                          }))
                        }
                        className={cn(
                          'grid h-11 w-full place-items-center rounded-xl transition-all',
                          selected
                            ? 'glass-tinted text-white'
                            : 'glass-liquid text-white/55 hover:text-white'
                        )}
                        aria-label={opt.name}
                        aria-pressed={selected}
                      >
                        <opt.Icon className="h-5 w-5" />
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-white/40">
                  Wybrana: <span className="text-white/65">{formData.icon || 'brak'}</span>
                </p>
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
                  className=" relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-60 transition"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {editingTag ? 'Zapisz' : 'Dodaj tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CoachLayout>
  )
}
