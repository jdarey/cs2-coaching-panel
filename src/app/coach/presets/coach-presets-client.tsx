'use client'
import { useMemo, useState } from 'react'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Pencil, Loader2, X, Zap, Clock, Film, MapPin, Image as ImageIcon, Tag, Globe, Layers, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PresetVariant {
  id?: string
  label: string
  difficulty: string
  description: string | null
  minutes: number | null
  order?: number
}

interface Preset {
  id: string
  title: string
  description: string | null
  videoId: string | null
  gifUrl: string | null
  steamMapUrl: string | null
  linkUrl: string | null
  minutes: number | null
  tags: string[]
  category: string | null
  variants: PresetVariant[]
}

// Sugerowane kategorie — coach może wpisać własną
const CATEGORIES = ['Aim', 'Movement', 'Utility', 'Granaty', 'Pozycjonowanie', 'Spray', 'Refleks', 'Gra drużynowa']

const DIFF_META: Record<string, { label: string; color: string }> = {
  EASY: { label: 'Łatwy', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
  MEDIUM: { label: 'Średni', color: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
  HARD: { label: 'Trudny', color: 'text-red-300 bg-red-500/10 border-red-500/25' },
}

const emptyVariant = (): PresetVariant => ({ label: '', difficulty: 'MEDIUM', description: '', minutes: null })

const DIFF_KEY = (d: string) => (d in DIFF_META ? d : 'MEDIUM') as keyof typeof DIFF_META

export function CoachPresetsClient({ initialPresets, initialVideos }: { initialPresets: Preset[]; initialVideos: { id: string; title: string }[] }) {
  const [presets, setPresets] = useState<Preset[]>(initialPresets)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Preset | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string>('Wszystkie')
  const [form, setForm] = useState({
    title: '', description: '', gifUrl: '', steamMapUrl: '', linkUrl: '', videoId: '', minutes: '', tags: '',
    category: '', variants: [] as PresetVariant[],
  })
  const { toast } = useToast()

  const categories = useMemo(() => {
    const set = new Set<string>()
    presets.forEach(p => p.category && set.add(p.category))
    return ['Wszystkie', ...Array.from(set).sort()]
  }, [presets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return presets.filter(p => {
      if (activeCat !== 'Wszystkie' && p.category !== activeCat) return false
      if (!q) return true
      return p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q))
    })
  }, [presets, query, activeCat])

  const openAdd = () => { setEditing(null); setForm({ title: '', description: '', gifUrl: '', steamMapUrl: '', linkUrl: '', videoId: '', minutes: '', tags: '', category: '', variants: [] }); setOpen(true) }
  const openEdit = (p: Preset) => {
    setEditing(p)
    setForm({
      title: p.title, description: p.description || '', gifUrl: p.gifUrl || '', steamMapUrl: p.steamMapUrl || '', linkUrl: p.linkUrl || '', videoId: p.videoId || '', minutes: p.minutes?.toString() || '', tags: p.tags.join(', '),
      category: p.category || '', variants: (p.variants || []).map(v => ({ ...v })),
    })
    setOpen(true)
  }

  const updateVariant = (i: number, patch: Partial<PresetVariant>) => {
    setForm(s => ({ ...s, variants: s.variants.map((v, idx) => idx === i ? { ...v, ...patch } : v) }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast({ title: 'Uzupełnij formularz', description: 'Nazwa presetu jest wymagana', variant: 'destructive' })
      return
    }
    let minutes: number | null = null
    if (form.minutes.trim()) {
      const v = parseInt(form.minutes)
      if (!Number.isFinite(v) || v < 1 || v > 600) {
        toast({ title: 'Zła wartość', description: 'Minuty muszą być liczbą 1–600', variant: 'destructive' })
        return
      }
      minutes = v
    }
    const variants = form.variants
      .filter(v => v.label.trim())
      .map(v => ({ label: v.label.trim(), difficulty: v.difficulty, description: v.description || null, minutes: v.minutes ?? null }))
    if (new Set(variants.map(v => v.label.toLowerCase())).size !== variants.length) {
      toast({ title: 'Duplikat wariantu', description: 'Nazwy wariantów muszą być unikalne', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const payload = {
        title: form.title, description: form.description || null, gifUrl: form.gifUrl || null, steamMapUrl: form.steamMapUrl || null, linkUrl: form.linkUrl || null, videoId: form.videoId || null, minutes,
        tags: Array.from(new Set(form.tags.split(',').map(s => s.trim()).filter(Boolean))),
        category: form.category.trim() || null,
        variants,
      }
      const url = editing ? `/api/exercise-presets/${editing.id}` : '/api/exercise-presets'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'Błąd', description: data.error, variant: 'destructive' }); return }
      if (editing) setPresets(prev => prev.map(p => p.id === editing.id ? data : p))
      else setPresets(prev => [data, ...prev])
      setOpen(false); toast({ title: 'Sukces', description: editing ? 'Preset zaktualizowany' : 'Preset utworzony' })
    } catch { toast({ title: 'Błąd', description: 'Błąd serwera', variant: 'destructive' }) } finally { setLoading(false) }
  }
  const del = async (p: Preset) => {
    if (!confirm(`Usunąć preset "${p.title}"?`)) return
    const res = await fetch(`/api/exercise-presets/${p.id}`, { method: 'DELETE' })
    if (res.ok) { setPresets(prev => prev.filter(x => x.id !== p.id)); toast({ title: 'Usunięto' }) }
    else toast({ title: 'Błąd', variant: 'destructive' })
  }

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader icon={Zap} label="Biblioteka ćwiczeń" title="Presety ćwiczeń" subtitle="Ćwiczenia z wariantami trudności — trener dobiera wariant per uczeń, uczeń może zmienić sam">
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-semibold text-white btn-primary-gradient"><Plus className="h-4 w-4" />Nowy preset</button>
        </PageHeader>

        {/* Filtry: kategorie + szukajka */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="flex flex-wrap gap-2 flex-1 min-w-0">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={cn(
                  'px-3.5 h-9 rounded-full text-xs font-semibold transition-all border',
                  activeCat === c
                    ? 'bg-[#a78bfa]/15 text-white border-[#a78bfa]/40'
                    : 'bg-white/[0.03] text-white/50 border-white/[0.07] hover:text-white hover:border-white/15',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative shrink-0 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Szukaj ćwiczenia…"
              className="h-9 w-full rounded-full bg-white/[0.03] border border-white/[0.08] pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#a78bfa]/40"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-liquid rounded-3xl p-16 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/55 mb-4">{presets.length === 0 ? 'Brak presetów — stwórz pierwszy' : 'Brak wyników dla tych filtrów'}</p>
            {presets.length === 0 && <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey"><Plus className="h-4 w-4" />Stwórz preset</button>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => (
              <div key={p.id} className="glass-liquid rounded-3xl overflow-hidden p-5 flex flex-col">
                {p.gifUrl && <div className="rounded-2xl overflow-hidden mb-3 h-36 bg-black"><img decoding="async" src={p.gifUrl} alt={p.title} className="w-full h-full object-cover" /></div>}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-white">{p.title}</h3>
                  {p.category && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#a78bfa]/15 text-[#c4b5fd] border border-[#a78bfa]/25">{p.category}</span>}
                </div>
                {p.description && <p className="text-sm text-white/45 line-clamp-2 mt-1">{p.description}</p>}

                {/* Warianty trudności */}
                {p.variants.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-white/35 font-semibold flex items-center gap-1"><Layers className="w-3 h-3" />Warianty ({p.variants.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.variants.map(v => {
                        const meta = DIFF_META[DIFF_KEY(v.difficulty)]
                        return (
                          <span key={v.id || v.label} title={v.description || ''} className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border font-semibold', meta.color)}>
                            {v.label}{v.minutes ? ` · ${v.minutes}m` : ''}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
                  {p.minutes && <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-white/[0.06] border border-white/[0.08] text-white/60"><Clock className="w-3 h-3" />{p.minutes} min</span>}
                  {p.gifUrl && <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#c4b5fd]"><ImageIcon className="w-3 h-3" />GIF</span>}
                  {p.tags.map(t => <span key={t} className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/50">{t}</span>)}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.06] mt-auto">
                  <button onClick={() => openEdit(p)} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl glass-liquid text-sm text-white/70 hover:text-white"><Pencil className="w-4 h-4" />Edytuj</button>
                  <button onClick={() => del(p)} className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/50 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setOpen(false)} />
            <form onSubmit={submit} className="glass-liquid relative w-full max-w-2xl rounded-3xl p-7 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-gradient-violet">{editing ? 'Edytuj preset' : 'Nowy preset ćwiczenia'}</h2>
                <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06]"><X className="w-5 h-5" /></button>
              </div>
              <input placeholder="Nazwa ćwiczenia *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              <textarea placeholder="Opis — co to za ćwiczenie i po co" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-white outline-none focus:border-[#a78bfa]/40 resize-none" />

              {/* Kategoria */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />Kategoria</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, category: form.category === c ? '' : c })} className={cn('px-3 h-8 rounded-full text-xs font-semibold border transition-all', form.category === c ? 'bg-[#a78bfa]/15 text-white border-[#a78bfa]/40' : 'bg-white/[0.03] text-white/45 border-white/[0.07] hover:text-white')}>{c}</button>
                  ))}
                </div>
                <input placeholder="…lub wpisz własną kategorię" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="h-10 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              </div>

              {/* Warianty trudności */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/70 font-semibold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Warianty trudności (opcjonalnie)</label>
                  <button type="button" onClick={() => setForm(s => ({ ...s, variants: [...s.variants, emptyVariant()] }))} disabled={form.variants.length >= 6} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold text-[#c4b5fd] bg-[#a78bfa]/10 border border-[#a78bfa]/25 hover:bg-[#a78bfa]/20 disabled:opacity-40"><Plus className="w-3.5 h-3.5" />Dodaj wariant</button>
                </div>
                <p className="text-[11px] text-white/35 mb-3">To samo ćwiczenie w wersjach trudności — np. counter-strafe: Łatwy (stój A-D) / Średni (z celowaniem) / Trudny (pełny ruch). Trener dobierze wariant per uczeń.</p>
                {form.variants.length === 0 ? (
                  <p className="text-xs text-white/30 italic">Brak wariantów — ćwiczenie jest jedno dla wszystkich.</p>
                ) : (
                  <div className="space-y-2">
                    {form.variants.map((v, i) => (
                      <div key={i} className="rounded-xl bg-black/25 border border-white/[0.06] p-3 space-y-2">
                        <div className="flex gap-2 items-center">
                          <input placeholder={`Nazwa wariantu (np. ${DIFF_META[v.difficulty]?.label ?? 'Średni'})`} value={v.label} onChange={e => updateVariant(i, { label: e.target.value })} className="flex-1 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
                          <select value={v.difficulty} onChange={e => updateVariant(i, { difficulty: e.target.value })} className="h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2 text-xs text-white outline-none [&>option]:bg-[#0a0c0e]">
                            <option value="EASY">Łatwy</option>
                            <option value="MEDIUM">Średni</option>
                            <option value="HARD">Trudny</option>
                          </select>
                          <input type="number" min={1} max={600} placeholder="min" value={v.minutes ?? ''} onChange={e => updateVariant(i, { minutes: e.target.value ? parseInt(e.target.value) : null })} className="w-20 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-white outline-none" />
                          <button type="button" onClick={() => setForm(s => ({ ...s, variants: s.variants.filter((_, idx) => idx !== i) }))} className="grid h-9 w-9 place-items-center rounded-lg text-white/40 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <input placeholder="Opis wariantu — co dokładnie robi uczeń (opcjonalnie)" value={v.description ?? ''} onChange={e => updateVariant(i, { description: e.target.value })} className="w-full h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 text-xs text-white outline-none focus:border-[#a78bfa]/40" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input placeholder="GIF URL (giphy/imgur/tenor...)" value={form.gifUrl} onChange={e => setForm({ ...form, gifUrl: e.target.value })} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              <input placeholder="Steam Workshop map URL" value={form.steamMapUrl} onChange={e => setForm({ ...form, steamMapUrl: e.target.value })} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input placeholder="Link do strony (https://...)" value={form.linkUrl} onChange={e => setForm({ ...form, linkUrl: e.target.value })} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-10 pr-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Domyślne minuty (gdy brak wariantu)" value={form.minutes} onChange={e => setForm({ ...form, minutes: e.target.value })} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none" />
                <select value={form.videoId} onChange={e => setForm({ ...form, videoId: e.target.value })} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none [&>option]:bg-[#0a0c0e]"><option value="">Bez filmu</option>{initialVideos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</select>
              </div>
              <input placeholder="Tagi (po przecinku, np. aim, spray)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-5 h-11 rounded-2xl glass-liquid text-white/60">Anuluj</button>
                <button type="submit" disabled={loading} className="px-5 h-11 rounded-2xl btn-darey text-white font-semibold disabled:opacity-40 inline-flex items-center gap-2">{loading && <Loader2 className="w-4 h-4 animate-spin" />}{editing ? 'Zapisz' : 'Utwórz'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
