'use client'

/**
 * Ambient background — subtle teal aurora blobs drifting slowly.
 * No 3D shapes, no cursor-following glow, no particles: light, GPU-friendly
 * and matching the clean look of the reference site.
 */
export function AuroraBackground({
  variant = 'default',
  intensity = 1,
}: {
  variant?: 'default' | 'auth' | 'minimal'
  intensity?: number
}) {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
      {/* ===== Aurora blobs ===== */}
      <div
        className={`absolute ${variant === 'auth' ? '-top-32' : '-top-40 -left-32'} w-[700px] h-[700px] rounded-full blur-[120px] animate-aurora`}
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(47,182,162,0.35) 0%, rgba(47,182,162,0.14) 40%, transparent 75%)',
          opacity: 0.14 * intensity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? 'top-1/4 -right-40' : 'top-1/3 -right-48'} w-[800px] h-[800px] rounded-full blur-[120px] animate-aurora-slow`}
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(45,229,202,0.3) 0%, rgba(47,182,162,0.12) 45%, transparent 80%)',
          opacity: 0.09 * intensity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? '-bottom-40 left-1/3' : '-bottom-48 left-1/4'} w-[650px] h-[650px] rounded-full blur-[120px] animate-aurora-reverse`}
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(45,229,202,0.22) 0%, rgba(20,122,107,0.12) 50%, transparent 80%)',
          opacity: 0.06 * intensity,
        }}
      />
    </div>
  )
}
