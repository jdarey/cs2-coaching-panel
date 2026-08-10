'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquareHeart, Loader2, Send, CheckCircle2, MessageSquare, CalendarDays, Lightbulb, AlertTriangle, Trash2 } from 'lucide-react'

type Feedback = {
  id: string
  type: string
  content: string
  status: string
  response: string | null
  respondedAt: string | null
  createdAt: string
  session: { id: string; title: string } | null
  coach: { id: string; name: string | null; avatarUrl: string | null } | null
}

type Session = { id: string; title: string }

const TYPE_OPTIONS = [
  { value: 'GENERAL', label: 'Ogólna opinia', icon: MessageSquare },
  { value: 'SESSION', label: 'Ocena sesji', icon: CalendarDays },
  { value: 'SUGGESTION', label: 'Pomysł / sugestia', icon: Lightbulb },
  { value: 'ISSUE', label: 'Problem / zgłoszenie', icon: AlertTriangle },
]

export function StudentFeedbackClient() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [type, setType] = useState('GENERAL')
  const [sessionId, setSessionId] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback')
      if (!res.ok) return
      const data = await res.json()
      setFeedback(data.feedback ?? [])
      if (data.coachId) {
        const sres = await fetch('/api/sessions')
        if (sres.ok) setSessions(await sres.json())
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

  const submit = async () => {
    if (!content.trim() || sending) return
    setSending(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          type,
          sessionId: sessionId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd wysyłania opinii')
      setFeedback((prev) => [data.feedback, ...prev])
      setContent('')
      setSessionId('')
      setType('GENERAL')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (e: any) {
      setError(e.message || 'Błąd wysyłania opinii')
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await fetch(`/api/feedback/${id}`, { method: 'DELETE' })
      setFeedback((prev) => prev.filter((f) => f.id !== id))
    } catch {
      /* ignore */
    }
  }

  const typeMeta = (t: string) => TYPE_OPTIONS.find((o) => o.value === t) ?? TYPE_OPTIONS[0]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold text-white/70 mb-3">
          <MessageSquareHeart className="w-3.5 h-3.5 text-[#2de5ca]" />
          TWOJA OPINIA
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white">Opinie i sugestie</h1>
        <p className="mt-2 text-white/50 text-sm">Twoje zdanie się liczy — podziel się nim z trenerem, a on odpowie bezpośrednio tutaj.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="glass rounded-2xl p-6 h-fit">
          <h2 className="font-display font-bold text-lg text-white mb-4">Nowa opinia</h2>

          <div className="mb-4">
            <p className="label-premium">Typ opinii</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setType(o.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200',
                    type === o.value
                      ? 'bg-[#2fb6a2]/25 border-[#2de5ca]/50 text-white'
                      : 'glass text-white/55 hover:text-white/85',
                  )}
                >
                  <o.icon className={cn('w-3.5 h-3.5', type === o.value ? 'text-[#8FA3FF]' : 'text-white/40')} />
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {sessions.length > 0 && (
            <div className="mb-4">
              <p className="label-premium">Dotyczy sesji (opcjonalnie)</p>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="input-premium appearance-none"
              >
                <option value="" className="bg-[#0a0a12]">— Bez sesji —</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0a0a12]">{s.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <p className="label-premium">Treść</p>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Co chcesz przekazać trenerowi? Co Ci pomogło, czego brakuje, z czym masz problem…"
              rows={5}
              className="input-premium resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          {success && (
            <p className="text-xs text-emerald-300 mb-3 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Opinia wysłana! Trener odpowie tutaj.
            </p>
          )}

          <button
            onClick={submit}
            disabled={!content.trim() || sending}
            className="btn-darey w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Wyślij opinię
          </button>
        </div>

        {/* History */}
        <div>
          <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center justify-between">
            Historia
            <span className="text-xs font-medium text-white/40">{feedback.length} opinii</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin mr-3" /> Ładowanie…
            </div>
          ) : feedback.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <MessageSquareHeart className="w-8 h-8 mx-auto mb-3 text-white/20" />
              <p className="text-sm text-white/40">Nie wysłałeś jeszcze żadnej opinii.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((f) => {
                const meta = typeMeta(f.type)
                return (
                  <div key={f.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[#2de5ca]/15 border-[#2de5ca]/30 text-[#8FA3FF]">
                          <meta.icon className="w-3 h-3" /> {meta.label}
                        </span>
                        {f.status === 'RESPONDED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> Odpowiedź
                          </span>
                        )}
                      </div>
                      <button onClick={() => remove(f.id)} className="text-white/25 hover:text-red-400 transition-colors" aria-label="Usuń opinię">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {f.session && <p className="text-[11px] text-white/40 mb-1">Sesja: {f.session.title}</p>}
                    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">{f.content}</p>
                    <p className="text-[11px] text-white/30 mt-2">
                      {new Date(f.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {f.response && (
                      <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
                        <p className="text-[10px] font-semibold text-[#8FA3FF] uppercase tracking-wider mb-1">
                          Odpowiedź trenera {f.coach?.name ? `(${f.coach.name})` : ''}
                        </p>
                        <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{f.response}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
