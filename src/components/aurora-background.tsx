'use client'

import { useEffect, useState } from 'react'

/**
 * Ultra-premium ambient background — multi-layered aurora blobs, particle field,
 * masked grid, vignette, noise, and dynamic cursor glow.
 */
export function AuroraBackground({ 
  variant = 'default',
  intensity = 1 
}: { 
  variant?: 'default' | 'auth' | 'minimal'
  intensity?: number
}) {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    setMounted(true)
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  if (!mounted) return null

  const baseOpacity = intensity

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden>
      {/* ===== Particle Field ===== */}
      <div className="particle-field" style={{ opacity: 0.3 * baseOpacity }}>
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              background: `radial-gradient(circle, ${i % 3 === 0 ? 'rgba(139,123,255,0.6)' : i % 3 === 1 ? 'rgba(192,132,252,0.5)' : 'rgba(168,85,247,0.4)'}, transparent 70%)`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${Math.random() * 4 + 6}s`,
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
      </div>

      {/* ===== Aurora Blobs - Organic, living gradients ===== */}
      <div
        className={`absolute ${variant === 'auth' ? '-top-32' : '-top-40 -left-32'} w-[700px] h-[700px] rounded-full blur-[160px] opacity-60 animate-aurora`}
        style={{ 
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(139,123,255,0.45) 0%, rgba(139,123,255,0.25) 40%, transparent 75%)',
          opacity: 0.5 * baseOpacity,
          transformOrigin: 'center center',
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? 'top-1/4 -right-40' : 'top-1/3 -right-48'} w-[800px] h-[800px] rounded-full blur-[180px] opacity-50 animate-aurora-slow`}
        style={{ 
          background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(192,132,252,0.35) 0%, rgba(192,132,252,0.15) 45%, transparent 80%)',
          opacity: 0.4 * baseOpacity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? '-bottom-40 left-1/3' : '-bottom-48 left-1/4'} w-[650px] h-[650px] rounded-full blur-[160px] opacity-40 animate-aurora-reverse`}
        style={{ 
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(168,85,247,0.3) 0%, rgba(168,85,247,0.1) 50%, transparent 80%)',
          opacity: 0.3 * baseOpacity,
        }}
      />
      
      {/* ===== Dynamic cursor-following aurora ===== */}
      <div
        className="absolute rounded-full blur-[200px] opacity-30 transition-all duration-700 ease-out pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          left: `${mousePos.x * 100}%`,
          top: `${mousePos.y * 100}%`,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(139,123,255,0.4) 0%, transparent 80%)',
          pointerEvents: 'none',
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

      {/* ===== Vignette - Deep, Cinematic ===== */}
      <div
        className="absolute inset-0"
        style={{ 
          background: 'radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%)',
          opacity: baseOpacity,
        }}
      />

      {/* ===== Top Vignette Accent ===== */}
      <div
        className="absolute top-0 left-0 right-0 h-[600px]"
        style={{ 
          background: 'radial-gradient(ellipse at top center, rgba(139,123,255,0.08) 0%, transparent 60%)',
          opacity: baseOpacity,
        }}
      />

      {/* ===== Noise Texture - Film Grain ===== */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundRepeat: 'repeat',
          backgroundSize: '180px',
          animation: 'noise-shift 0.2s steps(1) infinite',
        }}
      />

      {/* ===== Subtle Scanlines ===== */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 3px',
          opacity: 0.4 * baseOpacity,
          maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
        }}
      />

      <style jsx global>{`
        @keyframes noise-shift {
          0% { background-position: 0 0; }
          100% { background-position: 10px 10px; }
        }
      `}</style>
    </div>
  )
}