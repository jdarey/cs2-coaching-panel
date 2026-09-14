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
    // 60s -> 180s: online/offline i tak ma 5-minutowe okno tolerancji,
    // więc 3x mniej POST /api/presence/heartbeat (1440 -> 480/dzień/user).
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') beat()
    }, 180_000)
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
