'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, Loader2, Save, Send, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Template {
  key: string
  label: string
  hint: string
  customized: boolean
  updatedAt: string | null
  subject: string
  preheader: string
  badge: string
  title: string
  subtitle: string
  bodyHtml: string
  buttonLabel: string
  buttonNote: string
  footerNote: string
}

const FIELDS: { name: keyof Template; label: string; rows?: number; mono?: boolean }[] = [
  { name: 'subject', label: 'Temat maila' },
  { name: 'preheader', label: 'Podgląd (preheader)' },
  { name: 'badge', label: 'Pigułka nad tytułem' },
  { name: 'title', label: 'Nagłówek' },
  { name: 'subtitle', label: 'Podtytuł', rows: 2 },
  { name: 'bodyHtml', label: 'Treść (HTML, zmienne {{…}})', rows: 8, mono: true },
  { name: 'buttonLabel', label: 'Tekst przycisku' },
  { name: 'buttonNote', label: 'Notka pod przyciskiem' },
  { name: 'footerNote', label: 'Stopka' },
]

export function AdminEmailsClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/email-templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
        setActiveKey((prev) => prev ?? data.templates?.[0]?.key ?? null)
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

  const active = templates.find((t) => t.key === activeKey) ?? null

  useEffect(() => {
    setDraft(active ? { ...active } : null)
    setMsg(null)
  }, [activeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!draft && !!active && FIELDS.some((f) => draft[f.name] !== active[f.name])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu')
      setMsg({ ok: true, text: 'Zapisano. Nowe maile pójdą z tą treścią.' })
      load()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd zapisu' })
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    if (!activeKey) return
    if (dirty && !confirm('Masz niezapisane zmiany — test pójdzie ze ZAPISANĄ wersją. Wysłać mimo to?')) return
    setTesting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/email-templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: activeKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd wysyłki')
      setMsg({ ok: true, text: `Test wysłany na ${data.to}. Sprawdź skrzynkę (i spam).` })
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Błąd wysyłki' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/40 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Ładowanie szablonów…
      </div>
    )
  }

  return (
    <div className="pb-16">
      <div className="flex items-center gap-3 mb-1">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9]">
          <Mail className="w-5 h-5 text-white" />
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Administracja</p>
          <h1 className="font-display text-2xl font-bold">Treści maili</h1>
        </div>
      </div>
      <p className="text-sm text-white/45 mb-6">Zmień tekst, zapisz — kolejne maile idą z nową treścią. Przycisk i linki generuje system (bezpieczeństwo).</p>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveKey(t.key)}
            className={cn(
              'shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium border transition-colors',
              t.key === activeKey
                ? 'bg-[#a78bfa]/[0.12] border-[#a78bfa]/40 text-white'
                : 'bg-white/[0.03] border-white/[0.08] text-white/55 hover:text-white',
            )}
          >
            {t.label}
            {t.customized && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="zmieniony względem domyślnego" />}
          </button>
        ))}
      </div>

      {draft && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-6">
          <p className="text-xs text-white/40 mb-4">{templates.find((t) => t.key === draft.key)?.hint}</p>
          {msg && (
            <div className={cn('mb-4 rounded-xl px-4 py-3 text-sm border', msg.ok ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200' : 'bg-red-500/10 border-red-500/25 text-red-200')}>
              {msg.text}
            </div>
          )}
          <div className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/45 mb-1.5">{f.label}</label>
                {f.rows ? (
                  <textarea
                    value={draft[f.name] as string}
                    onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })}
                    rows={f.rows}
                    spellCheck={false}
                    className={cn('w-full rounded-xl bg-black/30 border border-white/[0.08] px-3.5 py-2.5 text-sm outline-none focus:border-[#a78bfa]/50', f.mono && 'font-mono text-[13px] leading-relaxed')}
                  />
                ) : (
                  <input
                    value={draft[f.name] as string}
                    onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })}
                    className="w-full h-11 rounded-xl bg-black/30 border border-white/[0.08] px-3.5 text-sm outline-none focus:border-[#a78bfa]/50"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Zapisz
            </button>
            <button
              onClick={sendTest}
              disabled={testing}
              className="inline-flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-semibold text-white/80 bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.09] disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Wyślij test na mój mail
            </button>
            {dirty && (
              <button onClick={() => setDraft(active ? { ...active } : null)} className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white">
                <RotateCcw className="w-3.5 h-3.5" /> Cofnij zmiany
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
