'use client'
import { useState } from 'react'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Pencil, Loader2, X, Zap, Clock, Film, MapPin, Image as ImageIcon, Tag } from 'lucide-react'

interface Preset {
  id: string
  title: string
  description: string | null
  videoId: string | null
  gifUrl: string | null
  steamMapUrl: string | null
  minutes: number | null
  tags: string[]
}

export function CoachPresetsClient({ initialPresets, initialVideos }: { initialPresets: Preset[]; initialVideos: { id: string; title: string }[] }) {
  const [presets, setPresets] = useState<Preset[]>(initialPresets)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Preset | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', gifUrl: '', steamMapUrl: '', videoId: '', minutes: '', tags: '' })
  const { toast } = useToast()

  const openAdd = () => { setEditing(null); setForm({ title: '', description: '', gifUrl: '', steamMapUrl: '', videoId: '', minutes: '', tags: '' }); setOpen(true) }
  const openEdit = (p: Preset) => { setEditing(p); setForm({ title: p.title, description: p.description||'', gifUrl: p.gifUrl||'', steamMapUrl: p.steamMapUrl||'', videoId: p.videoId||'', minutes: p.minutes?.toString()||'', tags: p.tags.join(', ') }); setOpen(true) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    try {
      const payload = { title: form.title, description: form.description||null, gifUrl: form.gifUrl||null, steamMapUrl: form.steamMapUrl||null, videoId: form.videoId||null, minutes: form.minutes ? parseInt(form.minutes) : null, tags: form.tags.split(',').map(s=>s.trim()).filter(Boolean) }
      const url = editing ? `/api/exercise-presets/${editing.id}` : '/api/exercise-presets'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast({ title: 'Błąd', description: data.error, variant: 'destructive' }); return }
      if (editing) setPresets(prev=>prev.map(p=>p.id===editing.id?data:p))
      else setPresets(prev=>[data, ...prev])
      setOpen(false); toast({ title: 'Sukces', description: editing?'Preset zaktualizowany':'Preset utworzony' })
    } catch { toast({ title: 'Błąd', description: 'Błąd serwera', variant: 'destructive' }) } finally { setLoading(false) }
  }
  const del = async (p: Preset) => {
    if (!confirm(`Usunąć preset "${p.title}"?`)) return
    const res = await fetch(`/api/exercise-presets/${p.id}`, { method: 'DELETE' })
    if (res.ok) { setPresets(prev=>prev.filter(x=>x.id!==p.id)); toast({ title: 'Usunięto' }) }
    else toast({ title: 'Błąd', variant: 'destructive' })
  }

  return (
    <CoachLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <PageHeader icon={Zap} label="Biblioteka ćwiczeń" title="Presety ćwiczeń" subtitle="Twórz reusable ćwiczenia z GIF-em — potem 1-kliknięciem dodasz je do rutyny">
          <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-semibold text-white btn-primary-gradient"><Plus className="h-4 w-4"/>Nowy preset</button>
        </PageHeader>

        {presets.length===0 ? (
          <div className="glass-liquid rounded-3xl p-16 text-center"><Zap className="h-12 w-12 mx-auto mb-4 text-white/30"/><p className="text-white/55 mb-4">Brak presetów — stwórz pierwszy</p><button onClick={openAdd} className="inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white btn-darey"><Plus className="h-4 w-4"/>Stwórz preset</button></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map(p=> (
              <div key={p.id} className="glass-liquid rounded-3xl overflow-hidden p-5 flex flex-col">
                {p.gifUrl && <div className="rounded-2xl overflow-hidden mb-3 h-36 bg-black"><img src={p.gifUrl} alt={p.title} className="w-full h-full object-cover" /></div>}
                <h3 className="font-display font-bold text-white">{p.title}</h3>
                {p.description && <p className="text-sm text-white/45 line-clamp-2 mt-1">{p.description}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3 text-xs">
                  {p.minutes && <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-white/[0.06] border border-white/[0.08] text-white/60"><Clock className="w-3 h-3"/>{p.minutes} min</span>}
                  {p.gifUrl && <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#c4b5fd]"><ImageIcon className="w-3 h-3"/>GIF</span>}
                  {p.tags.map(t=> <span key={t} className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/50">{t}</span>)}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                  <button onClick={()=>openEdit(p)} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl glass-liquid text-sm text-white/70 hover:text-white"><Pencil className="w-4 h-4"/>Edytuj</button>
                  <button onClick={()=>del(p)} className="grid h-9 w-9 place-items-center rounded-xl glass-liquid text-white/50 hover:text-red-300"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={()=>setOpen(false)} />
            <form onSubmit={submit} className="glass-liquid relative w-full max-w-lg rounded-3xl p-7 space-y-4 max-h-[90vh] overflow-y-auto">
              <h2 className="font-display text-xl font-bold text-gradient-violet">{editing?'Edytuj preset':'Nowy preset ćwiczenia'}</h2>
              <input placeholder="Nazwa *" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              <textarea placeholder="Opis" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} rows={2} className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-white outline-none focus:border-[#a78bfa]/40 resize-none" />
              <input placeholder="GIF URL (giphy/imgur/tenor...)" value={form.gifUrl} onChange={e=>setForm({...form, gifUrl:e.target.value})} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              <input placeholder="Steam Workshop map URL" value={form.steamMapUrl} onChange={e=>setForm({...form, steamMapUrl:e.target.value})} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none focus:border-[#a78bfa]/40" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Minuty" value={form.minutes} onChange={e=>setForm({...form, minutes:e.target.value})} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none" />
                <select value={form.videoId} onChange={e=>setForm({...form, videoId:e.target.value})} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none"><option value="">Bez filmu</option>{initialVideos.map(v=> <option key={v.id} value={v.id}>{v.title}</option>)}</select>
              </div>
              <input placeholder="Tagi (po przecinku, np. aim, spray)" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})} className="h-11 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 text-sm text-white outline-none" />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setOpen(false)} className="px-5 h-11 rounded-2xl glass-liquid text-white/60">Anuluj</button>
                <button type="submit" disabled={loading} className="px-5 h-11 rounded-2xl btn-darey text-white font-semibold disabled:opacity-40 inline-flex items-center gap-2">{loading && <Loader2 className="w-4 h-4 animate-spin"/>}{editing?'Zapisz':'Utwórz'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </CoachLayout>
  )
}
