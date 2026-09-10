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

function PresenceManager() {
  const { data: session, status } = useSession()
  usePresenceHeartbeat(status === 'authenticated' && !!session?.user)
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyStoredTheme()
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