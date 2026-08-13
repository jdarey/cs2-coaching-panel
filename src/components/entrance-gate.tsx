'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Delays the dashboard's staggered entrance animations until after the
 * redirect overlay has finished (~2.5s), so the cards rise in visibly
 * instead of animating unseen behind the transition.
 *
 * Wrap the dashboard content in this component: while `delay` elapses the
 * `.entrance-gate` CSS class keeps every `.rise-in` child hidden, then
 * flips to `.entrance-open` and the existing per-card animation delays
 * (60ms, 120ms, 160ms, …) play in sequence.
 */
export function EntranceGate({
  children,
  delay = 2600,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return <div className={cn('entrance-gate', open && 'entrance-open', className)}>{children}</div>
}
