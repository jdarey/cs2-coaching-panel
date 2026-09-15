'use client'

import { useEffect } from 'react'

function isChunkError(message: string): boolean {
  return /Loading chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module|error loading chunk/i.test(
    message || '',
  )
}

// Ostatnia deska ratunku dla błędów renderu. Najczęstszy scenariusz:
// deployment na Vercel wymienił pliki JS, a przeglądarka trzyma stary HTML
// wskazujący na nieistniejące chunki (_next/static → 404). Zamiast wisieć na
// "Application error", robimy jeden twardy reload po świeży HTML.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (!isChunkError(error?.message || '')) return
    try {
      const KEY = 'chunk-reload-at'
      const last = Number(sessionStorage.getItem(KEY) || 0)
      // Guard przed pętlą reloadów — max 1 na 10 s.
      if (Date.now() - last < 10_000) return
      sessionStorage.setItem(KEY, String(Date.now()))
    } catch {
      /* sessionStorage niedostępny — reload i tak lepszy niż martwy ekran */
    }
    window.location.reload()
  }, [error])

  return (
    <html lang="pl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#07060c',
          color: '#f4f6f7',
          fontFamily: 'system-ui, sans-serif',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 13, letterSpacing: 2, color: '#a78bfa', fontWeight: 700 }}>COŚ POSZŁO NIE TAK</p>
          <h1 style={{ fontSize: 22, margin: '8px 0' }}>Nie udało się wczytać strony</h1>
          <p style={{ fontSize: 14, color: 'rgba(244,246,247,0.6)' }}>
            Najczęściej pomaga odświeżenie — np. po aktualizacji aplikacji w tle.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <button
              onClick={() => reset()}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Spróbuj ponownie
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #a78bfa, #6d28d9)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
