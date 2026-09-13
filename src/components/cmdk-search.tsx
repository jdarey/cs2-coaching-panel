'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Film, ListChecks, GraduationCap, Users, X } from 'lucide-react'
import { matchesSearch } from '@/lib/utils'

interface Item { id: string; title: string; href: string; icon: any; kind: string }

export function CmdkSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    // lazy load all searchable
    Promise.all([
      fetch('/api/videos').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/routines').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/paths').then(r => r.ok ? r.json().then(d => d.paths ?? d) : []).catch(() => []),
    ]).then(([videos, routines, paths]) => {
      const all: Item[] = []
      for (const v of videos.slice(0, 30)) all.push({ id: v.id, title: v.title, href: `/student/videos/${v.id}`, icon: Film, kind: 'Film' })
      const rList = Array.isArray(routines) ? routines : []
      for (const r of rList.slice(0, 20)) {
        const title = r.title || r.routine?.title
        const id = r.id
        if (title && id) all.push({ id, title, href: `/student/tasks`, icon: ListChecks, kind: 'Rutyna' })
      }
      const pList = Array.isArray(paths) ? paths : []
      for (const p of pList.slice(0, 20)) all.push({ id: p.id, title: p.title, href: `/student/paths`, icon: GraduationCap, kind: 'Ścieżka' })
      setItems(all)
    })
  }, [open])

  const filtered = q ? items.filter(i => matchesSearch(q, i.title, i.kind)) : items.slice(0, 8)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] grid place-items-start pt-[20vh] p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setOpen(false)} />
      <div className="glass-liquid relative w-full max-w-xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/[0.06]">
          <Search className="w-4 h-4 text-white/40" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Szukaj filmów, rutyn, ścieżek… (⌘K)"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
          <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg text-white/40 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-white/40 py-8">Brak wyników</p>
          ) : (
            filtered.map(item => (
              <button
                key={`${item.kind}-${item.id}`}
                onClick={() => { setOpen(false); setQ(''); router.push(item.href) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.06] border border-transparent hover:border-white/[0.06] transition-colors"
              >
                <item.icon className="w-4 h-4 text-white/40 shrink-0" />
                <span className="flex-1 truncate text-sm text-white/80">{item.title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/40">{item.kind}</span>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 text-[11px] text-white/30 border-t border-white/[0.06] flex items-center justify-between">
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">↑↓</kbd> nawiguj · <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10">⏎</kbd> otwórz</span>
          <span className="hidden sm:inline">Esc zamknij</span>
        </div>
      </div>
    </div>
  )
}
