import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Builds the runtime connection URL with the settings Prisma needs when the
 * database sits behind a transaction pooler (Neon `-pooler` host, PgBouncer,
 * Supabase). Prisma must know it is talking to a pooler:
 *
 *  - `pgbouncer=true` switches Prisma into transaction-pooling mode — it stops
 *    relying on session-level features and prepared statements that a pooler
 *    cannot guarantee, which otherwise causes random `Can't reach database`
 *    errors under load.
 *  - `connection_limit` caps how many connections a single serverless instance
 *    may open. Without it Prisma defaults to `num_cpus * 2 + 1`, and every
 *    cold-started Vercel function instance spins up its own pool — together
 *    they can exhaust the Neon pool's connection budget and the whole database
 *    starts refusing connections for everyone.
 */
function buildPooledUrl(raw: string | undefined): string {
  if (!raw) return raw ?? ''
  try {
    const url = new URL(raw)
    const isPooler =
      url.hostname.includes('-pooler.') ||
      (url.searchParams.get('pgbouncer') ?? '').toLowerCase() === 'true'
    if (!isPooler) return raw
    // Prisma must know it is behind a transaction pooler: without pgbouncer=true
    // it relies on session features/prepared statements the pooler can't
    // guarantee, which causes random connection errors under load.
    if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true')
    // Cap connections per serverless instance. Prisma's default pool
    // (num_cpus * 2 + 1) lets every cold-started Vercel function open many
    // connections; multiplied across instances they exhaust the Neon pool and
    // the whole DB refuses connections for everyone. 5 is plenty through a
    // pooler that multiplexes.
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5')
    return url.toString()
  } catch {
    return raw
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: { url: buildPooledUrl(process.env.DATABASE_URL) },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
