'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Search, Trash2, Pencil, Loader2, X, Sparkles, UserPlus, ListChecks,
  CalendarRange, Clock, Film, Check, ChevronDown, ChevronUp, PlayCircle, Users, MapPin, Repeat,
  Image, Zap, GripVertical, BookmarkPlus, FileText, ArrowUp, ArrowDown, LinkIcon, Globe, Eye,
} from 'lucide-react'
import { StudentPicker } from '@/components/student-picker'
import { getYouTubeId } from '@/lib/utils'
import dynamic from 'next/dynamic'
const YoutubeCustomPlayer = dynamic(() => import('@/components/youtube-custom-player').then(m => m.YoutubeCustomPlayer), { ssr: false, loading: () => <div className="yt-force-dark w-full h-full grid place-items-center bg-black/40 text-white/30 text-sm">Ładowanie odtwarzacza…</div> })

interface RoutineTask {
  id?: string
  title: string
  description: string | null
  videoId: string | null
  steamMapUrl: string | null
  gifUrl: string | null
  linkUrl: string | null
  day: number
  minutes: number | null
}

interface Routine {
  id: string
  title: string
  description: string | null
  recurring: boolean
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

// Kolorystyka kart ćwiczeń — rotowana po indeksie, żeby lista nie była
// monotonna: pasek akcentu + gradient numeru + poświata w kolorze.
const TASK_ACCENTS = [
  { bar: '#a78bfa', from: '#a78bfa', to: '#6d28d9', soft: 'rgba(139,92,246,0.10)' },
  { bar: '#2dd4bf', from: '#2dd4bf', to: '#0f766e', soft: 'rgba(45,212,191,0.08)' },
  { bar: '#fbbf24', from: '#fbbf24', to: '#b45309', soft: 'rgba(251,191,36,0.08)' },
  { bar: '#38bdf8', from: '#38bdf8', to: '#1d4ed8', soft: 'rgba(56,189,248,0.08)' },
  { bar: '#f472b6', from: '#f472b6', to: '#be185d', soft: 'rgba(244,114,182,0.08)' },
]

interface ExercisePreset {
  id: string
  title: string
  description: string | null
  videoId: string | null
  gifUrl: string | null
  steamMapUrl: string | null
  linkUrl: string | null
  minutes: number | null
  tags: string[]
}

interface CoachRoutinesClientProps {
  initialRoutines: Routine[]
  initialStudents: Student[]
  initialVideos: Video[]
  initialExercisePresets: ExercisePreset[]
}

const emptyTask = (day = 1): RoutineTask => ({
  title: '',
  description: null,
  videoId: null,
  steamMapUrl: null,
  gifUrl: null,
  linkUrl: null,
  day,
  minutes: null,
})

function mdToHtml(md: string): string {
  if (!md) return ''
  let html = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#c4b5fd] underline hover:text-white">$1</a>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-white/90">$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-xs">$1</code>')
  const lines = html.split('\n')
  let out = '', inList = false
  for (const line of lines) {
    if (/^\s*[-•]\s+/.test(line)) {
      if (!inList) { out += '<ul class="list-disc list-inside space-y-1 my-2 marker:text-[#a78bfa]">'; inList = true }
      out += `<li>${line.replace(/^\s*[-•]\s+/, '')}</li>`
    } else {
      if (inList) { out += '</ul>'; inList = false }
      if (line.trim()==='') out += ''
      else out += `<p class="my-1 leading-relaxed">${line}</p>`
    }
  }
  if (inList) out += '</ul>'
  return out
}

export function CoachRoutinesClient({ initialRoutines, initialStudents, initialVideos, initialExercisePresets }: CoachRoutinesClientProps) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines)
  const [students] = useState<Student[]>(initialStudents)
  const [videos] = useState<Video[]>(initialVideos)
  const [exercisePresets] = useState<ExercisePreset[]>(initialExercisePresets)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Routine | null>(null)
  const [assigning, setAssigning] = useState<Routine | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', recurring: true })
  const [tasks, setTasks] = useState<RoutineTask[]>([emptyTask(1)])
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignEndsAt, setAssignEndsAt] = useState('')
  const [presetPickerOpen, setPresetPickerOpen] = useState(false)
  const [presetSearch, setPresetSearch] = useState('')
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [previewRoutine, setPreviewRoutine] = useState<Routine | null>(null)
  const [previewTask, setPreviewTask] = useState<RoutineTask | null>(null)
  const { toast } = useToast()

  const addPresetToTasks = (p: ExercisePreset) => {
    setTasks(prev=> [...prev, { title: p.title, description: p.description, videoId: p.videoId, gifUrl: p.gifUrl, steamMapUrl: p.steamMapUrl, linkUrl: p.linkUrl, day: 1, minutes: p.minutes }])
    toast({ title: 'Dodano', description: `"${p.title}" dodane do rutyny` })
  }

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const handleDragStart = (idx: number) => setDraggedIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx) }
  const handleDragLeave = () => setDragOverIdx(null)
  const handleDrop = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) { setDraggedIdx(null); setDragOverIdx(null); return }
    setTasks(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(draggedIdx, 1)
      copy.splice(idx, 0, moved)
      return copy
    })
    setDraggedIdx(null); setDragOverIdx(null)
  }
  const moveTask = (idx: number, dir: -1 | 1) => {
    const to = idx + dir
    if (to < 0 || to >= tasks.length) return
    setTasks(prev => {
      const copy = [...prev]
      const [m] = copy.splice(idx, 1)
      copy.splice(to, 0, m)
      return copy
    })
  }

  const saveTaskAsPreset = async (t: RoutineTask) => {
    if (!t.title.trim()) { toast({ title: 'Błąd', description: 'Najpierw wpisz nazwę ćwiczenia', variant: 'destructive' }); return }
    try {
      const res = await fetch('/api/exercise-presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t.title, description: t.description, videoId: t.videoId, gifUrl: t.gifUrl, steamMapUrl: t.steamMapUrl, linkUrl: t.linkUrl, minutes: t.minutes }) })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'Błąd', description: data.error, variant: 'destructive' }); return }
      toast({ title: 'Zapisano', description: `"${t.title}" zapisane jako preset` })
    } catch { toast({ title: 'Błąd', variant: 'destructive' }) }
  }
  const wrapSelection = (id: string, before: string, after: string, placeholder: string, setter: (v:string)=>void, current: string | null) => {
    const el = document.getElementById(id) as HTMLTextAreaElement | null
    const val = current || ''
    if (!el) { setter(val ? val + '\n' + before + placeholder + after : before + placeholder + after); return }
    const s = el.selectionStart, e = el.selectionEnd
    const sel = el.value.substring(s, e) || placeholder
    const nv = el.value.substring(0, s) + before + sel + after + el.value.substring(e)
    setter(nv)
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+before.length, s+before.length+sel.length)},0)
  }

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
    if (!formData.title.trim() || cleanTasks.length === 0) {
      toast({ title: 'Uzupełnij formularz', description: 'Nazwa rutyny i min. jedno ćwiczenie z tytułem są wymagane', variant: 'destructive' })
      return
    }

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
          recurring: formData.recurring,
          tasks: cleanTasks.map((t) => ({
            id: t.id || undefined,
            title: t.title,
            description: t.description || null,
            videoId: t.videoId || null,
            steamMapUrl: t.steamMapUrl || null,
            gifUrl: t.gifUrl || null,
            linkUrl: t.linkUrl || null,
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
        body: JSON.stringify({ routineId: assigning.id, studentId: assignStudentId, endsAt: assignEndsAt || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Błąd', description: data.error, variant: 'destructive' })
        return
      }
      const student = students.find((s) => s.id === assignStudentId)
      const fresh = { id: data.id, status: data.status, student: { id: student?.id ?? '', name: student?.name ?? null, email: student?.email ?? '' } }
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === assigning.id
            ? { ...r, assignments: [...r.assignments.filter((a) => a.id !== fresh.id), fresh] }
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
    setFormData({ title: '', description: '', recurring: true })
    setTasks([emptyTask(1)])
    setDialogOpen(true)
  }

  const openEditDialog = (r: Routine) => {
    setEditing(r)
    setFormData({ title: r.title, description: r.description || '', recurring: r.recurring })
    setTasks(r.tasks.length ? r.tasks.map((t) => ({ ...t, gifUrl: t.gifUrl || null, steamMapUrl: t.steamMapUrl || null, linkUrl: t.linkUrl || null })) : [emptyTask(1)])
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
                  className="glass-liquid rise-in spotlight-card group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)]"
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

                    <h3 className="font-display text-lg font-bold leading-snug text-white/90 group-hover:text-gradient-violet">
                      {r.title}
                    </h3>
                      {r.description && <p className="mt-1.5 text-sm text-white/45 line-clamp-2">{r.description}</p>}

                      {r.recurring && (
                        <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-lg px-2 h-6 text-[11px] font-semibold glass-liquid text-[#c4b5fd]">
                          <Repeat className="h-3 w-3" />
                          Powtarzana codziennie
                        </span>
                      )}

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
                        onClick={() => { setAssigning(r); setAssignStudentId(''); setAssignEndsAt(''); setAssignDialogOpen(true) }}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 h-9 text-xs font-semibold text-white btn-darey transition-all"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Przypisz
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreviewRoutine(r)}
                          className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/65 hover:text-white hover:border-[#2de5ca]/25 transition"
                          aria-label="Podgląd rutyny"
                          title="Podgląd — jak zobaczy uczeń"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
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
              className="glass-liquid relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl p-8 animate-rise-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="routine-dialog-title"
            >
              <div className="mb-8 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa]/20 to-[#6d28d9]/20 border border-white/[0.08]">
                  <Sparkles className="h-5 w-5 text-[#c4b5fd]" />
                </span>
                <div>
                  <h2 id="routine-dialog-title" className="font-display text-2xl font-bold text-gradient-violet">
                    {editing ? 'Edytuj rutynę' : 'Nowa rutyna treningowa'}
                  </h2>
                  <p className="text-sm text-white/50 mt-1">
                    Stwórz przyjemny program — dodawaj ćwiczenia, przeciągaj by zmienić kolejność, dodaj GIF i film
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    Opis (opcjonalnie) — wspiera **pogrubienie**, *kursywę*, `kod`, [link](url), - lista
                  </label>
                  <div className="flex gap-1">
                    <button type="button" onClick={()=>wrapSelection('r-desc','**','**','pogrubienie', v=>setFormData(p=>({...p, description:v})), formData.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.1]">B</button>
                    <button type="button" onClick={()=>wrapSelection('r-desc','*','*','kursywa', v=>setFormData(p=>({...p, description:v})), formData.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs italic text-white hover:bg-white/[0.1]">I</button>
                    <button type="button" onClick={()=>wrapSelection('r-desc','- ','','lista', v=>setFormData(p=>({...p, description:v})), formData.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white hover:bg-white/[0.1]">•</button>
                    <button type="button" onClick={()=>wrapSelection('r-desc','[','](https://)', 'tekst', v=>setFormData(p=>({...p, description:v})), formData.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white hover:bg-white/[0.1]">Link</button>
                    <button type="button" onClick={()=>wrapSelection('r-desc','`','`','kod', v=>setFormData(p=>({...p, description:v})), formData.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white hover:bg-white/[0.1]">`</button>
                  </div>
                  <textarea
                    id="r-desc"
                    placeholder="Cel tej rutyny i czego uczeń się nauczy... **pogrubienie** *kursywa* - lista [link](https://)"
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    maxLength={2000}
                    disabled={isLoading}
                    rows={3}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition resize-none"
                  />
                  {formData.description && <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/80" dangerouslySetInnerHTML={{__html: mdToHtml(formData.description)}} />}
                </div>

                {/* Recurring toggle */}
                <label
                  htmlFor="r-recurring"
                  className="flex items-start gap-3 rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 cursor-pointer hover:border-[#a78bfa]/25 transition"
                >
                  <input
                    id="r-recurring"
                    type="checkbox"
                    checked={formData.recurring}
                    onChange={(e) => setFormData((p) => ({ ...p, recurring: e.target.checked }))}
                    disabled={isLoading}
                    className="mt-0.5 h-4 w-4 accent-[#8b5cf6]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-white/85">
                      <Repeat className="h-3.5 w-3.5 text-[#a78bfa]" />
                      Rutyna codzienna (domyślnie)
                    </span>
                    <span className="block mt-0.5 text-xs text-white/45">
                      Po odhaczeniu wszystkich zadań rutyna zaczyna się od nowa każdego dnia — trwa, dopóki przy
                      przypisaniu nie ustawisz daty zakończenia. Odznacz, jeśli to jednorazowy program.
                    </span>
                  </span>
                </label>

                {/* Tasks builder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white/70">Ćwiczenia — przeciągnij <GripVertical className="w-3 h-3 inline text-white/30"/> by zmienić kolejność</label>
                    <div className="flex items-center gap-2">
                      {exercisePresets.length > 0 && (
                        <button type="button" onClick={()=>setPresetPickerOpen(true)} disabled={isLoading} className="inline-flex items-center gap-1.5 rounded-xl px-4 h-10 text-xs font-bold bg-gradient-to-br from-[#a78bfa]/15 to-[#8b5cf6]/15 border border-[#a78bfa]/20 text-[#c4b5fd] hover:from-[#a78bfa]/25 hover:to-[#8b5cf6]/25 transition"><Zap className="w-3.5 h-3.5"/>Biblioteka ({exercisePresets.length})</button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTasks((prev) => [...prev, emptyTask(1)])}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl px-4 h-10 text-xs font-bold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] hover:opacity-90 transition shadow"
                      >
                        <Plus className="h-4 w-4" />
                        Dodaj ćwiczenie
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2 -mr-2">
                  {tasks.map((t, i) => (
                    <div key={i} draggable onDragStart={()=>handleDragStart(i)} onDragOver={(e)=>handleDragOver(e,i)} onDragLeave={handleDragLeave} onDrop={()=>handleDrop(i)} className={cn("relative overflow-hidden rounded-2xl bg-white/[0.02] border p-5 pl-6 space-y-4 transition shadow-sm", draggedIdx===i ? "opacity-40 border-[#a78bfa]/40 ring-2 ring-[#a78bfa]/30 scale-[0.98]" : dragOverIdx===i ? "border-[#a78bfa]/50 bg-[#a78bfa]/[0.06] ring-1 ring-[#a78bfa]/20" : "border-white/[0.06] hover:border-white/[0.10] hover:bg-white/[0.03]")}>
                      {/* Kolorowy pasek akcentu + poświata (rotowane po indeksie) */}
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-1" style={{ background: TASK_ACCENTS[i % TASK_ACCENTS.length].bar }} aria-hidden />
                      <span className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl" style={{ background: TASK_ACCENTS[i % TASK_ACCENTS.length].soft }} aria-hidden />
                      <div className="flex items-center gap-1.5 relative">
                        <div className="flex flex-col gap-1 shrink-0">
                          <button type="button" onClick={()=>moveTask(i,-1)} disabled={i===0 || isLoading} className="grid h-6 w-7 place-items-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white disabled:opacity-20 transition"><ChevronUp className="w-3 h-3"/></button>
                          <button type="button" onClick={()=>moveTask(i,1)} disabled={i===tasks.length-1 || isLoading} className="grid h-6 w-7 place-items-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white disabled:opacity-20 transition"><ChevronDown className="w-3 h-3"/></button>
                        </div>
                        <button type="button" draggable onDragStart={(e)=>{e.stopPropagation(); handleDragStart(i)}} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white hover:bg-[#a78bfa]/15 hover:border-[#a78bfa]/30 cursor-grab active:cursor-grabbing touch-manipulation transition" title="Przytrzymaj i przeciągnij" aria-label="Przeciągnij by zmienić kolejność"><GripVertical className="w-5 h-5" /></button>
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${TASK_ACCENTS[i % TASK_ACCENTS.length].from}, ${TASK_ACCENTS[i % TASK_ACCENTS.length].to})` }}
                        >
                          {i + 1}
                        </span>
                        {[
                          t.minutes ? { icon: Clock, label: `${t.minutes} min`, color: '#fbbf24' } : null,
                          t.videoId ? { icon: Film, label: 'Film', color: '#c4b5fd' } : null,
                          t.gifUrl ? { icon: Image, label: 'GIF', color: '#2dd4bf' } : null,
                          t.steamMapUrl ? { icon: MapPin, label: 'Mapa', color: '#fda4af' } : null,
                          t.linkUrl ? { icon: Globe, label: 'Link', color: '#7dd3fc' } : null,
                        ].filter(Boolean).map((chip: any, ci) => (
                          <span
                            key={ci}
                            className="hidden md:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1"
                            style={{ color: chip.color, background: `${chip.color}14`, borderColor: `${chip.color}35` }}
                          >
                            <chip.icon className="w-3 h-3" />{chip.label}
                          </span>
                        ))}
                        <input
                          value={t.title}
                          onChange={(e) => updateTask(i, { title: e.target.value })}
                          placeholder="np. 30 minut DM z focusem na peeking"
                          disabled={isLoading}
                          className="h-10 flex-1 min-w-0 rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                        />
                        <label className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] pl-2.5 pr-1.5 h-10" title="Dzień rutyny, do którego należy ćwiczenie">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Dzień</span>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={t.day}
                            onChange={(e) => {
                              const v = parseInt(e.target.value)
                              updateTask(i, { day: Number.isFinite(v) ? Math.min(60, Math.max(1, v)) : 1 })
                            }}
                            disabled={isLoading}
                            aria-label="Dzień rutyny"
                            className="w-12 bg-transparent text-sm font-bold text-white text-center outline-none"
                          />
                        </label>
                        <button type="button" onClick={()=>saveTaskAsPreset(t)} disabled={isLoading} className="hidden sm:grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#c4b5fd] hover:text-white hover:bg-[#a78bfa]/15 border border-transparent hover:border-[#a78bfa]/20 transition" title="Zapisz jako preset" aria-label="Zapisz jako preset"><BookmarkPlus className="w-4 h-4" /></button>
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
                      <div>
                        <label className="text-[11px] font-medium text-white/45 flex items-center gap-1"><FileText className="w-3 h-3"/>Opis ćwiczenia — **pogrubienie** *kursywa* `kod` [link]</label>
                        <div className="flex gap-1 mt-1">
                          <button type="button" onClick={()=>wrapSelection(`task-desc-${i}`,'**','**','pogrubienie', v=>updateTask(i,{description:v}), t.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-bold text-white hover:bg-white/[0.1]">B</button>
                          <button type="button" onClick={()=>wrapSelection(`task-desc-${i}`,'*','*','kursywa', v=>updateTask(i,{description:v}), t.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs italic text-white hover:bg-white/[0.1]">I</button>
                          <button type="button" onClick={()=>wrapSelection(`task-desc-${i}`,'- ','','lista', v=>updateTask(i,{description:v}), t.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white hover:bg-white/[0.1]">•</button>
                          <button type="button" onClick={()=>wrapSelection(`task-desc-${i}`,'[','](https://)','tekst', v=>updateTask(i,{description:v}), t.description)} className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white hover:bg-white/[0.1]">Link</button>
                        </div>
                        <textarea id={`task-desc-${i}`} value={t.description ?? ''} onChange={(e)=> updateTask(i, { description: e.target.value || null })} placeholder="Opisz na czym skupić się w tym ćwiczeniu... **pogrubienie** - lista" rows={2} disabled={isLoading} className="mt-1 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition resize-none" />
                        {t.description && <div className="mt-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/80 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: mdToHtml(t.description)}} />}
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-white/45">Minuty (opcjonalnie)</label>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            min={1}
                            max={600}
                            value={t.minutes ?? ''}
                            onChange={(e) => {
                              if (!e.target.value) { updateTask(i, { minutes: null }); return }
                              const v = parseInt(e.target.value)
                              updateTask(i, { minutes: Number.isFinite(v) ? Math.min(600, Math.max(1, v)) : null })
                            }}
                            disabled={isLoading}
                            placeholder="—"
                            className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-white/45">GIF demonstracja (opcjonalnie)</label>
                        <div className="relative mt-1">
                          <Image className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <input
                            type="url"
                            value={t.gifUrl ?? ''}
                            onChange={(e) => updateTask(i, { gifUrl: e.target.value || null })}
                            disabled={isLoading}
                            placeholder="Link do GIF-a (np. giphy, imgur, tenor)..."
                            className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-white/45">Mapa ze Steam (opcjonalnie)</label>
                        <div className="relative mt-1">
                          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <input
                            type="url"
                            value={t.steamMapUrl ?? ''}
                            onChange={(e) => updateTask(i, { steamMapUrl: e.target.value || null })}
                            disabled={isLoading}
                            placeholder="Link do mapy z warsztatu Steam..."
                            className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-white/45">Link do strony (opcjonalnie)</label>
                        <div className="relative mt-1">
                          <Globe className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                          <input
                            type="url"
                            value={t.linkUrl ?? ''}
                            onChange={(e) => updateTask(i, { linkUrl: e.target.value || null })}
                            disabled={isLoading}
                            placeholder="https://..."
                            className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-3.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition"
                          />
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
                  <StudentPicker
                    id="r-student"
                    students={students}
                    value={assignStudentId}
                    onChange={setAssignStudentId}
                    disabled={isLoading}
                    placeholder="Wybierz lub wyszukaj ucznia..."
                  />
                  <p className="text-xs text-white/40">
                    Uczeń zobaczy rutynę w swoich zadaniach i będzie odhaczał kolejne dni.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="r-endsAt" className="text-xs font-medium text-white/55">
                    Data zakończenia (opcjonalnie)
                  </label>
                  <input
                    id="r-endsAt"
                    type="date"
                    value={assignEndsAt}
                    onChange={(e) => setAssignEndsAt(e.target.value)}
                    disabled={isLoading}
                    className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition [color-scheme:dark]"
                  />
                  <p className="text-xs text-white/40">
                    Bez daty rutyna powtarzana jest codziennie bez końca. Ustaw datę, by zakończyć rutynę po
                    ostatnim cyklu przed tym dniem.
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

        {presetPickerOpen && (
          <div className="fixed inset-0 z-[60] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={()=>setPresetPickerOpen(false)} />
            <div className="glass-liquid relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl flex flex-col">
              <div className="p-6 border-b border-white/[0.06]">
                <h3 className="font-display text-xl font-bold text-gradient-violet flex items-center gap-2"><Zap className="w-5 h-5 text-[#a78bfa]"/>Wybierz preset — 1 klik = 1 ćwiczenie w rutynie</h3>
                <p className="text-xs text-white/45 mt-1">Presety to pojedyncze ćwiczenia z GIF-em. Kliknij Dodaj by wstawić do listy zadań.</p>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"/>
                  <input value={presetSearch} onChange={e=>setPresetSearch(e.target.value)} placeholder="Szukaj presetu..." className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-10 pr-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid gap-3 sm:grid-cols-2">
                {exercisePresets.filter(p=> !presetSearch || p.title.toLowerCase().includes(presetSearch.toLowerCase()) || p.tags.some(t=>t.toLowerCase().includes(presetSearch.toLowerCase()))).map(p=> (
                  <div key={p.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] overflow-hidden flex flex-col">
                    {p.gifUrl && <div className="h-32 bg-black overflow-hidden"><img decoding="async" src={p.gifUrl} alt={p.title} className="w-full h-full object-cover" /></div>}
                    <div className="p-3 flex-1">
                      <p className="font-semibold text-white text-sm">{p.title}</p>
                      {p.description && <p className="text-xs text-white/40 line-clamp-2 mt-1">{p.description}</p>}
                      <div className="flex gap-1.5 mt-2 flex-wrap">{p.minutes && <span className="text-[11px] px-2 py-1 rounded-full bg-white/[0.06] text-white/60">{p.minutes} min</span>}{p.tags.map(t=> <span key={t} className="text-[10px] px-2 py-1 rounded-full bg-[#a78bfa]/10 text-[#c4b5fd]">{t}</span>)}</div>
                    </div>
                    <button onClick={()=> addPresetToTasks(p)} className="m-3 mt-0 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] text-white text-xs font-bold hover:opacity-90 transition"><Plus className="w-3.5 h-3.5"/>Dodaj do rutyny</button>
                  </div>
                ))}
                {exercisePresets.filter(p=> !presetSearch || p.title.toLowerCase().includes(presetSearch.toLowerCase())).length===0 && <p className="col-span-2 text-center text-white/40 py-8">Brak wyników — stwórz preset w zakładce Presety</p>}
              </div>
              <div className="p-4 border-t border-white/[0.06] flex justify-end">
                <button onClick={()=>setPresetPickerOpen(false)} className="px-5 h-10 rounded-xl glass-liquid text-white/70">Zamknij</button>
              </div>
            </div>
          </div>
        )}

        {/* Podgląd rutyny - jak zobaczy uczeń */}
        {previewRoutine && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setPreviewRoutine(null)} aria-hidden="true" />
            <div className="glass-liquid relative w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-3xl flex flex-col animate-rise-in" role="dialog" aria-modal="true">
              <div className="p-6 border-b border-white/[0.06] shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20 shrink-0">
                      <Eye className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#c4b5fd] font-semibold">Podgląd ucznia</p>
                      <h3 className="font-display text-xl font-bold text-white mt-1">{previewRoutine.title}</h3>
                      {previewRoutine.description && <div className="mt-2 text-sm text-white/60 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: mdToHtml(previewRoutine.description)}} />}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {previewRoutine.recurring && <span className="inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[11px] font-semibold bg-[#a78bfa]/10 text-[#c4b5fd] border border-[#a78bfa]/20"><Repeat className="h-3 w-3"/>Codziennie</span>}
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/50"><Clock className="h-3 w-3"/>{totalMinutes(previewRoutine)} min</span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/50"><ListChecks className="h-3 w-3"/>{previewRoutine.tasks.length} zadań</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setPreviewRoutine(null)} className="grid place-items-center w-9 h-9 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] shrink-0"><X className="w-5 h-5"/></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(() => {
                  const days = Array.from(new Set(previewRoutine.tasks.map((t) => t.day))).sort((a,b)=>a-b)
                  return days.map((d) => {
                    const dayTasks = previewRoutine.tasks.filter((t)=>t.day===d)
                    return (
                      <div key={d}>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#c4b5fd] mb-3">Dzień {d} · {dayTasks.length} {dayTasks.length===1?'zadanie':'zadań'}</p>
                        <div className="space-y-2">
                          {dayTasks.map((t, idx) => {
                            const vid = t.videoId ? videos.find((v)=>v.id===t.videoId) : null
                            return (
                              <div key={idx} onClick={() => setPreviewTask(t)} className="group flex items-start gap-3 rounded-2xl p-3.5 border bg-white/[0.02] border-white/[0.07] hover:border-[#a78bfa]/30 hover:bg-[#a78bfa]/[0.03] transition-all duration-300 relative cursor-pointer">
                                <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-bold text-white/70 shrink-0 mt-0.5">{idx+1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white/90 flex items-center gap-2">
                                      <span className="relative inline-flex items-center gap-1">
                                        {t.title}
                                        {t.gifUrl && (
                                        <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-[40%] hidden sm:block opacity-0 group-hover:opacity-100 transition-all duration-300 scale-[0.96] group-hover:scale-100 z-30">
                                          <span className="flex flex-col rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0c0e]/95 via-[#141222]/95 to-[#1a1628]/95 backdrop-blur-xl border border-white/10 shadow-[0_24px_64px_-16px_rgba(139,92,246,0.35)] w-64">
                                            <span className="relative h-36 w-64 bg-black block overflow-hidden">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img decoding="async" src={t.gifUrl} alt={`Demo: ${t.title}`} className="w-full h-full object-cover" loading="lazy" />
                                            </span>
                                          </span>
                                        </span>
                                        )}
                                      </span>
                                  </p>
                                  {t.description && <div className="mt-1 text-xs text-white/45 line-clamp-2 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: mdToHtml(t.description)}} />}
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {t.minutes && <span className="inline-flex items-center gap-1 text-[11px] text-white/40"><Clock className="w-3 h-3" />~{t.minutes} min</span>}
                                    {t.videoId && <span className="inline-flex items-center gap-1 text-[11px] text-[#c4b5fd]"><Film className="w-3 h-3" />Film</span>}
                                    {t.steamMapUrl && <span onClick={e=>e.stopPropagation()}><a href={t.steamMapUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#fda4af] bg-[#f43f5e]/[0.08] border border-[#f43f5e]/25 hover:bg-[#f43f5e]/[0.16] hover:border-[#f43f5e]/40 transition-all"><MapPin className="w-3.5 h-3.5" />Mapa</a></span>}
                                    {t.linkUrl && <span onClick={e=>e.stopPropagation()}><a href={t.linkUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] bg-[#a78bfa]/[0.08] border border-[#a78bfa]/20 hover:bg-[#a78bfa]/[0.16] hover:border-[#a78bfa]/30 transition-all"><Globe className="w-3.5 h-3.5" />Link</a></span>}
                                    <span className="text-[11px] text-white/30 hidden sm:inline">kliknij aby zobaczyć film/opis</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
              <div className="p-4 border-t border-white/[0.06] flex justify-between items-center shrink-0">
                <p className="text-xs text-white/40">Tak widzi uczeń · kliknij zadanie aby zobaczyć film/GIF</p>
                <button onClick={() => setPreviewRoutine(null)} className="px-5 h-10 rounded-xl glass-liquid text-white/70 hover:text-white">Zamknij podgląd</button>
              </div>
            </div>
          </div>
        )}

        {previewTask && (
          <div className="fixed inset-0 z-[60] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setPreviewTask(null)} />
            <div className="glass-liquid relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl flex flex-col">
              <button onClick={() => setPreviewTask(null)} className="yt-force-dark absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl bg-black/40 text-white/70 hover:text-white z-10"><X className="w-4 h-4" /></button>
              <div className="p-6 border-b border-white/[0.06]">
                <h3 className="font-display text-xl font-bold text-white pr-8">{previewTask.title}</h3>
                {previewTask.description && <div className="mt-2 text-sm text-white/60 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: mdToHtml(previewTask.description)}} />}
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewTask.minutes && <span className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/60"><Clock className="w-3.5 h-3.5" />~{previewTask.minutes} min</span>}
                  {previewTask.steamMapUrl && <a href={previewTask.steamMapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#fda4af] bg-[#f43f5e]/[0.08] border border-[#f43f5e]/25"><MapPin className="w-3.5 h-3.5" />Mapa Steam</a>}
                  {previewTask.linkUrl && <a href={previewTask.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] bg-[#a78bfa]/10 border border-[#a78bfa]/20"><Globe className="w-3.5 h-3.5" />Link</a>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(() => {
                  const vid = previewTask.videoId ? videos.find((v)=>v.id===previewTask.videoId) : null
                  const ytId = vid ? getYouTubeId(vid.url) : null
                  if (ytId) {
                    return (
                      <div className="rounded-2xl overflow-hidden bg-black border border-white/[0.08]">
                        <div className="aspect-video">
                          <YoutubeCustomPlayer videoId={ytId} title={previewTask.title} />
                        </div>
                      </div>
                    )
                  }
                  if (vid) {
                    return (
                      <div className="yt-force-dark rounded-2xl overflow-hidden bg-black border border-white/[0.08] p-6 text-center">
                        <Film className="w-8 h-8 text-white/30 mx-auto mb-2" />
                        <p className="text-sm text-white/60">{vid.title}</p>
                        <a href={vid.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full bg-[#a78bfa]/20 text-[#c4b5fd]">Otwórz film</a>
                      </div>
                    )
                  }
                  return null
                })()}
                {previewTask.gifUrl && (
                  <div className="rounded-2xl overflow-hidden bg-black border border-white/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img decoding="async" src={previewTask.gifUrl} alt={previewTask.title} className="w-full h-auto" loading="lazy" />
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-white/[0.06] flex justify-end">
                <button onClick={() => setPreviewTask(null)} className="px-5 h-9 rounded-xl glass-liquid text-white/70">Zamknij</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
