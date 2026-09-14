'use client'

import { useEffect } from 'react'

// Ustawia tytuł karty dla stron klienckich ('use client'), gdzie nie da się
// użyć `export const metadata`. Dokleja sufiks jak szablon w layout.tsx.
export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} • CS2 Coaching`
  }, [title])
  return null
}
