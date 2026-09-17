/**
 * Kody dostępu do produktu (rutyna CS2).
 * Format: CS2-XXXX-XXXX — cyfry/litery bez mylących znaków (bez 0/O/1/I/L).
 * Po zakupie klient dostaje kod, aktywuje go na /aktywuj-kod.
 */

// Bez 0/O/1/I/L — klient przepisuje kod z maila po zakupie.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const GROUPS = 2
const GROUP_LEN = 4

function randomGroup(): string {
  const bytes = new Uint32Array(GROUP_LEN)
  // crypto jest globalne w Node 18+ i w przeglądarkach
  globalThis.crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < GROUP_LEN; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

/** Losowy kod w formacie CS2-XXXX-XXXX. */
export function generateAccessCode(): string {
  const groups: string[] = []
  for (let i = 0; i < GROUPS; i++) groups.push(randomGroup())
  return `CS2-${groups.join('-')}`
}

/** Zestaw unikalnych kodów (np. partia do wysyłki po zakupach). */
export function generateAccessCodes(count: number): string[] {
  const set = new Set<string>()
  while (set.size < count) set.add(generateAccessCode())
  return Array.from(set)
}

/** Normalizacja wpisanego kodu: upper-case, myślniki/spacje opcjonalne. */
export function normalizeAccessCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, '')
  // Wpisane bez myślników — potnij na grupy 4 znaków po prefiksie CS2.
  if (cleaned.startsWith('CS2') && cleaned.length === 11) {
    return `CS2-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`
  }
  return cleaned
}

/** Szybki format-check przed uderzeniem w bazę. */
export function isValidAccessCodeFormat(code: string): boolean {
  return /^CS2-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/.test(code)
}
