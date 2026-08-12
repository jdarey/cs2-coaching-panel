'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Refreshes data as often as possible without burning the server: the
 * callback runs on window focus, when the tab becomes visible, and every
 * `interval` ms — but ONLY while the tab is actually visible. Hidden tabs
 * are skipped entirely (no wasted requests) and refresh on return.
 */
export function useLiveRefresh(refresh: () => void, { interval = 15000 }: { interval?: number } = {}) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  const run = useCallback(() => {
    try {
      refreshRef.current()
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const onFocus = () => run()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') run()
    }, interval)

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [run, interval])
}
