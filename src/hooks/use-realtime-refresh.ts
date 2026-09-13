'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRealtime } from './use-realtime'
import type { RealtimeEvent } from '@/lib/realtime'

/**
 * SSE-first refresh: odświeża TYLKO gdy serwer wyśle event (message/rank/task),
 * plus bezpieczny fallback co `fallbackMs` (domyślnie 5 min) i na focus/visible.
 * Zastępuje agresywny polling `router.refresh()` co 15-60s.
 */
export function useRealtimeRefresh(
  refresh: () => void,
  { fallbackMs = 300_000, types }: { fallbackMs?: number; types?: RealtimeEvent['type'][] } = {},
) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  const run = useCallback(() => {
    try {
      refreshRef.current()
    } catch {
      /* ignore */
    }
  }, [])

  useRealtime(
    (event) => {
      if (!types || types.includes(event.type)) run()
    },
    () => run(),
  )

  useEffect(() => {
    const onFocus = () => run()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') run()
    }, fallbackMs)

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [run, fallbackMs])
}
