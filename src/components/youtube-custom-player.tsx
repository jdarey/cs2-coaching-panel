'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useContentProtection } from './use-content-protection'
import { ContentProtectionOverlay } from './content-protection-overlay'

interface YoutubeCustomPlayerProps {
  videoId: string
  title?: string
  // Resume point (seconds) — the player starts here instead of 0.
  initialStartSeconds?: number
  // Called while watching (throttled to ~5s), on pause, on video end and on
  // unmount, so the page can persist the resume point to the server.
  onProgressChange?: (info: { position: number; duration: number; ended: boolean }) => void
}

// Volume persistence — the player remembers the user's volume and mute across
// sessions (localStorage). Applied on every player build so a reload never
// resets the volume to 100%.
const VOLUME_KEY = 'darey-player-volume'
const loadVolume = (): { volume: number; muted: boolean } => {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      const volume = typeof p?.volume === 'number' ? Math.min(100, Math.max(0, p.volume)) : 100
      return { volume, muted: !!p?.muted }
    }
  } catch (_) {}
  return { volume: 100, muted: false }
}
const saveVolume = (volume: number, muted: boolean) => {
  try { localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume, muted })) } catch (_) {}
}

// Native YouTube UI embed (controls: 1 — like watch2gether) with the app's
// protections on top: blocked capture shortcuts, DevTools detection with
// auto-pause, and the tab-hide warning. No watermark, no custom controls —
// quality, volume and fullscreen are YouTube's own, so the quality menu
// always works.
export function YoutubeCustomPlayer({
  videoId,
  title = 'Wideo',
  initialStartSeconds = 0,
  onProgressChange,
}: YoutubeCustomPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef     = useRef<any>(null)

  const [isApiReady, setIsApiReady] = useState(false)
  const [isPlaying,  setIsPlaying]  = useState(false)
  const [isEnded,    setIsEnded]    = useState(false)
  const [duration,   setDuration]   = useState(0)
  const [volume,     setVolume]     = useState(() => loadVolume().volume)
  const [isMuted,    setIsMuted]    = useState(() => loadVolume().muted)

  // Progress reporting (resume point). The latest position lives in a ref so
  // the pause/end/unmount flush always sends the freshest value, and the
  // callback ref avoids stale closures inside intervals and listeners.
  const onProgressRef = useRef(onProgressChange)
  useEffect(() => { onProgressRef.current = onProgressChange }, [onProgressChange])
  const latestPositionRef = useRef(initialStartSeconds || 0)
  const latestDurationRef = useRef(0)
  const lastSaveAtRef     = useRef(0)

  // Content protection (shared with the raw-embed wrapper): blocked capture
  // shortcuts, DevTools detection with auto-pause, and the tab-hide warning.
  // Absolute prevention of screen capture is impossible in a browser (OBS,
  // phone camera, hardware capture), but every technical path is blocked.
  const { devtoolsOpen, captureWarn } = useContentProtection({
    isPlaying,
    onDevtoolsOpen: () => {
      // Pause playback so nothing plays (and nothing can be captured) while
      // DevTools is open.
      const p = playerRef.current
      if (p && typeof p.pauseVideo === 'function') {
        try { p.pauseVideo() } catch (_) {}
      }
      setIsPlaying(false)
    },
  })

  // Reset on videoId change — resume from the persisted position.
  useEffect(() => {
    latestPositionRef.current = initialStartSeconds || 0
    latestDurationRef.current = 0
    lastSaveAtRef.current     = 0
    setIsPlaying(false)
    setIsEnded(false)
    setDuration(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  // Load YouTube IFrame API
  useEffect(() => {
    const win = window as any
    if (win.YT && win.YT.Player) { setIsApiReady(true); return }

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script')
      tag.id  = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.getElementsByTagName('script')[0].parentNode?.insertBefore(
        tag, document.getElementsByTagName('script')[0]
      )
    }
    const prev = (window as any).onYouTubeIframeAPIReady
    ;(window as any).onYouTubeIframeAPIReady = () => {
      if (prev) prev()
      window.dispatchEvent(new Event('youtube-api-ready'))
    }
    const onApiReady = () => setIsApiReady(true)
    window.addEventListener('youtube-api-ready', onApiReady)
    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) { setIsApiReady(true); clearInterval(interval) }
    }, 200)
    return () => { window.removeEventListener('youtube-api-ready', onApiReady); clearInterval(interval) }
  }, [])

  // Build the native-UI player. controls:1 hands the user YouTube's own
  // controls — the gear menu (quality), volume, fullscreen — exactly like
  // watch2gether, so the quality switch is YouTube's own and always works.
  // enablejsapi keeps progress/resume and the DevTools auto-pause working.
  useEffect(() => {
    if (!isApiReady) return
    const win = window as any
    if (!win.YT || !win.YT.Player) return

    if (playerRef.current) {
      try { playerRef.current.destroy() } catch (_) {}
      playerRef.current = null
    }
    const mountId = `yt-player-${videoId}`
    const mount = document.getElementById(mountId)
    if (!mount) return

    const startSec = initialStartSeconds || 0

    const applyPlayerState = (state: number, target: any) => {
      if (state === 1) {
        setIsPlaying(true); setIsEnded(false)
        const dur = target.getDuration?.() || 0
        if (dur > 0) { setDuration(dur); latestDurationRef.current = dur }
      } else if (state === 2) {
        setIsPlaying(false)
        // Flush the resume point on pause (user stops watching).
        onProgressRef.current?.({
          position: latestPositionRef.current,
          duration: latestDurationRef.current,
          ended: false,
        })
      } else if (state === 0) {
        setIsPlaying(false); setIsEnded(true)
        // Finished — persist 100% so the library marks it as watched.
        onProgressRef.current?.({
          position: latestDurationRef.current || latestPositionRef.current,
          duration: latestDurationRef.current,
          ended: true,
        })
      }
    }

    playerRef.current = new win.YT.Player(mountId, {
      videoId,
      playerVars: {
        autoplay: 0,
        // Native YouTube UI — controls, quality gear, fullscreen.
        controls:       1,
        fs:             1,
        disablekb:      0,
        modestbranding: 1,
        rel:            0,
        showinfo:       0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        cc_lang_pref: 'off',
        hl: 'pl',
        playsinline:    1,
        wmode:          'opaque',
        start:          startSec > 0 ? Math.floor(startSec) : undefined,
        color:          'white',
        loop:           0,
        enablejsapi:    1,
        origin:         window.location.origin,
        // No YouTube tracking cookies — the embed loads from youtube-nocookie.
        host:           'https://www.youtube-nocookie.com',
      },
      events: {
        onReady: (event: any) => {
          const readyDur = event.target.getDuration?.() || 0
          if (readyDur > 0) { setDuration(readyDur); latestDurationRef.current = readyDur }
          // Safety: if the resume point is beyond the real duration (e.g. a
          // different edit of the video), restart from 0 instead of erroring.
          if (readyDur > 0 && startSec > readyDur - 1) {
            latestPositionRef.current = 0
            try { event.target.seekTo(0) } catch (_) {}
          }
          // Apply the user's remembered volume/mute.
          const storedVol = loadVolume()
          try {
            event.target.setVolume(storedVol.volume)
            storedVol.muted ? event.target.mute() : event.target.unMute()
          } catch (_) {}
          setVolume(storedVol.volume)
          setIsMuted(storedVol.muted)
          // Force disable captions
          try {
            event.target.loadModule('captions')
            event.target.setOption('captions', 'track', { lang: 'off' })
          } catch (_) {}
        },
        onStateChange: (event: any) => applyPlayerState(event.data, event.target),
      },
    })

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch (_) {}
        playerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiReady, videoId])

  // Progress polling — reports to the parent (throttled to ~5s) so the resume
  // point is persisted while watching.
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && playerRef.current?.getCurrentTime) {
      interval = setInterval(() => {
        if (!playerRef.current?.getCurrentTime) return
        const pos = playerRef.current.getCurrentTime()
        const dur = playerRef.current.getDuration?.() || 0
        latestPositionRef.current = pos
        if (dur > 0) latestDurationRef.current = dur
        const now = Date.now()
        if (now - lastSaveAtRef.current >= 5000) {
          lastSaveAtRef.current = now
          onProgressRef.current?.({ position: pos, duration: dur || latestDurationRef.current, ended: false })
        }
      }, 1000)
    }
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  // Unmount flush — persist the latest position when leaving the page.
  useEffect(() => {
    return () => {
      if (latestPositionRef.current > 0 && latestDurationRef.current > 0) {
        onProgressRef.current?.({
          position: latestPositionRef.current,
          duration: latestDurationRef.current,
          ended: false,
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      title={title}
    >
      {/* Native YouTube player — full 1:1, edge to edge. YouTube's own UI
          (controls, quality gear, fullscreen) is fully interactive. */}
      <div className="absolute inset-0">
        <div id={`yt-player-${videoId}`} className="w-full h-full" />
      </div>

      {/* CONTENT PROTECTION — DevTools blocker and capture-warning toast
          (shared layer, same as the raw-embed wrapper). No watermark. */}
      <ContentProtectionOverlay devtoolsOpen={devtoolsOpen} captureWarn={captureWarn} />

      {/* Hidden volume/mute persistence touchpoints are managed through the
          player API above; nothing custom renders over the video. */}
    </div>
  )
}
