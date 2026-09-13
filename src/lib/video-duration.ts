// Czysty modul liczenia czasu filmu - napisany od zera
// Zasady: prosto, przewidywalnie, bez 5 fallbackow ktore wisza 30s
// YouTube: Data API v3 (jesli klucz) -> Piped -> Innertube (1 klient) -> null (wymaga recznie)
// Vimeo: oEmbed -> null
// Prywatne/unlisted ktore nie zwroci API -> null -> trener wpisuje recznie w UI
// Manual: parseDurationString obsluguje "12:34", "1:12:34", "754"

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

function parseISO8601(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return null
  const h = parseInt(m[1] || '0', 10)
  const min = parseInt(m[2] || '0', 10)
  const s = parseInt(m[3] || '0', 10)
  const total = h * 3600 + min * 60 + s
  return total > 0 ? total : null
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((res) => setTimeout(() => res(null), ms)),
  ])
}

async function fetchJson(url: string, opts: RequestInit, ms = 3500): Promise<any | null> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal } as any)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(id)
  }
}

// Publiczne API: zwraca sekundy lub null (wtedy UI wymaga recznego wpisania)
export async function getVideoDuration(url: string, _opts?: { noCache?: boolean }): Promise<number | null> {
  const ytId = getYouTubeId(url)
  if (ytId) {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    const key = process.env.YOUTUBE_API_KEY || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

    // 1) Data API v3 - najszybsze, dziala dla publicznych i niepublicznych, nie dla prywatnych
    const dataApi = await fetchJson(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ytId}&key=${key}`,
      { headers: { 'User-Agent': UA }, cache: 'no-store' as any },
      3500
    )
    const iso = dataApi?.items?.[0]?.contentDetails?.duration as string | undefined
    if (iso) {
      const secs = parseISO8601(iso)
      if (secs) return secs
    }

    // 2) Piped - omija blokady IP Vercel, nie wymaga klucza, dziala dla niepublicznych
    const piped = await fetchJson(`https://pipedapi.kavin.rocks/streams/${ytId}`, { headers: { 'User-Agent': UA }, cache: 'no-store' as any }, 3500)
    if (typeof piped?.duration === 'number' && piped.duration > 0) return Math.round(piped.duration)

    // 3) Innertube - jeden klient WEB, bez petli po 3 klientach
    const innertube = await fetchJson(
      'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': UA,
          Accept: 'application/json',
          Origin: 'https://www.youtube.com',
          Referer: 'https://www.youtube.com/',
        },
        body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20240101' } }, videoId: ytId }),
        cache: 'no-store' as any,
      },
      3500
    )
    if (innertube) {
      const secs = innertube?.videoDetails?.lengthSeconds
      if (secs && /^\d+$/.test(String(secs))) return parseInt(String(secs), 10)
      const ms = innertube?.videoDetails?.approxDurationMs ?? innertube?.streamingData?.adaptiveFormats?.[0]?.approxDurationMs
      if (ms && /^\d+$/.test(String(ms))) return Math.round(parseInt(String(ms), 10) / 1000)
    }

    return null // prywatne / usuniete -> trener wpisuje recznie
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    const data = await fetchJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, { cache: 'no-store' as any }, 4000)
    if (typeof data?.duration === 'number') return Math.round(data.duration)
    return null
  }

  // Drive / inne - zawsze recznie
  return null
}

// Pomocnicze dla UI: "12:34" -> 754, "1:12:34" -> 4354, "754" -> 754
export function parseDurationString(v: string): number | undefined {
  const s = v.trim()
  if (!s) return undefined
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  const parts = s.split(':').map((p) => parseInt(p, 10))
  if (parts.some(isNaN)) return undefined
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return undefined
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatTotalDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '—'
  const totalMin = Math.round(totalSeconds / 60)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}
