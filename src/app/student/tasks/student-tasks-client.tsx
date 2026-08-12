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
} from 'lucide-react'

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

export function StudentTasksClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/assignments')
      if (res.ok) {
        setAssignments(await res.json())
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
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] ring-1 ring-white/20">
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'PENDING', 'DONE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border',
                filter === f
                  ? 'text-white border-[#2de5ca]/40 bg-[#2de5ca]/[0.08]'
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
              <Flame className="w-3.5 h-3.5 text-[#2de5ca]" />
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
            <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#2de5ca]/25 to-[#14b8a6]/10 ring-1 ring-white/15 mb-4">
              <Inbox className="w-7 h-7 text-[#8cffef]" />
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
                          ? 'bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] text-white ring-1 ring-white/25 shadow-[0_6px_20px_-6px_rgba(45,229,202,0.6)]'
                          : 'bg-white/[0.04] text-white/35 border border-white/[0.1] hover:border-[#2de5ca]/40 hover:text-[#8cffef]',
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
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8cffef] hover:text-white transition-colors bg-[#2de5ca]/[0.08] border border-[#2de5ca]/20 rounded-full px-3 py-1.5"
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

        {/* Footer flourish */}
        <div className="pt-4 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <Sparkles className="w-3 h-3 text-[#2de5ca]/50" />
          <span className="uppercase tracking-[0.25em]">Małe kroki każdego dnia</span>
          <Sparkles className="w-3 h-3 text-[#2de5ca]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </StudentLayout>
  )
}
