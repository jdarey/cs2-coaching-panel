'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { RANKS, getRank, nextRank, getLevel, getStreak, getAchievements } from '@/lib/gamification'
import { RankEmblem } from '@/components/rank-emblem'
import { Trophy, Flame, Zap, Loader2, Crown } from 'lucide-react'

type P = {
  id: string
  status: string
  watchedAt: string | null
  updatedAt: string
  progress: number
}

export function StudentRankClient() {
  const [progress, setProgress] = useState<P[]>([])
  const [sessionsCount, setSessionsCount] = useState(0)
  const [feedbackCount, setFeedbackCount] = useState(0)
  const [messagesSent, setMessagesSent] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [pRes, sRes, fRes, mRes] = await Promise.all([
        fetch('/api/progress'),
        fetch('/api/sessions'),
        fetch('/api/feedback'),
        fetch('/api/messages'),
      ])
      const p = pRes.ok ? await pRes.json() : []
      setProgress(p ?? [])
      const s = sRes.ok ? await sRes.json() : []
      setSessionsCount(Array.isArray(s) ? s.length : 0)
      const f = fRes.ok ? await fRes.json() : { feedback: [] }
      setFeedbackCount(f.feedback?.length ?? 0)
      const m = mRes.ok ? await mRes.json() : { conversations: [] }
      setMessagesSent((m.conversations?.[0]?.lastMessage?.senderId === undefined ? 0 : 0))
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const total = progress.length
  const watched = progress.filter((p) => p.status === 'WATCHED').length
  const implemented = progress.filter((p) => p.status === 'IMPLEMENTED').length
  const pending = progress.filter((p) => p.status === 'PENDING').length
  const watching = progress.filter((p) => p.status === 'WATCHING').length
  const completionRate = total > 0 ? Math.round(((watched + implemented) / total) * 100) : 0

  const rank = getRank(completionRate)
  const next = nextRank(completionRate)
  const levelInfo = getLevel(watched + implemented)
  const streak = getStreak(progress.map((p) => p.watchedAt || p.updatedAt))
  const achievements = getAchievements({ total, pending, watching, watched, implemented, sessionsCount, feedbackCount, messagesSent })
  const earnedCount = achievements.filter((a) => a.earned).length
  const currentIdx = RANKS.findIndex((r) => r.key === rank.key)

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center text-white/40">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Ładowanie rangi…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-semibold text-white/70 mb-3">
          <Trophy className="w-3.5 h-3.5 text-[#2de5ca]" />
          TWOJA KARIERA
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-gradient-vantor">Moja ranga</h1>
        <p className="mt-2 text-white/50 text-sm">Każdy obejrzany i wdrożony film przybliża Cię do kolejnej rangi. Jak w grze — ale na serio.</p>
      </div>

      {/* Current rank hero */}
      <div className="bento-card p-6 md:p-8 relative overflow-hidden mb-8">
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-30" style={{ background: `radial-gradient(50% 50% at 50% 100%, ${rank.color} 0%, ${rank.glow} 70%, transparent 100%)` }} />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <RankEmblem rank={rank} size={110} />
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold mb-1">Aktualna ranga</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white">{rank.name}</h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 max-w-sm h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${next ? Math.min(100, ((completionRate - rank.min) / ((next.min - rank.min) || 1)) * 100) : 100}%`,
                    background: `linear-gradient(90deg, ${rank.color}, ${next?.color || rank.color})`,
                  }}
                />
              </div>
              <span className="text-sm text-white/55">
                {next ? `${next.min - completionRate}% do ${next.name}` : 'Maksymalna ranga! 👑'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="bento-card px-4 py-3 text-center">
              <p className="font-display text-2xl font-bold text-[#2de5ca]">{levelInfo.level}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Poziom</p>
            </div>
            <div className="bento-card px-4 py-3 text-center">
              <p className="font-display text-2xl font-bold text-[#2de5ca]">{streak}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1 flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> Seria</p>
            </div>
            <div className="bento-card px-4 py-3 text-center">
              <p className="font-display text-2xl font-bold text-[#2de5ca]">{completionRate}%</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Postęp</p>
            </div>
          </div>
        </div>
        <div className="relative mt-6 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#2de5ca]" />
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#14b8a6] to-[#2de5ca] transition-all duration-1000" style={{ width: `${levelInfo.pct}%` }} />
          </div>
          <span className="text-xs text-white/45">{levelInfo.xp}/{levelInfo.xpToNext} XP</span>
        </div>
      </div>

      {/* Rank ladder */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="section-pill"><Crown className="w-3.5 h-3.5" /> Drabinka rang</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RANKS.map((r, i) => {
            const isCurrent = i === currentIdx
            const isPassed = i < currentIdx
            return (
              <div
                key={r.key}
                className={cn(
                  'bento-card flex items-center gap-4 p-4 transition-all duration-300',
                  isCurrent && 'border-[#2de5ca]/40',
                  !isCurrent && !isPassed && 'opacity-45 grayscale',
                )}
              >
                <RankEmblem rank={r} size={44} glow={false} />
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isCurrent ? 'text-white' : 'text-white/70')}>{r.name}</p>
                  <p className="text-[11px] text-white/40">{r.min}% ukończenia</p>
                </div>
                {isCurrent && <span className="ml-auto shrink-0 text-[10px] font-bold text-[#2de5ca]">TWOJA</span>}
                {isPassed && <span className="ml-auto shrink-0 text-[#2de5ca]">✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="section-pill"><Trophy className="w-3.5 h-3.5" /> Osiągnięcia</span>
          <span className="text-xs text-white/40">{earnedCount}/{achievements.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {achievements.map((a) => (
            <div
              key={a.key}
              className={cn(
                'bento-card flex items-start gap-3 p-4 transition-all duration-300',
                a.earned ? 'border-[#2de5ca]/30' : 'opacity-40 grayscale',
              )}
            >
              <span className="text-2xl">{a.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/85 leading-tight">{a.name}</p>
                <p className="text-[11px] text-white/40 mt-1 leading-snug">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
