'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn, formatDate, spotlightHandler } from '@/lib/utils'
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Calendar,
  Film,
  Loader2,
  Sparkles,
  Target,
  Flame,
  Inbox,
  Check,
  ListChecks,
  ChevronDown,
  Clock,
  Trophy,
  Timer,
} from 'lucide-react'
import { PracticeTimer } from '@/components/practice-timer'

interface Assignment {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  status: string
  completedAt: string | null
  createdAt: string
  video?: { id: string; title: string; url: string; thumbnail: string | null } | null
}

interface RoutineAssignment {
  id: string
  status: string
  completedAt: string | null
  routine: {
    id: string
    title: string
    description: string | null
    tasks: { id: string; title: string; description: string | null; videoId: string | null; day: number; minutes: number | null }[]
  }
  progress: { id: string; taskId: string; status: string; completedAt: string | null }[]
}

export function StudentTasksClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [routines, setRoutines] = useState<RoutineAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [togglingTask, setTogglingTask] = useState<string | null>(null)
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null)
  const [activeTimer, setActiveTimer] = useState<{ assignment: RoutineAssignment; task: RoutineAssignment['routine']['tasks'][number] } | null>(null)

  const load = useCallback(async () => {
    try {
      const [aRes, rRes] = await Promise.all([fetch('/api/assignments'), fetch('/api/routines')])
      if (aRes.ok) {
        setAssignments(await aRes.json())
      }
      if (rRes.ok) {
        setRoutines(await rRes.json())
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async (a: Assignment) => {
    setTogglingId(a.id)
    const next = a.status === 'DONE' ? 'PENDING' : 'DONE'
    try {
      const res = await fetch(`/api/assignments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (res.ok) {
        setAssignments((prev) =>
          prev.map((x) =>
            x.id === a.id
              ? { ...x, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }
              : x,
          ),
        )
      }
    } catch {
      /* ignore */
    } finally {
      setTogglingId(null)
    }
  }

  const toggleRoutineTask = async (ra: RoutineAssignment, taskId: string) => {
    setTogglingTask(taskId)
    const current = ra.progress.find((p) => p.taskId === taskId)
    const next = current?.status === 'DONE' ? 'PENDING' : 'DONE'
    try {
      const res = await fetch('/api/routines/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: ra.id, taskId, status: next }),
      })
      if (res.ok) {
        setRoutines((prev) =>
          prev.map((r) => {
            if (r.id !== ra.id) return r
            const progress = r.progress.some((p) => p.taskId === taskId)
              ? r.progress.map((p) =>
                  p.taskId === taskId
                    ? { ...p, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }
                    : p,
                )
              : [...r.progress, { id: '', taskId, status: next, completedAt: next === 'DONE' ? new Date().toISOString() : null }]
            const allDone =
              progress.length >= r.routine.tasks.length && progress.every((p) => p.status === 'DONE')
            return { ...r, progress, status: allDone ? 'COMPLETED' : 'ACTIVE' }
          }),
        )
      }
    } catch {
      /* ignore */
    } finally {
      setTogglingTask(null)
    }
  }

  const now = new Date()
  const pendingCount = assignments.filter((a) => a.status === 'PENDING').length
  const doneCount = assignments.length - pendingCount

  const filtered = assignments.filter((a) => {
    if (filter === 'PENDING') return a.status === 'PENDING'
    if (filter === 'DONE') return a.status === 'DONE'
    return true
  })

  const isOverdue = (a: Assignment) =>
    a.status === 'PENDING' && a.dueDate && new Date(a.dueDate).getTime() < now.getTime()

  const sorted = [...filtered].sort((a, b) => {
    // pending first, then by due date
    if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    return ad - bd
  })

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 space-y-8">
        <PageHeader
          icon={ClipboardList}
          label="Plan treningowy"
          title="Zadania treningowe"
          subtitle="Zadania od Twojego trenera — wykonuj je, odhaczaj i buduj serię. To Twoja droga do mistrzostwa."
        />

        {/* Hero stats */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div
            className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden"
            style={{ animationDelay: '0ms' }}
            onMouseMove={spotlightHandler}
          >
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#fbbf24] to-[#f97316] ring-1 ring-white/20">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-white/45">Wszystkie zadania</p>
              </div>
            </div>
          </div>
          <div
            className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden"
            style={{ animationDelay: '80ms' }}
            onMouseMove={spotlightHandler}
          >
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/20">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-amber-300">{pendingCount}</p>
                <p className="text-xs text-white/45">Do zrobienia</p>
              </div>
            </div>
          </div>
          <div
            className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden"
            style={{ animationDelay: '160ms' }}
            onMouseMove={spotlightHandler}
          >
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#34d399] to-[#10b981] ring-1 ring-white/20">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-emerald-300">{doneCount}</p>
                <p className="text-xs text-white/45">Zrobione</p>
              </div>
            </div>
          </div>
        </section>

        {/* My routines */}
        {!loading && routines.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
                <ListChecks className="w-4 h-4 text-white" />
              </span>
              <h2 className="font-display text-xl font-bold text-gradient-violet">Moje rutyny</h2>
              <span className="text-xs text-white/40 font-medium">Programy od trenera rozłożone na dni</span>
            </div>

            {routines.map((ra, i) => {
              const expanded = expandedRoutine === ra.id
              const doneCount = ra.progress.filter((p) => p.status === 'DONE').length
              const totalCount = ra.routine.tasks.length
              const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
              const completed = ra.status === 'COMPLETED'
              const days = Array.from(new Set(ra.routine.tasks.map((t) => t.day))).sort((a, b) => a - b)

              return (
                <div
                  key={ra.id}
                  className="glass-liquid rise-in spotlight-card rounded-3xl overflow-hidden transition-all duration-300"
                  style={{ animationDelay: `${i * 70}ms` }}
                  onMouseMove={spotlightHandler}
                >
                  <button
                    onClick={() => setExpandedRoutine(expanded ? null : ra.id)}
                    className="w-full flex items-center gap-4 p-5 text-left group"
                  >
                    <div
                      className={cn(
                        'relative shrink-0 grid place-items-center w-11 h-11 rounded-2xl ring-1 transition-all duration-300',
                        completed
                          ? 'bg-gradient-to-br from-[#34d399] to-[#10b981] ring-white/25 shadow-[0_6px_20px_-6px_rgba(52,211,153,0.5)]'
                          : 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-white/25 shadow-[0_6px_20px_-6px_rgba(139,92,246,0.5)]',
                      )}
                    >
                      {completed ? <Trophy className="w-5 h-5 text-white" /> : <ListChecks className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn('font-display text-lg font-bold leading-snug', completed ? 'text-emerald-200' : 'text-white')}>
                          {ra.routine.title}
                        </h3>
                        {completed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                            <Trophy className="w-3 h-3" /> Ukończona
                          </span>
                        )}
                      </div>
                      {ra.routine.description && (
                        <p className="mt-0.5 text-sm text-white/45 line-clamp-1">{ra.routine.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 max-w-[220px] h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700',
                              completed
                                ? 'bg-gradient-to-r from-[#34d399] to-[#10b981]'
                                : 'bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6]',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-white/60">
                          {doneCount}/{totalCount} zadań
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                          <Calendar className="w-3 h-3" />
                          {days.length} {days.length === 1 ? 'dzień' : 'dni'}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn('w-5 h-5 shrink-0 text-white/35 transition-transform duration-300', expanded && 'rotate-180')}
                    />
                  </button>

                  {/* Expanded day-by-day view */}
                  {expanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-white/[0.06]">
                      {days.map((d) => {
                        const dayTasks = ra.routine.tasks.filter((t) => t.day === d)
                        const dayDone = dayTasks.filter((t) =>
                          ra.progress.find((p) => p.taskId === t.id)?.status === 'DONE',
                        ).length
                        return (
                          <div key={d} className="py-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-[#c4b5fd]">Dzień {d}</p>
                              <span className="text-[11px] text-white/40">
                                {dayDone}/{dayTasks.length} zrobione
                              </span>
                            </div>
                            <div className="space-y-2">
                              {dayTasks.map((t) => {
                                const tp = ra.progress.find((p) => p.taskId === t.id)
                                const done = tp?.status === 'DONE'
                                return (
                                  <div
                                    key={t.id}
                                    className={cn(
                                      'flex items-start gap-3 rounded-2xl p-3.5 border transition-all duration-300',
                                      done
                                        ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                                        : 'bg-white/[0.02] border-white/[0.07] hover:border-[#a78bfa]/25',
                                    )}
                                  >
                                    <button
                                      onClick={() => toggleRoutineTask(ra, t.id)}
                                      disabled={togglingTask === t.id}
                                      aria-label={done ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'}
                                      className={cn(
                                        'relative mt-0.5 shrink-0 grid place-items-center w-7 h-7 rounded-lg transition-all duration-300',
                                        done
                                          ? 'bg-gradient-to-br from-[#34d399] to-[#10b981] text-white ring-1 ring-white/25'
                                          : 'bg-white/[0.04] text-white/35 border border-white/[0.1] hover:border-[#a78bfa]/40 hover:text-[#c4b5fd]',
                                      )}
                                    >
                                      {togglingTask === t.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : done ? (
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn('text-sm font-semibold leading-snug', done ? 'text-white/50 line-through decoration-white/30' : 'text-white/90')}>
                                        {t.title}
                                      </p>
                                      {t.description && (
                                        <p className={cn('mt-0.5 text-xs leading-relaxed', done ? 'text-white/30' : 'text-white/45')}>
                                          {t.description}
                                        </p>
                                      )}
                                      <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {t.minutes && (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                                            <Clock className="w-3 h-3" />
                                            ~{t.minutes} min
                                          </span>
                                        )}
                                        {t.minutes && !done && (
                                          <button
                                            onClick={() => setActiveTimer({ assignment: ra, task: t })}
                                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#c4b5fd] bg-[#a78bfa]/[0.1] border border-[#a78bfa]/25 hover:bg-[#a78bfa]/[0.18] hover:border-[#a78bfa]/40 transition-all group/timer"
                                          >
                                            <Timer className="w-3.5 h-3.5 transition-transform group-hover/timer:rotate-12" />
                                            Start treningu
                                          </button>
                                        )}
                                        {t.minutes && done && (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/70">
                                            <Check className="w-3 h-3" />
                                            Odhaczone
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'PENDING', 'DONE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border',
                filter === f
                  ? 'text-white border-[#a78bfa]/40 bg-[#a78bfa]/[0.08]'
                  : 'text-white/50 border-white/[0.08] bg-white/[0.02] hover:text-white/80 hover:border-white/15',
              )}
            >
              {f === 'ALL' && 'Wszystkie'}
              {f === 'PENDING' && 'Do zrobienia'}
              {f === 'DONE' && 'Zrobione'}
            </button>
          ))}
          {pendingCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-white/40">
              <Flame className="w-3.5 h-3.5 text-[#a78bfa]" />
              {pendingCount} zadań czeka na Ciebie
            </span>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/40">
            <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie zadań…
          </div>
        ) : sorted.length === 0 ? (
          <div className="glass-liquid rounded-3xl py-16 px-6 text-center flex flex-col items-center">
            <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa]/25 to-[#8b5cf6]/10 ring-1 ring-white/15 mb-4">
              <Inbox className="w-7 h-7 text-[#c4b5fd]" />
            </div>
            <p className="font-display text-base font-semibold text-white">
              {filter === 'ALL' ? 'Brak zadań od trenera' : filter === 'DONE' ? 'Brak ukończonych zadań' : 'Wszystko zrobione! 🎉'}
            </p>
            <p className="text-sm text-white/45 mt-1 max-w-md">
              {filter === 'ALL'
                ? 'Gdy trener przypisze Ci zadanie treningowe, pojawi się tutaj.'
                : filter === 'DONE'
                  ? 'Ukończ pierwsze zadanie, aby zobaczyć je tutaj.'
                  : 'Świetna robota — nie masz nic zaległego. Czekaj na nowe zadania od trenera!'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((a, i) => {
              const overdue = isOverdue(a)
              const done = a.status === 'DONE'
              return (
                <li
                  key={a.id}
                  className={cn(
                    'glass-liquid rise-in spotlight-card group relative rounded-3xl p-5 overflow-hidden transition-all duration-300',
                    done && 'opacity-75',
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                  onMouseMove={spotlightHandler}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggle(a)}
                      disabled={togglingId === a.id}
                      aria-label={done ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'}
                      className={cn(
                        'relative mt-0.5 shrink-0 grid place-items-center w-8 h-8 rounded-xl transition-all duration-300',
                        done
                          ? 'bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white ring-1 ring-white/25 shadow-[0_6px_20px_-6px_rgba(45,229,202,0.6)]'
                          : 'bg-white/[0.04] text-white/35 border border-white/[0.1] hover:border-[#a78bfa]/40 hover:text-[#c4b5fd]',
                      )}
                    >
                      {togglingId === a.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : done ? (
                        <Check className="w-4 h-4" strokeWidth={3} />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={cn(
                            'font-display text-lg font-bold leading-snug transition-colors',
                            done ? 'text-white/50 line-through decoration-white/30' : 'text-white',
                          )}
                        >
                          {a.title}
                        </h3>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-300 bg-red-500/10 border border-red-500/25 rounded-full px-2 py-0.5">
                            Po terminie
                          </span>
                        )}
                        {done && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                            <Check className="w-3 h-3" /> Zrobione
                          </span>
                        )}
                      </div>

                      {a.description && (
                        <p className={cn('mt-1.5 text-sm leading-relaxed', done ? 'text-white/35' : 'text-white/55')}>
                          {a.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {a.video && (
                          <Link
                            href={`/student/videos/${a.video.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c4b5fd] hover:text-white transition-colors bg-[#a78bfa]/[0.08] border border-[#a78bfa]/20 rounded-full px-3 py-1.5"
                          >
                            <Film className="w-3.5 h-3.5" />
                            {a.video.title}
                          </Link>
                        )}
                        {a.dueDate && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border',
                              overdue
                                ? 'text-red-300 bg-red-500/8 border-red-500/20'
                                : 'text-white/50 bg-white/[0.03] border-white/[0.08]',
                            )}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Termin: {formatDate(a.dueDate)}
                          </span>
                        )}
                        {a.completedAt && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300/80 rounded-full px-3 py-1.5 bg-emerald-500/8 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ukończone {formatDate(a.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Practice timer modal */}
        {activeTimer && (
          <PracticeTimer
            minutes={activeTimer.task.minutes ?? 10}
            taskTitle={activeTimer.task.title}
            onClose={() => setActiveTimer(null)}
            onComplete={() => {
              // Log the completed practice session to the DB (weekly chart)
              fetch('/api/practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  minutes: activeTimer.task.minutes ?? 10,
                  taskId: activeTimer.task.id,
                  assignmentId: activeTimer.assignment.id,
                }),
              }).catch(() => undefined)
              toggleRoutineTask(activeTimer.assignment, activeTimer.task.id)
            }}
          />
        )}

        {/* Footer flourish */}
        <div className="pt-4 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="uppercase tracking-[0.25em]">Małe kroki każdego dnia</span>
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </StudentLayout>
  )
}
