'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Loader2 } from 'lucide-react'
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

// Playback quality is locked to 1080p — no selector, no YouTube UI. `vq`
// requests it at the URL level (honored at player load) and we re-assert it
// through the IFrame API after every quality change so ABR never drifts away.
const FORCED_QUALITY = 'hd1080'
const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function YoutubeCustomPlayer({
  videoId,
  title = 'Wideo',
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
  const [showControls, setShowControls]  = useState(true)
  // Opaque pre-play poster (the video's own thumbnail) so nothing YouTube
  // draws behind it — thumbnail, watermark, play button — is ever visible
  // before the student starts watching.
  const [thumbSrc, setThumbSrc] = useState(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)

  const isPlayingRef     = useRef(false)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  // YouTube embeds sometimes swallow the FIRST playVideo() call after a cold
  // load (player goes buffering → unstarted, no error). Retry once if
  // playback hasn't actually started shortly after the user's click.
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null }
  }, [])
  // In some environments YouTube stops an API-started video a few seconds in
  // (it wants a gesture inside its own frame; the webview is stricter than a
  // real browser). Auto-resume a few times when that happens, unless the
  // user paused on purpose or the video ended.
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

  // Reset on videoId change — resume from the persisted position.
  useEffect(() => {
    latestPositionRef.current = initialStartSeconds || 0
    latestDurationRef.current = 0
    lastSaveAtRef.current     = 0
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
      playerVars: {
        autoplay:       0,
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
        // 1080p at load time — the only mechanism embeds reliably obey.
        vq:             FORCED_QUALITY,
        color:          'white',
        loop:           0,
        enablejsapi:    1,
        origin:         window.location.origin,
        // No YouTube tracking cookies — the embed loads from youtube-nocookie.
        host:           'https://www.youtube-nocookie.com',
      },
      events: {
        onReady: (event: any) => {
          // Override the iframe title — YouTube sets it to the real video
          // title, which leaks out of the chromeless player (screen readers,
          // tooltips). Ours says what it is: a training video. (The API
          // already grants the frame autoplay permission itself.)
          try {
            containerRef.current?.querySelectorAll('iframe').forEach(f => {
              f.title = 'Wideo treningowe'
            })
          } catch (_) {}
          setIsReady(true)
          const readyDur = event.target.getDuration?.() || 0
          if (readyDur > 0) { setDuration(readyDur); latestDurationRef.current = readyDur }
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
          // Force disable captions
          try {
            event.target.loadModule('captions')
            event.target.setOption('captions', 'track', { lang: 'off' })
          } catch (_) {}
          // 1080p is already requested via vq at load (see playerVars). We
          // deliberately do NOT call setPlaybackQuality afterwards — it makes
          // YouTube re-initialise the stream, which drops the resume position
          // and briefly pauses playback. vq is honored at load and ABR keeps
          // it at 1080p unless the connection genuinely can't hold it.
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

  // Time polling — keeps the seek bar in sync AND reports progress to the
  // parent (throttled to ~5s) so the resume point is persisted while watching.
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isPlaying) {
      interval = setInterval(() => {
        const p = playerRef.current
        if (!p || typeof p.getCurrentTime !== 'function') return
        const pos = p.getCurrentTime()
        const dur = p.getDuration?.() || 0
        latestPositionRef.current = pos
        setCurrentTime(pos)
        if (dur > 0) latestDurationRef.current = dur
        const now = Date.now()
        if (now - lastSaveAtRef.current >= 5000) {
          lastSaveAtRef.current = now
          onProgressRef.current?.({ position: pos, duration: dur || latestDurationRef.current, ended: false })
        }
      }, 500)
    }
    return () => { if (interval) clearInterval(interval) }
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

  // Fullscreen tracking (our own button uses the container's requestFullscreen).
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

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
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
    } else if (typeof el.requestFullscreen === 'function') {
      void el.requestFullscreen().catch(() => {})
    }
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
      title={title}
    >
      {/* Chromeless YouTube player — controls:0 means YouTube draws nothing:
          no title bar, no logo, no gear, no share, no watermark. */}
      <div className="absolute inset-0">
        <div id={`yt-player-${videoId}`} className="w-full h-full" />
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

      {/* Paused state — YouTube draws its own paused chrome inside the iframe
          (title bar, big center button, logo, watermark). Cover all of it with
          our own overlay: the paused state speaks OUR design language, no
          YouTube UI shows. */}
      {!isPlaying && hasPlayed && !isEnded && (
        <div className="absolute inset-0 z-35 pointer-events-none select-none" aria-hidden>
          {/* Top strip — covers YT's title bar. */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/45 to-transparent" />
          {/* Bottom strip — taller and more opaque, covers YT's
              "Obejrzyj w YouTube" watermark in the bottom-right corner. */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
          {/* Center cover — hides YT's big center play button. */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/45 ring-1 ring-white/10" />
          </div>
          <div className="absolute top-4 left-4">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/85 bg-black/60 ring-1 ring-white/15 backdrop-blur-md">
              <Pause className="w-3 h-3 text-[#a78bfa]" />
              Wstrzymano
            </span>
          </div>
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

      {/* CONTENT PROTECTION — DevTools blocker and capture-warning toast
          (shared layer, same as the raw-embed wrapper). No watermark. */}
      <ContentProtectionOverlay devtoolsOpen={devtoolsOpen} captureWarn={captureWarn} />

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
          </div>

          <div className="flex items-center gap-3">
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
