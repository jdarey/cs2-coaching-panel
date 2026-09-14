// Czysty modul liczenia czasu filmu - napisany od zera
// YouTube BEZ KLUCZA: Piped (2 instancje) -> Invidious (1) -> Innertube WEB (1)
// Kolejno z early-exit, NIE równolegle wszystko naraz. Wcześniej fan-out do 9
// outbound/1 film (30 filmów w cron = 270 req); teraz max 4, zwykle 1-2.
// Data API tylko jeśli YOUTUBE_API_KEY ustawiony.
// Vimeo: oEmbed -> null
// Prywatne/unlisted które nie zwróci żadne proxy -> null -> trener wpisuje ręcznie w UI
// Manual: parseDurationString obsługuje "12:34", "1:12:34", "754"

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
// Bez klucza: Piped + Innertube (wystarcza dla publicznych/niepublicznych). Data API tylko jeśli YOUTUBE_API_KEY ustawiony.
export async function getVideoDuration(url: string, _opts?: { noCache?: boolean }): Promise<number | null> {
  const ytId = getYouTubeId(url)
  if (ytId) {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    const apiKey = process.env.YOUTUBE_API_KEY

    // 1) Data API v3 - tylko jeśli klucz dostępny (bez klucza pomijamy, nie używamy hardkodowanego)
    if (apiKey) {
      const dataApi = await fetchJson(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ytId}&key=${apiKey}`,
        { headers: { 'User-Agent': UA }, cache: 'no-store' as any },
        3500
      )
      const iso = dataApi?.items?.[0]?.contentDetails?.duration as string | undefined
      if (iso) {
        const secs = parseISO8601(iso)
        if (secs) return secs
      }
    }

    // 2) Piped - max 2 instancje sekwencyjnie (early-exit po pierwszym trafieniu).
    // 4 równolegle = 4x transfer na każdy film; 2 wystarczą, reszta to fallback.
    const PIPED_INSTANCES = [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.syncpundit.io',
    ]
    for (const base of PIPED_INSTANCES) {
      const piped = await fetchJson(`${base}/streams/${ytId}`, { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } as any }, 3000)
      if (typeof piped?.duration === 'number' && piped.duration > 0) return Math.round(piped.duration)
    }

    // 3) Invidious - 1 instancja (fallback, nie równolegle 2x)
    const inv = await fetchJson(`https://yewtu.be/api/v1/videos/${ytId}`, { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } as any }, 3000)
    {
      const secs = (inv as any)?.lengthSeconds
      if (secs && Number.isFinite(Number(secs)) && Number(secs) > 0) return Math.round(Number(secs))
      if (typeof secs === 'string' && /^\d+$/.test(secs) && parseInt(secs, 10) > 0) return parseInt(secs, 10)
    }

    // 4) Innertube - tylko klient WEB (1x POST zamiast 3x). ANDROID/IOS
    // klucze to głównie duplikaty tego samego; WEB wystarcza w >95% przypadków.
    const inner = await fetchJson(
      `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`,
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
        next: { revalidate: 86400 } as any,
      },
      3000
    )
    if (inner) {
      const secs = inner?.videoDetails?.lengthSeconds
      if (secs && /^\d+$/.test(String(secs)) && parseInt(String(secs), 10) > 0) return parseInt(String(secs), 10)
      const ms = inner?.videoDetails?.approxDurationMs ?? inner?.streamingData?.adaptiveFormats?.[0]?.approxDurationMs
      if (ms && /^\d+$/.test(String(ms)) && parseInt(String(ms), 10) > 0) return Math.round(parseInt(String(ms), 10) / 1000)
    }

    return null // prywatne / usunięte / wszystko zablokowane -> trener wpisuje ręcznie
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

export { parseDurationString, formatDuration, formatTotalDuration } from './format'
