'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Search, Trash2, Pencil, Loader2, X, Sparkles, UserPlus, ListChecks,
  CalendarRange, Clock, Film, Check, ChevronDown, PlayCircle, Users,
} from 'lucide-react'

interface RoutineTask {
  id?: string
  title: string
  description: string | null
  videoId: string | null
  day: number
  minutes: number | null
}

interface Routine {
  id: string
  title: string
  description: string | null
  tasks: RoutineTask[]
  assignments: { id: string; status: string; student: { id: string; name: string | null; email: string } }[]
}

interface Student {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface Video {
  id: string
  title: string
  url: string
  thumbnail: string | null
}

interface CoachRoutinesClientProps {
  initialRoutines: Routine[]
  initialStudents: Student[]
  initialVideos: Video[]
}

const emptyTask = (day = 1): RoutineTask => ({
  title: '',
  description: null,
  videoId: null,
  day,
  minutes: null,
})

export function CoachRoutinesClient({ initialRoutines, initialStudents, initialVideos }: CoachRoutinesClientProps) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines)
  const [students] = useState<Student[]>(initialStudents)
  const [videos] = useState<Video[]>(initialVideos)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)
  const [assigning, setAssigning] = useState<Routine | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [tasks, setTasks] = useState<RoutineTask[]>([emptyTask(1)])
  const [assignStudentId, setAssignStudentId] = useState('')
  const { toast } = useToast()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return routines
    return routines.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.tasks.some((t) => t.title.toLowerCase().includes(q))
    )
  }, [routines, search])

  const dayCount = (r: Routine) => Array.from(new Set(r.tasks.map((t) => t.day))).length
  const totalMinutes = (r: Routine) => r.tasks.reduce((acc, t) => acc + (t.minutes ?? 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTasks = tasks.filter((t) => t.title.trim())
    if (!formData.title.trim() || cleanTasks.length === 0) return

    setIsLoading(true)
    try {
      const url = editing ? `/api/routines/${editing.id}` : '/api/routines'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          tasks: cleanTasks.map((t) => ({
            id: t.id || undefined,
            title: t.title,
            description: t.description || null,
            videoId: t.videoId || null,
            day: Math.max(1, t.day),
            minutes: t.minutes || null,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      if (editing) {
        setRoutines((prev) => prev.map((r) => (r.id === editing.id ? data : r)))
        toast({ title: 'Sukces', description: 'Rutyna zaktualizowana' })
      } else {
        setRoutines((prev) => [{ ...data, assignments: [] }, ...prev])
        toast({ title: 'Sukces', description: 'Rutyna utworzona' })
      }
      closeDialog()
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (r: Routine) => {
    if (!confirm(`Czy na pewno chcesz usunąć rutynę „${r.title}"?`)) return
    try {
      const res = await fetch(`/api/routines/${r.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      setRoutines((prev) => prev.filter((x) => x.id !== r.id))
      toast({ title: 'Sukces', description: 'Rutyna usunięta' })
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assigning || !assignStudentId) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/routines/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineId: assigning.id, studentId: assignStudentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      const student = students.find((s) => s.id === assignStudentId)
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === assigning.id
            ? { ...r, assignments: [{ id: data.id, status: data.status, student: { id: student?.id ?? '', name: student?.name ?? null, email: student?.email ?? '' } }] }
            : r
        )
      )
      toast({ title: 'Sukces', description: `Rutyna przypisana do ${student?.name || student?.email || 'ucznia'}` })
      setAssignDialogOpen(false)
      setAssignStudentId('')
    } catch {
      toast({ title: 'Błąd', description: 'Wystąpił błąd serwera', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const openAddDialog = () => {
    setEditing(null)
    setFormData({ title: '', description: '' })
    setTasks([emptyTask(1)])
    setDialogOpen(true)
  }

  const openEditDialog = (r: Routine) => {
    setEditing(r)
    setFormData({ title: r.title, description: r.description || '' })
    setTasks(r.tasks.length ? r.tasks.map((t) => ({ ...t })) : [emptyTask(1)])
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const updateTask = (i: number, patch: Partial<RoutineTask>) => {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader
          icon={ListChecks}
          label="Programy treningowe"
          title="Rutyny"
          subtitle="Wielodniowe programy treningowe — rozbij trening na konkretne zadania i przypisz je uczniom"
        >
          <button
            onClick={openAddDialog}
            className="group relative inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-semibold text-white btn-primary-gradient"
          >
            <Plus className="h-4 w-4" />
            Nowa rutyna
          </button>
        </PageHeader>

        {/* Search */}
        <div className="relative max-w-md mb-8 animate-rise-in" style={{ animationDelay: '60ms' }}>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj rutyny lub zadania..."
            className="glass-liquid h-12 w-full rounded-2xl pl-11 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#8b5cf6]/30 transition"
            aria-label="Szukaj rutyn"
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

        {/* Routines grid */}
        {filtered.length === 0 ? (
          <div className="glass-liquid animate-rise-in rounded-3xl p-16 text-center">
            {search ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55">Nie znaleziono rutyn pasujących do kryteriów</p>
              </>
            ) : (
              <>
                <ListChecks className="h-12 w-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/55 mb-5">
                  Nie masz jeszcze żadnych rutyn. Stwórz pierwszy program treningowy — rozbij go na dni i zadania.
                </p>
                <button
                  onClick={openAddDialog}
                  className="inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey"
                >
                  <Plus className="h-4 w-4" />
                  Stwórz pierwszą rutynę
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => {
              const days = dayCount(r)
              const mins = totalMinutes(r)
              const doneAssignments = r.assignments.filter((a) => a.status === 'COMPLETED').length
              return (
                <article
                  key={r.id}
                  className="glass-liquid rise-in spotlight-card sheen group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)]"
                  style={{ animationDelay: `${i * 70}ms` }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`)
                    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`)
                  }}
                >
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6)]">
                        <ListChecks className="h-5 w-5 text-white" strokeWidth={2.2} />
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {r.assignments.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[11px] font-medium glass-liquid text-[#c4b5fd]">
                            <Users className="h-3 w-3" />
                            {r.assignments.length} przypisań
                          </span>
                        )}
                        {doneAssignments > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[11px] font-medium glass-liquid text-[#4ade80]">
                            <Check className="h-3 w-3" />
                            {doneAssignments} ukończonych
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-display text-lg font-bold leading-snug text-white/90 group-hover:text-gradient-violet transition-colors">
                      {r.title}
                    </h3>
                    {r.description && <p className="mt-1.5 text-sm text-white/45 line-clamp-2">{r.description}</p>}

                    {/* Stats */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/50">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarRange className="h-3.5 w-3.5 text-[#a78bfa]" />
                        {days} {days === 1 ? 'dzień' : days < 5 ? 'dni' : 'dni'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5 text-[#a78bfa]" />
                        {r.tasks.length} {r.tasks.length === 1 ? 'zadanie' : 'zadań'}
                      </span>
                      {mins > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#a78bfa]" />
                          ~{mins} min
                        </span>
                      )}
                    </div>

                    {/* Mini day preview */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {Array.from(new Set(r.tasks.map((t) => t.day)))
                        .sort((a, b) => a - b)
                        .map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[11px] font-semibold glass-liquid text-white/75"
                          >
                            Dzień {d}
                            <span className="text-white/40">
                              {r.tasks.filter((t) => t.day === d).length}
                            </span>
                          </span>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
                      <button
                        onClick={() => { setAssigning(r); setAssignStudentId(''); setAssignDialogOpen(true) }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 h-9 text-xs font-semibold text-white btn-darey transition-all"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Przypisz
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditDialog(r)}
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-white hover:border-[#a78bfa]/25 transition"
                          aria-label="Edytuj rutynę"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-red-300 hover:border-red-500/30 transition"
                          aria-label="Usuń rutynę"
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

        {/* Create/edit dialog */}
        {dialogOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={closeDialog} aria-hidden="true" />
            <div
              className="glass-liquid relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-7 animate-rise-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="routine-dialog-title"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <Sparkles className="h-5 w-5 text-[#c4b5fd]" />
                </span>
                <div>
                  <h2 id="routine-dialog-title" className="font-display text-xl font-bold text-gradient-violet">
                    {editing ? 'Edytuj rutynę' : 'Nowa rutyna treningowa'}
                  </h2>
                  <p className="text-xs text-white/45">
                    Program rozłożony na dni — każde zadanie może mieć przypisany film z biblioteki
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="r-title" className="text-xs font-medium text-white/55">
                    Nazwa rutyny *
                  </label>
                  <div className="relative">
                    <ListChecks className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="r-title"
                      placeholder="np. Tydzień focusa na crosshair placement"
                      value={formData.title}
                      onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                      required
                      disabled={isLoading}
                      className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-11 pr-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="r-desc" className="text-xs font-medium text-white/55">
                    Opis (opcjonalnie)
                  </label>
                  <textarea
                    id="r-desc"
                    placeholder="Cel tej rutyny i czego uczeń się nauczy..."
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    maxLength={2000}
                    disabled={isLoading}
                    rows={2}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition resize-none"
                  />
                </div>

                {/* Tasks builder */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white/55">Zadania (dzień po dniu)</label>
                    <button
                      type="button"
                      onClick={() => setTasks((prev) => [...prev, emptyTask(1)])}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 h-8 text-xs font-semibold text-[#c4b5fd] hover:bg-white/[0.05] transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Dodaj zadanie
                    </button>
                  </div>

                  {tasks.map((t, i) => (
                    <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#a78bfa]/15 text-[#c4b5fd] text-xs font-bold">
                          {i + 1}
                        </span>
                        <input
                          value={t.title}
                          onChange={(e) => updateTask(i, { title: e.target.value })}
                          placeholder="np. 30 minut DM z focusem na peeking"
                          disabled={isLoading}
                          className="h-10 flex-1 min-w-0 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setTasks((prev) => prev.filter((_, idx) => idx !== i))}
                          disabled={isLoading || tasks.length === 1}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/50 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-30"
                          aria-label="Usuń zadanie"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-white/45">Dzień</label>
                          <div className="relative mt-1">
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={t.day}
                              onChange={(e) => updateTask(i, { day: Math.max(1, parseInt(e.target.value) || 1) })}
                              disabled={isLoading}
                              className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 text-sm text-white outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-white/45">Minuty (opcjonalnie)</label>
                          <div className="relative mt-1">
                            <input
                              type="number"
                              min={1}
                              max={600}
                              value={t.minutes ?? ''}
                              onChange={(e) => updateTask(i, { minutes: e.target.value ? Math.max(1, parseInt(e.target.value)) : null })}
                              disabled={isLoading}
                              placeholder="—"
                              className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-white/45">Film z biblioteki (opcjonalnie)</label>
                        <div className="relative mt-1">
                          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <select
                            value={t.videoId ?? ''}
                            onChange={(e) => updateTask(i, { videoId: e.target.value || null })}
                            disabled={isLoading}
                            className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-3.5 pr-10 text-sm text-white appearance-none outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                          >
                            <option value="">Bez filmu</option>
                            {videos.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={isLoading}
                    className="inline-flex items-center rounded-2xl px-5 h-11 text-sm font-medium text-white/65 hover:text-white glass-liquid transition"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !formData.title.trim() || tasks.filter((t) => t.title.trim()).length === 0}
                    className="relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {editing ? 'Zapisz zmiany' : 'Stwórz rutynę'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign dialog */}
        {assignDialogOpen && assigning && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xl"
              onClick={() => setAssignDialogOpen(false)}
              aria-hidden="true"
            />
            <div
              className="glass-liquid relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-7 animate-rise-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="assign-r-title"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl glass-tinted">
                  <UserPlus className="h-5 w-5 text-[#c4b5fd]" />
                </span>
                <div>
                  <h2 id="assign-r-title" className="font-display text-xl font-bold text-gradient-violet">
                    Przypisz rutynę
                  </h2>
                  <p className="text-xs text-white/45 mt-1 line-clamp-1">{assigning.title}</p>
                </div>
              </div>

              <form onSubmit={handleAssign} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="r-student" className="text-xs font-medium text-white/55">
                    Uczeń *
                  </label>
                  <div className="relative">
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <select
                      id="r-student"
                      value={assignStudentId}
                      onChange={(e) => setAssignStudentId(e.target.value)}
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
                  <p className="text-xs text-white/40">
                    Uczeń zobaczy rutynę w swoich zadaniach i będzie odhaczał kolejne dni.
                  </p>
                </div>

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
                    disabled={isLoading || !assignStudentId}
                    className="relative overflow-hidden inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey disabled:opacity-40 disabled:cursor-not-allowed transition"
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
