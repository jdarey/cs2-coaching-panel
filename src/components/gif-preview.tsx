'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

const W = 192
const H = 112
const GAP = 12
// Podgląd minimalnie poniżej środka tytułu
const DROP_Y = 10

interface GifState {
  gifUrl: string
  title: string
  rect: { right: number; top: number; height: number }
}

let showFn: ((s: GifState) => void) | null = null
let hideFn: (() => void) | null = null

// Wołane z onMouseEnter wiersza ćwiczenia. rect = prostokąt tytułu
// (żeby dymek stał obok tytułu, w pionie lekko poniżej jego środka).
export function showGifPreview(gifUrl: string, title: string, rect: { right: number; top: number; height: number }) {
  showFn?.({ gifUrl, title, rect })
}

export function hideGifPreview() {
  hideFn?.()
}

// Helper do wiersza ćwiczenia: doklej {...gifRowHandlers(t)} do diva wiersza,
// tytuł oznacz data-gif-title, a przycisk Start (jeśli jest) data-gif-start.
// Kotwica pozioma: mierzymy szerokość tytułu i przycisku Start w pikselach —
// dymek staje obok SZERSZEGO z nich (brak Start → obok tytułu).
// Pion: zawsze środek CAŁEGO wiersza ćwiczenia.
export function gifRowHandlers(t: { gifUrl: string | null; title: string }) {
  if (!t.gifUrl) return {}
  const gifUrl = t.gifUrl
  const title = t.title
  return {
    onMouseEnter: (e: MouseEvent<HTMLDivElement>) => {
      const row = e.currentTarget
      const titleEl = row.querySelector('[data-gif-title]')
      const startEl = row.querySelector('[data-gif-start]')
      const titleW = titleEl?.getBoundingClientRect().width ?? 0
      const startW = startEl?.getBoundingClientRect().width ?? 0
      const anchor = (startEl && startW > titleW ? startEl : titleEl) ?? row
      const r = anchor.getBoundingClientRect()
      const rowR = row.getBoundingClientRect()
      showGifPreview(gifUrl, title, { right: r.right, top: rowR.top, height: rowR.height })
    },
    onMouseLeave: () => hideGifPreview(),
  }
}
}
export function GifPreviewHost() {
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<GifState | null>(null)

  const clearTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const show = useCallback((s: GifState) => {
    clearTimer()
    if (typeof window === 'undefined') return
    if (window.matchMedia('(hover: none)').matches) return
    if (window.innerWidth < 640) return
    setState(s)
  }, [])

  const hide = useCallback(() => {
    clearTimer()
    hideTimer.current = setTimeout(() => setState(null), 120)
  }, [])

  useEffect(() => {
    showFn = show
    hideFn = hide
    const onScroll = () => setState(null)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      clearTimer()
      if (showFn === show) showFn = null
      if (hideFn === hide) hideFn = null
    }
  }, [show, hide])

  if (!state || typeof document === 'undefined') return null

  const left = Math.max(8, Math.min(state.rect.right + GAP, window.innerWidth - W - 8))
  const top = Math.max(8, Math.min(state.rect.top + state.rect.height / 2 - H / 2 + DROP_Y, window.innerHeight - H - 8))

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed z-[200]" style={{ left, top, width: W }}>
      <div className="flex flex-col rounded-xl overflow-hidden bg-[#0b0e14]/95 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8),0_0_24px_-6px_rgba(139,92,246,0.25)]">
        <span className="h-px w-full bg-gradient-to-r from-transparent via-[#a78bfa]/60 to-transparent" />
        <span className="relative block overflow-hidden" style={{ width: W, height: H - 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img decoding="async" src={state.gifUrl} alt={`Demo: ${state.title}`} className="w-full h-full object-cover" loading="lazy" />
        </span>
      </div>
    </div>,
    document.body,
  )
}
