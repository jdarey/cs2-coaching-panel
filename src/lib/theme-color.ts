'use client'

export const PRIMARY_PRESETS = [
  { name: 'Fioletowy', value: '#a78bfa', desc: 'Domyślny' },
  { name: 'Biały', value: '#ffffff', desc: 'Minimal' },
  { name: 'Niebieski', value: '#3b82f6', desc: 'Blue' },
] as const

function hexToHsl(hex: string): [number, number, number] | null {
  const m = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{3,8}$/.test(m)) return null
  const full = m.length === 3 ? m.split('').map(c => c + c).join('') : m.slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  let r: number, g: number, b: number
  if (s === 0) { r = g = b = l } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function applyPrimaryColor(hex: string) {
  if (typeof document === 'undefined') return
  const hsl = hexToHsl(hex)
  if (!hsl) return
  const [h, s, l] = hsl
  // primary
  document.documentElement.style.setProperty('--primary', `${h} ${s}% ${l}%`)
  // darker / lighter variants for gradients
  const darkL = Math.max(0, l - 12)
  const darkerL = Math.max(0, l - 22)
  const lightL = Math.min(100, l + 18)
  document.documentElement.style.setProperty('--primary-dark', `${h} ${s}% ${darkL}%`)
  document.documentElement.style.setProperty('--primary-darker', `${h} ${s}% ${darkerL}%`)
  document.documentElement.style.setProperty('--primary-light', `${h} ${s}% ${lightL}%`)
  document.documentElement.style.setProperty('--primary-hex', hex)

  // light color needs dark text on primary buttons
  const isLight = l > 70
  document.documentElement.dataset.primaryLight = isLight ? 'true' : 'false'
  localStorage.setItem('primaryColor', hex)

  // Inject/update override style for hardcoded Tailwind arbitrary values
  let style = document.getElementById('primary-color-override') as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = 'primary-color-override'
    document.head.appendChild(style)
  }
  // All hardcoded violet shades + poswiaty/obramowki map to chosen color (wszystkie w stylu strony)
  const lightHex = hslToHex(h, s, lightL)
  const darkHex = hslToHex(h, s, darkL)
  const darkerHex = hslToHex(h, s, darkerL)
  const toRgba = (hx: string, a: number) => {
    const r = parseInt(hx.slice(1, 3), 16), g = parseInt(hx.slice(3, 5), 16), b = parseInt(hx.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  style.textContent = `
    /* tła, teksty, obramowania, ring */
    .bg-\\[\\#a78bfa\\] { background-color: ${hex} !important; }
    .bg-\\[\\#a78bfa\\]\\/10 { background-color: ${toRgba(hex, 0.1)} !important; }
    .bg-\\[\\#a78bfa\\]\\/20 { background-color: ${toRgba(hex, 0.2)} !important; }
    .bg-\\[\\#a78bfa\\]\\/30 { background-color: ${toRgba(hex, 0.3)} !important; }
    .bg-\\[\\#8b5cf6\\] { background-color: ${darkHex} !important; }
    .bg-\\[\\#8b5cf6\\]\\/10 { background-color: ${toRgba(darkHex, 0.1)} !important; }
    .bg-\\[\\#8b5cf6\\]\\/20 { background-color: ${toRgba(darkHex, 0.2)} !important; }
    .bg-\\[\\#6d28d9\\] { background-color: ${darkerHex} !important; }
    .bg-\\[\\#c4b5fd\\] { background-color: ${lightHex} !important; }
    .bg-\\[\\#c4b5fd\\]\\/10 { background-color: ${toRgba(lightHex, 0.1)} !important; }
    .text-\\[\\#a78bfa\\] { color: ${hex} !important; }
    .text-\\[\\#c4b5fd\\] { color: ${lightHex} !important; }
    .text-\\[\\#8b5cf6\\] { color: ${darkHex} !important; }
    .border-\\[\\#a78bfa\\] { border-color: ${hex} !important; }
    .border-\\[\\#a78bfa\\]\\/10 { border-color: ${toRgba(hex, 0.1)} !important; }
    .border-\\[\\#a78bfa\\]\\/20 { border-color: ${toRgba(hex, 0.2)} !important; }
    .border-\\[\\#a78bfa\\]\\/30 { border-color: ${toRgba(hex, 0.3)} !important; }
    .border-\\[\\#8b5cf6\\] { border-color: ${darkHex} !important; }
    .border-\\[\\#8b5cf6\\]\\/20 { border-color: ${toRgba(darkHex, 0.2)} !important; }
    .from-\\[\\#a78bfa\\] { --tw-gradient-from: ${hex} var(--tw-gradient-from-position) !important; }
    .from-\\[\\#8b5cf6\\] { --tw-gradient-from: ${darkHex} var(--tw-gradient-from-position) !important; }
    .from-\\[\\#c4b5fd\\] { --tw-gradient-from: ${lightHex} var(--tw-gradient-from-position) !important; }
    .to-\\[\\#8b5cf6\\] { --tw-gradient-to: ${darkHex} var(--tw-gradient-to-position) !important; }
    .to-\\[\\#6d28d9\\] { --tw-gradient-to: ${darkerHex} var(--tw-gradient-to-position) !important; }
    .via-\\[\\#a78bfa\\] { --tw-gradient-via: ${hex} var(--tw-gradient-via-position) !important; }
    .ring-\\[\\#a78bfa\\] { --tw-ring-color: ${hex} !important; }
    .ring-\\[\\#a78bfa\\]\\/20 { --tw-ring-color: ${toRgba(hex, 0.2)} !important; }
    .ring-\\[\\#a78bfa\\]\\/30 { --tw-ring-color: ${toRgba(hex, 0.3)} !important; }
    /* poswiaty / shadowy - wszystkie w kolorze przewodnim */
    [class*="shadow-\\[0_20px_60px"] { box-shadow: 0 20px 60px -20px ${toRgba(hex, 0.35)} !important; }
    [class*="shadow-\\[0_18px_56px"] { box-shadow: 0 18px 56px -20px ${toRgba(hex, 0.35)} !important; }
    [class*="shadow-\\[0_8px_24px"] { box-shadow: 0 8px 24px -8px ${toRgba(darkHex, 0.4)} !important; }
    .spotlight-card::before { background: radial-gradient(560px circle at var(--mx, 50%) var(--my, 50%), ${toRgba(hex, 0.14)}, ${toRgba(lightHex, 0.06)} 40%, transparent 60%) !important; }
    .border-glow::before { background: conic-gradient(from var(--border-angle, 0deg), transparent 0deg, ${toRgba(hex, 0.55)} 45deg, ${toRgba(lightHex, 0.9)} 90deg, ${toRgba(darkHex, 0.5)} 135deg, transparent 200deg, transparent 320deg, ${toRgba(darkerHex, 0.45)} 345deg, transparent 360deg) !important; }
    [data-primary-light="true"] .bg-\\[\\#a78bfa\\].text-white, [data-primary-light="true"] .bg-\\[\\#8b5cf6\\].text-white, [data-primary-light="true"] .from-\\[\\#a78bfa\\].text-white { color: #0a0a0a !important; }
  `
}

export function applyStoredPrimaryColor() {
  if (typeof window === 'undefined') return
  const saved = localStorage.getItem('primaryColor')
  if (saved) applyPrimaryColor(saved)
}

export function clearPrimaryColor() {
  if (typeof document === 'undefined') return
  localStorage.removeItem('primaryColor')
  document.documentElement.style.removeProperty('--primary')
  document.documentElement.style.removeProperty('--primary-dark')
  document.documentElement.style.removeProperty('--primary-darker')
  document.documentElement.style.removeProperty('--primary-light')
  document.documentElement.style.removeProperty('--primary-hex')
  delete document.documentElement.dataset.primaryLight
  const style = document.getElementById('primary-color-override')
  if (style) style.remove()
}
