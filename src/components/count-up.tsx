'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animated number — counts from 0 to `value` with an ease-out curve when it
 * enters the viewport. Re-runs when `value` changes.
 */
export function CountUp({ value, duration = 1200, className }: { value: number; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const run = () => {
      if (started.current) return
      started.current = true
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 4)
        setDisplay(Math.round(value * eased))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) run()
      },
      { threshold: 0.3 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [value, duration])

  useEffect(() => {
    started.current = false
    setDisplay(0)
  }, [value])

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('pl-PL')}
    </span>
  )
}
