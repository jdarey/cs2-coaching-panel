import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { MouseEvent } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mouse-follow spotlight: feed the cursor position into --mx/--my CSS vars
 * used by the .spotlight-card glow. Attach as onMouseMove on any element
 * that carries the `spotlight-card` class.
 */
export function spotlightHandler(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = new Date(date)
  return d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  })
}

export function formatDateTime(date: Date | string) {
  return formatDate(date, { hour: '2-digit', minute: '2-digit' })
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

/** Lowercase + strip diacritics so "lukasz" matches "Łukasz". */
export function normalizeSearch(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')}

/** Diacritics-insensitive search across any of the given fields. */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]) {
  const q = normalizeSearch(query.trim())
  if (!q) return true
  return fields.some((f) => f != null && normalizeSearch(f).includes(q))
}

// YouTube-only id extractor. Use this whenever the decision is "render the
// YouTube player or not" — getVideoId also returns Vimeo ids, which would
// mount a broken YouTube player on a Vimeo video.
// Covers watch?v=, youtu.be/, embed/, shorts/, live/ and youtube-nocookie.
export function getYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([^&\n?#]+)/
  )
  return m ? m[1] : null
}

export function getVideoId(url: string): string | null {
  const yt = getYouTubeId(url)
  if (yt) return yt

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return vimeoMatch[1]

  return null
}

export function getVideoThumbnail(url: string): string | null {
  const ytId = getYouTubeId(url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
  return null
}

export function getVideoEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return null
}

function parseISO8601Duration(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return null
  const h = parseInt(m[1] || '0', 10)
  const min = parseInt(m[2] || '0', 10)
  const s = parseInt(m[3] || '0', 10)
  const total = h * 3600 + min * 60 + s
  return total > 0 ? total : null
}

function fetchWithTimeout(url: string, opts: any, ms = 5000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  return fetch(url, { ...opts, signal: controller.signal } as any).finally(() => clearTimeout(id))
}

export async function fetchVideoDuration(url: string, opts?: { noCache?: boolean }): Promise<number | null> {
  const ytId = getYouTubeId(url)
  if (ytId) {
    const cacheOpts: any = opts?.noCache ? { cache: 'no-store' } : { next: { revalidate: 86400 } }
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    // 1) Data API v3 - najszybsze i najpewniejsze na Vercel (1 request, 3s timeout, oficialne)
    try {
      const res = await fetchWithTimeout(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ytId}&key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`, {
        headers: { 'User-Agent': UA },
        ...cacheOpts,
      } as any, 3000)
      if (res.ok) {
        const data = await res.json()
        const iso: string | undefined = data?.items?.[0]?.contentDetails?.duration
        if (iso) {
          const secs = parseISO8601Duration(iso)
          if (secs) return secs
        }
      }
    } catch {}
    // 2) Innertube API — backup gdy Data API quota przekroczone
    for (const client of [
      { clientName: 'WEB', clientVersion: '2.20240101' },
      { clientName: 'ANDROID', clientVersion: '19.09.37' },
    ] as const) {
      try {
        const res = await fetchWithTimeout('https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': UA,
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            Origin: 'https://www.youtube.com',
            Referer: 'https://www.youtube.com/',
          },
          body: JSON.stringify({ context: { client }, videoId: ytId }),
          ...cacheOpts,
        } as any, 3000)
        if (res.ok) {
          const data = await res.json()
          const secs = data?.videoDetails?.lengthSeconds
          if (secs && /^\d+$/.test(String(secs))) return parseInt(String(secs), 10)
          const ms = data?.videoDetails?.approxDurationMs ?? data?.streamingData?.adaptiveFormats?.[0]?.approxDurationMs
          if (ms && /^\d+$/.test(String(ms))) return Math.round(parseInt(String(ms), 10) / 1000)
          const lengthText: string | undefined = data?.videoDetails?.lengthText?.simpleText
          if (lengthText && /^\d+:\d+/.test(lengthText)) {
            const parts = lengthText.split(':').map((n) => parseInt(n, 10))
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
            if (parts.length === 2) return parts[0] * 60 + parts[1]
          }
        }
      } catch {}
    }
    // 3) Fallback: lemnoslife noKey proxy (nie wymaga klucza, omija blokady IP)
    try {
      const res = await fetchWithTimeout(`https://yt.lemnoslife.com/noKey/videos?part=contentDetails&id=${ytId}`, {
        headers: { 'User-Agent': UA },
        ...cacheOpts,
      } as any, 3000)
      if (res.ok) {
        const data = await res.json()
        const iso: string | undefined = data?.items?.[0]?.contentDetails?.duration
        if (iso) {
          const secs = parseISO8601Duration(iso)
          if (secs) return secs
        }
      }
    } catch {}
    // 4) Fallback: Piped (pipedapi.kavin.rocks) - czesto dziala gdy YT blokuje Vercel IP, zwraca duration w sekundach
    try {
      const res = await fetchWithTimeout(`https://pipedapi.kavin.rocks/streams/${ytId}`, {
        headers: { 'User-Agent': UA },
        ...cacheOpts,
      } as any, 4000)
      if (res.ok) {
        const data = await res.json()
        const d = (data as any)?.duration
        if (typeof d === 'number' && d > 0) return Math.round(d)
      }
    } catch {}
    // 5) Fallback: watch page — ostatecznosc (najwolniejsze, 4s)
    try {
      const res = await fetchWithTimeout(`https://www.youtube.com/watch?v=${ytId}&hl=en&has_verified=1`, {
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'en-US,en;q=0.9',
          Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+667; YSC=',
        },
        ...cacheOpts,
      } as any, 4000)
      if (res.ok) {
        const html = await res.text()
        const idx = html.indexOf('ytInitialPlayerResponse')
        if (idx !== -1) {
          const snippet = html.slice(idx, idx + 80000)
          const m = snippet.match(/"lengthSeconds"\s*:\s*"(\d+)"/)
          if (m) return parseInt(m[1], 10)
          const mMs = snippet.match(/"approxDurationMs"\s*:\s*"(\d+)"/)
          if (mMs) return Math.round(parseInt(mMs[1], 10) / 1000)
          const mText = snippet.match(/"lengthText"[^}]*"simpleText"\s*:\s*"(\d+:\d+(?::\d+)?)"/)
          if (mText) {
            const parts = mText[1].split(':').map((n) => parseInt(n, 10))
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
            if (parts.length === 2) return parts[0] * 60 + parts[1]
          }
          const mSimple = snippet.match(/"simpleText"\s*:\s*"(\d+:\d+(?::\d+)?)"/)
          if (mSimple) {
            const parts = mSimple[1].split(':').map((n) => parseInt(n, 10))
            const total = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1]
            if (total > 0 && total < 86400) return total
          }
        }
      }
    } catch {}
    return null
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    try {
      const cacheOpts: any = opts?.noCache ? { cache: 'no-store' } : { next: { revalidate: 86400 } }
      const res = await fetchWithTimeout(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, cacheOpts as any, 5000)
      if (res.ok) {
        const data = await res.json()
        if (typeof data.duration === 'number') return Math.round(data.duration)
      }
    } catch {}
  }
  return null
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Szkic',
  ACTIVE: 'Aktywna',
  COMPLETED: 'Zakończona',
  ARCHIVED: 'Zarchiwizowana',
  PENDING: 'Do oglądania',
  WATCHING: 'Oglądam',
  WATCHED: 'Obejrzane',
  IMPLEMENTED: 'Wdrożone',
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-800',
  WATCHING: 'bg-blue-100 text-blue-800',
  WATCHED: 'bg-green-100 text-green-800',
  IMPLEMENTED: 'bg-purple-100 text-purple-800',
}

export const ROLE_LABELS: Record<string, string> = {
  COACH: 'Trener',
  STUDENT: 'Uczeń',
}

// Aliases for video status
export const VIDEO_STATUS_LABELS = STATUS_LABELS
export const VIDEO_STATUS_COLORS = STATUS_COLORS