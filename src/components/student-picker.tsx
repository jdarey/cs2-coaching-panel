'use client'

import { useMemo, useRef, useState } from 'react'
import { Search, X, ChevronDown, Check } from 'lucide-react'
import { cn, matchesSearch } from '@/lib/utils'

export interface StudentOption {
  id: string
  name: string | null
  email: string
  avatarUrl?: string | null
}

interface StudentPickerProps {
  students: StudentOption[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
  id?: string
}

/**
 * Searchable student picker — replaces the native <select> so the coach can
 * filter by name OR email (including diacritics-insensitive matching) instead
 * of scrolling a long list.
 */
export function StudentPicker({ students, value, onChange, disabled, placeholder = 'Szukaj ucznia...', id }: StudentPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = students.find((s) => s.id === value) ?? null

  const filtered = useMemo(() => {
    const list = students.filter((s) => matchesSearch(query, s.name, s.email))
    // Selected student first, then alphabetical (Polish collation)
    return [...list].sort((a, b) => {
      if (a.id === value) return -1
      if (b.id === value) return 1
      return (a.name || a.email).localeCompare(b.name || b.email, 'pl')
    })
  }, [students, query, value])

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative" onBlur={(e) => {
      // Close only when focus leaves the whole component
      if (!ref.current?.contains(e.relatedTarget as Node)) close()
    }}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          'h-12 w-full rounded-xl bg-white/[0.03] border border-white/[0.08] pl-4 pr-10 text-sm text-left outline-none focus:border-[#a78bfa]/40 focus:ring-2 focus:ring-[#8b5cf6]/25 transition',
          selected ? 'text-white' : 'text-white/35',
        )}
      >
        <span className="block truncate">
          {selected ? `${selected.name || selected.email}${selected.name ? ` · ${selected.email}` : ''}` : placeholder}
        </span>
        <ChevronDown className={cn('pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-2xl bg-[#14121c] border border-white/[0.1] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="relative p-2 border-b border-white/[0.06]">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj po imieniu lub emailu..."
              className="h-9 w-full rounded-lg bg-white/[0.04] pl-9 pr-8 text-sm text-white placeholder:text-white/35 outline-none focus:ring-1 focus:ring-[#8b5cf6]/40"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label="Wyczyść">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-white/40">Brak uczniów pasujących do wyszukiwania</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(s.id); close() }}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06]',
                    s.id === value && 'bg-[#8b5cf6]/15',
                  )}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#a78bfa]/30 to-[#8b5cf6]/20 text-[11px] font-bold text-[#c4b5fd]">
                    {(s.name || s.email)[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{s.name || s.email}</span>
                    {s.name && <span className="block truncate text-[11px] text-white/40">{s.email}</span>}
                  </span>
                  {s.id === value && <Check className="h-4 w-4 shrink-0 text-[#c4b5fd]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
