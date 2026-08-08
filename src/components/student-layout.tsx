'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutDashboard, BookOpen, Video, BarChart2, Settings, LogOut, User, Menu, X, ChevronLeft } from 'lucide-react'

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

  if (userRole !== 'STUDENT') {
    return null
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="relative min-h-screen bg-[#060606] font-inter antialiased overflow-x-hidden">
      {/* Vignette */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.68) 100%)',
        animation: 'vignettePulse 8s ease-in-out infinite alternate',
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
        transform: `translate(-50%, -50%)`,
        left: `${mousePos.x}px`,
        top: `${mousePos.y}px`,
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

      <div className="relative z-10 min-h-screen">
        <div className="flex h-screen bg-[#060606]">
          {/* Sidebar */}
          <aside className="fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0" style={{
            background: 'rgba(10,10,10,0.9)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center justify-between border-b px-4 border-white/5">
                <Link href="/student/dashboard" className="flex items-center gap-2 font-space font-bold text-xl">
                  <span style={{ background: 'linear-gradient(135deg, #fff 0%, #7c6fff 50%, #5a4fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    CS2 Coaching
                  </span>
                </Link>
                <button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 px-3">
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          pathname === item.href || pathname.startsWith(item.href + '/')
                            ? 'bg-white/5 text-white border border-white/10'
                            : 'text-[#8a8a8a] hover:bg-white/5 hover:text-white hover:border-white/10'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="border-t border-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session?.user?.avatarUrl || ''} alt={session?.user?.name || ''} />
                      <AvatarFallback className="text-base">{session?.user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white">{session?.user?.name || 'Uczeń'}</p>
                    <p className="text-xs text-[#8a8a8a]">Uczeń</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/student/settings"
                    className="flex-1 px-3 py-2 text-sm font-medium text-center rounded-xl transition-all hover:bg-white/5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#fff' }}
                  >
                    Ustawienia
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex-1 px-3 py-2 text-sm font-medium text-center rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#ff6b6b' }}
                  >
                    Wyloguj się
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile sidebar overlay */}
          <div
            className={cn(
              'fixed inset-0 z-40 lg:hidden transition-opacity',
              mobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Main content */}
          <div className="lg:ml-64 min-h-screen">
            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 border-b px-4" style={{ background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex h-full items-center justify-between px-4">
                <button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="font-space font-bold text-lg" style={{ background: 'linear-gradient(135deg, #fff 0%, #7c6fff 50%, #5a4fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  CS2 Coaching
                </h1>
                <div className="w-10" />
              </div>
            </header>

            <main className="pt-16 lg:pt-0 min-h-screen">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}