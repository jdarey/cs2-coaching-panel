'use client'

import { useEffect, useRef, useState } from 'react'
import { useContentProtection } from './use-content-protection'
import { ContentProtectionOverlay } from './content-protection-overlay'

interface ProtectedEmbedProps {
  src: string
  title: string
  studentName?: string
  studentEmail?: string
  // Vimeo origin — used for the pause command and playing-state tracking.
  // Defaults to Vimeo, which is the only raw embed used by the app.
  embedOrigin?: string
}

// Wraps a raw <iframe> embed (Vimeo, generic) with the same protection as the
// YouTube player: identity watermark, blocked shortcuts, DevTools detection
// with auto-pause, and the tab-hide warning. Playing state is tracked through
// the embed's postMessage events so the tab-hide warning only fires while the
// video actually plays.
export function ProtectedEmbed({
  src,
  title,
  studentName = 'Uczeń',
  studentEmail,
  embedOrigin = 'https://player.vimeo.com',
}: ProtectedEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const { watermarkPos, devtoolsOpen, captureWarn } = useContentProtection({
    isPlaying,
    onDevtoolsOpen: () => {
      setIsPlaying(false)
      // Pause the embed when DevTools opens so nothing plays (and nothing can
      // be captured) while the panel is open.
      try {
        iframeRef.current?.contentWindow?.postMessage({ method: 'pause' }, embedOrigin)
      } catch (_) {}
    },
  })

  // Track play/pause from the embed's postMessages (Vimeo emits
  // {event:'playing'|'pause'|'ended'}). No SDK needed.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== embedOrigin) return
      const d = e.data
      if (!d || typeof d !== 'object') return
      if (d.event === 'playing') setIsPlaying(true)
      else if (d.event === 'pause' || d.event === 'ended') setIsPlaying(false)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [embedOrigin])

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
      <ContentProtectionOverlay
        studentName={studentName}
        studentEmail={studentEmail}
        watermarkPos={watermarkPos}
        devtoolsOpen={devtoolsOpen}
        captureWarn={captureWarn}
      />
    </div>
  )
}
