'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquareHeart, Inbox, Loader2, Send, CheckCircle2, Star, Lightbulb, AlertTriangle, CalendarDays, MessageSquare } from 'lucide-react'

type Feedback = {
  id: string
  studentId: string
  coachId: string
  sessionId: string | null
  type: string
  content: string
  status: string
  response: string | null
  respondedAt: string | null
  createdAt: string
  student: { id: string; name: string | null; email: string | null; avatarUrl: string | null }
  session: { id: string; title: string } | null
}

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  GENERAL: { label: 'Ogólna', icon: MessageSquare, color: 'text-[#8FA3FF] bg-[#2de5ca]/15 border-[#2de5ca]/30' },
  SESSION: { label: 'Po sesji', icon: CalendarDays, color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  SUGGESTION: { label: 'Pomysł', icon: Lightbulb, color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  ISSUE: { label: 'Problem', icon: AlertTriangle, color: 'text-red-300 bg-red-500/15 border-red-500/30' },
}

export function CoachFeedbackClient() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'RESPONDED'>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback')
      if (!res.ok) return
      const data = await res.json()
      setFeedback(data.feedback ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = feedback.filter((f) => (filter === 'ALL' ? true : f.status === filter))
  const newCount = feedback.filter((f) => f.status === 'NEW').length

  const markRead = async (id: string) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'READ' } : f)))
    try {
      await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READ' }),
      })
    } catch {
      /* ignore */
    }
  }

  const respond = async (f: Feedback) => {
    const content = replyDraft[f.id]?.trim()
    if (!content || replyingId) return
    setReplyingId(f.id)
    setError(null)
    try {
      const res = await fetch(`/api/feedback/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd zapisu')
      setFeedback((prev) => prev.map((x) => (x.id === f.id ? data.feedback : x)))
      setReplyDraft((prev) => ({ ...prev, [f.id]: '' }))
    } catch (e: any) {
      setError(e.message || 'Błąd zapisu')
    } finally {
      setReplyingId(null)
    }
  }

  const tabs = [
    { key: 'ALL' as const, label: 'Wszystkie', count: feedback.length },
    { key: 'NEW' as const, label: 'Nowe', count: newCount },
    { key: 'RESPONDED' as const, label: 'Odpowiedziane', count: feedback.filter((f) => f.status === 'RESPONDED').length },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold text-white/70 mb-3">
          <MessageSquareHeart className="w-3.5 h-3.5 text-[#2de5ca]" />
          OPINIE UCZNIÓW
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white">Opinie uczniów</h1>
        <p className="mt-2 text-white/50 text-sm">Twoi uczniowie dzielą się tu swoimi spostrzeżeniami — odpowiadaj i buduj zaufanie.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border',
              filter === t.key
                ? 'bg-[#14b8a6]/25 border-[#2de5ca]/50 text-white'
                : 'glass text-white/55 hover:text-white/85',
            )}
          >
            {t.label}
            <span className={cn('ml-2 text-xs', filter === t.key ? 'text-[#8FA3FF]' : 'text-white/35')}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Ładowanie opinii…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/70 font-semibold">Brak opinii</p>
          <p className="text-sm text-white/40 mt-1">Gdy uczeń podzieli się opinią, pojawi się tutaj.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {filtered.map((f) => {
            const meta = TYPE_META[f.type] ?? TYPE_META.GENERAL
            const open = openId === f.id
            return (
              <div key={f.id} className={cn('glass rounded-2xl overflow-hidden transition-all duration-300', f.status === 'NEW' && 'border-[#2de5ca]/40')}>
                <button
                  onClick={() => {
                    setOpenId(open ? null : f.id)
                    if (!open && f.status === 'NEW') markRead(f.id)
                  }}
                  className="w-full flex items-start gap-4 p-5 text-left"
                >
                  <Avatar className="h-11 w-11 rounded-xl ring-1 ring-white/10 shrink-0">
                    <AvatarImage src={f.student.avatarUrl || ''} alt={f.student.name || ''} />
                    <AvatarFallback className="rounded-xl bg-[#14b8a6] text-white text-sm font-semibold">
                      {(f.student.name || f.student.email || '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{f.student.name || 'Uczeń'}</span>
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', meta.color)}>
                        <meta.icon className="w-3 h-3" /> {meta.label}
                      </span>
                      {f.status === 'NEW' && (
                        <span className="px-2 py-0.5 rounded-full bg-[#2de5ca] text-white text-[10px] font-bold">NOWA</span>
                      )}
                      {f.status === 'RESPONDED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> ODPOWIEDZIANA
                        </span>
                      )}
                    </div>
                    {f.session && <p className="text-[11px] text-white/40 mb-1">Sesja: {f.session.title}</p>}
                    <p className={cn('text-sm leading-relaxed', open ? 'text-white/90' : 'text-white/60 line-clamp-2')}>{f.content}</p>
                    <p className="text-[11px] text-white/30 mt-2">
                      {new Date(f.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </button>

                {open && (
                  <div className="px-5 pb-5 pt-1 border-t border-white/[0.05]">
                    {f.response && (
                      <div className="mt-4 rounded-xl bg-[#14b8a6]/10 border border-[#2de5ca]/25 p-4">
                        <p className="text-[11px] font-semibold text-[#8FA3FF] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Star className="w-3 h-3" /> Twoja odpowiedź
                        </p>
                        <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">{f.response}</p>
                      </div>
                    )}
                    {!f.response ? (
                      <div className="mt-4">
                        <Textarea
                          value={replyDraft[f.id] ?? ''}
                          onChange={(e) => setReplyDraft((prev) => ({ ...prev, [f.id]: e.target.value }))}
                          placeholder="Odpowiedz uczniowi…"
                          rows={3}
                          className="input-premium resize-none"
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => respond(f)}
                            disabled={!replyDraft[f.id]?.trim() || replyingId === f.id}
                            className="btn-darey inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
                          >
                            {replyingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Odpowiedz
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-[11px] text-white/30">
                        Odpowiedziano {f.respondedAt ? new Date(f.respondedAt).toLocaleString('pl-PL') : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
