'use client'

/**
 * Publiczny licznik aktywności platformy na landing page (social proof).
 * Zasada „zero ściemy” (spójna z resztą produktu): wyświetlamy wyłącznie realne,
 * zanonimizowane liczby z bazy. Gdy endpoint nie odpowie albo platforma jest
 * jeszcze pusta, sekcja cicho znika — nigdy nie pokazujemy zmyślonych liczb.
 */
import { useEffect, useState } from 'react'
import { CheckCircle2, Timer, Users } from 'lucide-react'

type Stats = { students: number; trainingDays: number; practiceMinutes: number }

const fmt = (n: number) => new Intl.NumberFormat('pl-PL').format(n)

export function LandingLiveStats() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/public/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('stats unavailable'))))
      .then((d: Stats) => {
        // Ukryj sekcję, dopóki nie ma realnych liczb do pokazania.
        if (alive && d && (d.students > 0 || d.trainingDays > 0 || d.practiceMinutes > 0)) {
          setStats(d)
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!stats) return null

  const items = [
    { icon: Users, v: fmt(stats.students), l: 'graczy w systemie' },
    { icon: CheckCircle2, v: fmt(stats.trainingDays), l: 'odhaczonych dni treningu' },
    { icon: Timer, v: fmt(stats.practiceMinutes), l: 'minut celnej praktyki' },
  ]

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((s) => (
        <div
          key={s.l}
          className="glass-liquid flex items-center gap-3.5 rounded-2xl px-5 py-4 text-left"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa]/20 to-[#8b5cf6]/10 ring-1 ring-[#a78bfa]/25">
            <s.icon className="h-5 w-5 text-[#c4b5fd]" />
          </span>
          <span>
            <span className="font-display block text-lg font-bold leading-tight">{s.v}</span>
            <span className="block text-[11px] leading-tight text-white/40">{s.l}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
