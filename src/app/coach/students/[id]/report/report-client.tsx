'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Printer, ChevronLeft, ChevronRight, Trophy, Timer, CalendarDays,
  ListChecks, Film, Target, TrendingUp, TrendingDown, Minus, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EloPoint {
  mode: string
  rank: string
  elo: number | null
  recordedAt: Date | string
}

interface ReportClientProps {
  student: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
    createdAt: string
    faceitNickname: string | null
  }
  monthKey: string
  monthLabel: string
  prevKey: string
  nextKey: string
  isCurrent: boolean
  faceit: { first: EloPoint; last: EloPoint; count: number } | null
  premier: { first: EloPoint; last: EloPoint; count: number } | null
  practiceMinutes: number
  practiceSessions: number
  sessions: { id: string; title: string; status: string; scheduledAt: string | null }[]
  tasksDone: { id: string; title: string }[]
  tasksTotal: number
  routineDays: number
  routineTasks: number
  routineMinutes: number
  videosDone: number
  coachName: string | null
}

function eloDelta(info: { first: EloPoint; last: EloPoint } | null): number | null {
  if (!info || info.first.elo == null || info.last.elo == null) return null
  return info.last.elo - info.first.elo
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-sm text-neutral-400">—</span>
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  const cls = value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-neutral-400'
  return (
    <span className={cn('inline-flex items-center gap-1 font-bold', cls)}>
      <Icon className="w-4 h-4" />
      {value > 0 ? `+${value}` : value} ELO
    </span>
  )
}

function fmtHours(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}g ${m}min` : `${m} min`
}

export function ReportClient(props: ReportClientProps) {
  const { student } = props
  const [comment, setComment] = useState('')
  const faceitDelta = eloDelta(props.faceit)
  const premierDelta = eloDelta(props.premier)

  const stats = [
    { icon: Timer, label: 'Czas treningu', value: fmtHours(props.practiceMinutes + props.routineMinutes), sub: `${props.practiceSessions} sesji z timera` },
    { icon: CalendarDays, label: 'Dni z rutyną', value: String(props.routineDays), sub: `${props.routineTasks} zadań` },
    { icon: ListChecks, label: 'Zadania zrobione', value: `${props.tasksDone.length}/${props.tasksTotal}`, sub: 'w całym programie' },
    { icon: Film, label: 'Filmów obejrzanych', value: String(props.videosDone), sub: 'w tym miesiącu' },
    { icon: Target, label: 'Sesji 1:1', value: String(props.sessions.length), sub: 'zaplanowanych' },
  ]

  return (
    <div className="min-h-screen bg-[#07060c] text-white print:bg-white print:text-black">
      {/* Chrome — ukryty przy druku */}
      <div className="print:hidden max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-2 flex flex-wrap items-center gap-2">
        <Link
          href={`/coach/students/${student.id}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Profil ucznia
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/coach/students/${student.id}/report?month=${props.prevKey}`}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white"
            aria-label="Poprzedni miesiąc"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-semibold capitalize min-w-[140px] text-center">{props.monthLabel}</span>
          {props.isCurrent ? (
            <span className="grid h-9 w-9 place-items-center rounded-xl text-white/20" aria-hidden>
              <ChevronRight className="w-4 h-4" />
            </span>
          ) : (
            <Link
              href={`/coach/students/${student.id}/report?month=${props.nextKey}`}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white"
              aria-label="Następny miesiąc"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl px-5 h-11 text-sm font-bold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] hover:opacity-90 ml-2"
          >
            <Printer className="w-4 h-4" /> Drukuj / PDF
          </button>
        </div>
      </div>

      {/* Kartka — na ekranie ciemna, w druku biała */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 print:px-0 print:pb-0 print:max-w-none">
        <div className="mt-4 rounded-3xl overflow-hidden bg-white text-neutral-900 shadow-2xl print:shadow-none print:rounded-none print:mt-0">
          {/* Nagłówek */}
          <div className="bg-[#0a0a14] text-white px-7 py-6 print:bg-white print:text-black print:border-b-2 print:border-black">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/50 print:text-neutral-500 font-bold">
              CS2 Coaching · Raport miesięczny
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                <User className="w-6 h-6 print:hidden" />
                {student.name || student.email}
              </h1>
              <p className="text-sm text-white/60 print:text-neutral-500 capitalize pb-1">
                {props.monthLabel}
                {student.faceitNickname && ` · Faceit: ${student.faceitNickname}`}
              </p>
            </div>
          </div>

          <div className="px-7 py-6 space-y-7">
            {/* ELO */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Ranking
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs font-bold text-neutral-500 uppercase">Faceit ELO</p>
                  {props.faceit && props.faceit.last.elo != null ? (
                    <>
                      <p className="text-3xl font-black tabular-nums mt-1">{props.faceit.last.elo}</p>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Delta value={faceitDelta} />
                        <span className="text-neutral-400 text-xs">({props.faceit.count} odczytów)</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-neutral-400 mt-2">Brak odczytów w tym miesiącu</p>
                  )}
                </div>
                <div className="rounded-2xl border border-neutral-200 p-4">
                  <p className="text-xs font-bold text-neutral-500 uppercase">Premier</p>
                  {props.premier && props.premier.last.elo != null ? (
                    <>
                      <p className="text-3xl font-black tabular-nums mt-1">{props.premier.last.elo}</p>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <Delta value={premierDelta} />
                        <span className="text-neutral-400 text-xs">({props.premier.count} odczytów)</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-neutral-400 mt-2">Brak odczytów w tym miesiącu</p>
                  )}
                </div>
              </div>
            </section>

            {/* Statystyki */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400 mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4" /> Praca w miesiącu
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3 text-center">
                    <s.icon className="w-4 h-4 mx-auto text-violet-600" />
                    <p className="text-lg font-black tabular-nums mt-1">{s.value}</p>
                    <p className="text-[11px] font-bold text-neutral-600">{s.label}</p>
                    <p className="text-[10px] text-neutral-400">{s.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Sesje */}
            {props.sessions.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400 mb-3">
                  Sesje 1:1 ({props.sessions.length})
                </h2>
                <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 overflow-hidden">
                  {props.sessions.map((s) => (
                    <li key={s.id} className="px-4 py-2.5 text-sm flex items-center gap-3">
                      <span className="font-semibold flex-1">{s.title}</span>
                      <span className="text-neutral-500 text-xs">
                        {s.scheduledAt
                          ? new Date(s.scheduledAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', timeZone: 'Europe/Warsaw' })
                          : '—'}
                      </span>
                      <span className="text-[11px] font-bold uppercase text-neutral-400">{s.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Zadania */}
            {props.tasksDone.length > 0 && (
              <section>
                <h2 className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400 mb-3">
                  Ukończone zadania ({props.tasksDone.length})
                </h2>
                <ul className="flex flex-wrap gap-1.5">
                  {props.tasksDone.map((t) => (
                    <li key={t.id} className="text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-3 py-1">
                      ✓ {t.title}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Komentarz trenera */}
            <section>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400 mb-3">
                Komentarz trenera
              </h2>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Werdykt miesiąca: co poszło dobrze, nad czym pracujemy dalej… (drukuje się razem z raportem)"
                rows={4}
                className="print:hidden w-full rounded-2xl border border-neutral-300 p-3 text-sm outline-none focus:border-violet-500 resize-y"
              />
              {comment ? (
                <p className="hidden print:block text-sm leading-relaxed whitespace-pre-wrap">{comment}</p>
              ) : (
                <p className="hidden print:block text-sm text-neutral-400 italic">—</p>
              )}
            </section>

            <p className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-200">
              Wygenerowano {new Date().toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}
              {props.coachName ? ` · Trener: ${props.coachName}` : ''} · CS2 Coaching Panel
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
