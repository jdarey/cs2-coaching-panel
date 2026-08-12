'use client'

import { useEffect, useRef } from 'react'
import type { RealtimeEvent } from '@/lib/realtime'

/**
 * Subscribes to the server-sent events stream for the current session.
 * Auto-reconnects with a small backoff; a reconnection triggers a full
 * refresh via `onReconnect` (the polling fallback kicks in meanwhile).
 */
export function useRealtime(onEvent: (event: RealtimeEvent) => void, onReconnect?: () => void) {
  const handlerRef = useRef(onEvent)
  const reconnectRef = useRef(onReconnect)
  handlerRef.current = onEvent
  reconnectRef.current = onReconnect

  useEffect(() => {
    let source: EventSource | null = null
    let retry = 1000
    let closed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (closed) return
      source = new EventSource('/api/messages/stream')
      source.onmessage = (e) => {
        try {
          handlerRef.current(JSON.parse(e.data) as RealtimeEvent)
        } catch {
          /* malformed event — ignore */
        }
      }
      source.onopen = () => {
        retry = 1000
      }
      source.onerror = () => {
        source?.close()
        source = null
        if (closed) return
        reconnectRef.current?.()
        retryTimer = setTimeout(connect, retry)
        retry = Math.min(retry * 2, 15000)
      }
    }

    connect()

    return () => {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      source?.close()
    }
  }, [])
}
