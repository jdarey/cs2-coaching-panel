import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

// The token is sent to the user in the reset link; only its SHA-256 hash is
// stored in the database so a leaked DB dump can't be used to reset accounts.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')

  // Invalidate any previous reset tokens for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  })

  return token
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  if (!token) return null

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null
  }

  // Mark as used (single-use token).
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  return record.userId
}
