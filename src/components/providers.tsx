'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ReactNode, useEffect } from 'react'
import { usePresenceHeartbeat } from '@/hooks/use-presence-heartbeat'

// Applies the saved theme (light/dark/system) from localStorage on mount so the
// choice survives navigation and reloads.
export function applyStoredTheme() {
  if (typeof window === 'undefined') return
  const saved = localStorage.getItem('theme')
  const el = document.documentElement
  el.classList.remove('light', 'dark')
  if (saved === 'light' || saved === 'dark') {
    el.classList.add(saved)
  } else {
    // default: dark, matching the app's design
    el.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  }
}

// Tryb "system" ma na bieżąco podążać za przełącznikiem OS (bez reloadu).
export function useSystemThemeSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const saved = localStorage.getItem('theme')
      if (!saved || saved === 'system') applyStoredTheme()
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
}

function PresenceManager() {
  const { data: session, status } = useSession()
  usePresenceHeartbeat(status === 'authenticated' && !!session?.user)
  return null
}

function isChunkErrorMessage(message: string): boolean {
  return /Loading chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module|error loading chunk/i.test(
    message || '',
  )
}

// Twardy reload raz na max 10 s — chroni przed pętlą.
function reloadOnceForChunk(): boolean {
  try {
    const KEY = 'chunk-reload-at'
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < 10_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
    return true
  } catch {
    return true
  }
}

export function Providers({ children }: { children: ReactNode }) {
  useSystemThemeSync()

  useEffect(() => {
    applyStoredTheme()
    // primary color per user
    try {
      const { applyStoredPrimaryColor } = require('@/lib/theme-color')
      applyStoredPrimaryColor()
    } catch {}

    // Łapu na padnięte chunki JS (np. deployment wymieniony w tle, a karta
    // trzyma stary HTML). Dotyczy dynamicznych importów poza renderem —
    // błędy renderu łapie global-error.tsx.
    const onError = (e: ErrorEvent) => {
      if (e.message && isChunkErrorMessage(e.message) && reloadOnceForChunk()) {
        window.location.reload()
      }
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = (e.reason && (e.reason.message || String(e.reason))) || ''
      if (isChunkErrorMessage(msg) && reloadOnceForChunk()) {
        window.location.reload()
      }
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return (
    <SessionProvider>
      <TooltipProvider>
        <PresenceManager />
        {children}
        <Toaster />
      </TooltipProvider>
    </SessionProvider>
  )
}