'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Plus, Pin, Trash2, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Announcement {
  id: string
  title: string
  content: string
  pinned: boolean
  createdAt: string
}

export function CoachAnnouncementsClient() {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', content: '', pinned: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) {
        const data = await res.json()
        setAnnouncements(data.announcements ?? [])
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

  const create = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Podaj tytuł i treść ogłoszenia')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const data = await res.json()
        setAnnouncements((prev) => [data.announcement, ...prev])
        setForm({ title: '', content: '', pinned: false })
        toast({ title: 'Opublikowano', description: 'Ogłoszenie trafiło do wszystkich uczniów' })
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Nie udało się opublikować')
      }
    } catch {
      setError('Błąd sieci')
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (a: Announcement) => {
    const res = await fetch(`/api/announcements/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !a.pinned }),
    })
    if (res.ok) {
      setAnnouncements((prev) =>
        prev
          .map((x) => (x.id === a.id ? { ...x, pinned: !a.pinned } : x))
          .sort((x, y) => Number(y.pinned) - Number(x.pinned)),
      )
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Usunąć to ogłoszenie?')) return
    const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((x) => x.id !== id))
    }
  }

  return (
    <CoachLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          icon={Megaphone}
          label="Społeczność"
          title="Ogłoszenia"
          subtitle="Publikuj komunikaty dla wszystkich uczniów — widzą je na swoim dashboardzie"
        />

        {/* Create form */}
        <div className="glass-card rise-in relative rounded-3xl p-6 md:p-7 mt-6 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#a78bfa]/10 blur-3xl pointer-events-none" />
          <p className="relative z-10 text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#c4b5fd]" /> Nowe ogłoszenie
          </p>
          <div className="relative z-10 space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="Tytuł (np. Nowy harmonogram treningów na ten tydzień)"
              className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/40 transition-colors"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              placeholder="Treść — porady, zmiany, motywacja, co jest ważne w tym tygodniu…"
              rows={5}
              className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/40 transition-colors resize-y leading-relaxed"
            />
            <label className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm((s) => ({ ...s, pinned: e.target.checked }))}
                className="accent-[#a78bfa] w-4 h-4"
              />
              <Pin className="w-4 h-4 text-[#c4b5fd]" /> Przypnij na górze
            </label>
            {error && <p className="text-xs text-red-300">{error}</p>}
            <button
              onClick={create}
              disabled={saving}
              className="relative inline-flex items-center gap-2 rounded-xl px-6 h-11 text-sm font-semibold text-white btn-darey overflow-hidden disabled:opacity-60"
            >
              <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              Opublikuj ogłoszenie
            </button>
          </div>
        </div>

        {/* List */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie ogłoszeń…
            </div>
          ) : announcements.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <Sparkles className="w-9 h-9 text-white/25 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Brak ogłoszeń</p>
              <p className="text-xs text-white/40 mt-1">Opublikuj pierwsze, a uczniowie zobaczą je na dashboardzie.</p>
            </div>
          ) : (
            announcements.map((a, i) => (
              <div
                key={a.id}
                className={`glass-card rise-in relative rounded-3xl p-6 overflow-hidden ${a.pinned ? 'border-[#a78bfa]/30' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {a.pinned && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a78bfa] to-[#6d28d9]" />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {a.pinned && <Pin className="w-4 h-4 text-[#c4b5fd] shrink-0" />}
                    <h3 className="font-display text-lg font-bold truncate">{a.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => togglePin(a)}
                      title={a.pinned ? 'Odepnij' : 'Przypnij'}
                      className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-[#a78bfa]/10 hover:border-[#a78bfa]/30 transition-all"
                    >
                      <Pin className={`w-4 h-4 transition-colors ${a.pinned ? 'text-[#c4b5fd]' : 'text-white/35'}`} />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      title="Usuń"
                      className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-white/40 hover:text-red-300" />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/55 leading-relaxed whitespace-pre-line">{a.content}</p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-white/35">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300/70" />
                  Widoczne dla wszystkich uczniów · {formatDate(a.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </CoachLayout>
  )
}
