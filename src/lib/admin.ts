import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Jedyny admin. Zmiana wymaga też zmiany w authorize() (auth.ts),
// który nadaje rolę ADMIN przy logowaniu.
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'jdarey032@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL
}

export function isAdmin(user: { role?: string; email?: string | null } | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  // Pas awaryjny: nawet gdyby rola w bazie była inna, właścicielski email
  // zawsze przechodzi (chroni przed przypadkowym odebraniem sobie dostępu).
  return isAdminEmail(user.email)
}

export interface AdminUser {
  id: string
  role: string
  email?: string | null
}

// Rzuca Response 401/403 — użyj na początku każdego /api/admin/* handlera.
export async function requireAdmin(): Promise<AdminUser> {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(user)) throw Response.json({ error: 'Brak dostępu' }, { status: 403 })
  return { id: user.id as string, role: user.role as string, email: user.email ?? null }
}
