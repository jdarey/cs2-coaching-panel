import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({ studentId: z.string().min(1) })

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const coachId = (session.user as any).id
    const body = await request.json()
    const { studentId } = schema.parse(body)

    const student = await prisma.user.findUnique({ where: { id: studentId } })
    if (!student || student.role !== 'STUDENT') return NextResponse.json({ error: 'Uczeń nie znaleziony' }, { status: 404 })
    if (student.coachId) {
      if (student.coachId === coachId) return NextResponse.json({ error: 'Ten uczeń już jest u Ciebie' }, { status: 400 })
      return NextResponse.json({ error: 'Uczeń ma już trenera' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: { coachId },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    })

    // return in same shape as coach-students list expects
    const withCounts = {
      ...updated,
      _count: { sessionsAsStudent: 0, videoProgress: 0 },
      progressStats: { total: 0, pending: 0, watching: 0, watched: 0, implemented: 0 },
      note: null,
      lastSessionAt: null,
    }

    return NextResponse.json(withCounts)
  } catch (e) {
    if ((e as any)?.name === 'ZodError') return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
    console.error('attach student error', e)
    return NextResponse.json({ error: 'Błąd dodawania ucznia' }, { status: 500 })
  }
}
