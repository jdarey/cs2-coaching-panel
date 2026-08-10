'use client'

import { ReactNode, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AuroraBackground } from '@/components/aurora-background'
import { UnreadBadge } from '@/components/unread-badge'
import { LayoutDashboard, BookOpen, Video, BarChart2, Settings, LogOut, Menu, X, GraduationCap, MessageSquare, MessageSquareHeart, Trophy } from 'lucide-react'

type NavItem = { name: string; href: string; icon: any; badge?: 'messages' | 'feedback' }

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Menu główne',
    items: [
      { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
      { name: 'Moje sesje', href: '/student/sessions', icon: BookOpen },
      { name: 'Filmy do oglądania', href: '/student/videos', icon: Video },
      { name: 'Mój postęp', href: '/student/progress', icon: BarChart2 },
      { name: 'Moja ranga', href: '/student/rank', icon: Trophy },
    ],
  },
  {
    label: 'Komunikacja',
    items: [
      { name: 'Wiadomości', href: '/student/messages', icon: MessageSquare, badge: 'messages' },
      { name: 'Moja opinia', href: '/student/feedback', icon: MessageSquareHeart },
    ],
  },
]

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const glowRef = useRef<HTMLDivElement>(null)

  const user = session?.user
  const userRole = (user as any)?.role

  // Cursor glow: direct DOM write via rAF — no per-mousemove re-renders.
  useEffect(() => {
    let raf = 0
    const handleMouseMove = (e: MouseEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        if (glowRef.current) {
          glowRef.current.style.left = `${e.clientX}px`
          glowRef.current.style.top = `${e.clientY}px`
        }
      })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Client-side signout — never follows NextAuth's server redirect (built from
  // NEXTAUTH_URL, which on Vercel can point at a removed deployment and 404).
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false, callbackUrl: '/login' })
    } catch {
      /* cookie may already be gone — continue anyway */
    }
    router.push('/login')
    router.refresh()
  }

  if (userRole !== 'STUDENT') return null

  return (
    <div className="relative min-h-screen bg-[#060606] font-sans text-white overflow-x-hidden">
      <AuroraBackground />

      {/* Cursor follower glow */}
      <div
        ref={glowRef}
        className="fixed pointer-events-none z-0 w-[320px] h-[320px] rounded-full opacity-30 will-change-transform"
        style={{
          transform: 'translate(-50%, -50%)',
          left: '-500px',
          top: '-500px',
          background: 'radial-gradient(circle, rgba(47,182,162,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-opacity duration-300 backdrop-blur-sm',
          mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'rgba(6,6,6,0.45)' }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 z-50 h-screen w-[270px] flex-shrink-0 transition-transform duration-400 ease-out',
            sidebarOpen && mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
          style={{
            background: 'linear-gradient(180deg, rgba(20,122,107,0.5) 0%, rgba(6,6,6,0.6) 100%)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-18 items-center justify-between px-6 border-b border-white/[0.05]">
              <Link href="/student/dashboard" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 rounded-xl grid place-items-center bg-[#2fb6a2] shadow-[0_10px_30px_-8px_rgba(47,182,162,0.7)] transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                  <GraduationCap className="w-5.5 h-5.5 text-white" strokeWidth={2.2} />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
                </div>
                <div className="leading-tight">
                  <p className="font-display font-bold text-sm tracking-tight">CS2 Coaching</p>
                  <p className="text-[10px] text-white/40 font-medium tracking-wider uppercase">Panel ucznia</p>
                </div>
              </Link>
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 hover:bg-white/5" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-6 px-4">
              {navSections.map((section) => (
                <div key={section.label} className="mb-6">
                  <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-white/30 font-semibold">{section.label}</p>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={cn(
                              'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-300 overflow-hidden',
                              active ? 'text-white' : 'text-white/50 hover:text-white/85',
                            )}
                          >
                            {active && (
                              <>
                                <span className="absolute inset-0 rounded-xl bg-[#2fb6a2]/20 border border-[#2de5ca]/40" style={{ boxShadow: '0 0 24px -8px rgba(47,182,162,0.5)' }} />
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-[#2de5ca] shadow-[0_0_12px_rgba(47,182,162,0.9)]" />
                              </>
                            )}
                            {!active && <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-white/[0.03] transition-colors" />}
                            <item.icon className={cn('relative w-[18px] h-[18px] transition-colors duration-300', active ? 'text-white' : 'text-white/50 group-hover:text-white/80')} strokeWidth={2.1} />
                            <span className="relative">{item.name}</span>
                            {item.badge && <UnreadBadge kind={item.badge} />}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              <div className="mb-2">
                <p className="px-3 mb-2 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Konto</p>
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/student/settings"
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-300 overflow-hidden',
                        pathname === '/student/settings' ? 'text-white' : 'text-white/50 hover:text-white/85',
                      )}
                    >
                      {pathname === '/student/settings' && (
                        <>
                          <span className="absolute inset-0 rounded-xl bg-[#2fb6a2]/20 border border-[#2de5ca]/40" />
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-[#2de5ca]" />
                        </>
                      )}
                      {pathname !== '/student/settings' && <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-white/[0.03] transition-colors" />}
                      <Settings className={cn('relative w-[18px] h-[18px]', pathname === '/student/settings' ? 'text-white' : 'text-white/50 group-hover:text-white/80')} strokeWidth={2.1} />
                      <span className="relative">Ustawienia</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>

            {/* User card */}
            <div className="p-4 border-t border-white/[0.05]">
              <div className="rounded-2xl p-4 glass">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10 rounded-xl ring-1 ring-white/15">
                    <AvatarImage src={(user as any)?.avatarUrl || ''} alt={user?.name || ''} />
                    <AvatarFallback className="rounded-xl bg-[#2fb6a2] text-white font-display font-semibold text-sm">
                      {user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name || 'Uczeń'}</p>
                    <p className="text-[11px] text-white/40 truncate">{(user as any)?.email || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/student/settings"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-white/75 hover:text-white glass hover:bg-white/[0.06] hover:border-white/[0.12] transition-colors duration-300"
                  >
                    <Settings className="w-4 h-4" />
                    Ustawienia
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-red-300/85 hover:text-red-200 bg-red-500/[0.08] border border-red-500/15 hover:bg-red-500/15 hover:border-red-500/30 transition-colors duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                    Wyloguj
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="relative z-10 flex-1 min-w-0 min-h-screen flex flex-col">
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-30 h-16 border-b border-white/[0.05] bg-[#060606]/80 px-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/5" onClick={() => { setMobileSidebarOpen(true); setSidebarOpen(true) }}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#2fb6a2]">
                <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.2} />
              </div>
              <span className="font-display font-bold text-sm">CS2 Coaching</span>
            </div>
            <div className="w-10" />
          </header>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden lg:flex absolute top-6 left-[270px] z-40 items-center justify-center w-7 h-12 -translate-x-3.5 rounded-r-xl bg-white/[0.04] border border-l-0 border-white/[0.07] hover:bg-white/[0.08] backdrop-blur-xl transition-colors duration-300 text-white/40 hover:text-white"
            aria-label="Przełącz sidebar"
          >
            <ChevronLeftIcon className={cn('w-4 h-4 transition-transform duration-300', !sidebarOpen && 'rotate-180')} />
          </button>

          <main className="flex-1 min-h-screen pt-6 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
