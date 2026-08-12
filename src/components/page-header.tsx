import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon: any
  label?: string
  title: string
  subtitle?: string
  children?: ReactNode
}

/** Consistent premium header for every panel page: animated icon tile,
 *  uppercase accent label, white-gradient title, muted subtitle and optional
 *  action buttons on the right. Rendered as a rounded card that sits at the
 *  top of the page in normal flow. */
export function PageHeader({ icon: Icon, label, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0c0e] animate-rise-in">
      {/* Ambient glow + hairline */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.035] to-transparent" />
      <div className="pointer-events-none absolute -top-24 right-24 h-56 w-56 rounded-full bg-[#8b5cf6]/15 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a78bfa]/50 to-transparent" />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 px-5 sm:px-7 py-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#6d28d9] ring-1 ring-white/25 animate-pulse-ring shadow-[0_0_32px_-8px_rgba(139,92,246,0.55)]">
            <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
          </div>
          <div className="space-y-1.5 min-w-0">
            {label && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a78bfa]/90 animate-fade-up">{label}</p>
            )}
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-vantor leading-[1.05] animate-fade-up" style={{ animationDelay: '40ms' }}>
              {title}
            </h1>
            {subtitle && <p className="text-sm text-white/55 max-w-xl animate-fade-up" style={{ animationDelay: '80ms' }}>{subtitle}</p>}
          </div>
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-3 shrink-0 animate-fade-up" style={{ animationDelay: '120ms' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
