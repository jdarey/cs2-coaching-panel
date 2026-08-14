'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, PlayCircle, CheckCircle2, Loader2, ChevronDown, FolderOpen, Film } from 'lucide-react'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { cn } from '@/lib/utils'

interface PathVideo {
  id: string
  video: { id: string; title: string; thumbnail: string | null }
  status: string
}

interface PathModule {
  id: string
  title: string
  order: number
  videos: PathVideo[]
}

interface Path {
  id: string
  title: string
  description: string | null
  createdAt: string
  modules: PathModule[]
}

const DONE_STATUSES = ['WATCHED', 'IMPLEMENTED']

export function StudentPathsClient({ paths }: { paths: Path[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  if (!paths) {
    return (
      <StudentLayout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center py-12 text-white/40">
            <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie ścieżek…
          </div>
        </div>
      </StudentLayout>
    )
  }

  const allDone = (videos: PathVideo[]) => videos.every((v) => DONE_STATUSES.includes(v.status))

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          icon={GraduationCap}
          label="Twój program"
          title="Ścieżki treningowe"
          subtitle="Kursy ułożone przez trenera — przechodź moduły po kolei i obserwuj postęp"
        />

        <div className="mt-8 space-y-6">
          {paths.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <GraduationCap className="w-9 h-9 text-white/25 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Brak aktywnych ścieżek</p>
              <p className="text-xs text-white/40 mt-1">Twój trener jeszcze nie dodał programu treningowego.</p>
            </div>
          ) : (
            paths.map((p, pi) => {
              const all = p.modules.flatMap((m) => m.videos)
              const done = all.filter((v) => DONE_STATUSES.includes(v.status)).length
              const pct = all.length ? Math.round((done / all.length) * 100) : 0
              const isOpen = open[p.id]

              return (
                <div key={p.id} className="glass-card rise-in relative rounded-3xl overflow-hidden" style={{ animationDelay: `${pi * 0.06}s` }}>
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#2de5ca]/[0.08] blur-3xl pointer-events-none" />
                  <button
                    onClick={() => setOpen((s) => ({ ...s, [p.id]: !isOpen }))}
                    className="relative z-10 w-full text-left p-6"
                  >
                    <div className="flex items-start gap-4">
                      <span className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] ring-1 ring-white/20 shrink-0">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-lg font-bold truncate">{p.title}</h2>
                          {pct === 100 && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25">
                              <CheckCircle2 className="w-3 h-3" /> Ukończona
                            </span>
                          )}
                          <ChevronDown className={cn('ml-auto w-4 h-4 text-white/40 transition-transform duration-300 shrink-0', isOpen && 'rotate-180')} />
                        </div>
                        {p.description && <p className="mt-1 text-sm text-white/50 line-clamp-2">{p.description}</p>}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, #2de5ca 0%, #14b8a6 100%)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-[#2de5ca]">{pct}%</span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-white/40">
                          {done}/{all.length} filmów · {p.modules.length} modułów
                        </p>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="relative z-10 px-6 pb-6 space-y-4">
                      {p.modules.map((m, mi) => (
                        <div key={m.id || mi} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                            <FolderOpen className="w-4 h-4 text-[#2de5ca] shrink-0" />
                            <h3 className="text-sm font-semibold text-white truncate">{m.title}</h3>
                            {allDone(m.videos) && m.videos.length > 0 && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-300 ml-auto shrink-0" />
                            )}
                          </div>
                          <div className="divide-y divide-white/[0.04]">
                            {m.videos.length === 0 && (
                              <p className="px-4 py-3 text-xs text-white/35">Brak filmów w tym module</p>
                            )}
                            {m.videos.map((v, vi) => {
                              const isDone = DONE_STATUSES.includes(v.status)
                              return (
                                <Link
                                  key={v.id}
                                  href={`/student/videos/${v.video.id}`}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group"
                                >
                                  <span className="grid place-items-center w-6 h-6 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold text-white/40 shrink-0">
                                    {vi + 1}
                                  </span>
                                  {v.video.thumbnail ? (
                                    <img src={v.video.thumbnail} alt="" className="w-12 h-8 object-cover rounded-md shrink-0" loading="lazy" />
                                  ) : (
                                    <span className="grid place-items-center w-12 h-8 rounded-md bg-white/[0.04] border border-white/[0.08] shrink-0">
                                      <Film className="w-3.5 h-3.5 text-white/30" />
                                    </span>
                                  )}
                                  <span className={cn('flex-1 min-w-0 text-sm truncate', isDone ? 'text-white/45 line-through decoration-white/25' : 'text-white/80 group-hover:text-white')}>
                                    {v.video.title}
                                  </span>
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                                  ) : (
                                    <PlayCircle className="w-4 h-4 text-[#2de5ca]/70 shrink-0" />
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </StudentLayout>
  )
}
