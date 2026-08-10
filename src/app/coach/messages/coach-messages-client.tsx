'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Send, ArrowLeft, Inbox, Loader2 } from 'lucide-react'

type ChatUser = { id: string; name: string | null; email: string | null; avatarUrl: string | null }
type Message = { id: string; senderId: string; receiverId: string; content: string; readAt: string | null; createdAt: string }
type Conversation = ChatUser & { lastMessage: Message | null; unread: number }

export function CoachMessagesClient() {
  const { data: session } = useSession()
  const myId = (session?.user as any)?.id

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const active = conversations.find((c) => c.id === activeId) ?? null

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  const loadThread = useCallback(async (withId: string) => {
    const res = await fetch(`/api/messages?with=${withId}`)
    if (!res.ok) return
    const data = await res.json()
    setMessages(data.messages ?? [])
    // clear unread for this conversation
    setConversations((prev) => prev.map((c) => (c.id === withId ? { ...c, unread: 0 } : c)))
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (activeId) loadThread(activeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // Poll for new messages every 5s while a thread is open, 15s otherwise.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      if (activeId) loadThread(activeId)
      loadConversations()
    }, activeId ? 5000 : 15000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeId])

  const send = async () => {
    if (!draft.trim() || !active || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: active.id, content: draft.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd wysyłania')
      setMessages((prev) => [...prev, data.message])
      setDraft('')
      loadConversations()
    } catch (e: any) {
      setError(e.message || 'Błąd wysyłania')
    } finally {
      setSending(false)
    }
  }

  const timeLabel = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold text-white/70 mb-3">
          <MessageSquare className="w-3.5 h-3.5 text-[#2de5ca]" />
          KOMUNIKACJA
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-white">Wiadomości</h1>
        <p className="mt-2 text-white/50 text-sm">Pisz bezpośrednio ze swoimi uczniami — szybko, prosto i w jednym miejscu.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Ładowanie rozmów…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Conversation list */}
          <div className="glass rounded-2xl overflow-hidden lg:h-[calc(100vh-220px)] flex flex-col">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-sm font-semibold text-white/80">Rozmowy</span>
              <span className="text-[11px] text-white/40">{conversations.length} uczniów</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="w-8 h-8 mx-auto mb-3 text-white/20" />
                  <p className="text-sm text-white/40">Nie masz jeszcze rozmów.<br />Dodaj ucznia, żeby zacząć.</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 border-b border-white/[0.04]',
                      activeId === c.id ? 'bg-[#2fb6a2]/15' : 'hover:bg-white/[0.04]',
                    )}
                  >
                    <Avatar className="h-10 w-10 rounded-full ring-1 ring-white/10 shrink-0">
                      <AvatarImage src={c.avatarUrl || ''} alt={c.name || ''} />
                      <AvatarFallback className="rounded-full bg-[#2fb6a2] text-white text-sm font-semibold">
                        {(c.name || c.email || '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{c.name || 'Uczeń'}</p>
                        {c.lastMessage && (
                          <span className="text-[10px] text-white/35 shrink-0">
                            {new Date(c.lastMessage.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      <p className={cn('text-xs truncate mt-0.5', c.unread > 0 ? 'text-white/80 font-medium' : 'text-white/40')}>
                        {c.lastMessage ? (c.lastMessage.senderId === myId ? 'Ty: ' : '') + c.lastMessage.content : 'Brak wiadomości'}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#2de5ca] text-white text-[10px] font-bold grid place-items-center">
                        {c.unread}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Thread */}
          <div className="glass rounded-2xl overflow-hidden lg:h-[calc(100vh-220px)] flex flex-col">
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#2fb6a2]/15 border border-[#2de5ca]/30 grid place-items-center mb-4">
                  <MessageSquare className="w-7 h-7 text-[#8FA3FF]" />
                </div>
                <p className="text-white/70 font-semibold">Wybierz rozmowę</p>
                <p className="text-sm text-white/40 mt-1 max-w-xs">Kliknij ucznia po lewej stronie, aby otworzyć czat.</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
                  <button onClick={() => setActiveId(null)} className="lg:hidden text-white/60 hover:text-white mr-1" aria-label="Wróć">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar className="h-9 w-9 rounded-full ring-1 ring-white/10">
                    <AvatarImage src={active.avatarUrl || ''} alt={active.name || ''} />
                    <AvatarFallback className="rounded-full bg-[#2fb6a2] text-white text-xs font-semibold">
                      {(active.name || active.email || '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-white">{active.name || 'Uczeń'}</p>
                    <p className="text-[11px] text-white/40 truncate">{active.email}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-black/10">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-white/35 py-10">Brak wiadomości — napisz pierwszą!</p>
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
