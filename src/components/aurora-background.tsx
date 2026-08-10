'use client'

import { useEffect, useState } from 'react'

/**
 * Shared ambient background — aurora blobs + masked grid + vignette + noise.
 * Used on every page so the whole app feels like one cohesive premium product.
 */
export function AuroraBackground({ variant = 'default' }: { variant?: 'default' | 'auth' }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      {/* Aurora blobs */}
      <div
        className={`absolute ${variant === 'auth' ? '-top-24' : '-top-32 -left-24'} w-[560px] h-[560px] rounded-full blur-[120px] opacity-50 animate-aurora`}
        style={{ background: 'radial-gradient(circle, rgba(124,111,255,0.35) 0%, transparent 65%)' }}
      />
      <div
        className={`absolute ${variant === 'auth' ? 'top-1/4 -right-32' : 'top-1/3 -right-32'} w-[640px] h-[640px] rounded-full blur-[140px] opacity-40 animate-aurora-slow`}
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 65%)' }}
      />
      <div
        className={`absolute ${variant === 'auth' ? '-bottom-32 left-1/4' : '-bottom-40 left-1/3'} w-[520px] h-[520px] rounded-full blur-[120px] opacity-30 animate-aurora`}
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%)' }}
      />

      {/* Fine grid with radial mask */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)' }}
      />

      {/* Noise */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '180px',
        }}
      />
    </div>
  )
}
