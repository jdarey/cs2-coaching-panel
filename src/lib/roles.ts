// Pure role helpers — no Node.js dependencies, so this module is safe to
// import from Edge middleware, client components and API routes alike.
// SINGLE SOURCE OF TRUTH for "who counts as coach/admin".
//
// - ADMIN is a superuser: everywhere COACH passes, ADMIN passes too.
// - The owner's email comes ONLY from env (no hardcoded fallback in code).

export const ADMIN_EMAIL: string =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.trim().toLowerCase() ||
  ''

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!ADMIN_EMAIL && !!email && email.trim().toLowerCase() === ADMIN_EMAIL
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'ADMIN'
}

/** COACH or ADMIN — coach panels and coach API routes. */
export function isCoachRole(role: string | null | undefined): boolean {
  return role === 'COACH' || role === 'ADMIN'
}

export function isAdminUser(
  user: { role?: string | null; email?: string | null } | null | undefined,
): boolean {
  if (!user) return false
  if (isAdminRole(user.role ?? null)) return true
  return isAdminEmail(user.email)
}
