/** Shared formatters — single source of truth (PL, Europe/Warsaw, 24h) */

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
  const d = new Date(date)
  return d.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Warsaw',
    ...options,
  })
}

export function formatDateTime(date: Date | string) {
  return formatDate(date, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Warsaw' })
}

export function formatTime(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Warsaw' })
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
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

export function mdToHtml(md: string): string {
  if (!md) return ''
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#c4b5fd] underline hover:text-white">$1</a>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-white/90">$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-xs">$1</code>')
  const lines = html.split('\n')
  let out = '', inList = false
  for (const line of lines) {
    if (/^\s*[-•]\s+/.test(line)) {
      if (!inList) { out += '<ul class="list-disc list-inside space-y-1 my-2 marker:text-[#a78bfa]">'; inList = true }
      out += `<li>${line.replace(/^\s*[-•]\s+/, '')}</li>`
    } else {
      if (inList) { out += '</ul>'; inList = false }
      if (line.trim() === '') out += ''
      else out += `<p class="my-1 leading-relaxed">${line}</p>`
    }
  }
  if (inList) out += '</ul>'
  return out
}
