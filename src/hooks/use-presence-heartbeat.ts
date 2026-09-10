'use client'
import { useEffect } from 'react'

export function usePresenceHeartbeat(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const beat = async () => {
      try { await fetch('/api/presence/heartbeat', { method: 'POST' }) } catch {}
    }
    beat()
    const interval = setInterval(beat, 60_000)
    const onVisible = () => { if (document.visibilityState === 'visible') beat() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', beat)
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', beat)
    }
  }, [enabled])
}
