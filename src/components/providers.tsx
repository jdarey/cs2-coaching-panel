'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ReactNode, useEffect } from 'react'

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

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyStoredTheme()
  }, [])

  return (
    <SessionProvider>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </SessionProvider>
  )
}