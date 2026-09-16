'use client'

import { useEffect, useState } from 'react'

const VIOLET = ['#8b5cf6', '#a78bfa', '#6d28d9']

/**
 * Ambient background — static aurora blobs (no infinite drift animations:
 * 3 giant blurred layers animating forever was the top sustained GPU cost
 * app-wide). Same look, painted once and cached by the compositor.
 *
 * Kolory idą za custom primary color (--primary-hex ustawiane przez
 * theme-color.ts). Bez custom coloru — bazowy fiolet.
 */
export function AuroraBackground({
  variant = 'default',
  intensity = 1,
}: {
  variant?: 'default' | 'auth' | 'minimal'
  intensity?: number
}) {
  const [colors, setColors] = useState<string[]>(VIOLET)

  useEffect(() => {
    const read = () => {
      const hex = getComputedStyle(document.documentElement).getPropertyValue('--primary-hex').trim()
      setColors(hex ? [hex, hex, hex] : VIOLET)
    }
    read()
    // Reakcja na zmianę koloru w ustawieniach (applyPrimaryColor ustawia --primary-hex)
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-primary-light'] })
    return () => mo.disconnect()
  }, [])

  const toRgba = (hex: string, a: number) => {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  const grad = (hex: string, peak: number, mid: number) =>
    `radial-gradient(ellipse 60% 40% at 50% 50%, ${toRgba(hex, peak)} 0%, ${toRgba(hex, mid)} 40%, transparent 75%)`

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
      {/* ===== Aurora blobs ===== */}
      <div
        className={`absolute ${variant === 'auth' ? '-top-32' : '-top-40 -left-32'} w-[700px] h-[700px] rounded-full blur-[120px]`}
        style={{
          background: grad(colors[0], 0.38, 0.15),
          opacity: 0.16 * intensity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? 'top-1/4 -right-40' : 'top-1/3 -right-48'} w-[800px] h-[800px] rounded-full blur-[120px]`}
        style={{
          background: grad(colors[1], 0.32, 0.13),
          opacity: 0.1 * intensity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? '-bottom-40 left-1/3' : '-bottom-48 left-1/4'} w-[650px] h-[650px] rounded-full blur-[120px]`}
        style={{
          background: grad(colors[2], 0.24, 0.13),
          opacity: 0.07 * intensity,
        }}
      />
    </div>
  )
}
