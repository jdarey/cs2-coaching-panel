'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Loader2, Settings } from 'lucide-react'

interface YoutubeCustomPlayerProps {
  videoId: string
  title?: string
  studentName?: string
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

// Default minimum quality injected via URL parameter
const DEFAULT_VQ = 'hd2160'

export function YoutubeCustomPlayer({ videoId, title = 'Wideo', studentName = 'Uczeń' }: YoutubeCustomPlayerProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const playerRef     = useRef<any>(null)
  const iframeWrapRef = useRef<HTMLDivElement>(null)

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
  const [showQualityMenu,    setShowQualityMenu]    = useState(false)
  // vq tracks the URL parameter for the current player instance
  const [vq, setVq] = useState<string>(DEFAULT_VQ)

  // Thumbnail
  const [showThumbnail,   setShowThumbnail]   = useState(true)
  const [thumbnailFading, setThumbnailFading] = useState(false)
  const [hasPlayed,       setHasPlayed]       = useState(false)
  const isFirstPlay       = useRef(true)
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [thumbSrc, setThumbSrc] = useState(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)

  // Changing quality mid-play — show a brief overlay while reinitialising
  const [isReinitialising, setIsReinitialising] = useState(false)
  // startSeconds used when reinitialising after quality change
  const reinitStartRef  = useRef(0)
  const reinitPlayRef   = useRef(false)
  const reinitVqRef     = useRef(DEFAULT_VQ)

  // Removed playerKey remount - causes removeChild errors

  // Reset on videoId change
  useEffect(() => {
    isFirstPlay.current  = true
    reinitStartRef.current = 0
    reinitPlayRef.current  = false
    reinitVqRef.current    = DEFAULT_VQ
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
    setVq(DEFAULT_VQ)
    setIsReinitialising(false)
    setThumbSrc(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
  }, [videoId])

  // Stable player DOM id (per videoId)
  const playerId = useRef(`yt-player-${videoId}`)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const qualityRetryRef = useRef(0)

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

  // 2. Build player whenever API is ready OR videoId changes
  useEffect(() => {
    if (!isApiReady) return
    const win = window as any
    if (!win.YT || !win.YT.Player) return

    // Destroy previous instance
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
        // vq sets quality at the URL level - force 4K
        vq:             qualityVq || 'hd2160',
      },
      events: {
        onReady: (event: any) => {
          setIsReady(true)
          setDuration(event.target.getDuration() || 0)
          setVolume(event.target.getVolume())
          setIsMuted(event.target.isMuted())
          
          // Force disable captions programmatically
          try {
            event.target.loadModule('captions')
            event.target.setOption('captions', 'track', { lang: 'off' })
          } catch (_) {}

          const qualities: string[] = event.target.getAvailableQualityLevels?.() ?? []
          if (qualities.length > 0) setAvailableQualities(qualities)
          const playbackQuality = event.target.getPlaybackQuality?.() ?? qualityVq
          setCurrentQuality(playbackQuality)

          // Aggressive quality forcing - try multiple methods
          const forceHighQuality = (player: any, retries = 0) => {
            const available = player.getAvailableQualityLevels?.() ?? []
            if (available.length === 0) return
            
            // Prefer specific high-quality codes over generic "first"
            const preferredOrder = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small']
            const targetQuality = preferredOrder.find(q => available.includes(q)) || available[0]
            const current = player.getPlaybackQuality?.()
            
            if (current !== targetQuality) {
              // Method 1: setPlaybackQualityRange (newer API) - set minimum quality
              if (player.setPlaybackQualityRange) {
                try {
                  player.setPlaybackQualityRange({ min: targetQuality, max: targetQuality })
                } catch (_) {}
              }
              
              // Method 2: setPlaybackQuality
              try { player.setPlaybackQuality?.(targetQuality) } catch (_) {}
              
              // Method 3: loadVideoById with suggestedQuality (reloads at quality)
              if (player.loadVideoById && retries < 2) {
                const t = player.getCurrentTime?.() ?? 0
                try { player.loadVideoById(videoId, t, targetQuality) } catch (_) {}
              }
              
              // Retry after a short delay if quality didn't stick
              if (retries < 3) {
                setTimeout(() => forceHighQuality(player, retries + 1), 500 * (retries + 1))
              }
            }
          }
          
          forceHighQuality(event.target)

          // If this was a quality-change reinit, hide the overlay now
          if (isReinitialising) {
            setIsReinitialising(false)
          }

          // Setup resize observer to force quality when player grows
          if (containerRef.current && !resizeObserverRef.current) {
            resizeObserverRef.current = new ResizeObserver(() => {
              if (playerRef.current?.getPlaybackQuality) {
                const current = playerRef.current.getPlaybackQuality()
                const available = playerRef.current.getAvailableQualityLevels?.() ?? []
                if (available.length > 0) {
                  const preferredOrder = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small']
                  const highest = preferredOrder.find(q => available.includes(q)) || available[0]
                  if (current !== highest) {
                    try { 
                      if (playerRef.current.setPlaybackQualityRange) {
                        playerRef.current.setPlaybackQualityRange({ min: highest, max: highest })
                      }
                      playerRef.current.setPlaybackQuality(highest) 
                    } catch (_) {}
                  }
                }
              }
            })
            resizeObserverRef.current.observe(containerRef.current)
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
            // Fade out thumbnail
            setThumbnailFading(true)
            if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
            overlayTimeoutRef.current = setTimeout(() => {
              setShowThumbnail(false)
              setThumbnailFading(false)
            }, 600)
          } else if (state === 2) {
            setIsPlaying(false); setIsBuffering(false)
          } else if (state === 3) {
            setIsBuffering(true)
          } else if (state === 0) {
            setIsPlaying(false); setIsBuffering(false)
            setIsEnded(true); setShowControls(true)
          }
        },
        onPlaybackQualityChange: (event: any) => {
          setCurrentQuality(event.data ?? qualityVq)
        },
      },
    })

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch (_) {}
        playerRef.current = null
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiReady, videoId])

  // 3. Time polling
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && playerRef.current?.getCurrentTime) {
      interval = setInterval(() => {
        setCurrentTime(playerRef.current.getCurrentTime())
        if (duration === 0) setDuration(playerRef.current.getDuration() || 0)
      }, 250)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration])

  // 3b. Sync quality via setPlaybackQuality when player is ready and vq changes
  useEffect(() => {
    if (!isReady || !playerRef.current?.setPlaybackQuality) return
    // vq state tracks the desired quality
    if (vq !== 'auto' && currentQuality !== vq) {
      try {
        playerRef.current.setPlaybackQuality(vq)
      } catch (_) {}
    }
  }, [isReady, vq, currentQuality])

  // 3c. Periodic quality enforcement - YouTube often ignores first request
  useEffect(() => {
    if (!isReady || !playerRef.current?.getPlaybackQuality) return
    let interval: NodeJS.Timeout
    interval = setInterval(() => {
      if (!playerRef.current) return
      const actual = playerRef.current.getPlaybackQuality()
      if (actual && actual !== vq && vq !== 'auto') {
        // Quality didn't stick, force it again with both methods
        try {
          if (playerRef.current.setPlaybackQualityRange) {
            playerRef.current.setPlaybackQualityRange({ min: vq, max: vq })
          }
          playerRef.current.setPlaybackQuality(vq)
        } catch (_) {}
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [isReady, vq])

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

  // Helper to force quality change via YouTube API
  const forceQuality = useCallback((q: string) => {
    if (!playerRef.current) return
    const player = playerRef.current
    try {
      // Try setPlaybackQualityRange first (newer API, more reliable)
      if (player.setPlaybackQualityRange) {
        player.setPlaybackQualityRange({ min: q, max: q })
      }
      // Fallback to setPlaybackQuality
      player.setPlaybackQuality?.(q)
    } catch (_) {}
  }, [])

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

  /**
   * Quality change - aggressive multi-method approach.
   * Uses setPlaybackQualityRange (newer API) + setPlaybackQuality + loadVideoById + cueVideoById
   */
  const setQuality = (q: string) => {
    if (!playerRef.current) return

    const t          = playerRef.current.getCurrentTime?.() ?? 0
    const wasPlaying = isPlaying

    reinitStartRef.current = t
    reinitPlayRef.current  = wasPlaying
    reinitVqRef.current    = q

    setCurrentQuality(q)
    setVq(q)
    setShowQualityMenu(false)

    setIsReinitialising(true)

    const player = playerRef.current
    const available = player.getAvailableQualityLevels?.() ?? []
    
    // Use preferred quality order to find the best match
    const preferredOrder = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small']
    const targetQuality = preferredOrder.find(q => available.includes(q)) || q

    // Method 1: setPlaybackQualityRange (newer API) - locks min/max quality
    if (player.setPlaybackQualityRange) {
      try { player.setPlaybackQualityRange({ min: targetQuality, max: targetQuality }) } catch (_) {}
    }

    // Method 2: setPlaybackQuality
    try { player.setPlaybackQuality?.(targetQuality) } catch (_) {}

    // Method 3: loadVideoById with suggestedQuality
    if (player.loadVideoById) {
      try { player.loadVideoById(videoId, t, targetQuality) } catch (_) {}
    }

    // Method 4: cueVideoById fallback (after delay)
    setTimeout(() => {
      const actualQuality = player.getPlaybackQuality?.()
      if (actualQuality && actualQuality !== targetQuality && player.cueVideoById) {
        try {
          player.cueVideoById(videoId, t, targetQuality)
          if (wasPlaying) setTimeout(() => player.playVideo(), 50)
        } catch (_) {}
      }
    }, 200)

    // Ensure resume if playing
    if (wasPlaying) {
      setTimeout(() => player?.playVideo(), 150)
    }

    // Retry loop - YouTube often ignores first few attempts
    let retries = 0
    const retryForce = () => {
      if (retries >= 3) return
      const current = player.getPlaybackQuality?.()
      if (current && current !== targetQuality) {
        retries++
        if (player.setPlaybackQualityRange) {
          try { player.setPlaybackQualityRange({ min: targetQuality, max: targetQuality }) } catch (_) {}
        }
        try { player.setPlaybackQuality?.(targetQuality) } catch (_) {}
        setTimeout(retryForce, 500 * retries)
      }
    }
    setTimeout(retryForce, 500)

    setTimeout(() => setIsReinitialising(false), 1000)

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

  const qualityLabel = (q: string) => QUALITY_LABELS[q] ?? q

  const mountId = playerId.current

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black flex items-center justify-center group overflow-hidden select-none rounded-3xl ${isFullscreen ? 'rounded-none' : ''}`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { isPlaying && !isEnded && setShowControls(false); setShowQualityMenu(false) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. YouTube iframe — render at 4x resolution so YouTube ABR picks 4K quality.
           Visually crop to normal size via overflow:hidden on wrapper.
           pointer-events:none blocks the native center play button. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" ref={iframeWrapRef} style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}>
        <div
          id={mountId}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* 2. Student badge */}
      <div className="pointer-events-none absolute top-4 left-4 z-20 flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 ring-1 ring-white/5">
        <span className="h-2 w-2 rounded-full bg-[#2de5ca] animate-pulse" />
        <span className="text-[11px] font-semibold text-white/90 truncate max-w-[200px]">{studentName}</span>
      </div>

      {/* 3. Click-capture overlay (always after thumbnail gone) — covers YouTube native play button */}
      {!showThumbnail && (
        <div className="absolute inset-0 z-20 bg-black/0 cursor-pointer" onClick={togglePlay} onDoubleClick={toggleFullscreen} />
      )}

      {/* 4. Paused cinematic dim */}
      {!isPlaying && isReady && !isEnded && hasPlayed && !showThumbnail && !isReinitialising && (
        <div className="absolute inset-0 z-21 bg-black/40 backdrop-blur-[2px] pointer-events-none transition-all duration-500" />
      )}

      {/* 5. Buffering spinner */}
      {isBuffering && !isEnded && !showThumbnail && !isReinitialising && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <Loader2 className="w-10 h-10 text-[#2de5ca] animate-spin" />
        </div>
      )}

      {/* 6. Quality-change reinit overlay */}
      {isReinitialising && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Loader2 className="w-9 h-9 text-[#2de5ca] animate-spin" />
          <p className="text-white/50 text-[11px] font-semibold tracking-widest uppercase">
            Zmiana jakości na {qualityLabel(reinitVqRef.current)}…
          </p>
        </div>
      )}

      {/* 7. Thumbnail overlay */}
      {showThumbnail && (
        <div
          className="absolute inset-0 z-40 overflow-hidden cursor-pointer"
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
            <div className="w-20 h-20 rounded-full bg-black/50 border border-white/20 text-[#2de5ca] flex items-center justify-center backdrop-blur-md shadow-2xl shadow-black/80 hover:scale-110 active:scale-95 transition-all duration-300 hover:bg-[#2de5ca]/10 hover:border-[#2de5ca]/40">
              <Play className="w-8 h-8 fill-current ml-1.5" />
            </div>
          </div>
          {title && (
            <div className="absolute bottom-16 left-5 right-5">
              <p className="text-white font-semibold text-sm line-clamp-2 drop-shadow-lg">{title}</p>
            </div>
          )}
        </div>
      )}

      {/* 8. Center play button (post-thumbnail) */}
      {!showThumbnail && (!isPlaying || isEnded) && !isReinitialising && (
        <button
          onClick={togglePlay}
          className="absolute z-50 w-16 h-16 rounded-full bg-black/60 border border-white/20 text-[#2de5ca] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-md shadow-2xl shadow-black/80 pointer-events-auto hover:bg-[#2de5ca]/10 hover:border-[#2de5ca]/30"
          title="Odtwórz"
        >
          {isEnded ? <RotateCcw className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current ml-1" />}
        </button>
      )}

      {/* 9. Custom end screen */}
      {isEnded && (
        <div className="absolute inset-0 z-25 bg-[#0a0a0a]/95 flex flex-col items-center justify-center gap-4 text-center px-6 transition-all duration-500">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#2de5ca] mb-2">
            <RotateCcw className="w-8 h-8" />
          </div>
          <h3 className="text-white font-bold text-lg max-w-md">{title}</h3>
          <p className="text-white/40 text-xs max-w-sm">Wideo dobiegło końca. Możesz obejrzeć je ponownie.</p>
          <button
            onClick={togglePlay}
            className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-black bg-[#2de5ca] hover:bg-[#26d0b7] transition-all duration-300 shadow-lg shadow-[#2de5ca]/20 hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto"
          >
            Odtwórz ponownie
          </button>
        </div>
      )}

      {/* 10. Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-8 bg-gradient-to-t from-black/90 via-black/55 to-transparent transition-all duration-300 ease-out flex flex-col gap-3 pointer-events-auto select-none ${
          showControls || !isPlaying || isEnded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        } ${showThumbnail || isReinitialising ? 'opacity-0 pointer-events-none' : ''}`}
      >
        {/* Progress */}
        <div className="relative flex items-center w-full">
          <input
            type="range" min={0} max={duration || 100} value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1 rounded-lg appearance-none cursor-pointer outline-none bg-white/10 transition-all duration-300 hover:h-1.5 focus:outline-none"
            style={{ background: `linear-gradient(to right,#2de5ca 0%,#2de5ca ${duration?(currentTime/duration)*100:0}%,rgba(255,255,255,0.15) ${duration?(currentTime/duration)*100:0}%,rgba(255,255,255,0.15) 100%)` }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-[#2de5ca] transition-colors focus:outline-none" title={isPlaying?'Pauza':'Odtwórz'}>
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-[#2de5ca] transition-colors focus:outline-none" title={isMuted?'Odcisz':'Wycisz'}>
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range" min={0} max={100} value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-16 h-1 rounded-lg appearance-none cursor-pointer outline-none bg-white/15 transition-all duration-300 focus:outline-none hover:h-1.5 opacity-0 group-hover/volume:opacity-100"
                style={{ background: `linear-gradient(to right,#2de5ca 0%,#2de5ca ${isMuted?0:volume}%,rgba(255,255,255,0.15) ${isMuted?0:volume}%,rgba(255,255,255,0.15) 100%)` }}
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
                    className="absolute bottom-full right-0 mb-2 min-w-[110px] rounded-xl overflow-hidden border border-white/10 bg-black/85 backdrop-blur-xl shadow-2xl shadow-black/60 z-50"
                  >
                    <div className="px-3 py-2 border-b border-white/10">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Jakość</span>
                    </div>
                    {availableQualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium transition-all duration-150 flex items-center justify-between gap-3 ${
                          currentQuality === q ? 'text-[#2de5ca] bg-[#2de5ca]/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{qualityLabel(q)}</span>
                        {currentQuality === q && <span className="w-1.5 h-1.5 rounded-full bg-[#2de5ca] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  id="yt-quality-btn"
                  onClick={(e) => { e.stopPropagation(); setShowQualityMenu(v => !v); resetControlsTimer() }}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-colors focus:outline-none ${showQualityMenu ? 'text-[#2de5ca]' : 'text-white/70 hover:text-white'}`}
                  title="Zmień jakość"
                >
                  <Settings className={`w-4 h-4 transition-transform duration-300 ${showQualityMenu ? 'rotate-45 text-[#2de5ca]' : ''}`} />
                  <span className="text-[11px]">{qualityLabel(currentQuality)}</span>
                </button>
              </div>
            )}

            <button onClick={toggleFullscreen} className="text-white hover:text-[#2de5ca] transition-colors focus:outline-none" title={isFullscreen?'Wyjdź z pełnego ekranu':'Pełny ekran'}>
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
