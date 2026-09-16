'use client'

/**
 * Współdzielony podgląd GIF-a "za kursorem" — używany przez stronę ucznia
 * (lista zadań rutyny) i przez podgląd rutyny u trenera.
 *
 * Zasady wydajnościowe (z poprzednich poprawek perf):
 * - pozycja liczona SYNCHRONICZNIE w handlerze i trafia do stanu — pierwszy
 *   paint jest od razu dobry (bez mignięcia w rogu),
 * - animacja wejścia/wyjścia siedzi na WEWNĘTRZNEJ warstwie (gif-enter /
 *   gif-exit w globals.css: tylko transform+opacity), a przesuwanie za
 *   kursorem na zewnętrznym wrapperze — jedno nie przerywa drugiego,
 * - zero backdrop-blur na animowanych warstwach, karta renderowana w portalu
 *   (document.body), więc ŻADEN overflow-hidden rodzica jej nie ucinają.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Play, ArrowRight } from 'lucide-react'

export const GIF_CARD_W = 344
export const GIF_CARD_H = 320
const EXIT_MS = 130 // czas trwania gif-out w globals.css

export interface GifPreviewState {
  src: string
  title: string
  x: number
  y: number
}

function clampPos(cx: number, cy: number, w: number, h: number) {
  const GAP = 26
  let x = cx + GAP, y = cy - h / 2
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  if (x + w > window.innerWidth - 12) x = cx - w - GAP
  if (y + h > window.innerHeight - 12) y = window.innerHeight - h - 12
  if (x < 12) x = 12
  if (y < 12) y = 12
  return { x: Math.round(x), y: Math.round(y) }
}

export const canHoverFine = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * Hook zarządzający podglądem GIF-a. Podpinamy handlery do elementu wiersza:
 *   onMouseEnter={(e) => open(t.gifUrl, t.title, e.clientX, e.clientY)}
 *   onMouseMove={(e) => move(e.clientX, e.clientY)}
 *   onMouseLeave={close}
 */
export function useGifPreview() {
  const [preview, setPreview] = useState<GifPreviewState | null>(null)
  const [leaving, setLeaving] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openPos = useRef<{ cx: number; cy: number } | null>(null)

  // korekta pozycji po mount, prawdziwymi wymiarami karty
  const writePos = useCallback((x: number, y: number) => {
    wrapRef.current?.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0)`)
  }, [])

  const open = useCallback((src: string, title: string, cx: number, cy: number) => {
    if (!src) return
    if (exitTimer.current) { clearTimeout(exitTimer.current); exitTimer.current = null }
    openPos.current = { cx, cy }
    setLeaving(false)
    setPreview({ src, title, ...clampPos(cx, cy, GIF_CARD_W, GIF_CARD_H) })
  }, [])

  const move = useCallback((cx: number, cy: number) => {
    if (!wrapRef.current) return
    const pos = clampPos(cx, cy, GIF_CARD_W, GIF_CARD_H)
    writePos(pos.x, pos.y)
  }, [writePos])

  const close = useCallback(() => {
    setPreview((p) => {
      if (!p) return p
      if (exitTimer.current) clearTimeout(exitTimer.current)
      setLeaving(true)
      exitTimer.current = setTimeout(() => {
        exitTimer.current = null
        setPreview(null)
        setLeaving(false)
      }, EXIT_MS)
      return p
    })
  }, [])

  // twarde zamknięcie bez animacji (np. otwieramy modal ze szczegółami)
  const kill = useCallback(() => {
    if (exitTimer.current) { clearTimeout(exitTimer.current); exitTimer.current = null }
    setLeaving(false)
    setPreview(null)
  }, [])

  // jednorazowa korekta po mount prawdziwymi wymiarami karty
  useEffect(() => {
    if (!preview || typeof window === 'undefined') return
    const pos = openPos.current
    if (!pos) return
    const raf = requestAnimationFrame(() => {
      const el = wrapRef.current
      if (!el) return
      const fixed = clampPos(pos.cx, pos.cy, el.offsetWidth || GIF_CARD_W, el.offsetHeight || GIF_CARD_H)
      writePos(fixed.x, fixed.y)
    })
    return () => cancelAnimationFrame(raf)
  }, [preview, writePos])

  // cleanup timera przy odmontowaniu
  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current) }, [])

  return { preview, leaving, wrapRef, open, move, close, kill }
}

/**
 * Karta podglądu — renderowana w portalu do document.body, więc ŻADEN
 * overflow-hidden / transformowany przodek jej nie ucina ani nie przesuwa.
 * Zwraca null, gdy podgląd nieaktywny lub przed hydratacją.
 */
export function GifPreviewCard({
  preview,
  leaving,
  wrapRef,
}: {
  preview: GifPreviewState | null
  leaving: boolean
  wrapRef: React.RefObject<HTMLDivElement | null>
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !preview) return null

  return createPortal(
    <div
      ref={wrapRef as React.RefObject<HTMLDivElement>}
      style={{ transform: `translate3d(${preview.x}px, ${preview.y}px, 0)` }}
      className="pointer-events-none fixed left-0 top-0 z-[70] hidden md:block w-[344px] will-change-transform"
    >
      <div className="relative">
        {/* key=src: zmiana karty od nowa puszcza gif-enter */}
        <div key={`${preview.src}|${preview.title}`} className={cn('relative', leaving ? 'gif-exit' : 'gif-enter')}>
          <div className="absolute -inset-2 rounded-[20px] bg-gradient-to-br from-[#a78bfa]/25 via-[#2dd4bf]/10 to-transparent blur-xl" />
          <div className="yt-force-dark relative overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a12] shadow-[0_32px_80px_-20px_rgba(139,92,246,0.55),0_16px_40px_-12px_rgba(0,0,0,0.7)]">
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-[#a78bfa]/[0.08] to-transparent border-b border-white/[0.07]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] shadow"><Play className="w-3 h-3 text-white fill-white" /></span>
              <p className="flex-1 truncate text-[13px] font-bold text-white">{preview.title}</p>
              <span className="inline-flex items-center rounded-md bg-[#a78bfa]/15 border border-[#a78bfa]/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#c4b5fd]">GIF</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.src} alt={preview.title} loading="lazy" decoding="async" className="w-full h-auto max-h-[240px] object-contain bg-black" />
            <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/[0.07] bg-white/[0.02]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Podgląd demo</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#c4b5fd]">kliknij po szczegóły <ArrowRight className="w-3 h-3" /></span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
