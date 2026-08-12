'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { CountUp } from '@/components/count-up'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Timer, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Users, Flame, TrendingUp, Inbox,
} from 'lucide-react'

interface PracticeRow {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  bars: { label: string; minutes: number; isCurrent: boolean }[]
  thisWeek: number
  lastWeek: number
  delta: number
  total: number
  sessions: number
}

type SortKey = 'name' | 'thisWeek' | 'lastWeek' | 'delta' | 'total' | 'sessions'

interface CoachPracticeClientProps {
  rows: PracticeRow[]
  stats: { students: number; allTime: number; activeThisWeek: number }
}

export function CoachPracticeClient({ rows, stats }: CoachPracticeClientProps) {
  const router = useRouter()
  useLiveRefresh(() => router.refresh())

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('thisWeek')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const maxBar = Math.max(1, ...rows.flatMap((r) => r.bars.map((b) => b.minutes)))

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    )
    return filtered.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = (a.name || a.email).localeCompare(b.name || b.email)
      } else {
        cmp = a[sortKey] - b[sortKey]
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const HeaderCell = ({ label, k, align = 'text-right' }: { label: string; k: SortKey; align?: string }) => {
    const active = sortKey === k
    return (
      <th className={cn('px-4 py-3 text-[11px] uppercase tracking-widest font-semibold whitespace-nowrap', align)}>
        <button
          onClick={() => toggleSort(k)}
          className={cn(
            'inline-flex items-center gap-1 transition-colors',
            active ? 'text-[#c4b5fd]' : 'text-white/40 hover:text-white/70',
          )}
        >
          {label}
          {active ? (
            sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </th>
    )
  }

  const formatMin = (m: number) => (m > 0 ? `${m} min` : '—')

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader
          icon={Timer}
          label="Monitorowanie"
          title="Praktyka uczniów"
          subtitle="Minuty treningu zalogowane przez uczniów z timerów — kto pracuje, a kto potrzebuje przypomnienia."
        />

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold"><CountUp value={stats.students} /></p>
                <p className="text-xs text-white/45">uczniów</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] ring-1 ring-white/20">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold"><CountUp value={stats.allTime} /></p>
                <p className="text-xs text-white/45">minut treningu łącznie</p>
              </div>
            </div>
          </div>
          <div className="glass-liquid rise-in spotlight-card rounded-3xl p-5 relative overflow-hidden" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-[#34d399] to-[#16a34a] ring-1 ring-white/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold"><CountUp value={stats.activeThisWeek} /></p>
                <p className="text-xs text-white/45">aktywnych w tym tygodniu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6 animate-rise-in" style={{ animationDelay: '200ms' }}>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj ucznia..."
            className="glass-liquid h-12 w-full rounded-2xl pl-11 pr-11 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#8b5cf6]/30 transition"
            aria-label="Szukaj ucznia"
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

        {/* Table */}
        {sorted.length === 0 ? (
          <div className="glass-liquid rounded-3xl p-16 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/55">
              {search ? 'Nie znaleziono uczniów pasujących do kryteriów' : 'Brak uczniów. Dodaj ucznia, aby śledzić jego praktykę.'}
            </p>
          </div>
        ) : (
          <div className="glass-liquid rounded-3xl overflow-hidden animate-rise-in" style={{ animationDelay: '240ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-[11px] uppercase tracking-widest font-semibold text-left">
                      <button
                        onClick={() => toggleSort('name')}
                        className={cn('inline-flex items-center gap-1 transition-colors', sortKey === 'name' ? 'text-[#c4b5fd]' : 'text-white/40 hover:text-white/70')}
                      >
                        Uczeń
                        {sortKey === 'name' ? (
                          sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-[11px] uppercase tracking-widest font-semibold text-white/40 text-center">Ostatnie 8 tygodni</th>
                    <HeaderCell label="Ten tydzień" k="thisWeek" />
                    <HeaderCell label="Poprzedni" k="lastWeek" />
                    <HeaderCell label="Zmiana" k="delta" />
                    <HeaderCell label="Łącznie" k="total" />
                    <HeaderCell label="Sesje" k="sessions" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => {
                    const maxRow = Math.max(1, ...r.bars.map((b) => b.minutes))
                    const noPractice = r.total === 0
                    return (
                      <tr
                        key={r.id}
                        className={cn(
                          'border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]',
                          noPractice && 'opacity-60',
                        )}
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <td className="px-4 py-3.5">
                          <Link href={`/coach/students?q=${encodeURIComponent(r.email)}`} className="flex items-center gap-3 group min-w-0">
                            <Avatar className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/15">
                              <AvatarImage src={r.avatarUrl || undefined} alt={r.name || r.email} />
                              <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] text-white font-semibold text-sm">
                                {(r.name || r.email)[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-white/90 group-hover:text-white truncate transition-colors">{r.name || r.email}</p>
                              <p className="text-[11px] text-white/40 truncate">{r.email}</p>
                            </div>
                          </Link>
                        </td>
                        {/* Mini 8-week chart */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-end gap-[3px] h-8 w-40 mx-auto">
                            {r.bars.map((b, bi) => (
                              <div
                                key={bi}
                                title={`${b.label}: ${b.minutes} min`}
                                className={cn(
                                  'flex-1 rounded-t transition-all duration-500',
                                  b.isCurrent
                                    ? 'bg-gradient-to-t from-[#8b5cf6] to-[#a78bfa] ring-1 ring-white/20'
                                    : b.minutes > 0
                                      ? 'bg-[#a78bfa]/40'
                                      : 'bg-white/[0.06]',
                                )}
                                style={{ height: `${b.minutes > 0 ? Math.max(4, (b.minutes / maxRow) * 30) : 3}px` }}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={cn('font-display font-bold tabular-nums', r.thisWeek > 0 ? 'text-white' : 'text-white/30')}>
                            {r.thisWeek > 0 ? `${r.thisWeek} min` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="tabular-nums text-white/45">{formatMin(r.lastWeek)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {r.delta !== 0 ? (
                            <span className={cn('inline-flex items-center gap-1 font-semibold tabular-nums', r.delta > 0 ? 'text-[#34d399]' : 'text-red-300')}>
                              {r.delta > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                              {r.delta > 0 ? '+' : ''}{r.delta}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-display font-semibold tabular-nums text-[#c4b5fd]">{r.total > 0 ? `${r.total} min` : '—'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="tabular-nums text-white/45">{r.sessions > 0 ? r.sessions : '—'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-white/30 font-medium tracking-wide">
          Dane z timerów treningowych — aktualizują się automatycznie po każdym ukończonym treningu ucznia.
        </p>
      </div>
    </CoachLayout>
  )
}
