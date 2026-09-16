import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAIL, isAdminEmail, isAdminUser } from '@/lib/roles'

// Re-exporty dla kompatybilności — kanoniczne definicje żyją w lib/roles.ts.
export { ADMIN_EMAIL, isAdminEmail }

export function isAdmin(user: { role?: string; email?: string | null } | null | undefined): boolean {
  return isAdminUser(user)
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
