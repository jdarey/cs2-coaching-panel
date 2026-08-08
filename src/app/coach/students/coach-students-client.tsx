'use client'

import { useState } from 'react'
import { formatDate, getInitials, cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Plus, Search, UserPlus, MoreHorizontal, Trash2, Edit, Eye, Mail, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Student {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  _count: { sessionsAsStudent: number; videoProgress: number }
  progressStats: { total: number; pending: number; watching: number; watched: number; implemented: number }
}

interface CoachStudentsClientProps {
  initialStudents: Student[]
}

export function CoachStudentsClient({ initialStudents }: CoachStudentsClientProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ email: '', name: '', password: '' })
  const { toast } = useToast()

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setStudents((prev) => [data, ...prev])
      setDialogOpen(false)
      setFormData({ email: '', name: '', password: '' })
      toast({ title: 'Sukces', description: 'Uczeń został dodany' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tego ucznia? Ta akcja jest nieodwracalna.')) return

    try {
      const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }

      setStudents((prev) => prev.filter((s) => s.id !== studentId))
      toast({ title: 'Sukces', description: 'Uczeń został usunięty' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    }
  }

  const openEditDialog = (student: Student) => {
    setEditingStudent(student)
    setFormData({ email: student.email, name: student.name || '', password: '' })
    setDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingStudent(null)
    setFormData({ email: '', name: '', password: '' })
    setDialogOpen(true)
  }

  const getProgressColor = (status: keyof Student['progressStats']) => {
    switch (status) {
      case 'implemented': return 'bg-purple-100 text-purple-800'
      case 'watched': return 'bg-green-100 text-green-800'
      case 'watching': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressLabel = (status: keyof Student['progressStats']) => {
    switch (status) {
      case 'implemented': return 'Wdrożone'
      case 'watched': return 'Obejrzane'
      case 'watching': return 'Ogląda'
      case 'pending': return 'Do oglądania'
      default: return status
    }
  }

  return (
    <CoachLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Uczniowie</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj swoimi uczniami i śledź ich postępy</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                Dodaj ucznia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingStudent ? 'Edytuj ucznia' : 'Dodaj nowego ucznia'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="uczen@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    disabled={isLoading || !!editingStudent}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Imię (opcjonalnie)</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Jan Kowalski"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                {!editingStudent && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Hasło *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="minimum 6 znaków"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingStudent ? 'Zapisz' : 'Dodaj ucznia'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj ucznia po nazwisku lub emailu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Students Grid */}
        {filteredStudents.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              {search ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">Nie znaleziono uczniów pasujących do wyszukiwania</p>
                </>
              ) : (
                <>
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych uczniów</p>
                  <Button asChild>
                    <Link href="/coach/students" onClick={openAddDialog}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Dodaj pierwszego ucznia
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="overflow-hidden transition-shadow hover:shadow-lg">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={student.avatarUrl || ''} alt={student.name || ''} />
                          <AvatarFallback className="text-lg">{getInitials(student.name || 'U')}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{student.name || 'Bez nazwy'}</h3>
                          <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/coach/students/${student.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Szczegóły
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(student)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edytuj
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Progress Stats */}
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Wszystkie filmy</span>
                        <span className="font-medium">{student.progressStats.total}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {([
                          { key: 'implemented', label: 'Wdrożone' },
                          { key: 'watched', label: 'Obejrzane' },
                          { key: 'watching', label: 'Ogląda' },
                          { key: 'pending', label: 'Do oglądania' },
                        ] as const).map(({ key, label }) => {
                          const count = student.progressStats[key]
                          if (count === 0) return null
                          return (
                            <Badge key={key} variant="secondary" className={cn(getProgressColor(key), 'text-xs')}>
                              {label}: {count}
                            </Badge>
                          )
                        })}
                      </div>
                      {student.progressStats.total > 0 && (
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{
                              width: `${((student.progressStats.watched + student.progressStats.implemented) / student.progressStats.total) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>Dołączył: {formatDate(student.createdAt)}</span>
                      <span>{student._count.sessionsAsStudent} sesji</span>
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

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'