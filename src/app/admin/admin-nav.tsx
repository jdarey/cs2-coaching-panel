'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Mail, Shield, Activity, Database, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { name: 'Użytkownicy', href: '/admin/users', icon: Users },
  { name: 'Maile', href: '/admin/emails', icon: Mail },
  { name: 'Logi audytu', href: '/admin/audit-logs', icon: Shield },
  { name: 'Monitoring', href: '/admin/monitoring', icon: Activity },
  { name: 'Feature Flags', href: '/admin/feature-flags', icon: Settings },
  { name: 'Backup/Restore', href: '/admin/backup', icon: Database },
]

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  if (mobile) {
    return (
      <>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              pathname.startsWith(item.href) ? 'text-white bg-[#a78bfa]/[0.12]' : 'text-white/55',
            )}
          >
            <item.icon className="w-4 h-4" /> {item.name}
          </Link>
        ))}
      </>
    )
  }
  return (
    <nav className="flex-1 overflow-y-auto py-5 px-3">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'text-white bg-[#a78bfa]/[0.08]' : 'text-white/55 hover:text-white/90 hover:bg-white/[0.04]',
                )}
              >
                <item.icon className={cn('w-[18px] h-[18px]', active ? 'text-[#a78bfa]' : 'text-white/50')} />
                {item.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
