import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export function getVideoId(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
  if (ytMatch) return ytMatch[1]

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return vimeoMatch[1]

  return null
}

export function getVideoThumbnail(url: string): string | null {
  const ytId = getVideoId(url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
  return null
}

export function getVideoEmbedUrl(url: string): string | null {
  const ytId = getVideoId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}`

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

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