'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Loader2, Captions, CaptionsOff, Settings } from 'lucide-react'
import { useContentProtection } from './use-content-protection'
import { ContentProtectionOverlay } from './content-protection-overlay'

interface YoutubeCustomPlayerProps {
  videoId: string
  title?: string
  watermark?: string
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

const QUALITY_LABELS: Record<string, string> = {
  auto: 'Auto',
  tiny: '144p',
  small: '240p',
  medium: '360p',
  large: '480p',
  hd720: '720p',
  hd1080: '1080p',
  hd1440: '1440p',
  hd2160: '4K',
  highres: '4K',
}
const QUALITY_ORDER = ['hd2160', 'hd1440', 'highres', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny', 'auto']

// Quality — default auto (ABR) adapts to user's connection, but we force high then allow user to change
const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function YoutubeCustomPlayer({
  videoId,
  title = 'Wideo',
  watermark,
  initialStartSeconds = 0,
  onProgressChange,
}: YoutubeCustomPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef     = useRef<any>(null)

  const [isApiReady,   setIsApiReady]   = useState(false)
  const [isReady,      setIsReady]      = useState(false)
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [isBuffering,  setIsBuffering]  = useState(false)
  const [isEnded,      setIsEnded]      = useState(false)
  const [hasPlayed,    setHasPlayed]    = useState(false)
  const [currentTime,  setCurrentTime]  = useState(initialStartSeconds || 0)
  const [duration,     setDuration]     = useState(0)
  const [volume,       setVolume]       = useState(() => loadVolume().volume)
  const [isMuted,      setIsMuted]      = useState(() => loadVolume().muted)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [captionsOn, setCaptionsOn] = useState(false)
  const [showControls, setShowControls]  = useState(true)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto'])
  const [currentQuality, setCurrentQuality] = useState<string>('auto')
  const [playerScale, setPlayerScale] = useState(0.5)
  // Opaque pre-play poster (the video's own thumbnail) so nothing YouTube
  // draws behind it — thumbnail, watermark, play button — is ever visible
  // before the student starts watching.
  const [thumbSrc, setThumbSrc] = useState(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)

  const isPlayingRef     = useRef(false)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
  }, [])
  const intendPlayRef     = useRef(false)
  const resumeAttemptsRef = useRef(0)

  // Progress reporting (resume point). The latest position lives in a ref so
  // the pause/end/unmount flush always sends the freshest value, and the
  // callback ref avoids stale closures inside intervals and listeners.
  const onProgressRef = useRef(onProgressChange)
  useEffect(() => { onProgressRef.current = onProgressChange }, [onProgressChange])
  const latestPositionRef = useRef(initialStartSeconds || 0)
  const latestDurationRef = useRef(0)
  const lastSaveAtRef     = useRef(0)
  // Duration fetch guard - only fetch once when player becomes ready
  const durationFetchedRef = useRef(false)

  // Content protection (shared with the raw-embed wrapper): blocked capture
  // shortcuts, DevTools detection with auto-pause, and the tab-hide warning.
  // Absolute prevention of screen capture is impossible in a browser (OBS,
  // phone camera, hardware capture), but every technical path is blocked.
  const { devtoolsOpen, captureWarn } = useContentProtection({
    isPlaying,
    onDevtoolsOpen: () => {
      const p = playerRef.current
      if (p && typeof p.pauseVideo === 'function') {
        try { p.pauseVideo() } catch (_) {}
      }
      setIsPlaying(false)
      isPlayingRef.current = false
      intendPlayRef.current = false
    },
  })

  // Player scale: YT ABR picks quality by player size (setPlaybackQuality no-op since Oct 2019). For 800px container 1080p wystarczy, 4K to overkill i YT po ~20s downgrade'uje do 720p zeby oszczedzic transfer (stad psucie po 23s). Renderujemy 1920x1080 w normalnym widoku (1080p) i dopiero w fullscreen 3840.
  useEffect(() => {
    const updateScale = () => {
      const el = containerRef.current
      if (!el) return
      const targetWidth = isFullscreen ? 3840 : 1920
      const scale = el.clientWidth / targetWidth
      setPlayerScale(Math.min(1, scale))
      el.style.setProperty('--player-scale', String(scale))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [isReady, videoId, isFullscreen])

  // Reset on videoId change — resume from the persisted position.
  useEffect(() => {
    latestPositionRef.current = initialStartSeconds || 0
    latestDurationRef.current = 0
    lastSaveAtRef.current     = 0
    durationFetchedRef.current = false
    setCurrentTime(initialStartSeconds || 0)
    setIsPlaying(false); isPlayingRef.current = false
    setIsEnded(false)
    setHasPlayed(false)
    setDuration(0)
    setShowControls(true)
    setThumbSrc(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
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

  const applyPlayerState = useCallback((state: number, target: any) => {
    if (state === 1) {
      setIsPlaying(true); isPlayingRef.current = true
      setIsBuffering(false); setIsEnded(false)
      setHasPlayed(true)
      // Get duration on play start (some videos only report duration after playback begins)
      const dur = target.getDuration?.() || 0
      if (dur > 0) { setDuration(dur); latestDurationRef.current = dur }
      clearRetry()
    } else if (state === 2) {
      // YouTube sometimes stops an API-started video a few seconds in (see
      // intendPlayRef note above). If the user still wants playback and it
      // wasn't a deliberate pause, nudge it back on — capped attempts so we
      // never fight indefinitely.
      if (intendPlayRef.current && resumeAttemptsRef.current < 3) {
        resumeAttemptsRef.current++
        setTimeout(() => {
          if (intendPlayRef.current && !isPlayingRef.current) {
            const pp = playerRef.current
            if (pp && typeof pp.playVideo === 'function') {
              try { pp.playVideo() } catch (_) {}
            }
          }
        }, 800)
      }
      setIsPlaying(false); isPlayingRef.current = false
      setIsBuffering(false)
      // Flush the resume point on pause (user stops watching).
      onProgressRef.current?.({
        position: latestPositionRef.current,
        duration: latestDurationRef.current,
        ended: false,
      })
    } else if (state === 3) {
      setIsBuffering(true)
    } else if (state === 0) {
      setIsPlaying(false); isPlayingRef.current = false
      setIsBuffering(false); setIsEnded(true)
      intendPlayRef.current = false
      setShowControls(true)
      // Finished — persist 100% so the library marks it as watched.
      onProgressRef.current?.({
        position: latestDurationRef.current || latestPositionRef.current,
        duration: latestDurationRef.current,
        ended: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build the chromeless player. controls:0 hides EVERYTHING YouTube draws —
  // title bar, gear menu, logo, share, watermark. disablekb keeps its
  // keyboard shortcuts inert and fs:0 disables its own fullscreen. Playback
  // is driven entirely by our own controls below.
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

      playerRef.current = new win.YT.Player(mountId, {
      videoId,
      width: 1920,
      height: 1080,
      playerVars: {
        autoplay:       0,
        controls:       0,
        disablekb:      1,
        fs:             1,
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
        vq:             'hd1080',
        color:          'white',
        loop:           0,
        enablejsapi:    1,
        origin:         window.location.origin,
        host:           'https://www.youtube-nocookie.com',
      },
      events: {
        onReady: (event: any) => {
            // Override the iframe title — YouTube sets it to the real video
            // title, which leaks out of the chromeless player (screen readers,
            // tooltips). Ours says what it is: a training video. (The API
            // already grants the frame autoplay permission itself.)
            try {
              containerRef.current?.querySelectorAll('iframe').forEach((f: HTMLIFrameElement) => {
                f.title = 'Wideo treningowe'
                f.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture')
                f.setAttribute('allowFullscreen', '')
                // @ts-ignore
                f.allowFullscreen = true
              })
            } catch (_) {}
            setIsReady(true)
            // Get duration on ready - this is the most reliable moment
            const readyDur = event.target.getDuration?.() || 0
            if (readyDur > 0) { 
              setDuration(readyDur); 
              latestDurationRef.current = readyDur 
              durationFetchedRef.current = true
            }
            // Safety: if the resume point is beyond the real duration (e.g. a
            // different edit of the video), restart from 0 instead of erroring.
            if (readyDur > 0 && startSec > readyDur - 1) {
              latestPositionRef.current = 0
              setCurrentTime(0)
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
            // Force disable captions + hide YT layout (no CC, no endscreen)
            try {
              event.target.unloadModule('captions')
              event.target.loadModule('captions')
              event.target.setOption('captions', 'track', {})
              event.target.setOption('captions', 'track', { lang: 'off' })
              event.target.setOption('cc', 'track', {})
            } catch (_) {}
            // Quality: force highest available (4K) by default — 99% filmów ma 4K, ABR i tak wybierze max na podstawie rozmiaru 3840
            try {
              const avail: string[] = event.target.getAvailableQualityLevels?.() || []
              if (avail.length) {
                setAvailableQualities(avail)
                const preferred = ['hd2160', 'hd1440', 'highres', 'hd1080', 'hd720', 'large'].find((q) => avail.includes(q)) || avail[0]
                if (preferred && preferred !== 'auto') {
                  try { event.target.setPlaybackQuality(preferred); event.target.setPlaybackQualityRange?.(preferred, preferred) } catch {}
                  setCurrentQuality(preferred)
                }
              } else {
                // Fallback: try highres (4K) directly, YT will pick closest
                try { event.target.setPlaybackQuality('highres') } catch {}
                setCurrentQuality('highres')
              }
            } catch (_) {}
          },
        onStateChange: (event: any) => applyPlayerState(event.data, event.target),
        onPlaybackQualityChange: (event: any) => {
          try { setCurrentQuality(event.data) } catch {}
          try {
            const avail: string[] = event.target.getAvailableQualityLevels?.() || []
            if (avail.length) setAvailableQualities(avail)
            // Enforce highest (4K) if YT auto-downgraded after ~8s (znany bug ABR - github morphe-patches#667)
            const desired = (['hd2160', 'hd1440', 'highres', 'hd1080'].find((q) => avail.includes(q)) || 'highres') as string
            if (event.data !== desired && ['highres', 'hd2160', 'hd1440'].includes(desired)) {
              setTimeout(() => {
                try { event.target.setPlaybackQuality(desired); (event.target as any).setPlaybackQualityRange?.(desired, desired) } catch {}
              }, 500)
            }
          } catch {}
        },
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

  // Time polling — keeps the seek bar in sync AND reports progress to the
  // parent (throttled to ~5s) so the resume point is persisted while watching.
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    
    if (isPlaying) {
      // Playing: poll position and duration every 500ms
      interval = setInterval(() => {
        const p = playerRef.current
        if (!p || typeof p.getCurrentTime !== 'function') return
        const pos = p.getCurrentTime()
        const dur = p.getDuration?.() || 0
        latestPositionRef.current = pos
        setCurrentTime(pos)
        // Update duration if we get a valid one (some videos report duration only after playback starts)
        if (dur > 0 && dur !== latestDurationRef.current) {
          latestDurationRef.current = dur
          setDuration(dur)
        }
        const now = Date.now()
        if (now - lastSaveAtRef.current >= 5000) {
          lastSaveAtRef.current = now
          onProgressRef.current?.({ position: pos, duration: dur || latestDurationRef.current, ended: false })
        }
      }, 500)
    } else if (isReady && !durationFetchedRef.current) {
      // Player ready but duration not yet fetched: poll once per second for up to 10s
      let attempts = 0
      interval = setInterval(() => {
        const p = playerRef.current
        if (!p || typeof p.getDuration !== 'function') return
        const dur = p.getDuration() || 0
        if (dur > 0) {
          setDuration(dur)
          latestDurationRef.current = dur
          durationFetchedRef.current = true
          if (interval) clearInterval(interval)
        } else if (++attempts >= 10) {
          // Give up after 10 seconds - duration unavailable (private/unplayable video)
          if (interval) clearInterval(interval)
        }
      }, 1000)
    }
    
    return () => { if (interval) clearInterval(interval) }
  }, [isPlaying, isReady])

  // Enforce highest quality (4K) while playing — YT ABR downgrades after ~8s (morphe-patches#667), setPlaybackQuality is no-op but setPlaybackQualityRange + periodic re-apply helps
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      const p: any = playerRef.current
      if (!p || typeof p.getPlaybackQuality !== 'function') return
      try {
        const cur: string = p.getPlaybackQuality()
        const avail: string[] = p.getAvailableQualityLevels?.() || []
        const desired = (['hd2160', 'hd1440', 'highres', 'hd1080'].find((q) => avail.includes(q)) || 'highres') as string
        if (cur !== desired && avail.includes(desired)) {
          p.setPlaybackQuality(desired)
          try { p.setPlaybackQualityRange?.(desired, desired) } catch {}
        }
      } catch {}
    }, 3000)
    return () => clearInterval(id)
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

  // Fullscreen tracking (our own button uses the container's requestFullscreen).
  useEffect(() => {
    const onFs = () => {
      const doc: any = document
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement))
    }
    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('webkitfullscreenchange', onFs)
    document.addEventListener('mozfullscreenchange', onFs)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('webkitfullscreenchange', onFs)
      document.removeEventListener('mozfullscreenchange', onFs)
    }
  }, [])

  // Fullscreen: use 3840 for 4K, normal 1920 for 1080p (prevents ABR downgrade after 20s on small display)
  useEffect(() => {
    const el = containerRef.current?.querySelector(`#yt-player-${videoId}`) as HTMLElement | null
    const iframe = el?.querySelector('iframe') as HTMLElement | null
    const target = (iframe as any) || el
    if (!target) return
    if (isFullscreen) {
      target.style.width = '3840px'
      target.style.height = '2160px'
      ;(target.style as any).transform = `scale(${playerScale})`
      ;(target.style as any).transformOrigin = 'top left'
    } else {
      target.style.width = '1920px'
      target.style.height = '1080px'
      ;(target.style as any).transform = `scale(${playerScale})`
      ;(target.style as any).transformOrigin = 'top left'
    }
  }, [isFullscreen, playerScale, videoId])

  // When entering fullscreen switch to 4K, when leaving back to 1080p (prevents downgrade after 23s on small container)
  useEffect(() => {
    const p: any = playerRef.current
    if (!p || typeof p.setSize !== 'function') return
    try {
      if (isFullscreen) {
        p.setSize(3840, 2160)
        try { p.setPlaybackQuality('highres'); p.setPlaybackQualityRange?.('highres', 'highres') } catch {}
      } else {
        p.setSize(1920, 1080)
        try { p.setPlaybackQuality('hd1080'); p.setPlaybackQualityRange?.('hd1080', 'hd1080') } catch {}
      }
    } catch {}
  }, [isFullscreen])

  // Controls auto-hide while playing.
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) setShowControls(false)
    }, 2600)
  }, [])
  useEffect(() => () => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
  }, [])

  // ---- Playback actions (all guarded — the player may not be ready yet) ----
  const togglePlay = () => {
    const p = playerRef.current
    if (!p || typeof p.playVideo !== 'function') return
    if (isEnded) {
      setIsEnded(false); setHasPlayed(true)
      setCurrentTime(0); latestPositionRef.current = 0
      try { p.seekTo(0, true) } catch (_) {}
    }
    if (isPlaying) {
      try { p.pauseVideo() } catch (_) {}
      clearRetry()
      intendPlayRef.current = false
    } else {
      intendPlayRef.current = true
      resumeAttemptsRef.current = 0
      try { p.playVideo() } catch (_) {}
      // The first playVideo after a cold load can be silently swallowed by
      // YouTube (buffering → unstarted, no state 1). If playback hasn't
      // started within 1.5s, call playVideo again — the second call plays.
      clearRetry()
      retryTimerRef.current = setTimeout(() => {
        if (!isPlayingRef.current) {
          const pp = playerRef.current
          if (pp && typeof pp.playVideo === 'function') {
            try { pp.playVideo() } catch (_) {}
          }
        }
      }, 1500)
    }
    resetControlsTimer()
  }
  const toggleMute = () => {
    const p = playerRef.current
    if (!p) return
    const muted = !isMuted
    setIsMuted(muted)
    try {
      if (typeof p.mute === 'function' && typeof p.unMute === 'function') {
        muted ? p.mute() : p.unMute()
      }
    } catch (_) {}
    saveVolume(volume, muted)
    resetControlsTimer()
  }
  const handleVolumeChange = (v: number) => {
    const p = playerRef.current
    setVolume(v)
    if (v === 0) {
      setIsMuted(true)
      if (p && typeof p.mute === 'function') { try { p.mute() } catch (_) {} }
    } else {
      setIsMuted(false)
      if (p && typeof p.unMute === 'function') { try { p.unMute() } catch (_) {} }
      if (p && typeof p.setVolume === 'function') { try { p.setVolume(v) } catch (_) {} }
    }
    saveVolume(v, v === 0)
    resetControlsTimer()
  }
  const handleSeekChange = (v: number) => {
    const p = playerRef.current
    setCurrentTime(v)
    latestPositionRef.current = v
    if (p && typeof p.seekTo === 'function') {
      try { p.seekTo(v, true) } catch (_) {}
    }
    resetControlsTimer()
  }
  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    const doc: any = document
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement)
    if (isFs) {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen
      if (exit) void exit.call(document).catch(() => {})
    } else {
      const req = (el as any).requestFullscreen || (el as any).webkitRequestFullscreen || (el as any).mozRequestFullScreen || (el as any).msRequestFullscreen
      if (req) void req.call(el).catch(() => {})
    }
    resetControlsTimer()
  }
  const toggleCaptions = () => {
    const p = playerRef.current
    if (!p) return
    const next = !captionsOn
    setCaptionsOn(next)
    try {
      if (next) {
        p.loadModule('captions')
        p.setOption('captions', 'track', { languageCode: 'pl' })
      } else {
        p.unloadModule('captions')
        p.setOption('captions', 'track', {})
      }
    } catch {}
    resetControlsTimer()
  }
  const handleQualityChange = (q: string) => {
    const p = playerRef.current
    if (!p) return
    setCurrentQuality(q)
    setShowQualityMenu(false)
    try {
      if (q === 'auto') {
        // Let YT ABR decide
        try { p.setPlaybackQuality('auto'); p.setPlaybackQualityRange?.('auto', 'auto') } catch {}
      } else {
        p.setPlaybackQuality(q)
        // Pin to chosen quality so YT doesn't auto-downgrade immediately
        try { p.setPlaybackQualityRange?.(q, q) } catch {}
      }
    } catch {}
    resetControlsTimer()
  }

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()}
      // Never let the iframe be dragged out to a new tab (a drag off the
      // player opens the raw YouTube page), nor opened via middle-click.
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onAuxClick={(e) => { if (e.button === 1) e.preventDefault() }}
      onCopy={(e) => e.preventDefault()}
      onMouseMove={resetControlsTimer}
    >
      {/* Chromeless YouTube player — controls:0 hides YT UI. For >1080p (4K) YT ignores setPlaybackQuality since 2019 — ABR picks quality based on player size. We render at 1920x1080 (3840 on retina) and scale down so YT picks high quality; in fullscreen use 100% to fill screen. */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          id={`yt-player-${videoId}`}
          style={
            isFullscreen
              ? { width: '3840px', height: '2160px', transform: `scale(${playerScale})`, transformOrigin: 'top left' }
              : { width: '1920px', height: '1080px', transform: `scale(${playerScale})`, transformOrigin: 'top left' }
          }
        />
      </div>

      {/* Click surface — the whole video toggles play/pause (double-click:
          fullscreen). Sits above the iframe so no YT hit-area can appear. */}
      <div
        className="absolute inset-0 z-30 cursor-pointer"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Before first play — an OPAQUE poster (the video's own thumbnail),
          so YouTube's thumbnail chrome, watermark and center play button
          inside the iframe are never visible. Our play mark and resume chip
          sit on top. */}
      {!hasPlayed && !isEnded && (
        <div className="absolute inset-0 z-40 overflow-hidden pointer-events-none" aria-hidden>
          <img
            src={thumbSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
            onError={() => {
              if (thumbSrc.includes('maxresdefault')) setThumbSrc(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-black/60 border border-white/20 text-[#a78bfa] grid place-items-center backdrop-blur-md shadow-2xl shadow-black/80">
              <Play className="w-8 h-8 fill-current ml-1.5" />
            </div>
          </div>
          {initialStartSeconds > 0 && (
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white bg-black/60 ring-1 ring-white/20 backdrop-blur-md shadow-lg">
                <RotateCcw className="w-3 h-3 text-[#a78bfa]" />
                Wznawiasz od {formatTime(initialStartSeconds)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cover YT UI — title bar, share, big center play/pause, watermark — also when playing (central pause i udostepnienie w rogu) */}
      {hasPlayed && !isEnded && (
        <div className="absolute inset-0 z-35 pointer-events-none select-none" aria-hidden>
          <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {!isPlaying && (
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white/70 bg-black/40 ring-1 ring-white/10 backdrop-blur">
                <Pause className="w-3 h-3 text-[#a78bfa]" />
                Pauza
              </span>
            </div>
          )}
        </div>
      )}

      {/* Buffering — cover YouTube's spinner with our own. */}
      {isBuffering && !isEnded && (
        <div className="absolute inset-0 z-35 flex items-center justify-center bg-black/50 pointer-events-none">
          <Loader2 className="w-10 h-10 text-[#a78bfa] animate-spin" />
        </div>
      )}

      {/* End screen — covers YouTube's endscreen. */}
      {isEnded && (
        <div className="absolute inset-0 z-45 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center px-6 transition-all duration-500">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] grid place-items-center text-[#a78bfa]">
            <RotateCcw className="w-8 h-8" />
          </div>
          <h3 className="text-white font-bold text-lg max-w-md">{title}</h3>
          <p className="text-white/40 text-xs max-w-sm">Wideo dobiegło końca. Możesz obejrzeć je ponownie.</p>
          <button
            onClick={togglePlay}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-black bg-[#a78bfa] hover:bg-[#8b5cf6] transition-all duration-300 cursor-pointer"
          >
            Odtwórz ponownie
          </button>
        </div>
      )}

      {/* CONTENT PROTECTION — DevTools blocker and capture-warning toast */}
      <ContentProtectionOverlay devtoolsOpen={devtoolsOpen} captureWarn={captureWarn} />

      {/* Premium corner watermark only — no large diagonal */}
      {watermark && (
        <div className="absolute bottom-2 right-2 z-30 pointer-events-none select-none">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-[10px] font-medium tracking-wider text-white/35">
            <span className="w-1 h-1 rounded-full bg-white/25" />
            {watermark}
          </span>
        </div>
      )}

      {/* Our controls bar — slim, subtle; no big black slab, no quality menu. */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 px-4 pb-2.5 pt-2 bg-gradient-to-t from-black/75 via-black/35 to-transparent transition-all duration-300 ease-out flex flex-col gap-1.5 select-none ${
          showControls || !isPlaying || isEnded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        } ${!hasPlayed ? 'opacity-0 pointer-events-none' : ''}`}
      >
        {/* Progress */}
        <div className="relative flex items-center w-full">
          <input
            type="range" min={0} max={duration || 100} value={Math.min(currentTime, duration || 100)}
            onChange={(e) => handleSeekChange(Number(e.target.value))}
            aria-label="Postęp"
            className="w-full h-1 rounded-lg appearance-none cursor-pointer outline-none bg-white/10 transition-all duration-300 hover:h-1.5 focus:outline-none"
            style={{ background: `linear-gradient(to right,#a78bfa 0%,#a78bfa ${progressPct}%,rgba(255,255,255,0.15) ${progressPct}%,rgba(255,255,255,0.15) 100%)` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-[#a78bfa] transition-colors outline-none cursor-pointer" title={isPlaying ? 'Pauza' : 'Odtwórz'} aria-label={isPlaying ? 'Pauza' : 'Odtwórz'}>
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-[#a78bfa] transition-colors outline-none cursor-pointer" title={isMuted ? 'Odcisz' : 'Wycisz'} aria-label={isMuted ? 'Odcisz' : 'Wycisz'}>
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range" min={0} max={100} value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                aria-label="Głośność"
                className="w-0 group-hover/volume:w-16 h-1 rounded-lg appearance-none cursor-pointer outline-none bg-white/15 transition-all duration-300 focus:outline-none hover:h-1.5 opacity-0 group-hover/volume:opacity-100"
                style={{ background: `linear-gradient(to right,#a78bfa 0%,#a78bfa ${isMuted ? 0 : volume}%,rgba(255,255,255,0.15) ${isMuted ? 0 : volume}%,rgba(255,255,255,0.15) 100%)` }}
              />
            </div>

            <span className="text-[11px] font-medium text-white/70 select-none">
              {formatTime(currentTime)} <span className="text-white/30">/</span> {formatTime(duration)}
            </span>
            <button onClick={toggleCaptions} className={`text-white hover:text-[#a78bfa] transition-colors outline-none cursor-pointer ${captionsOn ? 'text-[#a78bfa]' : ''}`} title={captionsOn ? 'Wyłącz napisy' : 'Włącz napisy'} aria-label={captionsOn ? 'Wyłącz napisy' : 'Włącz napisy'}>
              {captionsOn ? <Captions className="w-5 h-5" /> : <CaptionsOff className="w-5 h-5 opacity-60" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowQualityMenu((v) => !v)} className={`text-white hover:text-[#a78bfa] transition-colors outline-none cursor-pointer ${showQualityMenu ? 'text-[#a78bfa]' : ''}`} title={`Jakość: ${QUALITY_LABELS[currentQuality] || currentQuality}`} aria-label="Jakość wideo">
                <Settings className="w-5 h-5" />
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-8 right-0 min-w-[130px] rounded-xl overflow-hidden bg-black/90 backdrop-blur-md border border-white/10 shadow-xl z-50">
                  <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 border-b border-white/5">Jakość</div>
                  {QUALITY_ORDER.filter((q) => q === 'auto' || availableQualities.includes(q)).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQualityChange(q)}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${currentQuality === q ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                      {QUALITY_LABELS[q] || q} {currentQuality === q ? '✓' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={toggleFullscreen} className="text-white hover:text-[#a78bfa] transition-colors outline-none cursor-pointer" title={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'} aria-label={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Range thumb styles */}
      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 0; height: 0; border-radius: 50%; background: #fff;
          cursor: pointer; transition: all .15s ease-in-out; box-shadow: 0 0 6px rgba(0,0,0,.4);
        }
        input[type='range']:hover::-webkit-slider-thumb { width: 12px; height: 12px }
        input[type='range']::-moz-range-thumb {
          width: 0; height: 0; border: none; border-radius: 50%; background: #fff;
          cursor: pointer; transition: all .15s ease-in-out; box-shadow: 0 0 6px rgba(0,0,0,.4);
        }
        input[type='range']:hover::-moz-range-thumb { width: 12px; height: 12px }
      `}</style>
    </div>
  )
}
