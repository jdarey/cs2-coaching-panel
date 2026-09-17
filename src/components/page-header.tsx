import { ReactNode } from 'react'

interface PageHeaderProps {
  icon: any
  label?: string
  title: string
  subtitle?: string
  children?: ReactNode
}

/**
 * Header każdej strony panelu — spłaszczony (bez karty w tle), editorial:
 * mniejsza ikona w miękkim fioletowym "squircle", nadtytuł z kreską,
 * gradientowy tytuł i akcje wyrównane do prawej. Wyróżnia treść, nie sam siebie.
 */
export function PageHeader({ icon: Icon, label, title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="relative mb-8 animate-rise-in">
      {/* Miękkie ambient-glow za nagłówkiem — nie odciąga od treści */}
      <div
        className="pointer-events-none absolute -top-16 right-8 h-48 w-48 rounded-full blur-3xl opacity-60"
        style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(139,92,246,0.16), transparent 70%)' }}
        aria-hidden
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pb-6">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[14px] text-white"
            style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 55%, #7c3aed 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 28px -10px rgba(139,92,246,0.6)',
            }}
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>

          <div className="space-y-1.5 min-w-0">
            {label && (
              <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a78bfa]">
                <span className="hidden sm:inline-block h-px w-6 bg-gradient-to-r from-[#a78bfa]/70 to-transparent" aria-hidden />
                {label}
              </p>
            )}
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gradient-vantor leading-[1.05]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-white/55 max-w-xl">{subtitle}</p>
            )}
          </div>
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">{children}</div>
        )}
      </div>

      {/* Hairline oddzielająca nagłówek od treści — z powolnym shimmerem (ambient, nie hover) */}
      <div className="header-line" aria-hidden />
    </header>
  )
}
