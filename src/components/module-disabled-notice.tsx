'use client'

import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { isFlagEnabled, type FeatureFlags } from '@/lib/feature-flags-client'

// Mapa ścieżka → flaga. Gdy flaga jest wyłączona, strona modułu pokazuje
// czytelny komunikat zamiast pełnej treści (nawigacja i tak ją chowa).
const PATH_FLAGS: { prefix: string; flag: string; label: string; role: 'coach' | 'student' }[] = [
  { prefix: '/coach/videos', flag: 'video_module', label: 'Filmy', role: 'coach' },
  { prefix: '/coach/presets', flag: 'presets_module', label: 'Presety ćwiczeń', role: 'coach' },
  { prefix: '/coach/paths', flag: 'paths_module', label: 'Ścieżki treningowe', role: 'coach' },
  { prefix: '/coach/practice', flag: 'practice_module', label: 'Praktyka', role: 'coach' },
  { prefix: '/coach/matches', flag: 'matches_module', label: 'Mecze uczniów', role: 'coach' },
  { prefix: '/coach/finance', flag: 'finance_module', label: 'Finanse', role: 'coach' },
  { prefix: '/coach/messages', flag: 'chat_enabled', label: 'Wiadomości', role: 'coach' },
  { prefix: '/student/videos', flag: 'video_module', label: 'Filmy', role: 'student' },
  { prefix: '/student/paths', flag: 'paths_module', label: 'Ścieżki treningowe', role: 'student' },
  { prefix: '/student/matches', flag: 'matches_module', label: 'Log meczów', role: 'student' },
  { prefix: '/student/messages', flag: 'chat_enabled', label: 'Wiadomości', role: 'student' },
]

export function ModuleDisabledNotice({ flags, pathname }: { flags: FeatureFlags | null; pathname: string }) {
  const hit = PATH_FLAGS.find((p) => pathname === p.prefix || pathname.startsWith(p.prefix + '/'))
  if (!hit) return null
  if (isFlagEnabled(flags, hit.flag)) return null

  return (
    <div className="glass-card rounded-3xl p-10 text-center mb-8">
      <ShieldOff className="w-10 h-10 text-white/25 mx-auto mb-3" />
      <h2 className="font-display text-xl font-bold text-white/85">Moduł „{hit.label}” jest wyłączony</h2>
      <p className="mt-1.5 text-sm text-white/45 max-w-md mx-auto">
        Administrator wyłączył ten moduł w panelu admina (Ustawienia → Flagi funkcji).
      </p>
      <Link
        href={hit.role === 'coach' ? '/coach/dashboard' : '/student/dashboard'}
        className="btn-darey relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-5"
      >
        Wróć na dashboard
      </Link>
    </div>
  )
}
