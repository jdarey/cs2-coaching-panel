import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon: any
  label?: string
  title: string
  subtitle?: string
  children?: ReactNode
}

/**
 * One consistent page header for every panel page: a teal icon tile, an
 * uppercase teal label, a white-gradient title, a muted subtitle and
 * optional action buttons on the right. Rendered as a rounded card that
 * matches the bento surfaces; it sits at the top of the page in normal
 * flow and scrolls away with the content (no sticky float).
 */
export function PageHeader({ icon: Icon, label, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0c0e]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.035] to-transparent" />
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 px-5 sm:px-7 py-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] ring-1 ring-white/20">
            <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5 min-w-0">
            {label && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a78bfa]/80">{label}</p>
            )}
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-vantor leading-[1.05]">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-white/55 max-w-xl">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-3 shrink-0">{children}</div>}
      </div>
    </div>
  )
}
