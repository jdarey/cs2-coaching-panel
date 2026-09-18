import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'
import { decryptSecret } from '@/lib/crypto'

const envKey = process.env.FACEIT_API_KEY

export async function getFaceitApiKey(userId: string, role: string): Promise<string | null> {
  if (envKey) return envKey

  let settings: { faceitApiKey: string | null } | null = null
  if (isCoachRole(role)) {
    settings = await prisma.coachSettings.findUnique({
      where: { coachId: userId },
      select: { faceitApiKey: true },
    })
  } else {
    const student = await prisma.user.findUnique({
      where: { id: userId },
      select: { coach: { select: { coachSettings: { select: { faceitApiKey: true } } } } },
    })
    settings = (student as any)?.coach?.coachSettings ?? null
  }
  return decryptSecret(settings?.faceitApiKey) || null
}
