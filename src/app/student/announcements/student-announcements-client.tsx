'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Pin, Loader2, Sparkles, Calendar } from 'lucide-react'
import { StudentLayout } from '@/components/student-layout'
import { PageHeader } from '@/components/page-header'
import { formatDate } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  content: string
  pinned: boolean
  createdAt: string
  coach: { id: string; name: string | null; avatarUrl: string | null }
}

export function StudentAnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <PageHeader
          icon={Megaphone}
          label="Od Twojego trenera"
          title="Ogłoszenia"
          subtitle="Wszystkie komunikaty i informacje od trenera w jednym miejscu"
        />

        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie ogłoszeń…
            </div>
          ) : announcements.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <Sparkles className="w-9 h-9 text-white/25 mx-auto mb-3" />
              <p className="text-sm text-white/60 font-medium">Brak ogłoszeń</p>
              <p className="text-xs text-white/40 mt-1">Twój trener jeszcze nic nie opublikował.</p>
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
                <div className="flex items-center gap-2.5">
                  {a.pinned && <Pin className="w-4 h-4 text-[#c4b5fd]" />}
                  <h3 className="font-display text-lg font-bold">{a.title}</h3>
                </div>
                <p className="mt-3 text-sm text-white/55 leading-relaxed whitespace-pre-line">{a.content}</p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-white/35">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(a.createdAt)}
                  {a.coach?.name && <span>· od {a.coach.name}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StudentLayout>
  )
}
