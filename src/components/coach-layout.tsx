'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AuroraBackground } from '@/components/aurora-background'
import { UnreadBadge } from '@/components/unread-badge'
import {
  LayoutDashboard, Users, BookOpen, Video, Tag, Settings, LogOut, Menu, X,
  ShieldCheck, MessageSquare, MessageSquareHeart,
} from 'lucide-react'

type NavItem = { name: string; href: string; icon: any; badge?: 'messages' | 'feedback' }

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Menu główne',
    items: [
      { name: 'Dashboard', href: '/coach/dashboard', icon: LayoutDashboard },
      { name: 'Uczniowie', href: '/coach/students', icon: Users },
      { name: 'Sesje', href: '/coach/sessions', icon: BookOpen },
      { name: 'Filmy', href: '/coach/videos', icon: Video },
      { name: 'Tagi', href: '/coach/tags', icon: Tag },
    ],
  },
  {
    label: 'Komunikacja',
    items: [
      { name: 'Wiadomości', href: '/coach/messages', icon: MessageSquare, badge: 'messages' },
      { name: 'Opinie uczniów', href: '/coach/feedback', icon: MessageSquareHeart, badge: 'feedback' },
    ],
  },
]

export function CoachLayout({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const user = session?.user

  // Client-side signout: clears the session, then navigates to /login on the
  // SAME origin. Never follows NextAuth's server redirect, which is built from
  // NEXTAUTH_URL and can point at a stale/removed deployment (Vercel
  // DEPLOYMENT_NOT_FOUND) — the browser would 404 instead of landing on login.
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false, callbackUrl: '/login' })
    } catch {
      /* cookie may already be gone — continue anyway */
    }
    router.push('/login')
    router.refresh()
  }

  if ((user as any)?.role !== 'COACH') return null

  return (
    <div className="relative min-h-screen bg-[#050607] font-sans text-white overflow-x-clip">
      <AuroraBackground />

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-opacity duration-300',
          mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'var(--overlay-bg, rgba(5,6,7,0.7))' }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 z-50 h-screen w-[264px] flex-shrink-0 transition-transform duration-300 ease-out',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
          style={{
            background: 'var(--sidebar-bg, #0a0c0e)',
            borderRight: '1px solid var(--sidebar-border, rgba(255,255,255,0.07))',
          }}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-[72px] items-center justify-between px-4 lg:px-5 border-b border-white/[0.06]">
              <Link
                href="/coach/dashboard"
                className="flex items-center gap-3 group"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <div className="relative grid w-10 h-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2de5ca] to-[#14b8a6]">
                  <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
                </div>
                <div className="leading-tight min-w-0">
                  <p className="font-display font-bold text-sm tracking-tight">CS2 Coaching</p>
                  <p className="text-[10px] text-[#f4f6f7]/[0.45] font-medium tracking-wider uppercase">Panel trenera</p>
                </div>
              </Link>
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 hover:bg-white/5" onClick={() => setMobileSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-5 px-3">
              {navSections.map((section) => (
                <div key={section.label} className="mb-5">
                  <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-[#f4f6f7]/[0.3] font-semibold">{section.label}</p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                            pathname === item.href || pathname.startsWith(item.href + '/')
                              ? 'text-white bg-[#2de5ca]/[0.08]'
                              : 'text-[#f4f6f7]/[0.55] hover:text-[#f4f6f7]/[0.9] hover:bg-white/[0.04]',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full transition-opacity duration-200',
                              pathname === item.href || pathname.startsWith(item.href + '/') ? 'bg-[#2de5ca] opacity-100' : 'opacity-0',
                            )}
                          />
                          <item.icon
                            className={cn(
                              'relative w-[18px] h-[18px] shrink-0 transition-colors duration-200',
                              pathname === item.href || pathname.startsWith(item.href + '/')
                                ? 'text-[#2de5ca]'
                                : 'text-[#f4f6f7]/[0.5] group-hover:text-[#f4f6f7]/[0.8]',
                            )}
                            strokeWidth={2.1}
                          />
                          <span className="relative">{item.name}</span>
                          {item.badge && <UnreadBadge kind={item.badge} />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="mb-2">
                <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-[#f4f6f7]/[0.3] font-semibold">Konto</p>
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      href="/coach/settings"
                      onClick={() => setMobileSidebarOpen(false)}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                        pathname === '/coach/settings'
                          ? 'text-white bg-[#2de5ca]/[0.08]'
                          : 'text-[#f4f6f7]/[0.55] hover:text-[#f4f6f7]/[0.9] hover:bg-white/[0.04]',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full transition-opacity duration-200',
                          pathname === '/coach/settings' ? 'bg-[#2de5ca] opacity-100' : 'opacity-0',
                        )}
                      />
                      <Settings
                        className={cn(
                          'relative w-[18px] h-[18px] shrink-0',
                          pathname === '/coach/settings' ? 'text-[#2de5ca]' : 'text-[#f4f6f7]/[0.5] group-hover:text-[#f4f6f7]/[0.8]',
                        )}
                        strokeWidth={2.1}
                      />
                      <span className="relative">Ustawienia</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>

            {/* User card */}
            <div className="p-3 border-t border-white/[0.06]">
              <div className="rounded-2xl p-3 bg-[#101316] border border-white/[0.07]">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/15">
                    <AvatarImage src={(user as any)?.avatarUrl || ''} alt={user?.name || ''} />
                    <AvatarFallback className="rounded-lg bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] text-white font-display font-semibold text-sm">
                      {user?.name?.[0] || 'T'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name || 'Trener'}</p>
                    <p className="text-[11px] text-[#f4f6f7]/[0.4] truncate">{(user as any)?.email || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/coach/settings"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#f4f6f7]/[0.75] hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors duration-200"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Ustawienia
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-300/85 hover:text-red-200 bg-red-500/[0.08] border border-red-500/15 hover:bg-red-500/15 transition-colors duration-200"
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
        <div className="relative z-10 flex-1 min-w-0 min-h-screen flex flex-col">
          {/* Mobile top bar */}
          <header className="lg:hidden sticky top-0 z-30 h-16 border-b border-white/[0.06] bg-[#0a0c0e] px-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/5" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg grid place-items-center bg-gradient-to-br from-[#2de5ca] to-[#14b8a6]">
                <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.2} />
              </div>
              <span className="font-display font-bold text-sm">CS2 Coaching</span>
            </div>
            <div className="w-10" />
          </header>

          <main className="flex-1 min-h-screen pt-6 lg:pt-8">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
