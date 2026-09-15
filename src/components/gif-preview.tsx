'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const W = 192
const H = 112
const GAP = 12

// Podgląd GIF-a "na pierwszym planie": renderowany w portalu na body,
// więc żaden overflow-hidden rodzica go nie ucina. Pozycja liczona z miejsca
// tytułu — po prawej, w pionie na środku wiersza, z docięciem do ekranu.
export function GifPreview({ gifUrl, title, children }: { gifUrl: string; title: string; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const clearTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const show = useCallback(() => {
    clearTimer()
    const el = anchorRef.current
    if (!el || typeof window === 'undefined') return
    // Na dotykowych i wąskich ekranach nie pokazujemy (tam i tak był hidden)
    if (window.matchMedia('(hover: none)').matches) return
    if (window.innerWidth < 640) return
    const r = el.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.right + GAP, window.innerWidth - W - 8))
    const top = Math.max(8, Math.min(r.top + r.height / 2 - H / 2, window.innerHeight - H - 8))
    setPos({ left, top })
  }, [])

  const hide = useCallback(() => {
    clearTimer()
    hideTimer.current = setTimeout(() => setPos(null), 120)
  }, [])

  useEffect(() => {
    const onScroll = () => setPos(null)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      clearTimer()
    }
  }, [])

  return (
    <>
      <span ref={anchorRef} onMouseEnter={show} onMouseLeave={hide} className="relative inline-flex items-center gap-1">
        {children}
      </span>
      {pos &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[200] transition-opacity duration-200"
            style={{ left: pos.left, top: pos.top, width: W }}
          >
            <div className="flex flex-col rounded-xl overflow-hidden bg-[#0b0e14]/95 backdrop-blur-xl ring-1 ring-white/15 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8),0_0_24px_-6px_rgba(139,92,246,0.25)]">
              <span className="h-px w-full bg-gradient-to-r from-transparent via-[#a78bfa]/60 to-transparent" />
              <span className="relative block overflow-hidden" style={{ width: W, height: H - 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img decoding="async" src={gifUrl} alt={`Demo: ${title}`} className="w-full h-full object-cover" loading="lazy" />
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
