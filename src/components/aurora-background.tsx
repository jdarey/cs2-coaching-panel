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
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(139,92,246,0.38) 0%, rgba(139,92,246,0.16) 40%, transparent 75%)',
          opacity: 0.16 * intensity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? 'top-1/4 -right-40' : 'top-1/3 -right-48'} w-[800px] h-[800px] rounded-full blur-[120px] animate-aurora-slow`}
        style={{
          background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(167,139,250,0.32) 0%, rgba(139,92,246,0.13) 45%, transparent 80%)',
          opacity: 0.1 * intensity,
        }}
      />
      <div
        className={`absolute ${variant === 'auth' ? '-bottom-40 left-1/3' : '-bottom-48 left-1/4'} w-[650px] h-[650px] rounded-full blur-[120px] animate-aurora-reverse`}
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(167,139,250,0.24) 0%, rgba(109,40,217,0.13) 50%, transparent 80%)',
          opacity: 0.07 * intensity,
        }}
      />
    </div>
  )
}
