'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Ambient background — aurora blobs (blue -> violet, matching the Vantor
 * reference), drifting 3D shapes, masked grid, vignette and a cursor glow.
 * The cursor glow is written straight to the DOM inside a requestAnimationFrame
 * so mousemove never triggers React re-renders.
 */
export function AuroraBackground({
  variant = 'default',
  intensity = 1,
}: {
  variant?: 'default' | 'auth' | 'minimal'
  intensity?: number
}) {
  const [mounted, setMounted] = useState(false)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    let raf = 0
    const handleMouseMove = (e: MouseEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (glowRef.current) {
          const x = (e.clientX / window.innerWidth) * 100
          const y = (e.clientY / window.innerHeight) * 100
          glowRef.current.style.left = `${x}%`
          glowRef.current.style.top = `${y}%`
        }
      })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  if (!mounted) return null

  const baseOpacity = intensity

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      {/* ===== Particle Field (light, GPU-friendly) ===== */}
      <div className="particle-field" style={{ opacity: 0.25 * baseOpacity }}>
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              background: `radial-gradient(circle, ${i % 3 === 0 ? 'rgba(140,255,239,0.7)' : i % 3 === 1 ? 'rgba(45,229,202,0.6)' : 'rgba(47,182,162,0.55)'}, transparent 70%)`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${Math.random() * 4 + 6}s`,
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
      </div>

      {/* ===== 3D Scene — drifting wireframe shapes ===== */}
      <div className="absolute inset-0" style={{ perspective: '1200px' }}>
        <div className="shape-3d left-[6%] top-[18%]" style={{ animation: 'drift-3d 34s ease-in-out infinite' }}>
          <div className="shape-3d-cube" style={{ opacity: 0.35 }}>
            <div className="face front" /><div className="face back" />
            <div className="face right" /><div className="face left" />
            <div className="face top" /><div className="face bottom" />
          </div>
        </div>
        <div className="shape-3d right-[8%] top-[28%]" style={{ animation: 'drift-3d 42s ease-in-out infinite 6s' }}>
          <div className="shape-3d-ring" style={{ opacity: 0.3 }} />
        </div>
        <div className="shape-3d left-[14%] bottom-[16%]" style={{ animation: 'drift-3d 38s ease-in-out infinite 12s' }}>
          <div className="shape-3d-pyramid" style={{ opacity: 0.25 }} />
        </div>
        <div className="shape-3d right-[18%] bottom-[24%]" style={{ animation: 'drift-3d 46s ease-in-out infinite 3s' }}>
          <div className="shape-3d-ring" style={{ opacity: 0.2, width: 60, height: 60, borderWidth: 1 }} />
        </div>
      </div>

      {/* ===== Aurora Blobs — blue -> violet ===== */}
      <div
        className={`absolute ${variant === 'auth' ? '-top-32' : '-top-40 -left-32'} w-[700px] h-[700px] rounded-full blur-[120px] animate-aurora`}
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(47,182,162,0.35) 0%, rgba(47,182,162,0.14) 40%, transparent 75%)',
          opacity: 0.14 * baseOpacity,
          transformOrigin: 'center center',
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? 'top-1/4 -right-40' : 'top-1/3 -right-48'} w-[800px] h-[800px] rounded-full blur-[120px] animate-aurora-slow`}
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(45,229,202,0.3) 0%, rgba(47,182,162,0.12) 45%, transparent 80%)',
          opacity: 0.09 * baseOpacity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? '-bottom-40 left-1/3' : '-bottom-48 left-1/4'} w-[650px] h-[650px] rounded-full blur-[120px] animate-aurora-reverse`}
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(45,229,202,0.22) 0%, rgba(20,122,107,0.12) 50%, transparent 80%)',
          opacity: 0.06 * baseOpacity,
        }}
      />

      {/* ===== Dynamic cursor-following glow (rAF, no re-renders) ===== */}
      <div
        ref={glowRef}
        className="absolute rounded-full blur-[200px] opacity-30 will-change-transform"
        style={{
          width: '420px',
          height: '420px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(45,229,202,0.25) 0%, rgba(45,229,202,0.12) 40%, transparent 80%)',
        }}
      />

      {/* ===== Fine Grid with Radial Mask ===== */}
      <div
        className="absolute inset-0 bg-grid"
        style={{
          opacity: 0.04 * baseOpacity,
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)',
        }}
      />

      {/* ===== Fine Grid Overlay (Secondary) ===== */}
      <div
        className="absolute inset-0 bg-grid-fine"
        style={{
          opacity: 0.02 * baseOpacity,
          maskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 60%, transparent 100%)',
        }}
      />

      {/* ===== Vignette ===== */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0.5) 100%)',
          opacity: baseOpacity,
        }}
      />

      {/* ===== Top Accent ===== */}
      <div
        className="absolute top-0 left-0 right-0 h-[600px]"
        style={{
          background: 'radial-gradient(ellipse at top center, rgba(47,182,162,0.14) 0%, rgba(45,229,202,0.06) 40%, transparent 60%)',
          opacity: baseOpacity,
        }}
      />

      <style jsx global>{`
        @keyframes drift-3d {
          0%, 100% { transform: translate3d(0, 0, 0) rotateZ(0deg); }
          25% { transform: translate3d(30px, -24px, 40px) rotateZ(6deg); }
          50% { transform: translate3d(-20px, 18px, -30px) rotateZ(-5deg); }
          75% { transform: translate3d(16px, -10px, 24px) rotateZ(4deg); }
        }
      `}</style>
    </div>
  )
}
