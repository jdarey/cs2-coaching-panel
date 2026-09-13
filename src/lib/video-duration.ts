// Czysty modul liczenia czasu filmu - napisany od zera
// YouTube BEZ KLUCZA: multi-Piped (8 instancji) -> multi-Invidious (4) -> Innertube 3 klienty (WEB/ANDROID/IOS)
// Data API tylko jeśli YOUTUBE_API_KEY ustawiony. Omija blokady IP Vercel - Piped/Invidious proxy'ują YouTube.
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

    // 2) Piped - multi-instancje, omijają blokady IP Vercel (Piped proxy'uje YouTube)
    const PIPED_INSTANCES = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.yt',
      'https://pipedapi.syncpundit.io',
      'https://pipedapi.r4fo.com',
      'https://pipedapi.leptons.xyz',
      'https://piped-api.privacy.com.de',
      'https://pipedapi.adminforge.de',
      'https://pipedapi.frontendfriendly.xyz',
    ]
    for (const base of PIPED_INSTANCES) {
      const piped = await fetchJson(`${base}/streams/${ytId}`, { headers: { 'User-Agent': UA }, cache: 'no-store' as any }, 2500)
      if (typeof piped?.duration === 'number' && piped.duration > 0) return Math.round(piped.duration)
      // jeśli instancja zwróci błąd, próbuj kolejną — nie czekaj długo
    }

    // 3) Invidious - alternatywne proxy, też omija Vercel IP block
    const INVIDIOUS_INSTANCES = [
      'https://yewtu.be',
      'https://invidious.protokolla.fi',
      'https://iv.ggtyler.dev',
      'https://invidious.privacydev.net',
    ]
    for (const base of INVIDIOUS_INSTANCES) {
      const inv = await fetchJson(`${base}/api/v1/videos/${ytId}`, { headers: { 'User-Agent': UA }, cache: 'no-store' as any }, 2500)
      const secs = inv?.lengthSeconds
      if (secs && Number.isFinite(secs) && secs > 0) return Math.round(secs)
      if (typeof secs === 'string' && /^\d+$/.test(secs) && parseInt(secs, 10) > 0) return parseInt(secs, 10)
    }

    // 4) Innertube - 3 klienci (WEB, ANDROID, IOS) - różne klucze/fingerprints, część omija blokadę
    const INNER_CLIENTS = [
      { clientName: 'WEB', clientVersion: '2.20240101', key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8' },
      { clientName: 'ANDROID', clientVersion: '20.10.38', key: 'AIzaSyA8eiZmM1FaDVjRy-df2UTQQRi2r7KI4TY' },
      { clientName: 'IOS', clientVersion: '20.10.38', key: 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc' },
    ]
    for (const c of INNER_CLIENTS) {
      const innertube = await fetchJson(
        `https://www.youtube.com/youtubei/v1/player?key=${c.key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': UA,
            Accept: 'application/json',
            Origin: 'https://www.youtube.com',
            Referer: 'https://www.youtube.com/',
          },
          body: JSON.stringify({ context: { client: { clientName: c.clientName, clientVersion: c.clientVersion } }, videoId: ytId }),
          cache: 'no-store' as any,
        },
        2500
      )
      if (innertube) {
        const secs = innertube?.videoDetails?.lengthSeconds
        if (secs && /^\d+$/.test(String(secs)) && parseInt(String(secs), 10) > 0) return parseInt(String(secs), 10)
        const ms = innertube?.videoDetails?.approxDurationMs ?? innertube?.streamingData?.adaptiveFormats?.[0]?.approxDurationMs
        if (ms && /^\d+$/.test(String(ms)) && parseInt(String(ms), 10) > 0) return Math.round(parseInt(String(ms), 10) / 1000)
      }
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
