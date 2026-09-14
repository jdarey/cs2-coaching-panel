import { prisma } from '@/lib/prisma'

export interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs?: number
  details?: string
  lastChecked: string
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      name: 'Database (PostgreSQL)',
      status: 'healthy',
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  } catch (e) {
    return {
      name: 'Database (PostgreSQL)',
      status: 'down',
      latencyMs: Date.now() - start,
      details: e instanceof Error ? e.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkFaceit(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    // Sprawdzamy legacy endpoint (keyless)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('https://api.faceit.com/users/v1/nicknames/testuser12345', {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    // 404 = endpoint działa, tylko user nie istnieje (OK)
    // 200 = działa
    // 429/5xx = problemy
    if (res.ok || res.status === 404) {
      return {
        name: 'Faceit API (Legacy)',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      }
    }
    if (res.status === 429) {
      return {
        name: 'Faceit API (Legacy)',
        status: 'degraded',
        latencyMs: Date.now() - start,
        details: 'Rate limited (429)',
        lastChecked: new Date().toISOString(),
      }
    }
    return {
      name: 'Faceit API (Legacy)',
      status: 'degraded',
      latencyMs: Date.now() - start,
      details: `HTTP ${res.status}`,
      lastChecked: new Date().toISOString(),
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return {
        name: 'Faceit API (Legacy)',
        status: 'degraded',
        latencyMs: Date.now() - start,
        details: 'Timeout (5s)',
        lastChecked: new Date().toISOString(),
      }
    }
    return {
      name: 'Faceit API (Legacy)',
      status: 'down',
      latencyMs: Date.now() - start,
      details: e instanceof Error ? e.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkSteam(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    // Steam Web API - sprawdzamy czy endpoint odpowiada
    const res = await fetch('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=test&steamids=76561197960435530', {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    // 401/403 = endpoint działa, tylko klucz niepoprawny (OK)
    // 200 = działa
    if (res.ok || res.status === 401 || res.status === 403) {
      return {
        name: 'Steam Web API',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      }
    }
    if (res.status === 429) {
      return {
        name: 'Steam Web API',
        status: 'degraded',
        latencyMs: Date.now() - start,
        details: 'Rate limited (429)',
        lastChecked: new Date().toISOString(),
      }
    }
    return {
      name: 'Steam Web API',
      status: 'degraded',
      latencyMs: Date.now() - start,
      details: `HTTP ${res.status}`,
      lastChecked: new Date().toISOString(),
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return {
        name: 'Steam Web API',
        status: 'degraded',
        latencyMs: Date.now() - start,
        details: 'Timeout (5s)',
        lastChecked: new Date().toISOString(),
      }
    }
    return {
      name: 'Steam Web API',
      status: 'down',
      latencyMs: Date.now() - start,
      details: e instanceof Error ? e.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkLeetify(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch('https://api.leetify.com/api/profile/76561197960435530', {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (res.ok || res.status === 404) {
      return {
        name: 'Leetify API',
        status: 'healthy',
        latencyMs: Date.now() - start,
        lastChecked: new Date().toISOString(),
      }
    }
    if (res.status === 429) {
      return {
        name: 'Leetify API',
        status: 'degraded',
        latencyMs: Date.now() - start,
        details: 'Rate limited (429)',
        lastChecked: new Date().toISOString(),
      }
    }
    return {
      name: 'Leetify API',
      status: 'degraded',
      latencyMs: Date.now() - start,
      details: `HTTP ${res.status}`,
      lastChecked: new Date().toISOString(),
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return {
        name: 'Leetify API',
        status: 'degraded',
        latencyMs: Date.now() - start,
        details: 'Timeout (5s)',
        lastChecked: new Date().toISOString(),
      }
    }
    return {
      name: 'Leetify API',
      status: 'down',
      latencyMs: Date.now() - start,
      details: e instanceof Error ? e.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    }
  }
}

async function checkEmail(): Promise<HealthCheck> {
  const start = Date.now()
  // Sprawdzamy czy skonfigurowano Resend lub SMTP
  const hasResend = !!process.env.RESEND_API_KEY
  const hasSmtp = !!process.env.SMTP_USER && !!process.env.SMTP_PASS

  if (hasResend || hasSmtp) {
    return {
      name: 'Email (Resend/SMTP)',
      status: 'healthy',
      details: hasResend ? 'Resend configured' : 'SMTP configured',
      latencyMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
    }
  }
  return {
    name: 'Email (Resend/SMTP)',
    status: 'down',
    details: 'No email provider configured (RESEND_API_KEY or SMTP_USER/SMTP_PASS missing)',
    latencyMs: Date.now() - start,
    lastChecked: new Date().toISOString(),
  }
}

export async function runHealthChecks(): Promise<{ checks: HealthCheck[]; overall: 'healthy' | 'degraded' | 'down' }> {
  const [db, faceit, steam, leetify, email] = await Promise.all([
    checkDatabase(),
    checkFaceit(),
    checkSteam(),
    checkLeetify(),
    checkEmail(),
  ])

  const checks = [db, faceit, steam, leetify, email]
  const hasDown = checks.some((c) => c.status === 'down')
  const hasDegraded = checks.some((c) => c.status === 'degraded')

  let overall: 'healthy' | 'degraded' | 'down' = 'healthy'
  if (hasDown) overall = 'down'
  else if (hasDegraded) overall = 'degraded'

  return { checks, overall }
}