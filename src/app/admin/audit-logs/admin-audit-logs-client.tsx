'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Search, Download, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

interface AuditLog {
  id: string
  actorId: string
  actorRole: string
  action: string
  targetId: string | null
  targetType: string | null
  details: Record<string, any> | null
  ip: string | null
  userAgent: string | null
  createdAt: string
  actor: { email: string; name: string | null }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function AdminAuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ action: '', actorId: '', targetId: '', dateFrom: '', dateTo: '' })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [actions, setActions] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(pagination.page))
      params.set('limit', String(pagination.limit))
      if (filters.action) params.set('action', filters.action)
      if (filters.actorId) params.set('actorId', filters.actorId)
      if (filters.targetId) params.set('targetId', filters.targetId)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      setLogs(data.logs ?? [])
      setPagination(data.pagination ?? pagination)
      setActions(data.filters?.map((f: any) => f.action) ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [pagination.page, filters])

  useEffect(() => {
    load()
  }, [load])

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPagination((p) => ({ ...p, page: 1 }))
  }

  const exportLogs = async () => {
    const params = new URLSearchParams()
    if (filters.action) params.set('action', filters.action)
    if (filters.actorId) params.set('actorId', filters.actorId)
    if (filters.targetId) params.set('targetId', filters.targetId)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    // Eksport all - set limit high
    params.set('limit', '5000')
    window.open(`/api/admin/audit-logs/export?${params.toString()}`, '_blank')
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
            <Shield className="w-5 h-5 text-white" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Administracja</p>
            <h1 className="font-display text-2xl font-bold">Logi audytu</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportLogs} className="inline-flex items-center gap-2 h-11 rounded-xl px-4 text-sm font-semibold text-white/80 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.09]">
            <Download className="w-4 h-4" /> Eksport CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full h-11 rounded-xl bg-black/30 border border-white/[0.08] pl-10 pr-4 text-sm outline-none focus:border-[#a78bfa]/50 text-white/80 [color-scheme:dark]"
            >
              <option value="">Wszystkie akcje</option>
              {actions.map((a) => (
                <option key={a} value={a}>{formatAction(a)}</option>
              ))}
            </select>
          </div>
          <input
            value={filters.actorId}
            onChange={(e) => handleFilterChange('actorId', e.target.value)}
            placeholder="ID aktora (cuid, nie email)"
            title="Wklej ID użytkownika (cuid) — filtrowanie po emailu nie jest wspierane"
            className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 placeholder:text-white/30"
          />
          <input
            value={filters.targetId}
            onChange={(e) => handleFilterChange('targetId', e.target.value)}
            placeholder="ID obiektu"
            className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 placeholder:text-white/30"
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 [color-scheme:dark]"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50 [color-scheme:dark]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/40 text-sm">
          <div className="w-5 h-5 animate-spin border-2 border-[#a78bfa] border-t-transparent rounded-full mr-2" />
          Ładowanie logów…
        </div>
      ) : logs.length === 0 ? (
        <p className="py-16 text-center text-sm text-white/40">Brak logów spełniających kryteria.</p>
      ) : (
        <>
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
            <ul className="divide-y divide-white/[0.06]">
              {logs.map((log) => (
                <li key={log.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      log.action.includes('BLOCKED') || log.action.includes('DELETE') ? 'bg-red-500/15 text-red-300 border-red-500/25' :
                      log.action.includes('CREATE') || log.action.includes('RESTORE') ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' :
                      log.action.includes('LOGIN') || log.action.includes('IMPERSONATE') ? 'bg-[#a78bfa]/15 text-[#c4b5fd] border-[#a78bfa]/25' :
                      'bg-white/[0.06] text-white/50 border-white/[0.1]'
                    )}>
                      {formatAction(log.action)}
                    </span>
                    <p className="text-sm font-semibold text-white flex-1 min-w-0 truncate">
                      {log.actor?.name || log.actor?.email || log.actorId}
                      <span className="text-white/40 ml-2">({log.actor?.email || log.actorId})</span>
                    </p>
                    {log.targetId && (
                      <span className="text-xs text-white/35 font-mono bg-white/[0.03] px-2 py-0.5 rounded">{log.targetType}: {log.targetId}</span>
                    )}
                    <span className="text-xs text-white/35 shrink-0">{new Date(log.createdAt).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })}</span>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] transition-colors"
                      aria-label="Szczegóły"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <details className="mt-2 pl-10 text-xs text-white/40">
                      <summary className="cursor-pointer hover:text-white/60">Szczegóły (JSON)</summary>
                      <pre className="mt-1 p-3 rounded bg-black/30 border border-white/[0.05] overflow-auto max-h-48 font-mono text-[11px]">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1} className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="w-5 h-5" /></button>
              <span className="px-4 text-sm text-white/60">Strona {pagination.page} z {pagination.totalPages} ({pagination.total} logów)</span>
              <button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages} className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-5 h-5" /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}