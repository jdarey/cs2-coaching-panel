'use client'

import { useCallback, useEffect, useState } from 'react'
import { Settings, Plus, Loader2, Save, Trash2, Shield, Zap, MessageSquare, Video, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeatureFlag {
  key: string
  name: string
  description: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const flagIcons: Record<string, any> = {
  chat_enabled: MessageSquare,
  auto_elo_refresh: Zap,
  finance_module: Wallet,
  video_module: Video,
  chat_notifications: MessageSquare,
  auto_reminders: Zap,
  impersonation: Shield,
  audit_logs: Shield,
  health_monitoring: Zap,
  backup_restore: Shield,
}

const DEFAULT_FLAGS = [
  { key: 'chat_enabled', name: 'Czat', description: 'Włącza/wyłącza czat między trenerem a uczniem', enabled: true },
  { key: 'auto_elo_refresh', name: 'Auto-odświeżanie ELO', description: 'Automatyczne pobieranie ELO z Faceit co 30s', enabled: true },
  { key: 'finance_module', name: 'Moduł Finanse', description: 'Włącza moduł kosztorysu w panelu trenera', enabled: true },
  { key: 'video_module', name: 'Moduł Wideo', description: 'Włącza moduł filmów i odtwarzacz', enabled: true },
  { key: 'chat_notifications', name: 'Powiadomienia o wiadomościach', description: 'Email/SMS o nowych wiadomościach', enabled: true },
  { key: 'auto_reminders', name: 'Automatyczne przypomnienia', description: 'Crony przypominające o zadaniach/nieaktywności', enabled: true },
  { key: 'impersonation', name: 'Impersonacja (admin)', description: 'Pozwala adminowi logować się jako użytkownik', enabled: true },
  { key: 'audit_logs', name: 'Logi audytu', description: 'Rejestracja działań administracyjnych', enabled: true },
  { key: 'health_monitoring', name: 'Monitoring zdrowia', description: 'Sprawdzanie statusu serwisów zewnętrznych', enabled: true },
  { key: 'backup_restore', name: 'Backup/Restore', description: 'Funkcje backupu i przywracania bazy', enabled: true },
]

function FlagIcon({ flag, enabled }: { flag: { key: string }; enabled: boolean }) {
  const Icon = flagIcons[flag.key] || Settings
  return <Icon className={cn('w-5 h-5', enabled ? 'text-[#c4b5fd]' : 'text-white/30')} />
}

export function AdminFeatureFlagsClient() {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newFlag, setNewFlag] = useState({ key: '', name: '', description: '', enabled: true })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/feature-flags')
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, FeatureFlag> = {}
        data.flags?.forEach((f: any) => { map[f.key] = f })
        DEFAULT_FLAGS.forEach((d) => { if (!map[d.key]) map[d.key] = { ...d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } })
        setFlags(map)
      }
    } catch {
      const map: Record<string, FeatureFlag> = {}
      DEFAULT_FLAGS.forEach((d) => { map[d.key] = { ...d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } })
      setFlags(map)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const saveFlag = async (key: string, enabled: boolean) => {
    setSaving(key)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu')
      setFlags((prev) => ({ ...prev, [key]: { ...prev[key], enabled: data.flag.enabled, updatedAt: data.flag.updatedAt } }))
      setMsg({ ok: true, text: `${data.flag.name} ${enabled ? 'włączone' : 'wyłączone'}.` })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd zapisu' })
      setFlags((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !enabled } }))
    } finally {
      setSaving(null)
    }
  }

  const deleteFlag = async (key: string) => {
    if (!confirm(`Usunąć flagę "${flags[key]?.name || key}"?`)) return
    try {
      const res = await fetch(`/api/admin/feature-flags?key=${key}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Błąd usuwania')
      setFlags((prev) => { const n = { ...prev }; delete n[key]; return n })
      setMsg({ ok: true, text: 'Flaga usunięta.' })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd usuwania' })
    }
  }

  const createFlag = async () => {
    const { key, name, description, enabled } = newFlag
    if (!key || !name) { setMsg({ ok: false, text: 'Klucz i nazwa są wymagane.' }); return }
    if (!/^[a-z0-9_]+$/.test(key)) { setMsg({ ok: false, text: 'Klucz: tylko małe litery, cyfry, podkreślenia.' }); return }
    if (flags[key]) { setMsg({ ok: false, text: 'Flaga o tym kluczu już istnieje.' }); return }
    setCreating(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, name, description, enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd tworzenia')
      setFlags((prev) => ({ ...prev, [data.flag.key]: data.flag }))
      setNewFlag({ key: '', name: '', description: '', enabled: true })
      setMsg({ ok: true, text: `Flaga "${name}" utworzona.` })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd tworzenia' })
    } finally {
      setCreating(false)
    }
  }

  const toggleFlag = (key: string) => {
    const flag = flags[key]
    if (!flag) return
    saveFlag(key, !flag.enabled)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/40 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie flag…
      </div>
    )
  }

  return (
    <div className="pb-16">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
            <Settings className="w-5 h-5 text-white" />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Administracja</p>
            <h1 className="font-display text-2xl font-bold">Feature Flags</h1>
          </div>
        </div>
        <button
          onClick={() => setNewFlag({ key: '', name: '', description: '', enabled: true })}
          className="inline-flex items-center gap-2 h-11 rounded-xl px-4 text-sm font-semibold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]"
        >
          <Plus className="w-4 h-4" /> Nowa flaga
        </button>
      </div>

      {msg && (
        <div className={cn('mb-6 rounded-xl px-4 py-3 text-sm border', msg.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' : 'bg-red-500/10 border-red-500/25 text-red-200')}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/40 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie flag…
        </div>
      ) : (
        <div className="space-y-3">
          {Object.values(flags).map((flag) => (
            <div key={flag.key} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-6 transition-colors hover:border-white/10">
              <div className="flex items-start gap-4">
                <div className={cn('grid h-12 w-12 place-items-center rounded-xl flex-shrink-0', flag.enabled ? 'bg-[#a78bfa]/15' : 'bg-white/[0.03]')}>
                  {(() => {
                    const Icon = flagIcons[flag.key] || Settings
                    return <Icon className={cn('w-5 h-5', flag.enabled ? 'text-[#c4b5fd]' : 'text-white/30')} />
                  })()}
                </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-display font-semibold text-white truncate">{flag.name}</p>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md', flag.enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-white/50')}>
                      {flag.enabled ? 'WŁĄCZONE' : 'WYŁĄCZONE'}
                    </span>
                  </div>
                  {flag.description && <p className="mt-1 text-sm text-white/45 truncate">{flag.description}</p>}
                  <p className="mt-1 text-xs text-white/35 font-mono">Key: {flag.key}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFlag(flag.key)}
                    disabled={saving === flag.key}
                    className={cn(
                      'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                      flag.enabled ? 'bg-[#a78bfa] after:translate-x-full' : 'bg-white/10 after:translate-x-0'
                    )}
                  >
                    <span className={cn('absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform', flag.enabled ? 'after:translate-x-full' : '')} />
                  </button>
                  <button
                    onClick={() => deleteFlag(flag.key)}
                    disabled={saving === flag.key}
                    className="shrink-0 p-2 rounded-lg text-white/30 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    title="Usuń flagę"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}