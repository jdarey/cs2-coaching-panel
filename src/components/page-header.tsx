import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon: any
  label?: string
  title: string
  subtitle?: string
  children?: ReactNode
  sticky?: boolean
}

/**
 * One consistent page header for every panel page: a teal icon tile, an
 * uppercase teal label, a white-gradient title, a muted subtitle and
 * optional action buttons on the right. Sticky by default, sitting below
 * the mobile top bar (top-16) and at the very top on desktop (lg:top-0).
 */
export function PageHeader({ icon: Icon, label, title, subtitle, children, sticky = true }: PageHeaderProps) {
  return (
    <div
      className={cn(
        '-mx-4 sm:-mx-6 px-4 sm:px-6 pt-5 pb-5 mb-8 border-b border-white/[0.06] bg-[#0a0a0a]',
        sticky && 'sticky top-16 lg:top-0 z-30',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2de5ca] to-[#14b8a6] ring-1 ring-white/20">
            <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5 min-w-0">
            {label && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2de5ca]/80">{label}</p>
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
