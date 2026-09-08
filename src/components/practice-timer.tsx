'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Play, Pause, RotateCcw, X, Trophy, Flame, Clock, Sparkles } from 'lucide-react'

interface PracticeTimerProps {
  minutes: number
  taskTitle: string
  onComplete: (actualMinutes: number) => void
  onClose: () => void
}

const RING = 2 * Math.PI * 84

export function PracticeTimer({ minutes: defaultMinutes, taskTitle, onComplete, onClose }: PracticeTimerProps) {
  const [customMinutes, setCustomMinutes] = useState(defaultMinutes)
  const [minutesLeft, setMinutesLeft] = useState(defaultMinutes)
  const [secondsInMinute, setSecondsInMinute] = useState(60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const totalMinutes = customMinutes

  // sync when customMinutes changes (before start)
  useEffect(() => {
    if (!running && !finished) {
      setMinutesLeft(customMinutes)
      setSecondsInMinute(60)
    }
  }, [customMinutes, running, finished])

  const ensureAudio = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      if (!audioRef.current) audioRef.current = new Ctx()
      if (audioRef.current.state === 'suspended') audioRef.current.resume().catch(() => undefined)
      return audioRef.current
    } catch { return null }
  }, [])

  const beep = useCallback(() => {
    try {
      const ctx = ensureAudio(); if (!ctx) return
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((freq, i) => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type='sine'; osc.frequency.value=freq; const t=ctx.currentTime+i*0.18; gain.gain.setValueAtTime(0.0001,t); gain.gain.exponentialRampToValueAtTime(0.25,t+0.02); gain.gain.exponentialRampToValueAtTime(0.0001,t+0.5); osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.55) })
    } catch {/* ignore */}
  }, [ensureAudio])

  // tick every second, but UI changes per minute — ring animates smoothly
  useEffect(() => {
    if (running && !finished) {
      intervalRef.current = setInterval(() => {
        setSecondsInMinute(s => {
          if (s <= 1) {
            setMinutesLeft(m => {
              if (m <= 1) {
                if (intervalRef.current) clearInterval(intervalRef.current)
                return 0
              }
              return m - 1
            })
            return 60
          }
          return s - 1
        })
      }, 1000)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }
  }, [running, finished])

  useEffect(() => {
    if (minutesLeft === 0 && secondsInMinute === 60 && running && !finished) {
      // handled by tick above, but safety
    }
  }, [])

  useEffect(() => {
    if (minutesLeft === 0 && !finished && running) {
      // when minutesLeft hits 0, finish after the last minute elapses
      // we detect when minutesLeft becomes 0 via the setter
    }
  }, [minutesLeft, finished, running])

  useEffect(() => {
    if (minutesLeft === 0 && secondsInMinute === 60 && !finished) {
      // edge: if user sets 0? not possible
    }
    if (minutesLeft === 0 && !finished) {
      // check if we actually just finished: minutesLeft 0 and secondsInMinute just reset means last minute done
      // simpler: when minutesLeft hits 0, finish
      const isDone = minutesLeft === 0
      if (isDone && running) {
        setRunning(false)
        setFinished(true)
        beep()
        onComplete(customMinutes)
      }
    }
  }, [minutesLeft, finished, running, beep, onComplete, customMinutes])

  // alternative reliable finish detection: watch minutesLeft transition to 0
  useEffect(() => {
    if (running && minutesLeft === 0 && !finished) {
      setRunning(false); setFinished(true); beep(); onComplete(customMinutes)
    }
  }, [minutesLeft, running, finished, beep, onComplete, customMinutes])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); audioRef.current?.close().catch(()=>undefined) }, [])

  const toggle = () => { if (finished) return; ensureAudio(); setRunning(r=>!r) }
  const reset = () => { if (intervalRef.current) clearInterval(intervalRef.current); setRunning(false); setFinished(false); setMinutesLeft(customMinutes); setSecondsInMinute(60) }

  const elapsedMinutes = totalMinutes - minutesLeft - (secondsInMinute < 60 && running ? (secondsInMinute/60) : 0)
  const pct = totalMinutes>0 ? Math.min(100, Math.max(0, (elapsedMinutes/totalMinutes)*100)) : 0
  const dashOffset = RING * (1 - pct/100)
  const warn = minutesLeft <= 1 && running && !finished
  const quickOptions = [5,10,15,20,30,45,60]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-fade-up">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={finished ? onClose : undefined} aria-hidden="true" />
      <div className={cn('glass-liquid relative w-full max-w-md rounded-[2rem] p-7 text-center animate-rise-in overflow-hidden border border-white/[0.08]', running && 'ring-1 ring-[#a78bfa]/40 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.4)]')}>
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full blur-3xl transition-all duration-700" style={{ background: finished ? 'rgba(52,211,153,0.3)' : running ? 'rgba(139,92,246,0.35)' : 'rgba(139,92,246,0.12)' }} />
        {finished && <div className="pointer-events-none absolute inset-0 overflow-hidden"><Sparkles className="absolute top-6 left-6 w-4 h-4 text-emerald-300/60 animate-pulse"/><Sparkles className="absolute top-10 right-8 w-3 h-3 text-[#a78bfa]/50 animate-pulse" style={{animationDelay:'400ms'}}/><Sparkles className="absolute bottom-20 left-8 w-3 h-3 text-amber-300/50 animate-pulse" style={{animationDelay:'800ms'}}/></div>}

        <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition" aria-label="Zamknij timer"><X className="h-4 w-4" /></button>

        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#c4b5fd] font-bold mb-1 flex items-center justify-center gap-1.5"><Clock className="w-3 h-3"/>Timer treningowy</p>
          <h3 className="font-display text-lg font-bold leading-snug text-white line-clamp-2 mb-5">{taskTitle}</h3>

          <div className="relative mx-auto w-56 h-56">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle cx="100" cy="100" r="84" fill="none" strokeWidth="10" strokeLinecap="round" stroke={finished ? '#34d399' : warn ? '#fbbf24' : '#8b5cf6'} strokeDasharray={RING} strokeDashoffset={finished ? 0 : dashOffset} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease', filter: running ? 'drop-shadow(0 0 10px rgba(139,92,246,0.6))' : undefined }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {finished ? (
                <>
                  <Trophy className="w-10 h-10 text-emerald-300 mb-2 animate-pop-in" />
                  <p className="font-display text-2xl font-bold text-emerald-300">Ukończone!</p>
                  <p className="text-xs text-white/50 mt-1">{customMinutes} min zaliczone ✓</p>
                </>
              ) : (
                <>
                  <p className={cn('font-display text-5xl font-black tabular-nums tracking-tight transition-colors flex items-baseline gap-1 justify-center', warn ? 'text-amber-300' : 'text-white')}>
                    {running ? minutesLeft : customMinutes}
                    <span className="text-2xl font-bold opacity-60">min</span>
                  </p>
                  <p className="text-[11px] uppercase tracking-widest font-semibold mt-2 px-3 py-1 rounded-full border" style={{ color: running ? '#c4b5fd' : 'rgba(255,255,255,0.4)', background: running ? 'rgba(167,139,250,0.1)' : 'transparent', borderColor: running ? 'rgba(167,139,250,0.2)' : 'transparent' }}>
                    {running ? `zostało ${minutesLeft} min • ${secondsInMinute}s` : pct===0 ? `cel: ${customMinutes} min` : `pauza • ${minutesLeft} min`}
                  </p>
                  {!running && pct===0 && <p className="text-[10px] text-white/30 mt-1">zmienia się co minutę</p>}
                </>
              )}
            </div>
          </div>

          {!finished && !running && (
            <div className="mt-6 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-left">
              <p className="text-[11px] uppercase tracking-widest text-white/50 font-bold mb-2">Ustaw czas</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-white/40">Sugeruje trener</span>
                <span className="px-3 py-1 rounded-full bg-gradient-to-br from-[#a78bfa]/20 to-[#8b5cf6]/20 border border-[#a78bfa]/30 text-[#c4b5fd] font-bold text-sm">{defaultMinutes} min</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {quickOptions.map(o=> (
                  <button key={o} onClick={()=>setCustomMinutes(o)} className={cn('px-3 h-8 rounded-full text-xs font-semibold border transition', customMinutes===o ? 'bg-[#a78bfa] text-white border-[#a78bfa]' : 'bg-white/[0.04] text-white/60 border-white/[0.08] hover:border-[#a78bfa]/30 hover:text-white')}>{o} min</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>setCustomMinutes(Math.max(1, customMinutes-5))} className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white transition">−</button>
                <div className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#07060c] border border-white/[0.08]">
                  <input type="number" min={1} max={600} value={customMinutes} onChange={e=>setCustomMinutes(Math.max(1, parseInt(e.target.value)||1))} className="w-14 bg-transparent text-center text-lg font-black text-white outline-none" />
                  <span className="text-sm text-white/40 font-medium">minut</span>
                </div>
                <button onClick={()=>setCustomMinutes(Math.min(600, customMinutes+5))} className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white transition">+</button>
              </div>
            </div>
          )}

          {!finished ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={reset} className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.1] transition" aria-label="Reset"><RotateCcw className="h-5 w-5" /></button>
              <button onClick={toggle} className={cn('relative inline-flex items-center gap-2 rounded-2xl px-8 h-13 py-3.5 text-base font-black text-white transition-all overflow-hidden', running ? 'bg-gradient-to-br from-[#f43f5e] to-[#e11d48] shadow-[0_8px_20px_-8px_rgba(244,63,94,0.5)]' : 'bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] shadow-[0_8px_20px_-8px_rgba(139,92,246,0.6)]')}>
                {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {running ? 'Pauza' : pct>0 ? 'Wznów' : 'Start'}
              </button>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={reset} className="inline-flex items-center gap-2 rounded-2xl px-5 h-11 text-sm font-semibold text-white/70 hover:text-white bg-white/[0.06] border border-white/[0.08] transition"><RotateCcw className="h-4 w-4"/>Jeszcze raz</button>
              <button onClick={onClose} className="inline-flex items-center gap-2 rounded-2xl px-6 h-11 text-sm font-black text-white bg-gradient-to-br from-[#34d399] to-[#10b981] shadow-[0_8px_20px_-8px_rgba(52,211,153,0.5)]"><Flame className="h-4 w-4"/>Gotowe!</button>
            </div>
          )}
          {running && <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#c4b5fd]/80"><span className="w-2 h-2 rounded-full bg-[#a78bfa] animate-pulse"/>Minutowy timer — skup się na treningu</p>}
        </div>
      </div>
    </div>
  )
}
