'use client'

import { ShieldAlert } from 'lucide-react'

interface ContentProtectionOverlayProps {
  devtoolsOpen: boolean
  captureWarn: boolean
}

// The visual layer of the content protection: the DevTools-open blocker and
// the capture-warning toast. Shared by the YouTube player and the raw-embed
// wrapper so every video surface is protected.
export function ContentProtectionOverlay({
  devtoolsOpen,
  captureWarn,
}: ContentProtectionOverlayProps) {
  return (
    <>
      {/* DevTools-open blocker — the video is paused and the overlay stays
          until the panel is closed (docked DevTools only; undocked cannot be
          detected by any page). */}
      {devtoolsOpen && (
        <div className="absolute inset-0 z-60 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#a78bfa] mb-1">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-white font-bold text-lg">Treść chroniona</h3>
          <p className="text-white/45 text-xs max-w-sm leading-relaxed">
            Narzędzia deweloperskie pozwalają wyciągnąć bezpośredni link do strumienia wideo.
            Zamknij panel, aby kontynuować oglądanie.
          </p>
        </div>
      )}

      {/* Capture-warning toast on blocked shortcuts and tab-hide while
          playing (possible screen recording). */}
      {captureWarn && !devtoolsOpen && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-60 pointer-events-none animate-rise-in">
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold text-amber-200 bg-black/85 ring-1 ring-amber-400/30 backdrop-blur-md shadow-2xl shadow-black/60">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            Ekran monitorowany — materiały są chronione przed kopiowaniem
          </span>
        </div>
      )}
    </>
  )
}
