'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRealtime } from '@/hooks/use-realtime'

/** Unread badge for nav items. Picks up new events instantly via SSE,
 *  refreshes on window focus and on navigation, and polls every 15s as a
 *  fallback (only while the tab is visible). */
export function UnreadBadge({ kind }: { kind: 'messages' | 'feedback' }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const myId = (session?.user as any)?.id
  const [count, setCount] = useState(0)

  const load = async () => {
    try {
      const res = await fetch('/api/messages/unread', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setCount(kind === 'messages' ? (data.messages ?? 0) : (data.feedback ?? 0))
    } catch {
      /* ignore */
    }
  }

  // Instant push: a new message event bumps the badge without waiting for poll.
  useRealtime((event) => {
    if (event.type !== 'message:new') return
    if (kind !== 'messages') return
    const msg = (event.payload as any)?.message
    if (!msg) return
    // Only incoming messages increase the unread count.
    if (myId && msg.senderId === myId) return
    setCount((c) => c + 1)
  })

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 15000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, kind])

  if (count <= 0) return null
  return (
    <span className="relative ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#a78bfa] text-white text-[10px] font-bold grid place-items-center shadow-[0_0_12px_rgba(20,184,166,0.7)]">
      {count > 99 ? '99+' : count}
    </span>
  )
}
