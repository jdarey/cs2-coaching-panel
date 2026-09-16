'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Search, KeyRound, Loader2, Copy, Check, Gamepad2, TrendingUp, Eye, Download, ArrowLeftRight, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: string
  faceitNickname: string | null
  steamId: string | null
  steamVanity: string | null
  coach: { id: string; name: string | null; email: string } | null
  lastActiveAt: string | null
  createdAt: string
  _count: { sessionsAsStudent: number }
}

interface Coach {
  id: string
  email: string
  name: string | null
  _count: { coachedStudents: number }
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
  // Rozwinięty wiersz: edycja kont gracza
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [gaming, setGaming] = useState({ faceitNickname: '', steamId: '', steamVanity: '' })
  const [savingGaming, setSavingGaming] = useState(false)
  const [fetchingElo, setFetchingElo] = useState(false)
  // Zmiana trenera
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [coachId, setCoachId] = useState('')
  const [savingCoach, setSavingCoach] = useState(false)

  const loadCoaches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/coaches')
      if (res.ok) setCoaches((await res.json()).coaches ?? [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadCoaches()
  }, [loadCoaches])

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

  const toggleGaming = (u: AdminUser) => {
    if (expandedId === u.id) {
      setExpandedId(null)
    } else {
      setExpandedId(u.id)
      setGaming({
        faceitNickname: u.faceitNickname ?? '',
        steamId: u.steamId ?? '',
        steamVanity: u.steamVanity ?? '',
      })
      setCoachId(u.coach?.id ?? '')
    }
  }

  const saveGaming = async (u: AdminUser) => {
    setSavingGaming(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/gaming`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gaming),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu')
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...data.gaming } : x)))
      setMsg({ ok: true, text: `Zapisano konta dla ${u.email}.` })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd zapisu' })
    } finally {
      setSavingGaming(false)
    }
  }

  const fetchElo = async (u: AdminUser) => {
    setFetchingElo(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/fetch-elo`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd pobierania')
      setMsg({
        ok: true,
        text: `${u.email}: ELO ${data.elo}${data.level ? ` (lvl ${data.level})` : ''}${data.saved ? ' — dopisano do trajektorii.' : ' — bez zmian w trajektorii.'}`,
      })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd pobierania' })
    } finally {
      setFetchingElo(false)
    }
  }

  const saveCoach = async (u: AdminUser) => {
    setSavingCoach(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/coach`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: coachId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu')
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, coach: data.coach } : x)))
      setMsg({ ok: true, text: data.coach ? `${u.email} → trener: ${data.coach.name || data.coach.email}.` : `${u.email} → bez trenera.` })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd zapisu' })
    } finally {
      setSavingCoach(false)
    }
  }

  const impersonate = async (u: AdminUser) => {
    if (u.role === 'ADMIN') {
      setMsg({ ok: false, text: 'Nie można zalogować się jako inny admin.' })
      return
    }
    setBusyId(u.id)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/users/${u.id}/impersonate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd generowania linku')
      // Otwórz w nowej karcie
      window.open(data.loginUrl, '_blank', 'noopener,noreferrer')
      setMsg({ ok: true, text: `Link do logowania jako ${u.email} otwarty w nowej karcie.` })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd impersonacji' })
    } finally {
      setBusyId(null)
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
        <a
          href="/api/admin/users/export"
          className="inline-flex items-center justify-center gap-2 h-11 rounded-xl px-4 text-sm font-semibold text-white/80 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.09]"
        >
          <Download className="w-4 h-4" /> Eksport CSV
        </a>
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
              <li key={u.id}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name || '—'}{' '}
                      <span className={cn('ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md', u.role === 'ADMIN' ? 'bg-[#a78bfa]/15 text-[#c4b5fd]' : u.role === 'COACH' ? 'bg-sky-500/15 text-sky-300' : 'bg-white/[0.06] text-white/50')}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      {u.email}
                      {u.coach && <span className="text-white/50"> · trener: {u.coach.name || u.coach.email}</span>}
                      {u.faceitNickname && <span className="text-[#ff9a5c]/80"> · Faceit: {u.faceitNickname}</span>}
                      {(u.steamId || u.steamVanity) && <span className="text-sky-300/70"> · Steam ✓</span>}
                    </p>
                  </div>
                  <a
                    href={`/admin/users/${u.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Podgląd oczami ucznia (read-only, nowa karta)"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white/70 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Podgląd</span>
                  </a>
                  <button
                    onClick={() => impersonate(u)}
                    disabled={busyId === u.id}
                    title="Zaloguj jako ten użytkownik (otwiera link w nowej karcie)"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#ff9a5c] bg-[#ff5500]/[0.08] border border-[#ff5500]/20 hover:bg-[#ff5500]/15 disabled:opacity-50"
                  >
                    <User className="w-3.5 h-3.5" /> Zaloguj jako
                  </button>
                  <button
                    onClick={() => toggleGaming(u)}
                    title="Edycja kont gier i trenera (Faceit / Steam)"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-sky-300 bg-sky-500/[0.08] border border-sky-500/20 hover:bg-sky-500/15"
                  >
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Konta</span>
                  </button>
                  <button
                    onClick={() => resetPassword(u)}
                    disabled={busyId === u.id}
                    title="Wyślij link resetujący hasło"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-200 bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/15 disabled:opacity-50"
                  >
                    {busyId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    Reset hasła
                  </button>
                </div>
                {expandedId === u.id && (
                  <div className="px-4 pb-4 pt-1">
                    <div className="rounded-xl p-4 bg-black/30 border border-white/[0.07] grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45 mb-1">Nick Faceit</label>
                        <input
                          value={gaming.faceitNickname}
                          onChange={(e) => setGaming({ ...gaming, faceitNickname: e.target.value })}
                          placeholder="np. darey"
                          className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.1] px-3 text-sm outline-none focus:border-[#ff5500]/60"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45 mb-1">Steam ID64</label>
                        <input
                          value={gaming.steamId}
                          onChange={(e) => setGaming({ ...gaming, steamId: e.target.value })}
                          placeholder="np. 7656119…"
                          className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.1] px-3 text-sm outline-none focus:border-sky-500/60"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45 mb-1">Steam vanity (link)</label>
                        <input
                          value={gaming.steamVanity}
                          onChange={(e) => setGaming({ ...gaming, steamVanity: e.target.value })}
                          placeholder="np. darey (ze steamcommunity.com/id/…)"
                          className="w-full h-10 rounded-lg bg-white/[0.05] border border-white/[0.1] px-3 text-sm outline-none focus:border-sky-500/60"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => saveGaming(u)}
                        disabled={savingGaming}
                        className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg text-xs font-semibold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] disabled:opacity-50"
                      >
                        {savingGaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Zapisz konta
                      </button>
                      <button
                        onClick={() => fetchElo(u)}
                        disabled={fetchingElo}
                        title="Pobierz live ELO i dopisz do trajektorii"
                        className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg text-xs font-semibold text-[#ff9a5c] bg-[#ff5500]/[0.08] border border-[#ff5500]/25 hover:bg-[#ff5500]/15 disabled:opacity-50"
                      >
                        {fetchingElo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Pobierz ELO
                      </button>
                    </div>
                    {u.role === 'STUDENT' && (
                      <div className="mt-3 rounded-xl p-4 bg-black/30 border border-white/[0.07]">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45 mb-2">
                          <ArrowLeftRight className="w-3.5 h-3.5" /> Trener ucznia
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={coachId}
                            onChange={(e) => setCoachId(e.target.value)}
                            className="flex-1 h-10 rounded-lg bg-white/[0.05] border border-white/[0.1] px-3 text-sm text-white outline-none focus:border-[#a78bfa]/50 [&>option]:bg-[#14161c]"
                          >
                            <option value="">— bez trenera —</option>
                            {coaches.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name || c.email} ({c._count.coachedStudents} ucz.)
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => saveCoach(u)}
                            disabled={savingCoach}
                            className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg text-xs font-semibold text-white bg-white/[0.06] border border-white/[0.12] hover:bg-white/[0.1] disabled:opacity-50"
                          >
                            {savingCoach ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Przypisz
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
