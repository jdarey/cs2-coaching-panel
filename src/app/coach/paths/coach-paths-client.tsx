'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  GraduationCap, Plus, Pencil, Trash2, Loader2, X, ChevronUp, ChevronDown, Film, FolderOpen, CheckCircle2, Save, Eye, EyeOff,
} from 'lucide-react'
import { CoachLayout } from '@/components/coach-layout-export'
import { PageHeader } from '@/components/page-header'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface PathVideo {
  videoId: string
  video: { id: string; title: string; thumbnail: string | null }
}

interface PathModule {
  title: string
  videos: PathVideo[]
}

interface Path {
  id: string
  title: string
  description: string | null
  isActive: boolean
  createdAt: string
  modules: PathModule[]
}

interface CoachVideo {
  id: string
  title: string
}

export function CoachPathsClient() {
  const { toast } = useToast()
  const [paths, setPaths] = useState<Path[]>([])
  const [videos, setVideos] = useState<CoachVideo[]>([])
  const [loading, setLoading] = useState(true)

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<{ title: string; description: string; isActive: boolean; modules: PathModule[] }>({
    title: '',
    description: '',
    isActive: true,
    modules: [],
  })

  const load = useCallback(async () => {
    try {
      const [pathsRes, videosRes] = await Promise.all([fetch('/api/paths'), fetch('/api/videos')])
      if (pathsRes.ok) setPaths((await pathsRes.json()).paths ?? [])
      if (videosRes.ok) setVideos((await videosRes.json()) ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setDraft({ title: '', description: '', isActive: true, modules: [] })
    setBuilderOpen(true)
  }

  const openEdit = (p: Path) => {
    setEditingId(p.id)
    setDraft({
      title: p.title,
      description: p.description ?? '',
      isActive: p.isActive,
      modules: p.modules.map((m) => ({ title: m.title, videos: [...m.videos] })),
    })
    setBuilderOpen(true)
  }

  const addModule = () => {
    setDraft((d) => ({ ...d, modules: [...d.modules, { title: '', videos: [] }] }))
  }

  const updateModuleTitle = (mi: number, title: string) => {
    setDraft((d) => ({ ...d, modules: d.modules.map((m, i) => (i === mi ? { ...m, title } : m)) }))
  }

  const addVideoToModule = (mi: number, videoId: string) => {
    if (!videoId) return
    const v = videos.find((x) => x.id === videoId)
    if (!v) return
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m, i) =>
        i === mi && !m.videos.some((mv) => mv.videoId === videoId)
          ? { ...m, videos: [...m.videos, { videoId, video: { id: videoId, title: v.title, thumbnail: null } }] }
          : m,
      ),
    }))
  }

  const removeVideo = (mi: number, vi: number) => {
    setDraft((d) => ({ ...d, modules: d.modules.map((m, i) => (i === mi ? { ...m, videos: m.videos.filter((_, j) => j !== vi) } : m)) }))
  }

  const moveVideo = (mi: number, vi: number, dir: -1 | 1) => {
    setDraft((d) => ({
      ...d,
      modules: d.modules.map((m, i) => {
        if (i !== mi) return m
        const target = vi + dir
        if (target < 0 || target >= m.videos.length) return m
        const videos = [...m.videos]
        ;[videos[vi], videos[target]] = [videos[target], videos[vi]]
        return { ...m, videos }
      }),
    }))
  }

  const removeModule = (mi: number) => {
    setDraft((d) => ({ ...d, modules: d.modules.filter((_, i) => i !== mi) }))
  }

  const save = async () => {
    if (!draft.title.trim()) {
      toast({ title: 'Błąd', description: 'Podaj tytuł ścieżki', variant: 'destructive' })
      return
    }
    const cleanModules = draft.modules
      .filter((m) => m.title.trim() || m.videos.length > 0)
      .map((m) => ({
        title: m.title.trim() || 'Moduł',
        videos: m.videos.map((v) => ({ videoId: v.videoId })),
      }))
    setSaving(true)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        isActive: draft.isActive,
        modules: cleanModules,
      }
      const res = editingId
        ? await fetch(`/api/paths/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/paths', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (res.ok) {
        const data = await res.json()
        setPaths((prev) => {
          const next = prev.filter((p) => p.id !== data.path.id)
          return [data.path, ...next]
        })
        setBuilderOpen(false)
        toast({ title: editingId ? 'Zapisano' : 'Utworzono', description: editingId ? 'Ścieżka zaktualizowana' : 'Ścieżka gotowa dla uczniów' })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Błąd', description: data.error || 'Nie udało się zapisać', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Błąd', description: 'Błąd sieci', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p: Path) => {
    const res = await fetch(`/api/paths/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    })
    if (res.ok) {
      const data = await res.json()
      setPaths((prev) => prev.map((x) => (x.id === p.id ? data.path : x)))
    }
  }

  const remove = async (p: Path) => {
    if (!confirm(`Usunąć ścieżkę „${p.title}"?`)) return
    const res = await fetch(`/api/paths/${p.id}`, { method: 'DELETE' })
    if (res.ok) setPaths((prev) => prev.filter((x) => x.id !== p.id))
  }

  const videoCount = (p: Path) => p.modules.reduce((acc, m) => acc + m.videos.length, 0)

  return (
    <CoachLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          icon={GraduationCap}
          label="Kursy"
          title="Ścieżki treningowe"
          subtitle="Ułóż filmy w kursy z modułami — uczeń widzi kolejność i pasek postępu"
        >
          <button
            onClick={openCreate}
            className="relative inline-flex items-center gap-2 rounded-full px-6 h-12 text-sm font-semibold text-white btn-darey overflow-hidden"
          >
            <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
            <Plus className="w-4 h-4" /> Nowa ścieżka
          </button>
        </PageHeader>

        {/* ===== Builder ===== */}
        {builderOpen && (
          <div className="glass-card relative rounded-3xl p-6 md:p-7 mt-6 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#2de5ca]/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold">
                {editingId ? 'Edytuj ścieżkę' : 'Nowa ścieżka treningowa'}
              </h2>
              <button onClick={() => setBuilderOpen(false)} className="grid place-items-center w-9 h-9 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.06] transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative z-10 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Tytuł (np. Fundamenty: od aimu do utility)"
                  className="rounded-xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#2de5ca]/40 transition-colors"
                />
                <label className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer select-none px-1">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                    className="accent-[#2de5ca] w-4 h-4"
                  />
                  {draft.isActive ? <Eye className="w-4 h-4 text-[#2de5ca]" /> : <EyeOff className="w-4 h-4 text-white/40" />}
                  Widoczna dla uczniów
                </label>
              </div>
              <input
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Opis ścieżki — czego się uczeń nauczy, dla kogo jest (opcjonalnie)"
                className="w-full rounded-xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#2de5ca]/40 transition-colors"
              />

              {/* Modules */}
              <div className="space-y-3">
                {draft.modules.map((m, mi) => (
                  <div key={mi} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FolderOpen className="w-4 h-4 text-[#2de5ca] shrink-0" />
                      <input
                        value={m.title}
                        onChange={(e) => updateModuleTitle(mi, e.target.value)}
                        placeholder={`Moduł ${mi + 1} (np. Pre-aim i crosshair placement)`}
                        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-[#2de5ca]/40 transition-colors"
                      />
                      <button onClick={() => removeModule(mi)} className="grid place-items-center w-8 h-8 rounded-lg text-white/35 hover:text-red-300 hover:bg-red-500/10 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {m.videos.map((v, vi) => (
                        <div key={v.videoId} className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                          <Film className="w-3.5 h-3.5 text-white/35 shrink-0" />
                          <span className="flex-1 min-w-0 text-sm text-white/75 truncate">{v.video.title}</span>
                          <span className="text-[10px] text-white/30 tabular-nums">#{vi + 1}</span>
                          <button onClick={() => moveVideo(mi, vi, -1)} disabled={vi === 0} className="grid place-items-center w-7 h-7 rounded-md text-white/35 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 transition">
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => moveVideo(mi, vi, 1)} disabled={vi === m.videos.length - 1} className="grid place-items-center w-7 h-7 rounded-md text-white/35 hover:text-white hover:bg-white/[0.06] disabled:opacity-20 transition">
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeVideo(mi, vi)} className="grid place-items-center w-7 h-7 rounded-md text-white/35 hover:text-red-300 hover:bg-red-500/10 transition">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            addVideoToModule(mi, e.target.value)
                            e.target.value = ''
                          }}
                          className="flex-1 rounded-lg px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:border-[#2de5ca]/40 transition-colors [&>option]:bg-[#0a0c0e]"
                        >
                          <option value="">+ Dodaj film do modułu…</option>
                          {videos.map((v) => (
                            <option key={v.id} value={v.id}>{v.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={addModule}
                  className="inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-medium text-[#2de5ca] bg-[#2de5ca]/[0.08] border border-[#2de5ca]/25 hover:bg-[#2de5ca]/[0.14] transition"
                >
                  <Plus className="w-4 h-4" /> Dodaj moduł
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setBuilderOpen(false)}
                    className="rounded-xl px-5 h-10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="relative inline-flex items-center gap-2 rounded-xl px-6 h-10 text-sm font-semibold text-white btn-darey overflow-hidden disabled:opacity-60"
                  >
                    <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Zapisz ścieżkę
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== List ===== */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie ścieżek…
            </div>
          ) : paths.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <GraduationCap className="w-9 h-9 text-white/25 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Brak ścieżek treningowych</p>
              <p className="text-xs text-white/40 mt-1">Utwórz pierwszą — uczniowie zobaczą ją z paskiem postępu.</p>
            </div>
          ) : (
            paths.map((p, i) => (
              <div
                key={p.id}
                className={cn('glass-card rise-in relative rounded-3xl p-6 overflow-hidden', !p.isActive && 'opacity-70')}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] ring-1 ring-white/20 shrink-0">
                        <GraduationCap className="w-4 h-4 text-white" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-bold truncate">{p.title}</h3>
                        <p className="text-[11px] text-white/40">
                          {p.modules.length} modułów · {videoCount(p)} filmów
                          {!p.isActive && <span className="text-amber-300/80 ml-2">· ukryta</span>}
                        </p>
                      </div>
                    </div>
                    {p.description && <p className="mt-2.5 text-sm text-white/50 leading-relaxed line-clamp-2">{p.description}</p>}
                    {p.modules.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.modules.map((m, mi) => (
                          <span key={mi} className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-white/60 bg-white/[0.04] border border-white/[0.08]">
                            <FolderOpen className="w-3 h-3 text-[#2de5ca]" /> {m.title || `Moduł ${mi + 1}`} · {m.videos.length}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(p)}
                      title={p.isActive ? 'Ukryj przed uczniami' : 'Pokaż uczniom'}
                      className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-[#2de5ca]/10 hover:border-[#2de5ca]/30 transition-all"
                    >
                      {p.isActive ? <Eye className="w-4 h-4 text-[#2de5ca]" /> : <EyeOff className="w-4 h-4 text-white/35" />}
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-[#a78bfa]/10 hover:border-[#a78bfa]/30 transition-all"
                    >
                      <Pencil className="w-4 h-4 text-[#c4b5fd]" />
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="grid place-items-center w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-300/80" />
                    </button>
                  </div>
                </div>
                {p.isActive && (
                  <p className="mt-4 flex items-center gap-1.5 text-[11px] text-emerald-300/70">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Widoczna dla wszystkich uczniów
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </CoachLayout>
  )
}
