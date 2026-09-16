// Wspólny rate-limit: Upstash Redis REST (darmowy tier) gdy skonfigurowany,
// inaczej in-memory Map (działa lokalnie / single-instance).
//
// Celowo BEZ SDK (@upstash/redis ciągnie Node.js API do Edge middleware) —
// czysty fetch do REST API działa w Edge, Node i przeglądarce. Przy awarii
// Redisa przepuszczamy (fail-open), żeby nie zablokować apki.

export type RateKind = 'auth' | 'sensitive' | 'forgot' | 'api'

const WINDOWS: Record<RateKind, { limit: number; secs: number }> = {
  auth: { limit: 10, secs: 60 },
  sensitive: { limit: 20, secs: 60 },
  forgot: { limit: 5, secs: 3600 },
  api: { limit: 100, secs: 60 },
}

function upstash(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

// Fallback in-memory (dev / brak Upstash).
const memory = new Map<string, { count: number; reset: number }>()
function memoryCheck(kind: RateKind, key: string): boolean {
  const { limit, secs } = WINDOWS[kind]
  const now = Date.now()
  const full = `${kind}:${key}`
  const rec = memory.get(full)
  if (!rec || now > rec.reset) {
    memory.set(full, { count: 1, reset: now + secs * 1000 })
    return true
  }
  if (rec.count >= limit) return false
  rec.count++
  return true
}

// Fixed window: INCR + EXPIRE NX w jednym pipeline.
async function redisCheck(kind: RateKind, key: string): Promise<boolean | null> {
  const cfg = upstash()
  if (!cfg) return null
  const { limit, secs } = WINDOWS[kind]
  const redisKey = `rl:${kind}:${key}`
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, String(secs), 'NX'],
      ]),
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ result?: number | string }>
    const count = Number(data?.[0]?.result)
    if (!Number.isFinite(count)) return null
    return count <= limit
  } catch {
    return null
  }
}

export async function checkRateLimit(kind: RateKind, key: string): Promise<{ ok: boolean }> {
  const distributed = await redisCheck(kind, key)
  if (distributed !== null) return { ok: distributed }
  return { ok: memoryCheck(kind, key) }
}
