'use client'

// Pobiera live ELO z Faceit i dopisuje punkt trajektorii, ale tylko gdy
// jest nowy (inny niż ostatni wpis). Best-effort: nigdy nie rzuca,
// zwraca ELO albo null. Używane po zapisie nicka i raz po zalogowaniu.
export async function fetchAndSaveLiveElo(nickname: string): Promise<number | null> {
  try {
    const nick = nickname.trim()
    if (!nick) return null
    const r = await fetch(`/api/integrations/faceit?nickname=${encodeURIComponent(nick)}`, { cache: 'no-store' })
    if (!r.ok) return null
    const data = await r.json()
    if (typeof data?.elo !== 'number') return null

    const h = await fetch('/api/ranks').then((x) => (x.ok ? x.json() : [])).catch(() => [])
    const faceitOnly = (Array.isArray(h) ? h : []).filter((e: any) => e.mode === 'FACEIT' && e.elo != null)
    const sorted = faceitOnly.sort((a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    const last = sorted.length ? sorted[sorted.length - 1] : null

    if (!last || last.elo !== data.elo) {
      await fetch('/api/ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'FACEIT',
          rank: `${data.elo} ELO`,
          elo: data.elo,
          source: 'FACEIT_LIVE',
          note: 'Auto (Faceit na żywo)',
        }),
      }).catch(() => {})
      window.dispatchEvent(new CustomEvent('ranks:updated'))
    }
    return data.elo
  } catch {
    return null
  }
}
