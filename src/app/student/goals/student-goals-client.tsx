'use client'

import { useCallback, useEffect, useState } from 'react'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn, formatDate } from '@/lib/utils'
import {
  Target, Plus, Trash2, Loader2, Check, CheckCircle2, Calendar, Sparkles, Inbox, Flag,
} from 'lucide-react'

interface Goal {
  id: string
  title: string
  target: string | null
  deadline: string | null
  status: string
  createdAt: string
}

export function StudentGoalsClient() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', target: '', deadline: '' })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) setGoals(await res.json())
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, target: form.target || null, deadline: form.deadline || null }),
      })
      const data = await res.json()
      if (res.ok) {
        setGoals((prev) => [data, ...prev])
        setForm({ title: '', target: '', deadline: '' })
      } else {
        alert(data.error || 'Nie udało się dodać celu')
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (g: Goal, status: string) => {
    const res = await fetch(`/api/goals/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setGoals((prev) => prev.map((x) => (x.id === g.id ? updated : x)))
    }
  }

  const remove = async (g: Goal) => {
    if (!confirm(`Usunąć cel „${g.title}"?`)) return
    const res = await fetch(`/api/goals/${g.id}`, { method: 'DELETE' })
    if (res.ok) setGoals((prev) => prev.filter((x) => x.id !== g.id))
  }

  const active = goals.filter((g) => g.status === 'ACTIVE')
  const done = goals.filter((g) => g.status === 'DONE')

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 space-y-8">
        <PageHeader
          icon={Target}
          label="Cel w zasięgu"
          title="Moje cele"
          subtitle="Mniej znaczy więcej — 1–3 konkretne cele treningowe z terminem. Trener widzi Twój postęp."
        />

        {/* Add goal */}
        <div className="glass-liquid rise-in rounded-3xl p-6" style={{ animationDelay: '60ms' }}>
          <h2 className="font-display text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#c4b5fd]" />
            Nowy cel
          </h2>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_180px_160px_auto]">
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="np. Osiągnij 15 000 ELO w Premier"
              disabled={saving}
              className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#a78bfa]/40 transition"
            />
            <input
              value={form.target}
              onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
              placeholder="Cel liczbowy"
              disabled={saving}
              className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#a78bfa]/40 transition"
            />
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              disabled={saving}
              className="h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40 transition [color-scheme:dark]"
            />
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="relative inline-flex items-center justify-center gap-2 rounded-2xl px-5 h-12 text-sm font-semibold text-white btn-darey overflow-hidden disabled:opacity-50"
            >
              <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
              Dodaj
            </button>
          </form>
        </div>

        {loading ? (
          <div className="glass-liquid rounded-3xl flex items-center justify-center py-20 text-white/40">
            <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie celów…
          </div>
        ) : goals.length === 0 ? (
          <div className="glass-liquid rounded-3xl py-16 px-6 text-center">
            <div className="relative w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa]/25 to-[#8b5cf6]/10 ring-1 ring-white/15 mb-4 mx-auto">
              <Inbox className="w-7 h-7 text-[#c4b5fd]" />
            </div>
            <p className="font-display text-base font-semibold text-white">Brak celów</p>
            <p className="text-sm text-white/45 mt-1 max-w-md mx-auto">
              Wyznacz 1–3 konkretne cele — badania pokazują, że mała liczba jasnych celów działa najlepiej.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active goals */}
            {active.map((g, i) => {
              const overdue = g.deadline && new Date(g.deadline) < new Date()
              return (
                <div
                  key={g.id}
                  className="glass-liquid rise-in spotlight-card group relative rounded-3xl p-5 overflow-hidden transition-all duration-300"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0 grid place-items-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25 animate-pulse-ring">
                      <Flag className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold leading-snug">{g.title}</h3>
                        {g.target && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#c4b5fd] bg-[#a78bfa]/[0.1] border border-[#a78bfa]/25 rounded-full px-2.5 py-1">
                            <Target className="w-3 h-3" /> {g.target}
                          </span>
                        )}
                      </div>
                      {g.deadline && (
                        <span className={cn(
                          'mt-1.5 inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border',
                          overdue ? 'text-red-300 bg-red-500/8 border-red-500/20' : 'text-white/50 bg-white/[0.03] border-white/[0.08]',
                        )}>
                          <Calendar className="w-3.5 h-3.5" />
                          {overdue ? 'Po terminie — ' : 'Do '}{formatDate(g.deadline)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setStatus(g, 'DONE')}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 h-9 text-xs font-semibold text-emerald-300 bg-emerald-500/[0.1] border border-emerald-500/25 hover:bg-emerald-500/20 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Osiągnięty
                      </button>
                      <button
                        onClick={() => remove(g)}
                        className="grid h-9 w-9 place-items-center rounded-xl text-white/40 hover:text-red-300 hover:bg-red-500/10 transition"
                        aria-label="Usuń cel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Done goals */}
            {done.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] uppercase tracking-widest text-white/35 font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
                  Osiągnięte ({done.length})
                </p>
                <div className="space-y-2.5">
                  {done.map((g) => (
                    <div key={g.id} className="glass-liquid rounded-2xl px-5 py-3.5 flex items-center gap-3 opacity-70">
                      <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#34d399] to-[#10b981] ring-1 ring-white/20 shrink-0">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/60 line-through decoration-white/25">{g.title}</p>
                        {g.target && <p className="text-[11px] text-white/35">{g.target}</p>}
                      </div>
                      <button
                        onClick={() => remove(g)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-white/30 hover:text-red-300 transition"
                        aria-label="Usuń cel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flourish */}
        <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-white/25 font-medium tracking-wide">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/15" />
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="uppercase tracking-[0.25em]">Cel widoczny = cel osiągnięty</span>
          <Sparkles className="w-3 h-3 text-[#a78bfa]/50" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/15" />
        </div>
      </div>
    </StudentLayout>
  )
}
