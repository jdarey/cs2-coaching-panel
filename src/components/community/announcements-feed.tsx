'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Megaphone, Pin, Loader2, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  content: string
  pinned: boolean
  createdAt: string
}

export function AnnouncementsFeed({
  variant,
  limit = 3,
}: {
  variant: 'student' | 'coach'
  limit?: number
}) {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements')
      if (res.ok) {
        const data = await res.json()
        setItems((data.announcements ?? []).slice(0, limit))
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    load()
  }, [load])

  const allHref = variant === 'coach' ? '/coach/announcements' : '/student/announcements'

  return (
    <div className="glass-card rise-in relative rounded-3xl p-6 overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#a78bfa]/10 blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20">
              <Megaphone className="w-4 h-4 text-white" />
            </span>
            <h2 className="font-display text-lg font-bold">Ogłoszenia trenera</h2>
          </div>
          <Link
            href={allHref}
            className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-[#c4b5fd] transition-colors"
          >
            Wszystkie <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-white/40">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ładowanie…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">
            Brak ogłoszeń — sprawdzaj tę sekcję, by nie przegapić komunikatów.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div
                key={a.id}
                className={`rounded-2xl p-4 bg-white/[0.03] border ${a.pinned ? 'border-[#a78bfa]/30' : 'border-white/[0.06]'}`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin className="w-3.5 h-3.5 text-[#c4b5fd] shrink-0" />}
                  <h3 className="text-sm font-semibold text-white truncate">{a.title}</h3>
                  <span className="ml-auto shrink-0 text-[10px] text-white/35 whitespace-nowrap">
                    {formatDate(a.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-white/50 leading-relaxed line-clamp-2">{a.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
