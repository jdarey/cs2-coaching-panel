'use client'

import { useEffect, useState } from 'react'

export interface FeatureFlags {
  [key: string]: boolean
}

// Klient feature-flagów: pobiera mapę key → enabled raz i buforuje w module
// (jeden request na sesję przeglądarki). Layouty czytają z cache synchronicznie,
// więc nawigacja nie miga pustymi zakładkami.
let cache: FeatureFlags | null = null
let inflight: Promise<FeatureFlags> | null = null

async function fetchFlags(): Promise<FeatureFlags> {
  if (cache) return cache
  if (!inflight) {
    inflight = fetch('/api/feature-flags')
      .then(r => (r.ok ? r.json() : { flags: {} }))
      .then((data: { flags?: Record<string, boolean> }) => {
        cache = data?.flags ?? {}
        return cache
      })
      .catch(() => {
        return {} as FeatureFlags
      })
      .finally(() => { inflight = null })
  }
  return inflight
}

// Czy flaga jest włączona. Brak wpisu = włączona (default-open),
// chyba że zdefiniowano DEFAULT_OFF_FLAGS.
const DEFAULT_OFF_FLAGS = new Set<string>([])

export function isFlagEnabled(flags: FeatureFlags | null, key: string): boolean {
  if (!flags) return true
  if (!(key in flags)) return !DEFAULT_OFF_FLAGS.has(key)
  return flags[key]
}

// Publiczny endpoint (zalogowani) — zwraca { flags: { key: enabled } }
if (typeof window !== 'undefined') {
  // prefetch w tle zaraz po załadowaniu modułu
  void fetchFlags()
}

export function useFeatureFlags(): FeatureFlags | null {
  const [flags, setFlags] = useState<FeatureFlags | null>(cache)
  useEffect(() => {
    let cancelled = false
    fetchFlags().then(f => { if (!cancelled) setFlags(f) })
    return () => { cancelled = true }
  }, [])
  return flags
}
