import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// NextAuth v4 hardcodes `http://localhost:3000` as its fallback base URL when
// NEXTAUTH_URL is unset, which makes login/logout redirects (data.url) point
// at the wrong origin whenever the dev server runs on a different port — e.g.
// the Freebuff preview on :3100. Signing out then navigates the browser to
// localhost:3000 where nothing listens, showing an error page instead of the
// login screen. Pin the base URL to the port the dev server actually uses.
//
// On Vercel the same class of bug bites in production: NEXTAUTH_URL may be
// unset or point at an old deployment slug (cs2-coaching-panel.vercel.app),
// so every login/logout redirect (data.url) and every link inside emails
// bounces users to a domain where their session cookie does not exist — they
// land back on /login. Because every API route imports authOptions, setting
// the env here fixes all of them at once. Prefer the live production URL
// (VERCEL_PROJECT_PRODUCTION_URL) over anything configured in the dashboard;
// preview deployments get their own URL so preview sessions still work.
if (process.env.NODE_ENV === 'production') {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
  } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  } else if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = 'https://cs2-coaching-panel-ten.vercel.app'
  }
} else if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `http://localhost:${process.env.PORT || 3000}`
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid credentials')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        }
      },
    }),
  ],
  callbacks: {
    // Extra guard: never bounce the browser to a different origin than the
    // one it is already on. This project has two deployment slugs
    // (…-ten.vercel.app and the old one); crossing between them drops the
    // session cookie and re-logs the user. Relative URLs and same-origin
    // URLs pass through; everything else lands on the current base URL.
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return url
      try {
        if (new URL(url).origin === baseUrl) return url
      } catch (_) {}
      return baseUrl
    },
    // Keep the JWT (and therefore the session cookie) tiny: only stable,
    // non-binary claims live in the token. Avatar data URIs can reach hundreds
    // of KB — embedding them here inflated the cookie past the 16KB request
    // header limit on Vercel, which made every request fail with
    // REQUEST_HEADER_TOO_LARGE (494). Name/avatar are read fresh from the DB
    // in the session callback instead, so they are always up to date too.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, avatarUrl: true },
        })
        if (dbUser) {
          session.user.name = dbUser.name
          session.user.avatarUrl = dbUser.avatarUrl
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Custom cookie name. The default `next-auth.session-token` has been used
  // since the app started — before the JWT was slimmed down (avatars used to
  // live in the token as multi-hundred-KB base64 data URIs). Anyone who logged
  // in back then still has that oversized cookie stored for up to 30 days and
  // the browser sends it on EVERY request, blowing past Vercel's 10KB request
  // header limit → 494 REQUEST_HEADER_TOO_LARGE on first page load. Rotating
  // the cookie name makes those stale cookies inert (they no longer match) so
  // every visitor gets a fresh, tiny token.
  cookies: {
    sessionToken: {
      name: 'cs2-coaching.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  // Never use the https cookie prefix locally: NEXTAUTH_URL can point at the
  // production domain while developing, which would otherwise produce a
  // Secure `__Secure-` cookie that browsers refuse over plain http.
  useSecureCookies: process.env.NODE_ENV !== 'development',
  secret: process.env.NEXTAUTH_SECRET,
}