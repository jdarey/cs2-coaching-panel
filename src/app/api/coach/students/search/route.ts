import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    if (q.length < 2) return NextResponse.json([])
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        coachId: null,
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(students)
  } catch (e) {
    console.error('search students error', e)
    return NextResponse.json({ error: 'Błąd wyszukiwania' }, { status: 500 })
  }
}
