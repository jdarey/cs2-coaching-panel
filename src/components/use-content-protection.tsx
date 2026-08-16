'use client'

import { useEffect, useRef, useState } from 'react'

export interface WatermarkPos { x: number; y: number; rot: number }

interface UseContentProtectionOptions {
  // Whether the video is currently playing — used to warn on tab-hide.
  isPlaying?: boolean
  // Called the moment docked DevTools is detected (pause the player, etc.).
  onDevtoolsOpen?: () => void
}

export function useContentProtection(opts: UseContentProtectionOptions = {}) {
  const { isPlaying = false, onDevtoolsOpen } = opts

  const [watermarkPos, setWatermarkPos] = useState<WatermarkPos>({ x: 4, y: 82, rot: -8 })
  const [devtoolsOpen, setDevtoolsOpen] = useState(false)
  const [captureWarn, setCaptureWarn] = useState(false)
  const toastRef = useRef<NodeJS.Timeout | null>(null)

  // Keep the latest callback without re-binding the interval below.
  const onDevtoolsOpenRef = useRef(onDevtoolsOpen)
  onDevtoolsOpenRef.current = onDevtoolsOpen

  const flashCaptureWarn = (ms = 3000) => {
    setCaptureWarn(true)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setCaptureWarn(false), ms)
  }

  // Block the shortcuts that expose the stream: F12 / Ctrl+Shift+I/J/C
  // (DevTools), Ctrl+U (source), Ctrl+S (save page), Ctrl+P (print),
  // PrintScreen / Alt+PrintScreen (capture). F12 and the print-screen keys
  // also flash a warning so the user knows it is watched.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      if (e.key === 'F12') { e.preventDefault(); flashCaptureWarn(); return }
      if (e.key === 'PrintScreen') { e.preventDefault(); flashCaptureWarn(); return }
      if (ctrl && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); flashCaptureWarn(); return }
      if (ctrl && (k === 'u' || k === 's' || k === 'p')) { e.preventDefault(); return }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect an open DevTools panel (docked) via the classic outer-vs-inner
  // size delta. Real docked DevTools steals a lot of space on EXACTLY ONE
  // side (right: w large / h small, bottom: h large / w small). Requiring the
  // other dimension to stay near-normal avoids false positives (browser zoom,
  // embedded webviews, which inflate both).
  useEffect(() => {
    const interval = setInterval(() => {
      const ow = window.outerWidth, ih = window.innerHeight, iw = window.innerWidth, oh = window.outerHeight
      if (ow <= 0 || oh <= 0) return
      const w = ow - iw, h = oh - ih
      const open = (w > 160 && h < 120) || (h > 160 && w < 120)
      if (open === devtoolsOpen) return
      setDevtoolsOpen(open)
      if (open) onDevtoolsOpenRef.current?.()
    }, 1500)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devtoolsOpen])

  // The identity watermark drifts slowly between spots so a recording can't
  // simply crop a static corner.
  useEffect(() => {
    const spots: WatermarkPos[] = [
      { x: 4, y: 82, rot: -8 },
      { x: 12, y: 10, rot: 6 },
      { x: 78, y: 84, rot: 10 },
      { x: 72, y: 8, rot: -6 },
      { x: 40, y: 88, rot: 4 },
      { x: 30, y: 6, rot: -4 },
    ]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % spots.length
      setWatermarkPos(spots[i])
    }, 40000)
    return () => clearInterval(interval)
  }, [])

  // Warn when the tab is hidden while the video plays (a common screen-
  // recording setup). The video keeps playing; the toast reminds the viewer
  // that their identity is burned into the frame.
  useEffect(() => {
    if (!isPlaying) return
    const onVis = () => {
      if (document.hidden) flashCaptureWarn(7000)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  return { watermarkPos, devtoolsOpen, captureWarn, flashCaptureWarn }
}
