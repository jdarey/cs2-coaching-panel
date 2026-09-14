'use client'

import { useEffect, useState } from 'react'
import { Check, Palette, RotateCcw } from 'lucide-react'
import { PRIMARY_PRESETS, applyPrimaryColor, clearPrimaryColor, applyStoredPrimaryColor } from '@/lib/theme-color'
import { cn } from '@/lib/utils'

export function ThemeColorPicker() {
  const [current, setCurrent] = useState<string>('#a78bfa')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    applyStoredPrimaryColor()
    const saved = localStorage.getItem('primaryColor') || '#a78bfa'
    setCurrent(saved)
    setCustom(saved)
  }, [])

  const pick = (hex: string) => {
    setCurrent(hex)
    setCustom(hex)
    applyPrimaryColor(hex)
  }

  const onCustom = (hex: string) => {
    setCustom(hex)
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setCurrent(hex)
      applyPrimaryColor(hex)
    }
  }

  const reset = () => {
    clearPrimaryColor()
    setCurrent('#a78bfa')
    setCustom('#a78bfa')
    applyPrimaryColor('#a78bfa')
  }

  return (
    <div className="rounded-3xl glass-tinted p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#c4b5fd] shrink-0">
          <Palette className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-white">Kolor przewodni</h3>
          <p className="text-sm text-white/45 mt-1">Wybierz kolor przewodni — ikony, obramowania, przyciski i poświaty w całej aplikacji dopasują się do niego. Każdy użytkownik widzi swój własny. Zapisuje się lokalnie.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {PRIMARY_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => pick(p.value)}
            className={cn(
              'group relative flex flex-col items-center gap-2 rounded-2xl p-3 border transition-all',
              current.toLowerCase() === p.value.toLowerCase()
                ? 'bg-white/[0.06] border-white/20 ring-1 ring-white/20'
                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
            )}
            title={p.name}
          >
            <span className="w-10 h-10 rounded-xl ring-1 ring-white/10 shadow-inner" style={{ background: p.value }} />
            <span className="text-[11px] font-medium text-white/70">{p.name}</span>
            {current.toLowerCase() === p.value.toLowerCase() && (
              <span className="absolute top-2 right-2 grid place-items-center w-5 h-5 rounded-full bg-white text-black">
                <Check className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            className="h-10 w-14 rounded-xl bg-transparent border border-white/10 p-1 cursor-pointer"
            title="Wybierz własny kolor"
          />
          <input
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            placeholder="#a78bfa"
            className="h-10 w-32 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
        <span className="text-xs text-white/30">lub wpisz HEX</span>
        <button onClick={reset} className="ml-auto inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white hover:border-white/15">
          <RotateCcw className="w-3.5 h-3.5" /> Przywróć fioletowy
        </button>
      </div>

      <div className="mt-5 rounded-2xl p-4 bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
        <div className="h-8 flex-1 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: current }}>Podgląd: {current}</div>
        <span className="text-xs text-white/40">Ikony, obramowania i poświaty w tym kolorze</span>
      </div>
    </div>
  )
}
