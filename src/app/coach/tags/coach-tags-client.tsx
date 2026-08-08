'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Trash2, Edit, Loader2, Palette, Tag } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1',
]

export function CoachTagsClient({ initialTags }: CoachTagsClientProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', color: DEFAULT_COLORS[0], icon: '' })
  const { toast } = useToast()

  const filteredTags = tags.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
  )

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
    if (!confirm('Czy na pewno chcesz usunąć ten tag? Zostanie usunięty z wszystkich sesji i filmów.')) return

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
    setFormData({ name: tag.name, description: tag.description || '', color: tag.color, icon: tag.icon || '' })
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

  return (
    <CoachLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tagi błędów</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj kategoriami błędów do przypisywania filmów</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj tag
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTag ? 'Edytuj tag' : 'Nowy tag błędu'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nazwa *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="np. Peeking bez info"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    maxLength={50}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Opis (opcjonalnie)</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Opis błędu..."
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    maxLength={500}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kolor</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, color }))}
                        className={cn(
                          'w-8 h-8 rounded-lg border-2 transition-all',
                          formData.color === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={color}
                        aria-pressed={formData.color === color}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Ikona Lucide (opcjonalnie)</Label>
                  <Input
                    id="icon"
                    name="icon"
                    placeholder="np. AlertTriangle, Target, Crosshair"
                    value={formData.icon}
                    onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Nazwa ikony z <a href="https://lucide.dev/icons/" target="_blank" rel="noopener" className="underline">lucide.dev</a></p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingTag ? 'Zapisz' : 'Dodaj tag'}
                  </Button>
                </DialogFooter              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj tagu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tags Grid */}
        {filteredTags.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              {search ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Nie znaleziono tagów</p>
                </>
              ) : (
                <>
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych tagów</p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj pierwszy tag
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTags.map((tag) => (
              <Card key={tag.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.icon && (
                            <span className="text-lg">{tag.icon}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{tag.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tag._count.videos} filmów · {tag._count.sessions} sesji
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(tag)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(tag.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {tag.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tag.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className={tag.isGlobal ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}>
                        {tag.isGlobal ? 'Globalny' : 'Prywatny'}
                      </Badge>
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