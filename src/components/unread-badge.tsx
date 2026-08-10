'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/** Small unread badge for nav items. Polls the lightweight /api/messages/unread
 *  endpoint every 30s (only while the tab is visible) and refreshes on navigation. */
export function UnreadBadge({ kind }: { kind: 'messages' | 'feedback' }) {
  const pathname = usePathname()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/messages/unread', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setCount(kind === 'messages' ? (data.messages ?? 0) : (data.feedback ?? 0))
      } catch {
        /* ignore */
      }
    }
    load()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [pathname, kind])

  if (count <= 0) return null
  return (
    <span className="relative ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#2de5ca] text-white text-[10px] font-bold grid place-items-center shadow-[0_0_12px_rgba(20,184,166,0.7)]">
      {count > 99 ? '99+' : count}
    </span>
  )
}
