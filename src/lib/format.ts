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

/**
 * Markdown → HTML dla opisów rutyn/zadań. Wspólny dla coacha i ucznia.
 * Wspiera: nagłówki (#/##/###), **pogrubienie**, *kursywa*, `kod`, [link](url),
 * listy punktowane (- / •) i numerowane (1.), checklisty (- [ ] / - [x]),
 * cytaty (>), poziomą linię (---). Enter = nowa linia (każdy niepusty wiersz
 * to akapit), pusta linia rozdziela akapity. Tekst jest escapowany (XSS-safe).
 */
export function mdToHtml(md: string): string {
  if (!md) return ''
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#c4b5fd] underline hover:text-white">$1</a>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-white/90">$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[0.85em]">$1</code>')

  const P = 'my-1.5 leading-relaxed'
  const lines = html.split('\n')
  let out = ''
  let ul = false, ol = false
  const closeLists = () => {
    if (ul) { out += '</ul>'; ul = false }
    if (ol) { out += '</ol>'; ol = false }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    // pozioma linia
    if (/^---+\s*$/.test(line)) { closeLists(); out += '<hr class="my-3 border-0 h-px bg-white/10" />'; continue }
    // nagłówki (# → największy; w opisie to poziom h3/h4/h5)
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      closeLists()
      const lvl = h[1].length
      const cls = lvl === 1
        ? 'font-display text-lg font-bold text-white mt-4 mb-1.5'
        : lvl === 2
          ? 'font-display text-base font-bold text-white mt-3 mb-1'
          : 'text-sm font-bold text-[#e9d5ff] mt-2.5 mb-1 uppercase tracking-wide'
      out += `<h${lvl + 2} class="${cls}">${h[2]}</h${lvl + 2}>`
      continue
    }
    // cytat
    const q = line.match(/^&gt;\s?(.*)$/)
    if (q) {
      closeLists()
      out += `<blockquote class="border-l-2 border-[#a78bfa]/50 pl-3 my-2 text-white/70 italic">${q[1]}</blockquote>`
      continue
    }
    // checklisty (- [ ] / - [x]) — przed zwykłą listą
    const chk = line.match(/^\s*[-•]\s+\[([ xX])\]\s+(.*)$/)
    if (chk) {
      if (ol) { out += '</ol>'; ol = false }
      if (!ul) { out += '<ul class="my-2 space-y-1">'; ul = true }
      const done = chk[1] !== ' '
      out += done
        ? `<li class="flex items-start gap-2"><span class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded bg-[#a78bfa]/25 border border-[#a78bfa]/50 text-[10px] font-black text-[#e9d5ff]">✓</span><span class="text-white/45">${chk[2]}</span></li>`
        : `<li class="flex items-start gap-2"><span class="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/25"></span><span>${chk[2]}</span></li>`
      continue
    }
    // lista punktowana
    if (/^\s*[-•]\s+/.test(line)) {
      if (ol) { out += '</ol>'; ol = false }
      if (!ul) { out += '<ul class="list-disc list-inside space-y-1 my-2 marker:text-[#a78bfa]">'; ul = true }
      out += `<li>${line.replace(/^\s*[-•]\s+/, '')}</li>`
      continue
    }
    // lista numerowana (1. / 1) )
    if (/^\s*\d+[.)]\s+/.test(line)) {
      if (ul) { out += '</ul>'; ul = false }
      if (!ol) { out += '<ol class="list-decimal list-inside space-y-1 my-2 marker:text-[#a78bfa] marker:font-bold">'; ol = true }
      out += `<li>${line.replace(/^\s*\d+[.)]\s+/, '')}</li>`
      continue
    }
    closeLists()
    if (line.trim() === '') continue // pusta linia = koniec akapitu (marginesy <p> dają oddech)
    out += `<p class="${P}">${line}</p>`
  }
  closeLists()
  return `<div class="md-body">${out}</div>`
}
