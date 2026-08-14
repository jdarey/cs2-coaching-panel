'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Send, Loader2, ShieldCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string | null; role: string; avatarUrl: string | null }
}

export function VideoComments({ videoId, myRole }: { videoId: string; myRole: 'student' | 'coach' }) {
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments((prev) => [...prev, data.comment])
        setDraft('')
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Błąd', description: data.error || 'Nie udało się dodać komentarza', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Błąd', description: 'Błąd sieci', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="glass-card rise-in relative rounded-3xl p-6 mt-8 overflow-hidden" style={{ animationDelay: '0.15s' }}>
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#2de5ca]/[0.08] blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#147a6b] ring-1 ring-white/20">
            <MessageCircle className="w-4 h-4 text-white" />
          </span>
          <h2 className="font-display text-lg font-bold">Dyskusja przy filmie</h2>
          <span className="ml-auto inline-flex items-center rounded-full px-2.5 h-6 text-[11px] font-semibold bg-white/[0.05] border border-white/[0.08] text-white/55">
            {comments.length}
          </span>
        </div>

        {/* Composer */}
        <div className="flex items-start gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={
              myRole === 'student'
                ? 'Masz pytanie do tego materiału? Napisz — trener odpowie…'
                : 'Odpowiedz uczniom — wyjaśnij, pochwal, dodaj wskazówkę…'
            }
            rows={2}
            className="flex-1 rounded-2xl px-4 py-3 text-sm bg-white/[0.04] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-[#2de5ca]/40 transition-colors resize-y leading-relaxed"
          />
          <button
            onClick={submit}
            disabled={sending || !draft.trim()}
            className="relative inline-flex items-center gap-2 rounded-2xl px-4 h-11 text-sm font-semibold text-white btn-darey overflow-hidden disabled:opacity-50 shrink-0"
          >
            <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Wyślij</span>
          </button>
        </div>

        {/* List */}
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-white/40">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Ładowanie komentarzy…
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">
              Brak komentarzy — bądź pierwszy i zapytaj o coś z tego materiału.
            </p>
          ) : (
            comments.map((c) => {
              const isCoach = c.author.role === 'COACH'
              return (
                <div key={c.id} className={`rounded-2xl p-4 border ${isCoach ? 'border-[#2de5ca]/25 bg-[#2de5ca]/[0.05]' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{c.author.name || 'Uczeń'}</span>
                    {isCoach && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[10px] font-bold text-[#2de5ca] bg-[#2de5ca]/10 border border-[#2de5ca]/25">
                        <ShieldCheck className="w-3 h-3" /> TRENER
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-white/35">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-white/60 leading-relaxed whitespace-pre-line">{c.content}</p>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
