import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// Lista trenerów do selecta "Zmień trenera".
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const coaches = await prisma.user.findMany({
    where: { role: { in: ['COACH', 'ADMIN'] as any } },
    select: {
      id: true,
      email: true,
      name: true,
      _count: { select: { coachedStudents: true } },
    },
    orderBy: { email: 'asc' },
    take: 100,
  })

  return NextResponse.json({ coaches })
}
