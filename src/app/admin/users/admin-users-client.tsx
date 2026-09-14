'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Search, KeyRound, Loader2, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: string
  lastActiveAt: string | null
  createdAt: string
  _count: { sessionsAsStudent: number }
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', COACH: 'Trener', STUDENT: 'Uczeń' }

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [manualLink, setManualLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (role) params.set('role', role)
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (res.ok) setUsers((await res.json()).users ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [q, role])

  useEffect(() => {
    const t = setTimeout(load, q ? 400 : 0)
    return () => clearTimeout(t)
  }, [load])

  const resetPassword = async (u: AdminUser) => {
    if (!confirm(`Wysłać link resetujący hasło do ${u.email}?`)) return
    setBusyId(u.id)
    setMsg(null)
    setManualLink(null)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd')
      setMsg({
        ok: true,
        text: data.emailSent
          ? `Link wysłany mailem do ${u.email}.`
          : `Mail nie doszedł (limity?) — wyślij link ręcznie (skopiuj poniżej).`,
      })
      if (data.resetUrl) setManualLink(data.resetUrl)
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd wysyłania' })
    } finally {
      setBusyId(null)
    }
  }

  const copyLink = async () => {
    if (!manualLink) return
    try {
      await navigator.clipboard.writeText(manualLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="pb-16">
      <div className="flex items-center gap-3 mb-1">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
          <Users className="w-5 h-5 text-white" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Administracja</p>
          <h1 className="font-display text-2xl font-bold">Użytkownicy</h1>
        </div>
      </div>
      <p className="text-sm text-white/45 mb-6">Wyszukaj konto i jednym klikiem wyślij mu link resetujący hasło (ważny 1h).</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po emailu lub nazwie…"
            className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-10 pr-4 text-sm placeholder:text-white/30 outline-none focus:border-[#a78bfa]/50"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/50 [&>option]:bg-[#14161c]"
        >
          <option value="">Wszystkie role</option>
          <option value="STUDENT">Uczniowie</option>
          <option value="COACH">Trenerzy</option>
          <option value="ADMIN">Admini</option>
        </select>
      </div>

      {msg && (
        <div className={cn('mb-4 rounded-xl px-4 py-3 text-sm border', msg.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' : 'bg-red-500/10 border-red-500/25 text-red-200')}>
          {msg.text}
        </div>
      )}
      {manualLink && (
        <div className="mb-4 rounded-xl p-4 bg-white/[0.03] border border-white/[0.08]">
          <p className="text-xs text-white/50 mb-2">Link do ręcznego wysłania (ważny 1h, jednorazowy):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs text-white/80 bg-black/40 rounded-lg px-3 py-2">{manualLink}</code>
            <button onClick={copyLink} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#a78bfa]/15 border border-[#a78bfa]/30 hover:bg-[#a78bfa]/25">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'OK' : 'Kopiuj'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/40 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie…
          </div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-white/40">Brak użytkowników.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.name || '—'}{' '}
                    <span className={cn('ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md', u.role === 'ADMIN' ? 'bg-[#a78bfa]/15 text-[#c4b5fd]' : u.role === 'COACH' ? 'bg-sky-500/15 text-sky-300' : 'bg-white/[0.06] text-white/50')}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </p>
                  <p className="text-xs text-white/40 truncate">{u.email}</p>
                </div>
                <button
                  onClick={() => resetPassword(u)}
                  disabled={busyId === u.id}
                  title="Wyślij link resetujący hasło"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-200 bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/15 disabled:opacity-50"
                >
                  {busyId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                  Reset hasła
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
