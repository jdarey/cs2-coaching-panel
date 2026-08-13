'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Sparkles, ShieldCheck, LayoutDashboard } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Full-screen premium SaaS transition shown while redirecting after an auth
 * action (login / registration). Plays a short animated sequence — pulsing
 * logo rings, staged messages, animated progress bar — then navigates.
 *
 * Usage: keep this mounted only while `visible`; it self-navigates to `to`.
 */
export function RedirectOverlay({
  to,
  visible,
  label = 'Przygotowujemy Twój panel',
  stages = ['Uwierzytelnianie', 'Ładowanie danych', 'Prawie gotowe'],
}: {
  to: string
  visible: boolean
  label?: string
  stages?: string[]
}) {
  const router = useRouter()
  const [stageIdx, setStageIdx] = useState(0)
  const [exiting, setExiting] = useState(false)

  // Advance through the staged messages over ~2.2s total.
  useEffect(() => {
    if (!visible) return
    const perStage = 1900 / Math.max(1, stages.length)
    const interval = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, stages.length - 1))
    }, perStage)
    return () => clearInterval(interval)
  }, [visible, stages.length])

  // Fade out, then navigate once the sequence completes.
  useEffect(() => {
    if (!visible) return
    const fadeTimer = setTimeout(() => setExiting(true), 2100)
    const navTimer = setTimeout(() => {
      router.replace(to)
      router.refresh()
    }, 2500)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(navTimer)
    }
  }, [visible, to, router])

  if (!visible) return null

  const stage = stages[Math.min(stageIdx, stages.length - 1)]

  return (
    <div className={`redirect-overlay redirect-overlay-enter ${exiting ? 'redirect-exit' : ''}`} aria-live="polite" aria-busy="true">
      {/* Ambient aurora + vignette */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full blur-[140px] animate-aurora"
          style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(139,92,246,0.4) 0%, rgba(109,40,217,0.14) 45%, transparent 78%)' }} />
        <div className="absolute -bottom-52 -right-40 w-[760px] h-[760px] rounded-full blur-[130px] animate-aurora-slow"
          style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(45,229,202,0.2) 0%, rgba(20,184,166,0.08) 50%, transparent 80%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(5,5,8,0.85) 100%)' }} />
      </div>

      {/* Fine grain + top hairline */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" aria-hidden />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-[#a78bfa]/70 to-transparent" aria-hidden />

      {/* Center stage */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Logo with expanding rings */}
        <div className="relative w-24 h-24 mb-9" aria-hidden>
          <span className="redirect-ring" />
          <span className="redirect-ring" />
          <span className="redirect-ring" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#a78bfa]/[0.16] to-transparent blur-2xl" />
          <div className="relative w-full h-full rounded-3xl grid place-items-center bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/20 shadow-[0_0_70px_-10px_rgba(139,92,246,0.7)] animate-breathe">
            <GraduationCap className="w-11 h-11 text-white" strokeWidth={1.8} />
            <span className="absolute -inset-1.5 rounded-[20px] border border-[#a78bfa]/30 redirect-logo-spin" />
          </div>
        </div>

        {/* Stage message */}
        <div key={stageIdx} className="redirect-stage">
          <p className="font-display text-2xl sm:text-[1.7rem] font-bold tracking-tight text-white flex items-center justify-center gap-2.5">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#2de5ca] opacity-60 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#14b8a6]" />
            </span>
            {stage}
            <span className="redirect-dots" />
          </p>
          <p className="mt-2 text-sm text-white/40 font-light tracking-wide">{label}</p>
        </div>

        {/* Progress bar */}
        <div className="w-64 sm:w-80 mt-9 relative" aria-hidden>
          <div className="h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
            <div className="redirect-bar" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/25 font-semibold">
            <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Secure</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SSL</span>
            <span className="inline-flex items-center gap-1"><LayoutDashboard className="w-3 h-3" /> SaaS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
