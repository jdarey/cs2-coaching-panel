'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AuroraBackground } from '@/components/aurora-background'
import { LayoutDashboard, BookOpen, Video, BarChart2, Settings, LogOut, Menu, X, GraduationCap, ChevronLeft, Sparkles } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { name: 'Moje sesje', href: '/student/sessions', icon: BookOpen },
  { name: 'Filmy do oglądania', href: '/student/videos', icon: Video },
  { name: 'Mój postęp', href: '/student/progress', icon: BarChart2 },
  { name: 'Ustawienia', href: '/student/settings', icon: Settings },
]

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const user = session?.user
  const userRole = (user as any)?.role

  // All hooks must run unconditionally - an early return above this effect
  // changed the hook count between renders and crashed the layout once the
  // session loaded ("Rendered more hooks than during the previous render").
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  if (userRole !== 'STUDENT') return null

  return (
    <div className="relative min-h-screen bg-[#06070d] font-sans text-white overflow-x-hidden">
      <AuroraBackground />

      {/* Cursor follower glow */}
      <div
        className="fixed pointer-events-none z-0 w-[300px] h-[300px] rounded-full blur-[80px] opacity-30 transition-all duration-500"
        style={{
          transform: `translate(-50%, -50%)`,
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          background: 'radial-gradient(circle, rgba(139,123,255,0.25) 0%, transparent 70%)',
        }}
      />

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-opacity duration-300 backdrop-blur-sm',
          mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'rgba(6,7,13,0.8)' }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 z-50 h-screen w-[270px] flex-shrink-0 transition-transform duration-400 ease-out',
            sidebarOpen && mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
          style={{
            background: 'linear-gradient(180deg, rgba(10,11,18,0.95) 0%, rgba(6,7,13,0.95) 100%)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-18 items-center justify-between px-6 border-b border-white/[0.05]">
              <Link href="/student/dashboard" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] shadow-[0_10px_30px_-8px_rgba(139,123,255,0.7)] transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
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
              <p className="px-3 mb-3 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Menu</p>
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300 overflow-hidden',
                          active ? 'text-white' : 'text-white/50 hover:text-white/85',
                        )}
                      >
                        {active && (
                          <>
                            <span className="absolute inset-0 rounded-xl glass-card" style={{ boxShadow: '0 0 24px -6px rgba(139,123,255,0.4)' }} />
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-r-full bg-gradient-to-b from-[#a594ff] to-[#5a4fff] shadow-[0_0_12px_rgba(139,123,255,0.8)]" />
                          </>
                        )}
                        {!active && <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-white/[0.03] transition-colors" />}
                        <item.icon className={cn('relative w-[18px] h-[18px] transition-all duration-300', active ? 'text-[#a594ff]' : 'text-white/50 group-hover:text-white/80')} strokeWidth={2.1} />
                        <span className="relative">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* User card */}
            <div className="p-4 border-t border-white/[0.05]">
              <div className="rounded-2xl p-4 glass">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10 rounded-xl ring-1 ring-white/15">
                    <AvatarImage src={(user as any)?.avatarUrl || ''} alt={user?.name || ''} />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#8b7bff] to-[#5a4fff] text-white font-display font-semibold text-sm">
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
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-white/75 hover:text-white glass hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <Settings className="w-4 h-4" />
                    Ustawienia
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium text-red-300/85 hover:text-red-200 bg-red-500/[0.08] border border-red-500/15 hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-300"
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
        <div className="flex-1 min-w-0 min-h-screen flex flex-col">
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-30 h-16 border-b border-white/[0.05] backdrop-blur-2xl bg-[#06070d]/70 px-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/5" onClick={() => { setMobileSidebarOpen(true); setSidebarOpen(true) }}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg grid place-items-center bg-gradient-to-br from-[#8b7bff] to-[#5a4fff]">
                <GraduationCap className="w-4 h-4 text-white" strokeWidth={2.2} />
              </div>
              <span className="font-display font-bold text-sm">CS2 Coaching</span>
            </div>
            <div className="w-10" />
          </header>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden lg:flex absolute top-6 left-[270px] z-40 items-center justify-center w-7 h-12 -translate-x-3.5 rounded-r-xl bg-white/[0.04] border border-l-0 border-white/[0.07] hover:bg-white/[0.08] backdrop-blur-xl transition-all duration-300 text-white/40 hover:text-white"
            aria-label="Przełącz sidebar"
          >
            <ChevronLeft className={cn('w-4 h-4 transition-transform duration-300', !sidebarOpen && 'rotate-180')} />
          </button>

          <main className="flex-1 min-h-screen pt-6 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}