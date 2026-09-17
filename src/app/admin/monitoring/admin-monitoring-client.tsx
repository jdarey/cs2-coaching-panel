'use client'

import { useEffect, useState } from 'react'
import { Shield, Activity, RefreshCw, Loader2, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Users, UserPlus, Zap, Database, ClipboardList, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs?: number
  details?: string
  lastChecked: string
}

interface HealthResponse {
  checks: HealthCheck[]
  overall: 'healthy' | 'degraded' | 'down'
}

interface Overview {
  entities: { usersTotal: number; students: number; coaches: number; admins: number; routines: number; routineAssignments: number; sessionsTotal: number; videosTotal: number }
  growth: { last24h: number; last7d: number; last30d: number; latest: { email: string; name: string | null; createdAt: string } | null }
  activity: { active24h: number; active7d: number; auditEvents24h: number; auditErrors24h: number }
  signups: { date: string; count: number }[]
  training: { date: string; count: number }[]
  recentAudit: { id: string; action: string; actorRole: string; createdAt: string }[]
  generatedAt: string
}

export function AdminMonitoringClient() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [hRes, oRes] = await Promise.all([
        fetch('/api/admin/health'),
        fetch('/api/admin/overview').catch(() => null),
      ])
      if (!hRes.ok) throw new Error(`Health API: ${hRes.status}`)
      setData(await hRes.json())
      if (oRes?.ok) setOverview(await oRes.json())
    } catch (e: any) {
      setError(e.message || 'Nie udało się pobrać statusu')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => load(true), 60_000) // co minutę, cicho (bez migania tabeli)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const statusIcon = (status: string) => {
    return status === 'healthy' ? (
      <CheckCircle2 className={cn('w-5 h-5', 'text-emerald-300')} />
    ) : status === 'degraded' ? (
      <AlertTriangle className={cn('w-5 h-5', 'text-amber-300')} />
    ) : (
      <XCircle className={cn('w-5 h-5', 'text-red-300')} />
    )
  }

  const statusBadge = (status: string) => (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
      status === 'healthy' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' :
      status === 'degraded' ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' :
      'bg-red-500/15 text-red-300 border-red-500/25'
    )}>
      {status === 'healthy' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'degraded' && <AlertTriangle className="w-3 h-3" />}
      {status === 'down' && <XCircle className="w-3 h-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )

  const formatLatency = (ms?: number) => {
    if (!ms) return '—'
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })
  }

  return (
    <div className="pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
            <Activity className="w-5 h-5 text-white" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Administracja</p>
            <h1 className="font-display text-2xl font-bold">Monitoring systemu</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#a78bfa] focus:ring-[#a78bfa]"
            />
            Auto-odświeżanie (60s)
          </label>
          <button
            onClick={() => { load(); setAutoRefresh(false) }}
            disabled={loading}
            className="inline-flex items-center gap-2 h-11 rounded-xl px-4 text-sm font-semibold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] disabled:opacity-50"
          >
            {loading || refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Odśwież
          </button>
        </div>
      </div>

      {/* ===== Przegląd systemu (overview) ===== */}
      {overview && (
        <div className="mb-8 space-y-4">
          {/* Statystyki naboru i aktywności */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Użytkownicy" value={overview.entities.usersTotal} sub={`${overview.entities.students} uczniów · ${overview.entities.coaches} trenerów`} />
            <StatCard icon={UserPlus} label="Nowi (7 dni)" value={overview.growth.last7d} sub={`${overview.growth.last24h} dziś · ${overview.growth.last30d} w 30 dni`} accent />
            <StatCard icon={Zap} label="Aktywni (24h)" value={overview.activity.active24h} sub={`${overview.activity.active7d} w 7 dni`} />
            <StatCard icon={Database} label="Treningi (24h)" value={overview.activity.auditEvents24h} sub="zdarzenia audytu" />
          </div>

          {/* Wykresy: rejestracje + treningi (14 dni) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <MiniChart title="Rejestracje — 14 dni" icon={UserPlus} data={overview.signups} color="139, 92, 246" />
            <MiniChart title="Zaliczone zadania treningowe — 14 dni" icon={ClipboardList} data={overview.training} color="45, 212, 191" />
          </div>

          {/* Encje + ostatnie akcje audytu */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-3 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Encje w bazie</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <EntityRow label="Rutyny" value={overview.entities.routines} />
                <EntityRow label="Przypisane rutyny" value={overview.entities.routineAssignments} />
                <EntityRow label="Sesje" value={overview.entities.sessionsTotal} />
                <EntityRow label="Filmy" value={overview.entities.videosTotal} />
                <EntityRow label="Trenerzy" value={overview.entities.coaches} />
                <EntityRow label="Admini" value={overview.entities.admins} />
              </div>
              {overview.growth.latest && (
                <p className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-white/45 truncate">
                  Ostatnio dołączył: <b className="text-white/75">{overview.growth.latest.name || overview.growth.latest.email}</b>{' '}
                  · {new Date(overview.growth.latest.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-3 flex items-center gap-1.5"><ScrollText className="w-3.5 h-3.5" /> Ostatnie akcje w systemie</p>
              <ul className="space-y-2">
                {overview.recentAudit.length === 0 && <li className="text-sm text-white/35">Brak zdarzeń.</li>}
                {overview.recentAudit.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] shrink-0" />
                    <span className="font-mono text-xs text-white/75 truncate">{a.action}</span>
                    <span className="ml-auto text-[11px] text-white/35 shrink-0">{new Date(a.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
              <a href="/admin/audit-logs" className="mt-3 pt-3 border-t border-white/[0.06] inline-flex items-center gap-1 text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors">
                Zobacz pełne logi <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Overall status */}
      {data && (
        <div className={cn('mb-6 rounded-2xl p-5', data.overall === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : data.overall === 'degraded' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20')}>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: data.overall === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : data.overall === 'degraded' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
              {statusIcon(data.overall)}
            </span>
            <div>
              <p className="font-display text-lg font-bold text-white">
                Status systemu: <span className={cn(
                  data.overall === 'healthy' ? 'text-emerald-300' :
                  data.overall === 'degraded' ? 'text-amber-300' :
                  'text-red-300'
                )}>
                  {data.overall.charAt(0).toUpperCase() + data.overall.slice(1)}
                </span>
              </p>
              <p className="text-sm text-white/50">Ostatnia kontrola: {data.checks.length > 0 ? formatTime(data.checks[0].lastChecked) : '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Checks table */}
      {error && !data && (
        <div className="mb-6 rounded-xl px-4 py-3 text-sm border bg-red-500/10 border-red-500/25 text-red-200">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/40 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Sprawdzanie serwisów…
          </div>
        ) : data ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/45">Serwis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/45">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/45">Latencja</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/45">Szczegóły</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/45">Ostatnia kontrola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.checks.map((check) => (
                  <tr key={check.name} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{check.name}</p>
                    </td>
                    <td className="px-4 py-3">{statusBadge(check.status)}</td>
                    <td className="px-4 py-3 text-sm text-white/60 font-mono tabular-nums">{formatLatency(check.latencyMs)}</td>
                    <td className="px-4 py-3 text-sm text-white/50">{check.details || '—'}</td>
                    <td className="px-4 py-3 text-sm text-white/40 font-mono">{formatTime(check.lastChecked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span className="font-semibold text-emerald-200">Zdrowy</span>
          </div>
          <p className="text-xs text-white/50">Serwis działa poprawnie, latencja w normie.</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span className="font-semibold text-amber-200">Obciążony</span>
          </div>
          <p className="text-xs text-white/50">Serwis odpowiada, ale z opóźnieniami lub rate limit.</p>
        </div>
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-300" />
            <span className="font-semibold text-red-200">Niedostępny</span>
          </div>
          <p className="text-xs text-white/50">Serwis nie odpowiada lub zwraca błąd krytyczny.</p>
        </div>
      </div>
    </div>
  )
}

/* ===== Pomocnicze komponenty ===== */

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <span className={cn('grid h-8 w-8 place-items-center rounded-lg', accent ? 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]' : 'bg-white/[0.06] border border-white/[0.08]')}>
          <Icon className={cn('w-4 h-4', accent ? 'text-white' : 'text-[#a78bfa]')} />
        </span>
        <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  )
}

function EntityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
      <span className="text-white/55">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

/** Mini wykres słupkowy — czysty CSS, bez bibliotek. 14 dni. */
function MiniChart({ title, icon: Icon, data, color }: { title: string; icon: any; data: { date: string; count: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-3 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {title}</p>
      <div className="flex items-end gap-1 h-24">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-100 opacity-80 min-h-[2px]"
              style={{ height: `${Math.max(4, (d.count / max) * 88)}px`, background: `linear-gradient(180deg, rgba(${color},0.9), rgba(${color},0.35))` }}
              title={`${d.date}: ${d.count}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-white/30 mt-1.5">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}