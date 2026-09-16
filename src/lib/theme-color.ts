'use client'

export const PRIMARY_PRESETS = [
  { name: 'Fioletowy', value: '#a78bfa', desc: 'Domyślny' },
  { name: 'Biały', value: '#ffffff', desc: 'Minimal' },
  { name: 'Niebieski', value: '#3b82f6', desc: 'Blue' },
] as const

type Role = 'base' | 'light' | 'dark' | 'darker'

// Każdy twardo wpisany akcent (fiolet + turkus) mapujemy na rolę względem
// wybranego koloru. Kolory statusów (amber/emerald/red/blue) i kolory tagów
// (dane) celowo zostają nietknięte.
const TOKEN_ROLE: Record<string, Role> = {
  a78bfa: 'base',
  '8b5cf6': 'dark',
  '6d28d9': 'darker',
  c4b5fd: 'light',
  '7c3aed': 'dark',
  ddd6fe: 'light',
  '2de5ca': 'base',
  '14b8a6': 'dark',
  '147a6b': 'darker',
  '0d6b5f': 'darker',
  '8cffef': 'light',
  '2fb6a2': 'dark',
  '2dd4bf': 'base',
  e9d5ff: 'light',
}

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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

// [prefix, utility, hex, opacity] — dokładne kombinacje występujące w kodzie
// (wyciągnięte skanem). Prefix '' = zawsze, reszta tylko w danym stanie.
type Combo = [string, string, string, string]
const COMBOS: Combo[] = []
function addCombos(util: string, hex: string, ops: string[], pres: string[] = ['']) {
  for (const pre of pres) for (const op of ops) COMBOS.push([pre, util, hex, op])
}
const SOLID = ['']

addCombos('accent', '2de5ca', SOLID)
addCombos('accent', '8b5cf6', SOLID)
addCombos('accent', 'a78bfa', SOLID)
addCombos('bg', '14b8a6', SOLID)
addCombos('bg', '2de5ca', [...SOLID, '0.04', '0.05', '0.07', '0.08', '10', '15', '20'])
addCombos('bg', '6d28d9', ['10', '20'])
addCombos('bg', '8b5cf6', [...SOLID, '10', '12', '15', '20', '25', '30'])
addCombos('bg', 'a78bfa', [...SOLID, '0.04', '0.06', '0.08', '0.1', '0.12', '10', '15', '20', '40'])
addCombos('bg', 'c4b5fd', [...SOLID, '10', '15'])
addCombos('border', '2de5ca', ['20', '25', '30', '40'])
addCombos('border', '8b5cf6', ['30'])
addCombos('border', 'a78bfa', [...SOLID, '15', '20', '25', '30', '40', '50'])
addCombos('border', 'c4b5fd', ['20', '25'])
addCombos('border', '8b5cf6', ['30', '40'])
addCombos('border', '2de5ca', ['10', '15', '20'])
addCombos('border-r', '8b5cf6', SOLID)
addCombos('border-t', 'a78bfa', SOLID)
addCombos('decoration', '2de5ca', ['40'])
addCombos('from', '2de5ca', SOLID)
addCombos('from', '8b5cf6', SOLID)
addCombos('from', 'a78bfa', [...SOLID, '0.07', '0.16', '10', '15', '20', '25', '30', '40', '45', '70'])
addCombos('from', 'c4b5fd', SOLID)
addCombos('ring', '8b5cf6', ['30'])
addCombos('ring', 'a78bfa', [...SOLID, '20', '25', '30', '40'])
addCombos('ring', '2de5ca', ['20'])
addCombos('text', '2de5ca', [...SOLID, '80'])
addCombos('text', '6d28d9', SOLID)
addCombos('text', '8b5cf6', SOLID)
addCombos('text', '8cffef', [...SOLID, '70', '80'])
addCombos('text', 'a78bfa', [...SOLID, '50', '60', '70', '80', '90'])
addCombos('text', 'c4b5fd', [...SOLID, '70', '80'])
addCombos('text', 'e9d5ff', SOLID)
addCombos('text', '2dd4bf', SOLID)
addCombos('via', '8b5cf6', SOLID)
addCombos('to', '147a6b', SOLID)
addCombos('to', '6d28d9', [...SOLID, '0.04', '10', '20', '25', '5'])
addCombos('to', '7c3aed', SOLID)
addCombos('to', '8b5cf6', [...SOLID, '10', '15', '20', '25', '70'])
addCombos('to', 'a78bfa', [...SOLID, '10'])
addCombos('to', 'c4b5fd', SOLID)
addCombos('to', 'ddd6fe', SOLID)
addCombos('border', 'a78bfa', ['40', '50'], ['focus-visible:'])
addCombos('ring', '8b5cf6', ['25'], ['focus-visible:'])
addCombos('border', '2de5ca', ['40'], ['focus:'])
addCombos('border', '8b5cf6', ['40'], ['focus:'])
addCombos('border', 'a78bfa', ['30', '40', '60'], ['focus:'])
addCombos('ring', '8b5cf6', ['25', '30', '40'], ['focus:'])
addCombos('text', 'c4b5fd', SOLID, ['group-focus-within:'])
addCombos('bg', 'a78bfa', ['30', '5'], ['group-hover:'])
addCombos('bg', 'a78bfa', ['15'], ['group-hover/task:'])
addCombos('border', 'a78bfa', ['25'], ['group-hover:'])
addCombos('border', 'a78bfa', ['30'], ['group-hover/task:'])
addCombos('text', '8cffef', SOLID, ['group-hover:'])
addCombos('text', 'c4b5fd', SOLID, ['group-hover:'])
addCombos('bg', '2de5ca', ['0.06', '0.08', '0.12', '0.14', '10'], ['hover:'])
addCombos('bg', '8b5cf6', [...SOLID, '15'], ['hover:'])
addCombos('bg', 'a78bfa', ['0.03', '0.16', '0.18', '10', '15', '20', '5'], ['hover:'])
addCombos('border', '2de5ca', ['25', '30'], ['hover:'])
addCombos('border', '8b5cf6', ['40'], ['hover:'])
addCombos('border', 'a78bfa', ['20', '25', '30', '40', '50'], ['hover:'])
addCombos('decoration', '2de5ca', SOLID, ['hover:'])
addCombos('from', 'a78bfa', ['20', '25'], ['hover:'])
addCombos('ring', '2de5ca', ['30'], ['hover:'])
addCombos('ring', 'a78bfa', ['25', '30', '40'], ['hover:'])
addCombos('text', '8cffef', SOLID, ['hover:'])
addCombos('text', 'a78bfa', SOLID, ['hover:'])
addCombos('text', 'c4b5fd', SOLID, ['hover:'])
addCombos('to', '8b5cf6', ['10', '25'], ['hover:'])
addCombos('text', 'a78bfa', SOLID, ['marker:'])

// [prefix, token klasy shadow, geometria CSS, alpha] — geometria zostaje,
// kolor idzie w wybrany. Emerald (done) i neutralne celowo pomijamy.
type ShadowRule = [string, string, string, number, string?]
const SHADOWS: ShadowRule[] = [
  ['', 'shadow-[0_0_12px_rgba(167,139,250,0.8)]', '0 0 12px', 0.8],
  ['', 'shadow-[0_0_12px_rgba(20,184,166,0.7)]', '0 0 12px', 0.7],
  ['', 'shadow-[0_0_16px_rgba(139,92,246,0.5)]', '0 0 16px', 0.5],
  ['', 'shadow-[0_0_24px_-6px_rgba(139,92,246,0.5)]', '0 0 24px -6px', 0.5],
  ['', 'shadow-[0_0_32px_-8px_rgba(139,92,246,0.55)]', '0 0 32px -8px', 0.55],
  ['', 'shadow-[0_0_40px_-8px_rgba(139,92,246,0.55)]', '0 0 40px -8px', 0.55],
  ['', 'shadow-[0_0_70px_-10px_rgba(139,92,246,0.7)]', '0 0 70px -10px', 0.7],
  ['', 'shadow-[0_10px_40px_-10px_rgba(45,229,202,0.6)]', '0 10px 40px -10px', 0.6],
  ['', 'shadow-[0_12px_40px_-12px_rgba(139,92,246,0.6)]', '0 12px 40px -12px', 0.6],
  ['', 'shadow-[0_24px_64px_-16px_rgba(139,92,246,0.35)]', '0 24px 64px -16px', 0.35],
  ['', 'shadow-[0_24px_64px_-16px_rgba(139,92,246,0.35),0_8px_32px_-8px_rgba(0,0,0,0.6)]', '0 24px 64px -16px', 0.35, ', 0 8px 32px -8px rgba(0,0,0,0.6)'],
  ['', 'shadow-[0_24px_64px_-16px_rgba(139,92,246,0.35),0_8px_32px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)]', '0 24px 64px -16px', 0.35, ', 0 8px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)'],
  ['', 'shadow-[0_4px_12px_-4px_rgba(139,92,246,0.4)]', '0 4px 12px -4px', 0.4],
  ['', 'shadow-[0_4px_16px_rgba(139,92,246,0.3)]', '0 4px 16px', 0.3],
  ['', 'shadow-[0_6px_20px_-6px_rgba(139,92,246,0.5)]', '0 6px 20px -6px', 0.5],
  ['', 'shadow-[0_6px_20px_-6px_rgba(45,229,202,0.6)]', '0 6px 20px -6px', 0.6],
  ['', 'shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6)]', '0 8px 24px -8px', 0.6],
  ['', 'shadow-[0_8px_32px_-8px_rgba(45,229,202,0.55)]', '0 8px 32px -8px', 0.55],
  ['focus:', 'focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]', '0 0 0 3px', 0.12],
  ['group-hover:', 'group-hover:shadow-[0_0_56px_-6px_rgba(139,92,246,0.8)]', '0 0 56px -6px', 0.8],
  ['group-hover/routine:', 'group-hover/routine:shadow-[0_14px_40px_-10px_rgba(139,92,246,0.7)]', '0 14px 40px -10px', 0.7],
  ['hover:', 'hover:shadow-[0_16px_48px_-12px_rgba(139,92,246,0.8)]', '0 16px 48px -12px', 0.8],
  ['hover:', 'hover:shadow-[0_18px_56px_-20px_rgba(139,92,246,0.35)]', '0 18px 56px -20px', 0.35],
  ['hover:', 'hover:shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)]', '0 20px 60px -20px', 0.35],
]

const UTIL_PROP: Record<string, string> = {
  accent: 'accent-color',
  bg: 'background-color',
  border: 'border-color',
  'border-r': 'border-right-color',
  'border-t': 'border-top-color',
  decoration: 'text-decoration-color',
  from: '--tw-gradient-from',
  ring: '--tw-ring-color',
  text: 'color',
  to: '--tw-gradient-to',
  // via jako stops — ustawiamy pośredni stop gradientu na wybrany kolor
  via: '--tw-gradient-stops',
}

function alphaOf(op: string): number {
  if (!op) return 1
  return op.includes('.') ? parseFloat(op) : parseInt(op, 10) / 100
}

function scopeSelector(pre: string, token: string): string {
  const tok = `[class~="${token}"]`
  switch (pre) {
    case 'hover:': return `${tok}:hover`
    case 'focus:': return `${tok}:focus`
    case 'focus-visible:': return `${tok}:focus-visible`
    case 'focus-within:': return `${tok}:focus-within`
    case 'disabled:': return `${tok}:disabled`
    case 'active:': return `${tok}:active`
    case 'group-hover:': return `.group:hover ${tok}`
    case 'group-hover/routine:': return `.group\\/routine:hover ${tok}`
    case 'group-hover/task:': return `.group\\/task:hover ${tok}`
    case 'group-focus-within:': return `.group:focus-within ${tok}`
    case 'marker:': return `${tok}::marker`
    default: return tok
  }
}

export function applyPrimaryColor(hex: string) {
  if (typeof document === 'undefined') return
  const hsl = hexToHsl(hex)
  if (!hsl) return
  const [h, s, l] = hsl
  document.documentElement.style.setProperty('--primary', `${h} ${s}% ${l}%`)
  const darkL = Math.max(0, l - 12)
  const darkerL = Math.max(0, l - 22)
  const lightL = Math.min(100, l + 18)
  document.documentElement.style.setProperty('--primary-dark', `${h} ${s}% ${darkL}%`)
  document.documentElement.style.setProperty('--primary-darker', `${h} ${s}% ${darkerL}%`)
  document.documentElement.style.setProperty('--primary-light', `${h} ${s}% ${lightL}%`)
  document.documentElement.style.setProperty('--primary-hex', hex)

  const baseHex = hex
  const lightHex = hslToHex(h, s, lightL)
  const darkHex = hslToHex(h, s, darkL)
  const darkerHex = hslToHex(h, s, darkerL)
  const roleHex: Record<Role, string> = { base: baseHex, light: lightHex, dark: darkHex, darker: darkerHex }
  const rgba = (hx: string, a: number) => {
    const [r, g, b] = hexToRgb(hx)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  const roleVal = (role: Role, a: number) => (a >= 1 ? roleHex[role] : rgba(roleHex[role], a))

  const isLight = l > 70
  document.documentElement.dataset.primaryLight = isLight ? 'true' : 'false'
  localStorage.setItem('primaryColor', hex)

  // Zmienne design systemu też idą w wybrany kolor
  const root = document.documentElement.style
  root.setProperty('--teal', baseHex)
  root.setProperty('--teal-deep', darkHex)
  root.setProperty('--teal-dark', darkerHex)

  let style = document.getElementById('primary-color-override') as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = 'primary-color-override'
    document.head.appendChild(style)
  }

  const css: string[] = []

  // 1) Dokładne klasy Tailwind z akcentami (149 kombinacji)
  for (const [pre, util, srcHex, op] of COMBOS) {
    const role = TOKEN_ROLE[srcHex]
    if (!role) continue
    const prop = UTIL_PROP[util]
    if (!prop) continue
    const token = `${pre}${util}-[#${srcHex}]${op ? `/${op}` : ''}`
    if (util === 'via') {
      // via jest częścią --tw-gradient-stops — nadpisujemy pełny łańcuch stopów,
      // zachowując from/to (i pozycję 50% jak w Tailwindzie)
      css.push(`${scopeSelector(pre, token)}{--tw-gradient-stops:var(--tw-gradient-from), ${roleVal(role, alphaOf(op))} var(--tw-gradient-via-position), var(--tw-gradient-to) !important;}`)
    } else {
      css.push(`${scopeSelector(pre, token)}{${prop}:${roleVal(role, alphaOf(op))} !important;}`)
    }
  }

  // 2) Cienie glow — geometria zostaje, kolor idzie w wybrany
  for (const [pre, token, geom, a, rest] of SHADOWS) {
    css.push(`${scopeSelector(pre, token)}{box-shadow:${geom} ${rgba(baseHex, a)}${rest || ''} !important;}`)
  }

  // 3) Klasy komponentów ze statycznego CSS (twarde fiolety/teale)
  const A = (a: number) => rgba(baseHex, a)
  css.push(
    `.btn-darey,.btn-primary-gradient{background:linear-gradient(135deg, ${baseHex} 0%, ${darkHex} 45%, ${darkerHex} 100%) !important;border-color:${A(0.45)} !important;box-shadow:0 8px 32px -10px ${A(0.55)} !important;}`,
    `.btn-darey:hover,.btn-primary-gradient:hover{box-shadow:0 14px 44px -10px ${A(0.8)} !important;}`,
    `.icon-tile{background:linear-gradient(135deg, ${baseHex} 0%, ${darkHex} 100%) !important;border-color:${A(0.35)} !important;}`,
    `.tab-underline{background:linear-gradient(90deg, ${baseHex} 0%, ${darkHex} 100%) !important;}`,
    `.section-pill{color:${baseHex} !important;background:${A(0.09)} !important;border-color:${A(0.28)} !important;}`,
    `.live-dot{background:${baseHex} !important;}`,
    `.live-dot::after{border-color:${A(0.55)} !important;}`,
    `.glass-tinted{background:linear-gradient(180deg, ${A(0.05)}, transparent 40%), var(--surface-2) !important;}`,
    `.glass-liquid:hover{border-color:${A(0.22)} !important;box-shadow:0 12px 48px -20px ${A(0.25)} !important;}`,
    `.bento-card:hover{border-color:${A(0.35)} !important;}`,
    `.btn-secondary-glass:hover{border-color:${A(0.4)} !important;}`,
    `.btn-ghost-premium:hover{background:${A(0.08)} !important;border-color:${A(0.35)} !important;}`,
    `.input-premium:focus{border-color:${A(0.5)} !important;box-shadow:0 0 0 3px ${A(0.14)} !important;}`,
    `.spotlight-card::before{background:radial-gradient(560px circle at var(--mx, 50%) var(--my, 50%), ${A(0.14)}, ${rgba(lightHex, 0.06)} 40%, transparent 60%) !important;}`,
    `.border-glow::before{background:conic-gradient(from var(--border-angle, 0deg), transparent 0deg, ${A(0.55)} 45deg, ${rgba(lightHex, 0.9)} 90deg, ${rgba(darkHex, 0.5)} 135deg, transparent 200deg, transparent 320deg, ${rgba(darkerHex, 0.45)} 345deg, transparent 360deg) !important;}`,
    `::selection{background:${A(0.35)} !important;}`,
    `.animate-pulse-ring::before,.animate-pulse-ring::after{border-color:${A(0.7)} !important;}`,
    `.redirect-bar{background:linear-gradient(90deg, ${baseHex}, ${darkHex}, ${lightHex}, ${baseHex}) !important;}`,
    `[data-primary-light="true"] .btn-darey,[data-primary-light="true"] .btn-primary-gradient,[data-primary-light="true"] .icon-tile{color:#0a0a0a !important;}`,
    `[data-primary-light="true"] .btn-darey svg,[data-primary-light="true"] .btn-primary-gradient svg,[data-primary-light="true"] .icon-tile svg{color:#0a0a0a !important;}`,
  )

  style.textContent = css.join('\n')
}

export function applyStoredPrimaryColor() {
  if (typeof window === 'undefined') return
  const saved = localStorage.getItem('primaryColor')
  if (saved) applyPrimaryColor(saved)
}

export function clearPrimaryColor() {
  if (typeof document === 'undefined') return
  localStorage.removeItem('primaryColor')
  const root = document.documentElement.style
  root.removeProperty('--primary')
  root.removeProperty('--primary-dark')
  root.removeProperty('--primary-darker')
  root.removeProperty('--primary-light')
  root.removeProperty('--primary-hex')
  root.removeProperty('--teal')
  root.removeProperty('--teal-deep')
  root.removeProperty('--teal-dark')
  delete document.documentElement.dataset.primaryLight
  const style = document.getElementById('primary-color-override')
  if (style) style.remove()
}
