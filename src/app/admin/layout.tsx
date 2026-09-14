import { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session?.user as any)) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-screen bg-[#07060c] font-sans text-white">
      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 z-40 h-screen w-[240px] flex-shrink-0 hidden md:flex flex-col border-r border-white/[0.07] bg-[#0a0c0e]">
          <div className="flex h-[72px] items-center px-5 border-b border-white/[0.06]">
            <Link href="/admin" className="leading-tight">
              <p className="font-display font-bold text-sm tracking-tight">CS2 Coaching</p>
              <p className="text-[10px] text-[#f4f6f7]/[0.45] font-medium tracking-wider uppercase">Panel admina</p>
            </Link>
          </div>
          <AdminNav />
          <div className="p-3 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/35 truncate px-2">{(session?.user as any)?.email}</p>
          </div>
        </aside>
        <div className="flex-1 min-w-0 min-h-screen flex flex-col">
          <header className="md:hidden sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0c0e] px-4 py-3 flex items-center gap-3 overflow-x-auto">
            <span className="font-display font-bold text-sm shrink-0">Admin</span>
            <AdminNav mobile />
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
