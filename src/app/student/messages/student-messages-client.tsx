'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Send, Loader2, GraduationCap } from 'lucide-react'

type Message = { id: string; senderId: string; receiverId: string; content: string; readAt: string | null; createdAt: string }
type Coach = { id: string; name: string | null; email: string | null; avatarUrl: string | null }

export function StudentMessagesClient() {
  const { data: session } = useSession()
  const myId = (session?.user as any)?.id

  const [coach, setCoach] = useState<Coach | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadThread = useCallback(async () => {
    if (!coach?.id) return
    const res = await fetch(`/api/messages?with=${coach.id}`)
    if (!res.ok) return
    const data = await res.json()
    setMessages(data.messages ?? [])
    setLoading(false)
  }, [coach?.id])

  const loadConversation = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (!res.ok) return
      const data = await res.json()
      const conv = data.conversations?.[0]
      if (conv) {
        setCoach((prev) => prev ?? { id: conv.id, name: conv.name, email: conv.email, avatarUrl: conv.avatarUrl })
      } else if (data.coach) {
        setCoach(data.coach)
      }
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversation()
  }, [loadConversation])

  useEffect(() => {
    if (coach) loadThread()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id])

  // Poll for new messages every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (coach) loadThread()
    }, 5000)
    return () => clearInterval(interval)
  }, [coach, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    if (!draft.trim() || !coach || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: coach.id, content: draft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd wysyłania')
      setMessages((prev) => [...prev, data.message])
      setDraft('')
    } catch (e: any) {
      setError(e.message || 'Błąd wysyłania')
    } finally {
      setSending(false)
    }
  }

  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) + ', ' +
    new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold text-white/70 mb-3">
          <MessageSquare className="w-3.5 h-3.5 text-[#2de5ca]" />
          KOMUNIKACJA
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white">Wiadomości</h1>
        <p className="mt-2 text-white/50 text-sm">Masz pytanie? Napisz bezpośrednio do swojego trenera.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Ładowanie…
        </div>
      ) : !coach ? (
        <div className="glass rounded-2xl p-10 text-center">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/70 font-semibold">Nie masz jeszcze trenera</p>
          <p className="text-sm text-white/40 mt-1">Gdy trener doda Cię do swojego panelu, pojawi się tutaj czat.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden h-[calc(100vh-240px)] flex flex-col">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <Avatar className="h-10 w-10 rounded-full ring-1 ring-white/10">
              <AvatarImage src={coach.avatarUrl || ''} alt={coach.name || ''} />
              <AvatarFallback className="rounded-full bg-[#2fb6a2] text-white text-sm font-semibold">
                {(coach.name || coach.email || 'T')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-white">{coach.name || 'Twój trener'}</p>
              <p className="text-[11px] text-white/40">Trener • odpowiada zwykle szybko</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-black/10">
            {messages.length === 0 && (
              <p className="text-center text-sm text-white/35 py-10">Brak wiadomości — napisz do trenera!</p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === myId
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                      mine
                        ? 'bg-gradient-to-br from-[#2fb6a2] to-[#2fb6a2] text-white rounded-br-md shadow-[0_8px_24px_-8px_rgba(47,182,162,0.6)]'
                        : 'bg-white/[0.06] border border-white/[0.08] text-white/90 rounded-bl-md',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={cn('mt-1 text-[10px]', mine ? 'text-white/60' : 'text-white/35')}>{timeLabel(m.createdAt)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-white/[0.06]">
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Napisz wiadomość… (Enter = wyślij)"
                rows={1}
                className="min-h-[48px] max-h-32 resize-none input-premium"
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="btn-darey shrink-0 h-[48px] px-5 rounded-xl inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-40 disabled:pointer-events-none"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Wyślij</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
