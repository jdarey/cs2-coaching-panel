import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

// E2E login test — drives the REAL NextAuth flow over HTTP against a running
// dev server (the same requests the login form makes):
//   GET  /login                     → form renders
//   GET  /api/auth/csrf             → csrf token (+ csrf cookie)
//   POST /api/auth/callback/credentials  with csrfToken + absolute callbackUrl
//   GET  /api/auth/session          → session carries the role
//   GET  /                          → middleware/page redirect to role dashboard
//
// The absolute callbackUrl is itself a regression test: next-auth/react
// resolves the POST response with `new URL(data.url)`, which throws on a
// relative path ('/') — the bug that made every login fail with a generic
// error. If someone reverts that fix, this test fails.
//
// Run with:  npm run test:e2e   (requires the dev server to be up)
// Point at another server with  E2E_BASE_URL=http://host:port

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3100'

const COACH = { email: 'coach@test.com', password: 'password123', role: 'COACH', dashboard: '/coach/dashboard' }
const STUDENT = { email: 'student@test.com', password: 'password123', role: 'STUDENT', dashboard: '/student/dashboard' }

// Minimal cookie jar — NextAuth sets two cookies (csrf + session token) and
// expects both back on subsequent requests. Node's fetch does not persist
// cookies automatically.
function makeJar() {
  let store = new Map<string, string>()
  return {
    cookieHeader(): string {
      return Array.from(store.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
    },
    absorb(res: Response) {
      const setCookies = (res.headers as any).getSetCookie?.() as string[] | undefined
      if (!setCookies) return
      for (const sc of setCookies) {
        const pair = sc.split(';')[0]
        const eq = pair.indexOf('=')
        if (eq < 0) continue
        const name = pair.slice(0, eq).trim()
        const value = pair.slice(eq + 1).trim()
        if (value === '') store.delete(name)
        else store.set(name, value)
      }
    },
  }
}

async function getCsrf(jar: ReturnType<typeof makeJar>): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/csrf`, { cache: 'no-store' })
  jar.absorb(res)
  assert.equal(res.status, 200, 'csrf endpoint should return 200')
  const data = (await res.json()) as { csrfToken?: string }
  assert.ok(data.csrfToken, 'csrf endpoint should return a csrfToken')
  return data.csrfToken as string
}

async function loginViaForm(jar: ReturnType<typeof makeJar>, email: string, password: string) {
  const csrfToken = await getCsrf(jar)
  // Absolute callbackUrl — exactly what the fixed login form sends.
  const callbackUrl = `${BASE}/`
  const body = new URLSearchParams()
  body.set('csrfToken', csrfToken)
  body.set('callbackUrl', callbackUrl)
  body.set('json', 'true')
  body.set('email', email)
  body.set('password', password)

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // The csrf cookie from GET /api/auth/csrf must be sent back — without it
      // NextAuth fails CSRF validation and never issues a session cookie.
      cookie: jar.cookieHeader(),
    },
    body,
    redirect: 'manual',
  })
  jar.absorb(res)
  return res
}

async function getSession(jar: ReturnType<typeof makeJar>) {
  const res = await fetch(`${BASE}/api/auth/session`, {
    headers: { cookie: jar.cookieHeader() },
    cache: 'no-store',
  })
  return (await res.json()) as { user?: { email?: string; role?: string } }
}

// Follows redirects manually (redirect: 'manual' everywhere) so we can assert
// the exact final URL the role redirect lands on.
async function followToDashboard(jar: ReturnType<typeof makeJar>, start: string): Promise<string> {
  let url = start
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(url, { headers: { cookie: jar.cookieHeader() }, redirect: 'manual', cache: 'no-store' })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      assert.ok(loc, `redirect ${url} should have a location header`)
      url = new URL(loc, url).toString()
      continue
    }
    return new URL(url).pathname
  }
  assert.fail('too many redirects following to dashboard')
}

describe('login e2e (form flow over HTTP)', () => {
  let serverUp = false

  before(async () => {
    try {
      const res = await fetch(`${BASE}/login`, { method: 'HEAD', cache: 'no-store' })
      serverUp = res.status < 500
    } catch {
      serverUp = false
    }
    assert.ok(serverUp, `No server answering at ${BASE} — start the dev server first (npm run dev -p 3100).`)
  })

  it('GET /login serves the login form', async () => {
    // The form itself is a client component in an RSC shell, so the raw HTML
    // only carries the page chunk reference — assert the login page module is
    // served and the page answers 200.
    const res = await fetch(`${BASE}/login`, { cache: 'no-store' })
    assert.equal(res.status, 200)
    const html = await res.text()
    assert.ok(html.includes('login/page'), 'login HTML should reference the login page chunk')

    // RSC payload (what the browser hydrates) references the login form module.
    const rsc = await fetch(`${BASE}/login`, { headers: { RSC: '1' }, cache: 'no-store' })
    assert.equal(rsc.status, 200)
    const rscText = await rsc.text()
    assert.ok(rscText.includes('login/page.tsx'), 'RSC payload should reference the login form component')
  })

  it('credentials POST returns an absolute, same-origin url (regression: relative "/" used to throw in new URL())', async () => {
    const jar = makeJar()
    const res = await loginViaForm(jar, STUDENT.email, STUDENT.password)
    jar.absorb(res)
    assert.ok(res.status < 500, `credentials POST should not 500 (got ${res.status})`)
    const data = (await res.json()) as { url?: string }
    assert.ok(data.url, 'credentials response should include a url')
    // The whole point of the fix: data.url must be ABSOLUTE so next-auth/react
    // can parse it with new URL(). A relative path ('/') makes it throw
    // TypeError → the whole login dies with a generic error. Same-origin is
    // not asserted because in dev NEXTAUTH_URL is localhost while the client
    // may connect via 127.0.0.1 — same machine, different origin string.
    const parsed = new URL(data.url as string)
    assert.ok(parsed.origin, 'callback url should be absolute and parseable')
    assert.equal(parsed.pathname, '/', 'callback url should keep the requested path')
  })

  it('coach@test.com logs in and lands on /coach/dashboard', async () => {
    const jar = makeJar()
    const res = await loginViaForm(jar, COACH.email, COACH.password)
    assert.equal(res.status, 200, 'coach credentials POST should succeed')

    const session = await getSession(jar)
    assert.equal(session.user?.email, COACH.email)
    assert.equal(session.user?.role, COACH.role)

    const finalPath = await followToDashboard(jar, `${BASE}/`)
    assert.equal(finalPath, COACH.dashboard, 'root should redirect coach to /coach/dashboard')

    // Middleware: an authenticated coach hitting /login goes straight to their dashboard.
    const loginPath = await followToDashboard(jar, `${BASE}/login`)
    assert.equal(loginPath, COACH.dashboard, 'coach visiting /login should be redirected to /coach/dashboard')
  })

  it('student@test.com logs in and lands on /student/dashboard', async () => {
    const jar = makeJar()
    const res = await loginViaForm(jar, STUDENT.email, STUDENT.password)
    assert.equal(res.status, 200, 'student credentials POST should succeed')

    const session = await getSession(jar)
    assert.equal(session.user?.email, STUDENT.email)
    assert.equal(session.user?.role, STUDENT.role)

    const finalPath = await followToDashboard(jar, `${BASE}/`)
    assert.equal(finalPath, STUDENT.dashboard, 'root should redirect student to /student/dashboard')

    const loginPath = await followToDashboard(jar, `${BASE}/login`)
    assert.equal(loginPath, STUDENT.dashboard, 'student visiting /login should be redirected to /student/dashboard')
  })

  it('wrong password is rejected', async () => {
    const jar = makeJar()
    const res = await loginViaForm(jar, STUDENT.email, 'definitely-wrong')
    jar.absorb(res)
    const data = (await res.json()) as { url?: string }
    // NextAuth answers 200 with a url that points back at /login?error=…
    assert.ok(data.url && data.url.includes('error='), 'wrong credentials should redirect to login with an error param')
  })

  it('signout clears the session and / redirects back to /login', async () => {
    const jar = makeJar()
    await loginViaForm(jar, STUDENT.email, STUDENT.password)

    const sessionBefore = await getSession(jar)
    assert.equal(sessionBefore.user?.role, 'STUDENT')

    // Sign out exactly like the UI button does.
    const csrf = await getCsrf(jar)
    const signoutBody = new URLSearchParams()
    signoutBody.set('csrfToken', csrf)
    signoutBody.set('json', 'true')
    const signoutRes = await fetch(`${BASE}/api/auth/signout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: jar.cookieHeader() },
      body: signoutBody,
      redirect: 'manual',
    })
    jar.absorb(signoutRes)
    assert.ok(signoutRes.status < 500, `signout should not 500 (got ${signoutRes.status})`)

    const sessionAfter = await getSession(jar)
    assert.equal(sessionAfter.user, undefined, 'session should be empty after signout')

    // Root now redirects to /login because there is no session.
    const res = await fetch(`${BASE}/`, { headers: { cookie: jar.cookieHeader() }, redirect: 'manual', cache: 'no-store' })
    const loc = res.headers.get('location')
    assert.ok(loc && loc.includes('/login'), `root without session should redirect to /login (got ${loc ?? 'no location'})`)
  })
})
