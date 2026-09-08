'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, RotateCcw, X, Trophy, Flame } from 'lucide-react'

interface PracticeTimerProps {
  minutes: number
  taskTitle: string
  onComplete: (actualMinutes: number) => void
  onClose: () => void
}

const RING = 2 * Math.PI * 84 // circumference of r=84 circle

export function PracticeTimer({ minutes: defaultMinutes, taskTitle, onComplete, onClose }: PracticeTimerProps) {
  const [customMinutes, setCustomMinutes] = useState(defaultMinutes)
  const totalSeconds = Math.max(1, Math.round(customMinutes * 60))
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [warn, setWarn] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!running && !finished) setSecondsLeft(totalSeconds)
  }, [totalSeconds, running, finished])

  // Create + unlock the AudioContext inside a user gesture (Start click),
  // otherwise browsers block autoplay and the finish alarm never plays.
  const ensureAudio = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      if (!audioRef.current) audioRef.current = new Ctx()
      if (audioRef.current.state === 'suspended') {
        audioRef.current.resume().catch(() => undefined)
      }
      return audioRef.current
    } catch {
      return null
    }
  }, [])

  const beep = useCallback(() => {
    try {
      const ctx = ensureAudio()
      if (!ctx) return
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6 — victory arpeggio
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.55)
      })
    } catch {
      /* audio unavailable — fine */
    }
  }, [ensureAudio])

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
  }, [running, secondsLeft])

  useEffect(() => {
    if (secondsLeft === 0 && !finished) {
      setRunning(false)
      setFinished(true)
      beep()
      onComplete(customMinutes)
    }
  }, [secondsLeft, finished, beep, onComplete, customMinutes])

  useEffect(() => {
    setWarn(secondsLeft > 0 && secondsLeft <= 60)
  }, [secondsLeft])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      audioRef.current?.close().catch(() => undefined)
    }
  }, [])

  const toggle = () => {
    if (finished) return
    ensureAudio()
    setRunning((r) => !r)
  }

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setFinished(false)
    setSecondsLeft(totalSeconds)
  }

  // display co minutę — jak na początku płynne kółko, ale liczba zmienia się co minutę
  const displayMinutes = Math.ceil(secondsLeft / 60)
  const elapsed = totalSeconds - secondsLeft
  const pct = totalSeconds > 0 ? (elapsed / totalSeconds) * 100 : 0
  const dashOffset = RING * (1 - pct / 100)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" onClick={finished ? onClose : () => undefined} aria-hidden="true" />
      <div
        className={cn(
          'glass-liquid relative w-full max-w-sm rounded-3xl p-8 text-center animate-rise-in overflow-hidden',
          running && 'ring-1 ring-[#a78bfa]/40',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={`Timer treningowy: ${taskTitle}`}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-44 w-44 rounded-full blur-3xl transition-all duration-700"
          style={{ background: finished ? 'rgba(52,211,153,0.35)' : running ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.12)' }}
        />

        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition"
          aria-label="Zamknij timer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-widest text-[#c4b5fd] font-semibold mb-1">Timer treningowy</p>
          <h3 className="font-display text-lg font-bold leading-snug text-white/90 line-clamp-2 mb-6 break-words max-w-full px-2">{taskTitle}</h3>

          {/* Ring */}
          <div className="relative mx-auto w-52 h-52">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle
                cx="100" cy="100" r="84" fill="none"
                strokeWidth="10" strokeLinecap="round"
                stroke={finished ? '#34d399' : '#8b5cf6'}
                strokeDasharray={RING}
                strokeDashoffset={finished ? 0 : dashOffset}
                style={{
                  transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease',
                  filter: running ? 'drop-shadow(0 0 8px rgba(139,92,246,0.7))' : undefined,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {finished ? (
                <>
                  <Trophy className="w-10 h-10 text-emerald-300 mb-2 animate-pop-in" />
                  <p className="font-display text-2xl font-bold text-emerald-300">Ukończone!</p>
                  <p className="text-xs text-white/45 mt-1">Trening odhaczony ✓</p>
                </>
              ) : (
                <>
                  <p className={cn('font-display text-5xl font-bold tabular-nums tracking-tight transition-colors', warn && 'text-amber-300')}>
                    {displayMinutes}<span className="text-2xl opacity-60"> min</span>
                  </p>
                  <p className="text-[11px] uppercase tracking-widest text-white/40 font-medium mt-2">
                    {running ? 'trening w toku' : pct === 0 ? `cel: ${customMinutes} min` : 'wstrzymano'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Czas - wybór przed startem - subtelnie w oryginalnym stylu */}
          {!finished && !running && (
            <div className="mt-6 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">Czas trenera</span>
                <span className="text-xs font-bold text-[#c4b5fd] bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded-full px-2.5 py-1">{defaultMinutes} min</span>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button onClick={() => setCustomMinutes(Math.max(1, customMinutes - 1))} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] transition">−</button>
                <div className="flex-1 min-w-[80px] flex items-center justify-center gap-1 h-9 rounded-xl bg-[#07060c] border border-white/[0.08]">
                  <input type="number" min={1} max={600} value={customMinutes} onChange={e => setCustomMinutes(Math.max(1, parseInt(e.target.value)||1))} className="w-12 bg-transparent text-center text-sm font-bold text-white outline-none" />
                  <span className="text-xs text-white/40">min</span>
                </div>
                <button onClick={() => setCustomMinutes(Math.min(600, customMinutes + 1))} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08] transition">+</button>
                <div className="flex gap-1 flex-wrap">
                  {[5,10,15,30].map(v=> <button key={v} onClick={()=>setCustomMinutes(v)} className={cn('px-2.5 h-8 rounded-xl text-xs font-semibold border shrink-0', customMinutes===v ? 'bg-[#a78bfa] text-white border-[#a78bfa]' : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:text-white')}>{v}</button>)}
                </div>
              </div>
            </div>
          )}

          {/* Controls - oryginalne */}
          {!finished ? (
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="grid h-12 w-12 place-items-center rounded-2xl glass-liquid text-white/60 hover:text-white hover:border-white/[0.15] transition"
                aria-label="Zresetuj timer"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                onClick={toggle}
                className={cn(
                  'relative inline-flex items-center gap-2 rounded-2xl px-8 h-14 text-base font-bold text-white transition-all duration-300 overflow-hidden',
                  running ? 'btn-darey' : 'btn-primary-gradient',
                  running && 'animate-btn-gradient',
                )}
              >
                <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
                {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {running ? 'Pauza' : pct > 0 ? 'Wznów' : 'Start'}
              </button>
            </div>
          ) : (
            <div className="mt-7 flex items-center justify-center gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-2xl px-5 h-12 text-sm font-semibold text-white/75 hover:text-white glass-liquid transition"
              >
                <RotateCcw className="h-4 w-4" />
                Jeszcze raz
              </button>
              <button
                onClick={onClose}
                className="relative inline-flex items-center gap-2 rounded-2xl px-5 h-12 text-sm font-semibold text-white btn-darey overflow-hidden"
              >
                <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
                <Flame className="h-4 w-4" />
                Świetna robota!
              </button>
            </div>
          )}

          {running && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#c4b5fd]/80 animate-pulse">
              <span className="live-dot" /> Skup się — tylko Ty i trening
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
