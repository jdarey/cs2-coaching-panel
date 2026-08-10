'use client'

import { useCallback, useRef, type ReactNode, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tilt3D — tilts a card in 3D toward the cursor.
 *
 * - `className` lands on the tilting element (the card itself), so card
 *   styling, rounded corners and hover shadows work on the element that moves.
 * - `wrapperClassName` / `wrapperStyle` land on the perspective stage, which
 *   is the right place for entrance animations (rise-in, animate-enter-3d)
 *   because they animate `transform` and would otherwise fight the tilt.
 * - Children can use `.layer-1/.layer-2/.layer-3` to pop toward the viewer.
 */
export function Tilt3D({
  children,
  className,
  wrapperClassName,
  wrapperStyle,
  maxTilt = 8,
  scale = 1.015,
  glare = true,
  style,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  wrapperClassName?: string
  wrapperStyle?: CSSProperties
  /** Max tilt angle in degrees (default 8) */
  maxTilt?: number
  /** Hover scale (default 1.015) */
  scale?: number
  /** Render the specular glare overlay (default true) */
  glare?: boolean
  style?: CSSProperties
  as?: 'div' | 'article' | 'li'
}) {
  const ref = useRef<HTMLElement | null>(null)

  const handleMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const ry = (px - 0.5) * 2 * maxTilt
      const rx = (0.5 - py) * 2 * maxTilt
      el.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
      el.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
      el.style.setProperty('--tx', `${px * 100}%`)
      el.style.setProperty('--ty', `${py * 100}%`)
    },
    [maxTilt]
  )

  const handleLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }, [])

  return (
    <div className={cn('scene-3d', wrapperClassName)} style={wrapperStyle}>
      <Tag
        ref={ref as any}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={cn('tilt-3d relative', className)}
        style={{ ...style, transform: `rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) scale(${scale})` }}
      >
        {children}
        {glare && (
          <span
            className="glare-3d"
            style={{
              background: `radial-gradient(600px circle at var(--tx, 50%) var(--ty, 50%), rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 30%, transparent 60%)`,
            }}
            aria-hidden
          />
        )}
      </Tag>
    </div>
  )
}
