import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// Lista użytkowników: ?q=szukaj (email/nazwa) &role=COACH|STUDENT|ADMIN
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  const role = searchParams.get('role')?.trim() || ''

  const where: any = {}
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (role === 'COACH' || role === 'STUDENT' || role === 'ADMIN') {
    where.role = role as any
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      faceitNickname: true,
      steamId: true,
      steamVanity: true,
      coach: { select: { id: true, name: true, email: true } },
      lastActiveAt: true,
      createdAt: true,
      _count: { select: { sessionsAsStudent: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ users })
}
