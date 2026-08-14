'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Loader2 } from 'lucide-react'

interface YoutubeCustomPlayerProps {
  videoId: string
  title?: string
  studentName?: string
}

// Preferred quality codes, high → low — used only to pick the best starting
// quality. After that YouTube's own ABR (Auto) manages quality: it steps
// down on a weak connection and back up when bandwidth recovers.
const QUALITY_ORDER = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small']

export function YoutubeCustomPlayer({ videoId, title = 'Wideo', studentName = 'Uczeń' }: YoutubeCustomPlayerProps) {
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

  // Thumbnail
  const [showThumbnail,   setShowThumbnail]   = useState(true)
  const [thumbnailFading, setThumbnailFading] = useState(false)
  const [hasPlayed,       setHasPlayed]       = useState(false)
  const isFirstPlay       = useRef(true)
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [thumbSrc, setThumbSrc] = useState(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)

  // Reset on videoId change
  useEffect(() => {
    isFirstPlay.current  = true
    setShowThumbnail(true)
    setThumbnailFading(false)
    setHasPlayed(false)
    setIsPlaying(false)
    setIsBuffering(false)
    setIsEnded(false)
    setCurrentTime(0)
    setDuration(0)
    setThumbSrc(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
  }, [videoId])

  // Stable player DOM id (per videoId)
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

  // 2. Build player
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
        // Ask for the highest quality at load; YouTube's ABR then manages
        // it automatically (Auto) — stepping down on weak connections and
        // back up when the connection improves.
        vq:             'hd2160',
        color:          'white',
        loop:           0,
        enablejsapi:    1,
        origin:         window.location.origin,
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

          // Request the best available quality once at start (soft request —
          // YouTube ABR decides what it can actually deliver).
          const requestBest = (player: any, retries = 0) => {
            const available = player.getAvailableQualityLevels?.() ?? []
            if (available.length === 0) return
            const preferredOrder = QUALITY_ORDER
            const best = preferredOrder.find(q => available.includes(q)) || available[0]
            const current = player.getPlaybackQuality?.()
            if (current !== best) {
              try {
                if (player.setPlaybackQualityRange) {
                  player.setPlaybackQualityRange({ min: best, max: best })
                }
                player.setPlaybackQuality?.(best)
              } catch (_) {}
              if (retries < 2) {
                setTimeout(() => requestBest(player, retries + 1), 600 * (retries + 1))
              }
            }
          }
          requestBest(event.target)
        },
        onStateChange: (event: any) => {
          const state = event.data
          if (state === 1) {
            setIsPlaying(true)
            setIsBuffering(false)
            setIsEnded(false)
            setHasPlayed(true)
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

  // 3. Time polling
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && playerRef.current?.getCurrentTime) {
      interval = setInterval(() => {
        if (!playerRef.current?.getCurrentTime) return
        setCurrentTime(playerRef.current.getCurrentTime())
        if (duration === 0) setDuration(playerRef.current.getDuration() || 0)
      }, 250)
    }
    return () => clearInterval(interval)
  }, [isPlaying, duration])

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

  const mountId = playerId.current

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black flex items-center justify-center group overflow-hidden select-none rounded-3xl ${isFullscreen ? 'rounded-none' : ''}`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { isPlaying && !isEnded && setShowControls(false) }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. YouTube iframe — rendered on a 6x canvas and scaled back to the
           container: YouTube's ABR then streams the highest available quality
           (this is the only reliable way to make embeds start at max quality).
           The YouTube UI is hidden by the layers above (the click-capture
           overlay at z-30 blocks all pointer events; the soft gradients mask
           the title / "Watch on YouTube" / share corner / logo). */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ transform: 'scale(0.166667)', transformOrigin: 'top left', width: '600%', height: '600%' }}>
        <div
          id={mountId}
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* 2. Soft top gradient — masks the YouTube title / "Watch on YouTube" /
           share corner with a gentle fade that blends into the footage. */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 h-16 bg-gradient-to-b from-black/85 via-black/35 to-transparent" />

      {/* 2b. Soft bottom-right mask — hides the persistent YouTube logo
           watermark (bottom-right corner). */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 z-20 h-24 w-48"
        style={{ background: 'radial-gradient(ellipse 100% 100% at 100% 100%, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 62%)' }}
      />

      {/* 3. Click-capture overlay (ALWAYS) — covers YouTube native play button at all times */}
      <div className="absolute inset-0 z-30 bg-black/0 cursor-pointer" onClick={togglePlay} onDoubleClick={toggleFullscreen} />
      {/* 3b. Base cover layer - always present to block any YouTube UI bleed-through */}
      <div className="absolute inset-0 z-25 bg-black/0 pointer-events-none" />
      {/* 3c. SOLID COVER - blocks ALL YouTube UI until video has actually played frames */}
      {!hasPlayed && (
        <div className="absolute inset-0 z-50 bg-black pointer-events-none" />
      )}

      {/* 4. Paused cinematic dim — YouTube's paused overlay can never show through */}
      {!isPlaying && isReady && !isEnded && hasPlayed && !showThumbnail && (
        <div className="absolute inset-0 z-35 bg-black/75 backdrop-blur-sm pointer-events-none transition-all duration-500" />
      )}

      {/* 5. Buffering spinner */}
      {isBuffering && !isEnded && !showThumbnail && (
        <div className="absolute inset-0 z-35 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-none">
          <Loader2 className="w-10 h-10 text-[#a78bfa] animate-spin" />
        </div>
      )}

      {/* 6b. SOLID COVER - blocks ALL YouTube UI until video has actually played frames */}
      {!hasPlayed && !showThumbnail && (
        <div className="absolute inset-0 z-45 bg-black pointer-events-none" />
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
          {title && (
            <div className="absolute bottom-16 left-5 right-5">
              <p className="text-white font-semibold text-sm line-clamp-2 drop-shadow-lg">{title}</p>
            </div>
          )}
        </div>
      )}

      {/* 8. Center play button (post-thumbnail) */}
      {!showThumbnail && (!isPlaying || isEnded) && (
        <button
          onClick={togglePlay}
          className="absolute z-50 w-16 h-16 rounded-full bg-black/60 border border-white/20 text-[#a78bfa] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-md shadow-2xl shadow-black/80 pointer-events-auto hover:bg-[#a78bfa]/10 hover:border-[#a78bfa]/30"
          title="Odtwórz"
        >
          {isEnded ? <RotateCcw className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current ml-1" />}
        </button>
      )}

      {/* 9. Custom end screen — covers the YouTube endscreen */}
      {isEnded && (
        <div className="absolute inset-0 z-45 bg-[#0a0a0a]/95 flex flex-col items-center justify-center gap-4 text-center px-6 transition-all duration-500">
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

      {/* 10. Controls bar — play/pause, volume, time, fullscreen. Quality is
           handled automatically by YouTube (Auto), so there is no quality
           picker that fights the ABR and never sticks. */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-8 bg-gradient-to-t from-black/90 via-black/55 to-transparent transition-all duration-300 ease-out flex flex-col gap-3 pointer-events-auto select-none ${
          showControls || !isPlaying || isEnded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        } ${showThumbnail ? 'opacity-0 pointer-events-none' : ''}`}
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
