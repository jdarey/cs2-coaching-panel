import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

// Szyfrowanie sekretów trenera (klucze Faceit/Steam, webhook Discord) w DB.
// AES-256-GCM, klucz z ENCRYPTION_KEY. TYLKO SERWER — nie importować z
// komponentów klienckich ('use client').
//
// Format: "enc:v1:<ivB64>:<ctB64>". Stare wartości plaintext przechodzą
// przez decrypt bez zmian i szyfrują się przy kolejnym zapisie (migracja
// miękka — nic nie trzeba robić ręcznie).

const PREFIX = 'enc:v1:'

function key(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) return null
  return createHash('sha256').update(raw).digest()
}

let warned = false
function warnOnce() {
  if (!warned) {
    warned = true
    console.warn('[crypto] ENCRYPTION_KEY nie ustawiony — sekrety lądują w DB jako plaintext')
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX)
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null) return null
  const text = String(plain)
  if (!text) return null
  // Nie szyfruj dwa razy (np. echo zwróconej wcześniej zaszyfrowanej wartości).
  if (isEncrypted(text)) return text
  const k = key()
  if (!k) {
    warnOnce()
    return text
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()])
  return `${PREFIX}${iv.toString('base64')}:${ct.toString('base64')}`
}

export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null) return null
  const text = String(stored)
  if (!text) return null
  if (!isEncrypted(text)) return text // legacy plaintext
  const k = key()
  if (!k) return null // nie odszyfrujemy bez klucza — traktuj jako brak
  try {
    const [, ivB64, ctB64] = text.split(':')
    const iv = Buffer.from(ivB64, 'base64')
    const raw = Buffer.from(ctB64, 'base64')
    const tag = raw.subarray(raw.length - 16)
    const ct = raw.subarray(0, raw.length - 16)
    const decipher = createDecipheriv('aes-256-gcm', k, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
