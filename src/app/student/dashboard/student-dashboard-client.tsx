'use client'

import { useEffect, useRef, useState } from 'react'
import { formatDate, formatDateTime, STATUS_LABELS, STATUS_COLORS, VIDEO_STATUS_LABELS, VIDEO_STATUS_COLORS, cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Video, BookOpen, CheckCircle, Clock, PlayCircle, TrendingUp, ArrowRight, Target, Trophy, Sparkles, Zap, Shield, Play, Clock as ClockIcon, ArrowRight as ArrowRightIcon, BookOpen as BookOpenIcon, Video as VideoIcon, Target as TargetIcon, Trophy as TrophyIcon, TrendingUp as TrendingUpIcon, Sparkles as SparklesIcon, Zap as ZapIcon, Shield as ShieldIcon, Play as PlayIcon, Clock as ClockIcon2, BookOpen as BookOpenIcon2, Video as VideoIcon2, Target as TargetIcon2, Trophy as TrophyIcon2, TrendingUp as TrendingUpIcon2, Sparkles as SparklesIcon2, Zap as ZapIcon2, Shield as ShieldIcon2 } from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: string
  title: string
  description: string | null
  status: string
  scheduledAt: string | null
  coach: { id: string; name: string | null; email: string; avatarUrl: string | null }
  tags: { tag: { id: string; name: string; color: string } }[]
  videos: { video: { id: string; title: string; thumbnail: string | null } }[]
  _count: { videos: number }
}

interface Progress {
  id: string
  status: string
  progress: number
  note: string | null
  watchedAt: string | null
  video: { id: string; title: string; thumbnail: string | null; tags: { tag: { id: string; name: string; color: string } }[] }
  session: { id: string; title: string }
}

interface Coach {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface Stats {
  totalVideos: number
  pending: number
  watching: number
  watched: number
  implemented: number
  totalSessions: number
  activeSessions: number
}

interface StudentDashboardClientProps {
  initialStats: Stats
  initialSessions: Session[]
  initialProgress: Progress[]
  initialCoach: Coach | null
}

export function StudentDashboardClient({ initialStats, initialSessions, initialProgress, initialCoach }: StudentDashboardClientProps) {
  const { totalVideos, pending, watching, watched, implemented, totalSessions, activeSessions } = initialStats
  const sessions = initialSessions
  const progress = initialProgress
  const coach = initialCoach

  const completionRate = totalVideos > 0 ? Math.round(((watched + implemented) / totalVideos) * 100) : 0

  const statCards = [
    { name: 'Wszystkie filmy', value: totalVideos, icon: 'video', color: 'from-[#7c6fff] to-[#5a4fff]' },
    { name: 'Do oglądania', value: pending, icon: 'clock', color: 'from-[#f59e0b] to-[#f97316]' },
    { name: 'Oglądam', value: watching, icon: 'play', color: 'from-[#3b82f6] to-[#06b6d4]' },
    { name: 'Zakończone', value: watched + implemented, icon: 'check', color: 'from-[#22c55e] to-[#16a34a]' },
  ]

  const recentProgress = progress.slice(0, 5)
  const upcomingSessions = sessions.filter((s) => s.status === 'ACTIVE').slice(0, 3)
  const completionRateValue = completionRate

  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#060606]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7c6fff] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#8a8a8a] text-sm font-medium">Ładowanie panelu...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#060606] text-white font-inter antialiased overflow-x-hidden">
      {/* Grain overlay */}
      <div className="fixed inset-0 pointer-events-none z-10 opacity-[0.03]" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat',
        backgroundSize: '200px',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% -10%, rgba(255,255,255,0.10) 0%, transparent 35%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 25%)',
        filter: 'blur(90px)',
      }} />

      {/* Blobs */}
      <div className="fixed top-10% left-14% w-[420px] h-[420px] rounded-full blur-[70px] opacity-35 pointer-events-none z-0" style={{
        background: 'radial-gradient(circle, rgba(124,111,255,0.065) 0%, transparent 60%)',
        filter: 'blur(70px)',
        animation: 'floatBlob 14s ease-in-out infinite',
      }} />
      <div className="fixed bottom-8% right-18% w-[420px] h-[420px] rounded-full blur-[70px] opacity-35 pointer-events-none z-0" style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.065), transparent 60%)',
        filter: 'blur(70px)',
        animation: 'floatBlob 14s ease-in-out infinite',
        animationDelay: '-7s',
      }} />

      {/* Grid pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Mouse light */}
      <div className="fixed w-[280px] h-[280px] rounded-full pointer-events-none z-0 filter-blur-30" style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.045), transparent 70%)',
        transform: 'translate(-50%, -50%)',
        left: '0px',
        top: '0px',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.68) 100%)',
        animation: 'vignettePulse 8s ease-in-out infinite alternate',
      }} />

      <style jsx global>{`
        @keyframes vignettePulse { from { opacity: 0.9; } to { opacity: 1; } }
        @keyframes floatBlob { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(55px,-35px) scale(1.08); } }
      `}

      <div className="relative z-10 min-h-screen">
        {/* Header/Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(22px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="font-space text-xl font-bold tracking-tight" style={{ color: '#fff' }}>CS2 Coaching</div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#8a8a8a] hidden md:block">Panel ucznia</span>
              <a href="/logout" className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2">
                Wyloguj się
              </a>
            </div>
          </div>
        </nav>

        <main className="pt-20 pb-20 px-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12">
              <h1 className="font-space text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ background: 'linear-gradient(135deg, #fff 0%, #7c6fff 50%, #5a4fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Panel ucznia
              </h1>
              <p className="text-[#8a8a8a] text-lg max-w-2xl">Twój postęp, sesje i filmy w jednym miejscu</p>
            </div>

            {/* Coach Card */}
            {coach && (
              <div className="mb-10" style={{ perspective: '1000px' }}>
                <div className="relative rounded-2xl overflow-hidden" style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(20px)',
                  transformStyle: 'preserve-3d',
                }}>
                  <div className="absolute inset-0 rounded-2xl p-[1px] pointer-events-none" style={{
                    background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.16), transparent 42%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity 0.3s ease',
                  }} />
                  <div className="relative p-6" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.022), transparent)' }}>
                    <div className="flex items-center gap-4">
                      <div className="relative p-3 rounded-xl shadow-xl" style={{
                        background: 'linear-gradient(135deg, #7c6fff 0%, #5a4fff 100%)',
                        boxShadow: '0 20px 50px -12px rgba(124,111,255,0.4)'
                      }}>
                        <span style={{ fontSize: '1.5rem' }}>👨‍🏫</span>
                      </div>
                      <div>
                        <h3 className="font-space text-xl font-bold">Twój trener</h3>
                        <p className="text-[rgba(232,232,232,0.48)] text-sm">{coach.name || coach.email}</p>
                        <p className="text-[rgba(138,138,138,0.8)] text-xs mt-1">Skontaktuj się w razie pytań</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
              {statCards.map((stat, i) => (
                <div key={stat.name} className="group relative rounded-2xl p-6 overflow-hidden transition-all duration-500 hover:translate-y-[-4px] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)]" style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3)',
                }}>
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: 'radial-gradient(ellipse at top center, rgba(124,111,255,0.05) 0%, transparent 50%)',
                    borderRadius: '20px',
                  }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-[rgba(232,232,232,0.48)] text-sm font-medium font-inter">{stat.name}</p>
                      <p className="font-space text-3xl font-bold mt-1" style={{ color: '#fff' }}>{stat.value}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{
                      background: `linear-gradient(135deg, ${stat.color.split(' to ')[0].replace('from-', '')} 0%, ${stat.color.split(' to ')[1].replace('to-', '')} 100%)`,
                      boxShadow: '0 8px 30px -8px rgba(124,111,255,0.4)',
                    }}>
                      <span className="w-6 h-6 text-white" style={{ fontSize: '1.5rem' }}>{getIcon(stat.icon)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Overview */}
            <div className="grid gap-6 lg:grid-cols-3 mb-10">
              {/* Progress Card */}
              <div className="lg:col-span-2 relative rounded-2xl p-6 overflow-hidden" style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '20px',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3)',
              }}>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(ellipse at top center, rgba(124,111,255,0.05) 0%, transparent 50%)',
                  borderRadius: '20px',
                }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-space text-xl font-bold">Postęp oglądania filmów</h3>
                      <p className="text-[rgba(232,232,232,0.48)] text-sm mt-1">Twój postęp w nauce</p>
                    </div>
                    <div className="text-right">
                      <p className="font-space text-3xl font-bold" style={{ background: 'linear-gradient(135deg, #7c6fff 0%, #5a4fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{completionRate}%</p>
                      <p className="text-[rgba(138,138,138,0.8)] text-xs">ukończone</p>
                    </div>
                  </div>
                  <div style={{ height: '12px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${completionRate}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #7c6fff 0%, #5a4fff 100%)',
                      boxShadow: '0 0 18px rgba(124,111,255,0.22)',
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-6 text-center">
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                      <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{pending}</p>
                      <p className="text-xs text-[rgba(138,138,138,0.8)]">Do oglądania</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                      <p className="text-2xl font-bold" style={{ color: '#3b82f6' }}>{watching}</p>
                      <p className="text-xs text-[rgba(138,138,138,0.8)]">W trakcie</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                      <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{watched}</p>
                      <p className="text-xs text-[rgba(138,138,138,0.8)]">Obejrzane</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                      <p className="text-2xl font-bold" style={{ color: '#a855f7' }}>{implemented}</p>
                      <p className="text-xs text-[rgba(138,138,138,0.8)]">Wdrożone</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coach Quick Actions */}
              <div className="relative rounded-2xl p-6" style={{
                background: 'linear-gradient(135deg, rgba(124,111,255,0.1) 0%, rgba(90,79,255,0.05) 100%)',
                border: '1px solid rgba(124,111,255,0.2)',
                borderRadius: '20px',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 0 40px -10px rgba(124,111,255,0.2)',
              }}>
                <h4 className="font-space text-lg font-bold mb-4">Szybkie akcje</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a href="/student/sessions" className="group flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:translate-x-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', backdropFilter: 'blur(20px)' }}>
                    <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', boxShadow: '0 8px 24px -8px rgba(59,130,246,0.4)' }}>
                      <span style={{ fontSize: '1.5rem' }}>📖</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white group-hover:text-[#7c6fff] transition-colors truncate">Wszystkie sesje</p>
                      <p className="text-xs text-[rgba(138,138,138,0.7)]">Przeglądaj swoje sesje</p>
                    </div>
                    <span className="w-5 h-5 text-white/40 group-hover:text-[#7c6fff] transition-colors group-hover:translate-x-1" style={{ fontSize: '1.5rem' }}>→</span>
                  </a>
                  <a href="/student/videos" className="group flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:translate-x-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', backdropFilter: 'blur(20px)' }}>
                    <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', boxShadow: '0 8px 24px -8px rgba(245,158,11,0.4)' }}>
                      <span style={{ fontSize: '1.5rem' }}>🎬</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white group-hover:text-[#7c6fff] transition-colors truncate">Filmy do oglądania</p>
                      <p className="text-xs text-[rgba(138,138,138,0.7)]">Twoja lista filmów</p>
                    </div>
                    <span className="w-5 h-5 text-white/40 group-hover:text-[#7c6fff] transition-colors group-hover:translate-x-1" style={{ fontSize: '1.5rem' }}>→</span>
                  </a>
                  <a href="/student/progress" className="group flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:translate-x-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', backdropFilter: 'blur(20px)' }}>
                    <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 8px 24px -8px rgba(34,197,94,0.4)' }}>
                      <span style={{ fontSize: '1.5rem' }}>📈</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white group-hover:text-[#7c6fff] transition-colors truncate">Mój postęp</p>
                      <p className="text-xs text-[rgba(138,138,138,0.7)]">Statystyki i wykresy</p>
                    </div>
                    <span className="w-5 h-5 text-white/40 group-hover:text-[#7c6fff] transition-colors group-hover:translate-x-1" style={{ fontSize: '1.5rem' }}>→</span>
                  </a>
                  <a href="/student/settings" className="group flex items-center gap-3 p-4 rounded-xl transition-all duration-300 hover:translate-x-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', backdropFilter: 'blur(20px)' }}>
                    <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)', boxShadow: '0 8px 24px -8px rgba(168,85,247,0.4)' }}>
                      <span style={{ fontSize: '1.5rem' }}>🎯</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white group-hover:text-[#7c6fff] transition-colors truncate">Ustawienia</p>
                      <p className="text-xs text-[rgba(138,138,138,0.7)]">Profil i preferencje</p>
                    </div>
                    <span className="w-5 h-5 text-white/40 group-hover:text-[#7c6fff] transition-colors group-hover:translate-x-1" style={{ fontSize: '1.5rem' }}>→</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="relative rounded-2xl overflow-hidden" style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '20px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.3)',
            }}>
              <div className="flex border-b border-white/10">
                <button className="px-6 py-4 font-medium text-sm transition-colors relative" style={{ background: 'transparent', border: 'none', color: '#8a8a8a', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
                  Nadchodzące sesje
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(90deg, #7c6fff 0%, #5a4fff 100%)' }} />
                </div>
                <button className="px-6 py-4 font-medium text-sm transition-colors relative" style={{ background: 'transparent', border: 'none', color: '#8a8a8a', fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600 }}>
                  Ostatnia aktywność
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(90deg, #7c6fff 0%, #5a4fff 100%)' }} />
                </div>
              </div>

              {/* Sessions Tab */}
              <div className="p-6">
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                      <span style={{ fontSize: '1.5rem' }}>📖</span>
                    </div>
                    <h4 className="font-space text-lg font-medium mb-2">Brak nadchodzących sesji</h4>
                    <p className="text-[rgba(138,138,138,0.6)]">Twój trener poinformuje Cię o nowej sesji</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.map((session) => (
                      <div key={session.id} className="group flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:translate-x-2" style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(20px)',
                      }}>
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', boxShadow: '0 8px 24px -8px rgba(59,130,246,0.4)' }}>
                            <span style={{ fontSize: '1.5rem' }}>📖</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate group-hover:text-[#7c6fff] transition-colors">{session.title}</h4>
                            <p className="text-sm text-[rgba(138,138,138,0.6)] mt-1">
                              {session.scheduledAt ? formatDateTime(session.scheduledAt) : 'Bez terminu'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[session.status])}>
                            {STATUS_LABELS[session.status]}
                          </Badge>
                          <a href={`/student/sessions/${session.id}`} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 text-sm font-medium" style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            color: '#fff',
                            textDecoration: 'none',
                          }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(124,111,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                            Otwórz
                            <span style={{ fontSize: '1.2rem', display: 'inline-block', transition: 'transform 0.2s' }}>→</span>
                          </a>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {session.tags.slice(0, 3).map((st) => (
                            <Badge key={st.tag.id} variant="secondary" className={cn('text-xs', st.tag.color && `bg-[${st.tag.color}] text-white border-[${st.tag.color}]`)}>
                              {st.tag.name}
                            </Badge>
                          ))}
                          {session.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{session.tags.length - 3}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Progress */}
          <div className="mt-10">
            <h3 className="font-space text-2xl font-bold mb-6">Ostatnia aktywność</h3>
            {recentProgress.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '20px',
                backdropFilter: 'blur(20px)',
              }}>
                <span style={{ fontSize: '2rem' }}>🎬</span>
                <h4 className="font-space text-lg font-medium mb-2">Brak ostatniej aktywności</h4>
                <p className="text-[rgba(138,138,138,0.5)]">Rozpocznij oglądanie filmów z sesji</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProgress.map((p) => (
                  <div key={p.id} className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:translate-x-2" style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(20px)',
                  }}>
                    <div className="relative w-16 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      {p.video.thumbnail ? (
                        <img src={p.video.thumbnail} alt={p.video.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '1.5rem' }}>🎬</span>
                        </div>
                      )}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, #7c6fff 0%, #5a4fff 100%)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate group-hover:text-[#7c6fff] transition-colors">{p.video.title}</h4>
                      <p className="text-sm text-[rgba(138,138,138,0.6)] truncate">{p.session.title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={cn(VIDEO_STATUS_COLORS[p.status])}>
                        {VIDEO_STATUS_LABELS[p.status]}
                      </Badge>
                      {p.status !== 'IMPLEMENTED' && p.session && (
                        <a href={`/student/sessions/${p.session.id}`} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-300 text-sm font-medium" style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          color: '#fff',
                          textDecoration: 'none',
                        }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(124,111,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                          Kontynuuj
                          <span style={{ fontSize: '1.2rem', display: 'inline-block', transition: 'transform 0.2s' }}>→</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes vignettePulse { from { opacity: 0.9; } to { opacity: 1; } }
        @keyframes floatBlob { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(55px,-35px) scale(1.08); } }
      `}

      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(circle at 50% -10%, rgba(255,255,255,0.10) 0%, transparent 35%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 25%)',
        filter: 'blur(90px)',
      }} />

      {/* Blobs */}
      <div className="fixed top-10% left-14% w-[420px] h-[420px] rounded-full blur-[70px] opacity-35 pointer-events-none z-0" style={{
        background: 'radial-gradient(circle, rgba(124,111,255,0.065) 0%, transparent 60%)',
        filter: 'blur(70px)',
        animation: 'floatBlob 14s ease-in-out infinite',
      }} />
      <div className="fixed bottom-8% right-18% w-[420px] h-[420px] rounded-full blur-[70px] opacity-35 pointer-events-none z-0" style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.065), transparent 60%)',
        filter: 'blur(70px)',
        animation: 'floatBlob 14s ease-in-out infinite',
        animationDelay: '-7s',
      }} />

      {/* Grid pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Mouse light */}
      <div className="fixed w-[280px] h-[280px] rounded-full pointer-events-none z-0 filter-blur-30" style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.045), transparent 70%)',
        transform: 'translate(-50%, -50%)',
        left: '0px',
        top: '0px',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.68) 100%)',
        animation: 'vignettePulse 8s ease-in-out infinite alternate',
      }} />

      <style jsx global>{`
        @keyframes vignettePulse { from { opacity: 0.9; } to { opacity: 1; } }
        @keyframes floatBlob { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(55px,-35px) scale(1.08); } }
      `}
    </div>
  )
}

function getIcon(name: string): string {
  switch (name) {
    case 'video': return '🎬'
    case 'clock': return '⏰'
    case 'play': return '▶️'
    case 'check': return '✅'
    default: return '📊'
  }
}