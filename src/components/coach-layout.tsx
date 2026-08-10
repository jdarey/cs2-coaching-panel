'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AuroraBackground } from '@/components/aurora-background'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Video,
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/coach/dashboard', icon: LayoutDashboard },
  { name: 'Uczniowie', href: '/coach/students', icon: Users },
  { name: 'Sesje', href: '/coach/sessions', icon: BookOpen },
  { name: 'Filmy', href: '/coach/videos', icon: Video },
  { name: 'Tagi', href: '/coach/tags', icon: Tag },
  { name: 'Ustawienia', href: '/coach/settings', icon: Settings },
]

export function CoachLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const user = session?.user
  const userRole = (user as any)?.role

  if (userRole !== 'COACH') return null

  return (
    <div className="relative min-h-screen bg-[#06070d] font-sans text-white overflow-x-hidden">
      <AuroraBackground />

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-opacity duration-300 backdrop-blur-sm',
          mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'rgba(6,7,13,0.7)' }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 z-50 h-screen w-[260px] flex-shrink-0 transition-transform duration-300 ease-out',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
          style={{
            background: 'linear-gradient(180deg, rgba(13,14,20,0.92) 0%, rgba(8,9,14,0.92) 100%)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.06]">
              <Link href="/coach/dashboard" className="flex items-center gap-2.5 group">
                <div className="relative w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br from-[#a855f7] to-[#7c3aed] shadow-[0_8px_24px_-8px_rgba(168,85,247,0.6)] transition-transform group-hover:scale-105">
                  <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
                </div>
                <div className="leading-tight">
                  <p className="font-display font-bold text-sm tracking-tight">CS2 Coaching</p>
                  <p className="text-[10px] text-white/40 font-medium tracking-wide uppercase">Panel trenera</p>
                </div>
              </Link>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 hover:bg-white/5" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-5 px-3">
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-white/30 font-semibold">Menu</p>
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden',
                          active ? 'text-white' : 'text-white/55 hover:text-white',
                        )}
                      >
                        {active && (
                          <>
                            <span
                              className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#c084fc]/15 to-[#7c3aed]/5 border border-[#c084fc]/25"
                              style={{ boxShadow: '0 0 24px -6px rgba(168,85,247,0.35)' }}
                            />
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2.5px] rounded-r-full bg-gradient-to-b from-[#d8b4fe] to-[#7c3aed] shadow-[0_0_10px_rgba(168,85,247,0.7)]" />
                          </>
                        )}
                        {!active && <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-white/[0.04] transition-colors" />}
                        <item.icon className={cn('relative w-[18px] h-[18px] transition-colors', active ? 'text-[#d8b4fe]' : 'text-white/50 group-hover:text-white/80')} strokeWidth={2.1} />
                        <span className="relative">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* User card */}
            <div className="p-3 border-t border-white/[0.06]">
              <div className="rounded-2xl p-3 bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-9 w-9 rounded-xl ring-1 ring-white/15">
                    <AvatarImage src={(user as any)?.avatarUrl || ''} alt={user?.name || ''} />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#c084fc] to-[#7c3aed] text-white font-display font-semibold text-sm">
                      {user?.name?.[0] || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name || 'Trener'}</p>
                    <p className="text-[11px] text-white/40 truncate">{(user as any)?.email || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/coach/settings"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-white/75 hover:text-white bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.13] transition-all duration-300"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Ustawienia
                  </Link>
<button
                    onClick={() => signOut({ redirect: true, callbackUrl: '/login' })}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red-300/85 hover:text-red-200 bg-red-500/[0.08] border border-red-500/15 hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-300"
                  >
                    <LogOut className="w-3.5 h-3.5" />
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
          <header className="lg:hidden sticky top-0 z-30 h-14 border-b border-white/[0.06] backdrop-blur-2xl bg-[#06070d]/70 px-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/5" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg grid place-items-center bg-gradient-to-br from-[#c084fc] to-[#7c3aed]">
                <ShieldCheck className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
              </div>
              <span className="font-display font-bold text-sm">CS2 Coach</span>
            </div>
            <div className="w-9" />
          </header>

          <main className="flex-1 min-h-screen pt-4 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
