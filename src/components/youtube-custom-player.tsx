'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Loader2, Settings } from 'lucide-react'

interface YoutubeCustomPlayerProps {
  videoId: string
  title?: string
  studentName?: string
  // Resume point (seconds) — the player starts here instead of 0.
  initialStartSeconds?: number
  // Called while watching (throttled to ~5s), on pause, on video end and on
  // unmount, so the page can persist the resume point to the server.
  onProgressChange?: (info: { position: number; duration: number; ended: boolean }) => void
}

const QUALITY_LABELS: Record<string, string> = {
  highres: '4K+',
  hd2160:  '4K',
  hd1440:  '1440p',
  hd1080:  '1080p',
  hd720:   '720p',
  large:   '480p',
  medium:  '360p',
  small:   '240p',
  tiny:    '144p',
  auto:    'Auto',
}

// Default: start at the highest quality (Auto). vq is a URL-level request
// honored at player load — the only mechanism YouTube embeds reliably obey.
const DEFAULT_VQ = 'hd2160'
const QUALITY_ORDER = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small']

export function YoutubeCustomPlayer({
  videoId,
  title = 'Wideo',
  studentName = 'Uczeń',
  initialStartSeconds = 0,
  onProgressChange,
}: YoutubeCustomPlayerProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const playerRef     = useRef<any>(null)

  const [isApiReady,   setIsApiReady]   = useState(false)
  const [isReady,      setIsReady]      = useState(false)
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [isBuffering,  setIsBuffering]  = useState(false)
  const [isEnded,      setIsEnded]      = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [volume,       setVolume]       = useState(100)
  const [isMuted,      setIsMuted]      = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Quality
  const [availableQualities, setAvailableQualities] = useState<string[]>([])
  const [currentQuality,     setCurrentQuality]     = useState<string>(DEFAULT_VQ)
  // In Auto mode, the ACTUAL quality YouTube's ABR settled on (e.g. "4K"
  // instead of "Auto") once playback stabilises.
  const [autoQuality,        setAutoQuality]        = useState<string | null>(null)
  const autoQualityRef = useRef<string | null>(null)
  const [showQualityMenu,    setShowQualityMenu]    = useState(false)
  const [playerEpoch, setPlayerEpoch] = useState(0)
  const [vq, setVq] = useState<string>(DEFAULT_VQ)
  const vqRef = useRef<string>(DEFAULT_VQ)
  // Once the user picks a quality manually, stop second-guessing YouTube's ABR.
  const userPickedRef = useRef(false)

  // The iframe is rendered at true 1:1. (A 6x upscale was once used to push
  // ABR to the highest quality, but on wide screens the 600% layer exceeds
  // the GPU tile size and renders a visible horizontal seam across the
  // middle of the video. vq=hd2160 in the URL + requestBest() on ready force
  // the maximum quality at load, so the artifact is not worth the cost.)

  // Thumbnail
  const [showThumbnail,   setShowThumbnail]   = useState(true)
  const [thumbnailFading, setThumbnailFading] = useState(false)
  const [hasPlayed,       setHasPlayed]       = useState(false)
  const isFirstPlay       = useRef(true)
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [thumbSrc, setThumbSrc] = useState(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)

  // Quality change mid-play — brief overlay while reinitialising
  const [isReinitialising, setIsReinitialising] = useState(false)
  const reinitStartRef  = useRef(0)
  const reinitPlayRef   = useRef(false)
  const reinitVqRef     = useRef(DEFAULT_VQ)
  const reinitActiveRef = useRef(false)

  // Progress reporting (resume point). The latest position lives in a ref so
  // the pause/end/unmount flush always sends the freshest value, and the
  // callback ref avoids stale closures inside intervals and listeners.
  const onProgressRef = useRef(onProgressChange)
  useEffect(() => { onProgressRef.current = onProgressChange }, [onProgressChange])
  const latestPositionRef = useRef(0)
  const latestDurationRef = useRef(0)
  const lastSaveAtRef     = useRef(0)

  // Reset on videoId change — resume from the persisted position.
  useEffect(() => {
    isFirstPlay.current  = true
    reinitStartRef.current = initialStartSeconds ?? 0
    reinitPlayRef.current  = false
    reinitVqRef.current    = DEFAULT_VQ
    latestPositionRef.current = initialStartSeconds ?? 0
    latestDurationRef.current = 0
    lastSaveAtRef.current     = 0
    setShowThumbnail(true)
    setThumbnailFading(false)
    setHasPlayed(false)
    setIsPlaying(false)
    setIsBuffering(false)
    setIsEnded(false)
    setCurrentTime(0)
    setDuration(0)
    setAvailableQualities([])
    setCurrentQuality(DEFAULT_VQ)
    setAutoQuality(null)
    autoQualityRef.current = null
    setVq(DEFAULT_VQ)
    vqRef.current = DEFAULT_VQ
    setIsReinitialising(false)
    setThumbSrc(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
    userPickedRef.current = false
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
  }, [videoId])

  const playerId = useRef(`yt-player-${videoId}`)

  // 1. Load YouTube IFrame API
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

  // 2. Build player whenever API is ready OR playerEpoch changes (quality rebuild)
  useEffect(() => {
    if (!isApiReady) return
    const win = window as any
    if (!win.YT || !win.YT.Player) return

    if (playerRef.current) {
      try { playerRef.current.destroy() } catch (_) {}
      playerRef.current = null
    }

    const mountId = playerId.current
    const mount   = document.getElementById(mountId)
    if (!mount) return

    const startSec  = reinitStartRef.current
    const autoplay  = reinitPlayRef.current ? 1 : 0
    const qualityVq = reinitVqRef.current

    playerRef.current = new win.YT.Player(mountId, {
      videoId,
      playerVars: {
        autoplay,
        controls:       0,
        disablekb:      1,
        fs:             0,
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
        // vq sets quality at the URL level — honored at player load
        vq:             qualityVq || 'hd2160',
        color:          'white',
        loop:           0,
        enablejsapi:    1,
        origin:         window.location.origin,
        // No YouTube tracking cookies — the embed loads from youtube-nocookie.
        host:           'https://www.youtube-nocookie.com',
      },
      // Override the iframe title the moment the embed exists — YouTube sets
      // it to the real video title, which leaks out of the chromeless player
      // (screen readers, tooltips). Ours says what it is: a training video.
      events: {
        onReady: (event: any) => {
          // Override the iframe title — YouTube sets it to the real video
          // title, which leaks out of the chromeless player (screen readers,
          // tooltips). Ours says what it is: a training video. YouTube
          // sometimes injects the iframe as a sibling of the mount div, so
          // search the whole container.
          try { const f = containerRef.current?.querySelector('iframe'); if (f) f.title = 'Wideo treningowe' } catch (_) {}
          setIsReady(true)
          const readyDur = event.target.getDuration?.() || 0
          setDuration(readyDur)
          if (readyDur > 0) latestDurationRef.current = readyDur
          // Safety: if the resume point is beyond the real duration (e.g. a
          // different edit of the video), restart from 0 instead of erroring.
          if (readyDur > 0 && reinitStartRef.current > readyDur - 1) {
            reinitStartRef.current = 0
            latestPositionRef.current = 0
            try { event.target.seekTo(0) } catch (_) {}
          }
          setVolume(event.target.getVolume())
          setIsMuted(event.target.isMuted())

          // Force disable captions
          try {
            event.target.loadModule('captions')
            event.target.setOption('captions', 'track', { lang: 'off' })
          } catch (_) {}

          const qualities: string[] = event.target.getAvailableQualityLevels?.() ?? []
          if (qualities.length > 0) setAvailableQualities(qualities)
          // A manual pick is authoritative for the label; otherwise show what
          // YouTube actually settled on (getPlaybackQuality often reports
          // 'auto' before ABR stabilises, which would misleadingly reset a
          // chosen quality back to Auto).
          if (!userPickedRef.current) {
            const playbackQuality = event.target.getPlaybackQuality?.() ?? qualityVq
            setCurrentQuality(playbackQuality)
          }

          // Request best quality at start (soft; YouTube ABR decides delivery)
          const requestBest = (player: any, retries = 0) => {
            const available = player.getAvailableQualityLevels?.() ?? []
            if (available.length === 0) return
            const preferredOrder = QUALITY_ORDER
            const highest = preferredOrder.find(q => available.includes(q)) || available[0]
            const desired = reinitVqRef.current
            const userChose = desired !== DEFAULT_VQ && desired !== 'auto'
            const targetQuality = userChose ? desired : highest
            const current = player.getPlaybackQuality?.()
            if (current !== targetQuality) {
              try {
                if (player.setPlaybackQualityRange) {
                  player.setPlaybackQualityRange({ min: targetQuality, max: targetQuality })
                }
                player.setPlaybackQuality?.(targetQuality)
              } catch (_) {}
              if (retries < 2) {
                setTimeout(() => requestBest(player, retries + 1), 600 * (retries + 1))
              }
            }
          }
          requestBest(event.target)

          // Rebuild resilience: after a quality switch the player is
          // re-created with start+autoplay — YouTube sometimes leaves it
          // buffering forever instead of resuming (a known embed quirk). If
          // playback hasn't started within a few seconds, nudge it.
          if (reinitPlayRef.current) {
            let attempts = 0
            const tryResume = setInterval(() => {
              attempts++
              try {
                const st = event.target.getPlayerState?.()
                if (st === 1) { clearInterval(tryResume); return }
                if (st === 2 || st === 3 || st === 5) event.target.playVideo()
              } catch (_) {}
              if (attempts > 6) clearInterval(tryResume)
            }, 1000)
          }

          if (reinitActiveRef.current) {
            reinitActiveRef.current = false
            setIsReinitialising(false)
          }
        },
        onStateChange: (event: any) => {
          const state = event.data
          if (state === 1) {
            setIsPlaying(true)
            setIsBuffering(false)
            setIsEnded(false)
            setHasPlayed(true)
            const qualities: string[] = event.target.getAvailableQualityLevels?.() ?? []
            if (qualities.length > 0) setAvailableQualities(qualities)
            setThumbnailFading(true)
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
            overlayTimeoutRef.current = setTimeout(() => {
              setShowThumbnail(false)
              setThumbnailFading(false)
            }, 600)
          } else if (state === 2) {
            setIsPlaying(false); setIsBuffering(false)
            // Flush the resume point on pause (user stops watching).
            onProgressRef.current?.({
              position: latestPositionRef.current,
              duration: latestDurationRef.current,
              ended: false,
            })
          } else if (state === 3) {
            setIsBuffering(true)
          } else if (state === 0) {
            setIsPlaying(false); setIsBuffering(false)
            setIsEnded(true); setShowControls(true)
            // Finished — persist 100% so the library marks it as watched.
            onProgressRef.current?.({
              position: latestDurationRef.current || latestPositionRef.current,
              duration: latestDurationRef.current,
              ended: true,
            })
          }
        },
      },
    })

    // Safety net: YouTube may create the iframe slightly later than onReady;
    // keep the title ours no matter when the element lands in the DOM.
    const titleFixers = [600, 1600].map((ms) =>
      setTimeout(() => {
        try {
          const f = containerRef.current?.querySelector('iframe')
          if (f) f.title = 'Wideo treningowe'
        } catch (_) {}
      }, ms)
    )

    return () => {
      titleFixers.forEach(clearTimeout)
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch (_) {}
        playerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiReady, videoId, playerEpoch])

  // 3. Time polling — keeps the seek bar in sync AND reports progress to the
  // parent (throttled to ~5s) so the resume point is persisted while watching.
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && playerRef.current?.getCurrentTime) {
      interval = setInterval(() => {
        if (!playerRef.current?.getCurrentTime) return
        const pos = playerRef.current.getCurrentTime()
        const dur = playerRef.current.getDuration?.() || 0
        latestPositionRef.current = pos
        if (dur > 0) latestDurationRef.current = dur
        setCurrentTime(pos)
        if (duration === 0 && dur > 0) setDuration(dur)
        // Throttled save: once every ~5s while actively watching.
        const now = Date.now()
        if (now - lastSaveAtRef.current >= 5000) {
          lastSaveAtRef.current = now
          onProgressRef.current?.({ position: pos, duration: dur || latestDurationRef.current, ended: false })
        }
      }, 250)
    }
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, duration])

  // 4b. Auto mode: surface the ACTUAL quality YouTube's ABR settled on once
  // playback is stable. getPlaybackQuality reports 'auto' while the player is
  // still deciding and a concrete value (hd2160, hd1440, …) once settled — we
  // only accept concrete values so the label never lies or flickers.
  useEffect(() => {
    if (!isPlaying || !playerRef.current?.getPlaybackQuality) return
    const interval = setInterval(() => {
      const player = playerRef.current
      if (!player?.getPlaybackQuality) return
      const isAuto = vqRef.current === DEFAULT_VQ || vqRef.current === 'auto'
      if (!isAuto) {
        autoQualityRef.current = null
        setAutoQuality(null)
        return
      }
      const q = player.getPlaybackQuality?.()
      if (q && q !== 'auto' && q !== 'unknown' && q !== autoQualityRef.current) {
        autoQualityRef.current = q
        setAutoQuality(q)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying])

  // 4. Controls auto-hide
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    if (isPlaying && !isEnded) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500)
    }
  }, [isPlaying, isEnded])

  useEffect(() => {
    resetControlsTimer()
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current) }
  }, [isPlaying, isEnded])

  // 5. Fullscreen sync
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // 5b. Unmount flush — persist the latest position when leaving the page.
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
  }, [])

  // 6. Close quality menu on outside click
  useEffect(() => {
    if (!showQualityMenu) return
    const handler = (e: MouseEvent) => {
      const menu = document.getElementById('yt-quality-menu')
      const btn  = document.getElementById('yt-quality-btn')
      if (menu && !menu.contains(e.target as Node) && btn && !btn.contains(e.target as Node)) {
        setShowQualityMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showQualityMenu])

  // Actions
  const togglePlay = () => {
    if (!playerRef.current) return
    if (isEnded) { playerRef.current.seekTo(0); playerRef.current.playVideo(); setIsEnded(false); return }
    if (isPlaying) { playerRef.current.pauseVideo() }
    else           { if (isFirstPlay.current) isFirstPlay.current = false; playerRef.current.playVideo() }
    resetControlsTimer()
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setCurrentTime(v)
    playerRef.current?.seekTo?.(v, true)
    resetControlsTimer()
  }

  const toggleMute = () => {
    if (!playerRef.current) return
    const muted = !isMuted; setIsMuted(muted)
    muted ? playerRef.current.mute() : (playerRef.current.unMute(), playerRef.current.setVolume(volume))
    resetControlsTimer()
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    setVolume(v); setIsMuted(v === 0)
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(v)
      v > 0 ? playerRef.current.unMute() : playerRef.current.mute()
    }
    resetControlsTimer()
  }

  // Rebuild the player at a specific vq, resuming at the same position. This
  // is the only mechanism that reliably changes quality on YouTube embeds —
  // setPlaybackQuality is a soft request ABR overrides, but the vq URL param
  // is honored at player load.
  const setQuality = (q: string) => {
    if (!playerRef.current) return
    userPickedRef.current = true
    // Going back to Auto: drop the stale "actual" so the label re-settles
    // from the fresh player instead of flashing an old value.
    if (q === DEFAULT_VQ || q === 'auto') {
      autoQualityRef.current = null
      setAutoQuality(null)
    }
    const t = playerRef.current.getCurrentTime?.() ?? 0
    const wasPlaying = playerRef.current.getPlayerState?.() === 1
    reinitStartRef.current = t
    reinitPlayRef.current  = wasPlaying
    reinitVqRef.current    = q
    setCurrentQuality(q)
    setVq(q)
    vqRef.current = q
    setShowQualityMenu(false)
    setIsReinitialising(true)
    reinitActiveRef.current = true
    setPlayerEpoch(e => e + 1)
    setTimeout(() => {
      if (reinitActiveRef.current) { reinitActiveRef.current = false; setIsReinitialising(false) }
    }, 8000)
    resetControlsTimer()
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    !document.fullscreenElement
      ? containerRef.current.requestFullscreen().catch(console.error)
      : document.exitFullscreen().catch(console.error)
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00'
    return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
  }

  const qualityLabel = (q: string) => QUALITY_LABELS[q] ?? 'Auto'

  const mountId = playerId.current

  // Hyde-style UI lockdown at the iframe level: the embed is sealed from
  // every kind of input so YouTube can never render its own chrome (title bar,
  // center play button, share / "Watch on YouTube", watermark).
  //   - pointer-events:none (below) kills ALL mouse input to the iframe.
  //   - Keyboard focus is the only remaining input path. A cross-origin
  //     iframe does NOT dispatch focus/focusin events into the parent
  //     document, so we can't react to a focus handler — instead a light poll
  //     watches document.activeElement and blurs the iframe the instant it
  //     gains focus. YouTube stays in the inert "chromeless" state forever:
  //     no title bar, no center play button, no watermark on pause.
  useEffect(() => {
    const interval = setInterval(() => {
      // YouTube sometimes injects the iframe as a sibling of the mount div
      // (React re-creates the mount node mid-injection), so search the whole
      // player container instead of the mount.
      const iframe = containerRef.current?.querySelector('iframe')
      if (iframe && document.activeElement === iframe) {
        ;(iframe as HTMLElement).blur()
      }
    }, 250)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, playerEpoch])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black flex items-center justify-center group overflow-hidden select-none rounded-3xl ${isFullscreen ? 'rounded-none' : ''}`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { isPlaying && !isEnded && setShowControls(false); setShowQualityMenu(false) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. YouTube iframe at true 1:1 — full quality via vq URL param, no
           GPU layer scaling (see note above). The YouTube UI is completely
           inert: pointer-events-none + focus lockdown below. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div
          id={mountId}
          tabIndex={-1}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* 2. No black bars — the iframe wrapper is pointer-events-none and the
           playerVars (controls:0, modestbranding:1, showinfo:0, rel:0,
           disablekb:1) keep YouTube from rendering ANY of its UI (title,
           "Watch on YouTube", watermark, related videos). The whole video is
           visible edge to edge; our own controls float on top. */}

      {/* 3. Click-capture overlay (ALWAYS) — covers YouTube native play button */}
      <div className="absolute inset-0 z-30 bg-black/0 cursor-pointer" onClick={togglePlay} onDoubleClick={toggleFullscreen} />
      {/* 3c. SOLID COVER - blocks ALL YouTube UI until video has actually played frames */}
      {!hasPlayed && (
        <div className="absolute inset-0 z-50 bg-black pointer-events-none" />
      )}

      {/* 4. Paused state — the video frame stays fully visible. YouTube's own
           paused overlay can't appear: the iframe never receives mouse events
           (pointer-events-none) and our center play button (z-50) sits exactly
           where YouTube's would. */}

      {/* 5. Buffering spinner — semi-transparent so the frame stays visible */}
      {isBuffering && !isEnded && !showThumbnail && !isReinitialising && (
        <div className="absolute inset-0 z-35 flex items-center justify-center bg-black/60 pointer-events-none backdrop-blur-[1px]">
          <Loader2 className="w-10 h-10 text-[#a78bfa] animate-spin" />
        </div>
      )}

      {/* 6. Quality-change reinit overlay — brief, semi-transparent */}
      {isReinitialising && (
        <div className="absolute inset-0 z-40 bg-black/70 flex flex-col items-center justify-center gap-3 pointer-events-none backdrop-blur-[2px]">
          <Loader2 className="w-9 h-9 text-[#a78bfa] animate-spin" />
          <p className="text-white/60 text-[11px] font-semibold tracking-widest uppercase">
            {userPickedRef.current
              ? `Zmiana jakości na ${qualityLabel(reinitVqRef.current)}…`
              : 'Dopasowuję jakość do łącza…'}
          </p>
        </div>
      )}

      {/* 7. Thumbnail overlay */}
      {showThumbnail && (
        <div
          className="absolute inset-0 z-50 overflow-hidden cursor-pointer"
          style={{ opacity: thumbnailFading ? 0 : 1, transition: 'opacity 600ms ease-in-out' }}
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
        >
          <img
            src={thumbSrc}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => { if (thumbSrc.includes('maxresdefault')) setThumbSrc(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`) }}
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-black/50 border border-white/20 text-[#a78bfa] flex items-center justify-center backdrop-blur-md shadow-2xl shadow-black/80 hover:scale-110 active:scale-95 transition-all duration-300 hover:bg-[#a78bfa]/10 hover:border-[#a78bfa]/40">
              <Play className="w-8 h-8 fill-current ml-1.5" />
            </div>
          </div>
          {initialStartSeconds > 0 && !hasPlayed && (
            <div className="absolute top-4 left-4 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white bg-black/60 ring-1 ring-white/20 backdrop-blur-md shadow-lg">
                <RotateCcw className="w-3 h-3 text-[#a78bfa]" />
                Wznawiasz od {formatTime(initialStartSeconds)}
              </span>
            </div>
          )}
          {title && (
            <div className="absolute bottom-16 left-5 right-5">
              <p className="text-white font-semibold text-sm line-clamp-2 drop-shadow-lg">{title}</p>
            </div>
          )}
        </div>
      )}

      {/* 8. No center button after the thumbnail — the whole video surface
           stays clean and clickable (click = play/pause). The thumbnail and
           end screen keep their own actions. */}

      {/* 9. Custom end screen — covers the YouTube endscreen, last frame
           slightly visible behind the overlay */}
      {isEnded && (
        <div className="absolute inset-0 z-45 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center px-6 transition-all duration-500">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#a78bfa] mb-2">
            <RotateCcw className="w-8 h-8" />
          </div>
          <h3 className="text-white font-bold text-lg max-w-md">{title}</h3>
          <p className="text-white/40 text-xs max-w-sm">Wideo dobiegło końca. Możesz obejrzeć je ponownie.</p>
          <button
            onClick={togglePlay}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-black bg-[#a78bfa] hover:bg-[#26d0b7] transition-all duration-300 shadow-lg shadow-[#a78bfa]/20 hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto"
          >
            Odtwórz ponownie
          </button>
        </div>
      )}

      {/* 10. Controls bar — slim, subtle; no big black slab */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 px-4 pb-2.5 pt-2 bg-gradient-to-t from-black/60 via-black/25 to-transparent transition-all duration-300 ease-out flex flex-col gap-1.5 pointer-events-auto select-none ${
          showControls || !isPlaying || isEnded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        } ${showThumbnail || isReinitialising ? 'opacity-0 pointer-events-none' : ''}`}
      >
        {/* Progress */}
        <div className="relative flex items-center w-full">
          <input
            type="range" min={0} max={duration || 100} value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1 rounded-lg appearance-none cursor-pointer outline-none bg-white/10 transition-all duration-300 hover:h-1.5 focus:outline-none"
            style={{ background: `linear-gradient(to right,#a78bfa 0%,#a78bfa ${duration?(currentTime/duration)*100:0}%,rgba(255,255,255,0.15) ${duration?(currentTime/duration)*100:0}%,rgba(255,255,255,0.15) 100%)` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-[#a78bfa] transition-colors focus:outline-none" title={isPlaying?'Pauza':'Odtwórz'}>
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-[#a78bfa] transition-colors focus:outline-none" title={isMuted?'Odcisz':'Wycisz'}>
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range" min={0} max={100} value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-16 h-1 rounded-lg appearance-none cursor-pointer outline-none bg-white/15 transition-all duration-300 focus:outline-none hover:h-1.5 opacity-0 group-hover/volume:opacity-100"
                style={{ background: `linear-gradient(to right,#a78bfa 0%,#a78bfa ${isMuted?0:volume}%,rgba(255,255,255,0.15) ${isMuted?0:volume}%,rgba(255,255,255,0.15) 100%)` }}
              />
            </div>

            <span className="text-[11px] font-medium text-white/70 select-none">
              {formatTime(currentTime)} <span className="text-white/30">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quality picker */}
            {availableQualities.length > 0 && (
              <div className="relative">
                {showQualityMenu && (
                  <div
                    id="yt-quality-menu"
                    className="absolute bottom-full right-0 mb-2 min-w-[110px] rounded-xl overflow-hidden border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl shadow-black/60 z-50"
                  >
                    <div className="px-3 py-2 border-b border-white/10">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Jakość</span>
                    </div>
                    <button
                      onClick={() => setQuality('auto')}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-all duration-150 flex items-center justify-between gap-3 ${
                        currentQuality === 'auto' || !userPickedRef.current ? 'text-[#a78bfa] bg-[#a78bfa]/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>Auto</span>
                      {(!userPickedRef.current || currentQuality === 'auto') && <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] flex-shrink-0" />}
                    </button>
                    {availableQualities.filter((q) => q !== 'auto').map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-all duration-150 flex items-center justify-between gap-3 ${
                          userPickedRef.current && currentQuality === q ? 'text-[#a78bfa] bg-[#a78bfa]/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{qualityLabel(q)}</span>
                        {userPickedRef.current && currentQuality === q && <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  id="yt-quality-btn"
                  onClick={(e) => { e.stopPropagation(); setShowQualityMenu(v => !v); resetControlsTimer() }}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-colors focus:outline-none ${showQualityMenu ? 'text-[#a78bfa]' : 'text-white/70 hover:text-white'}`}
                  title="Zmień jakość"
                >
                  <Settings className={`w-4 h-4 transition-transform duration-300 ${showQualityMenu ? 'rotate-45 text-[#a78bfa]' : ''}`} />
                  <span className="text-[11px]">
                    {(() => {
                      const isAuto = vqRef.current === DEFAULT_VQ || vqRef.current === 'auto'
                      if (isAuto) return autoQuality ? qualityLabel(autoQuality) : 'Auto'
                      return qualityLabel(currentQuality)
                    })()}
                  </span>
                </button>
              </div>
            )}

            <button onClick={toggleFullscreen} className="text-white hover:text-[#a78bfa] transition-colors focus:outline-none" title={isFullscreen?'Wyjdź z pełnego ekranu':'Pełny ekran'}>
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Range thumb styles */}
      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance:none;appearance:none;
          width:0;height:0;border-radius:50%;background:#fff;
          cursor:pointer;transition:all .15s ease-in-out;box-shadow:0 0 6px rgba(0,0,0,.4);
        }
        input[type='range']:hover::-webkit-slider-thumb{width:12px;height:12px}
        input[type='range']::-moz-range-thumb{
          width:0;height:0;border:none;border-radius:50%;background:#fff;
          cursor:pointer;transition:all .15s ease-in-out;box-shadow:0 0 6px rgba(0,0,0,.4);
        }
        input[type='range']:hover::-moz-range-thumb{width:12px;height:12px}
      `}</style>
    </div>
  )
}
