import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    const entry = await prisma.rankEntry.findUnique({ where: { id: params.id } })
    if (!entry) {
      return NextResponse.json({ error: 'Wpis nie znaleziony' }, { status: 404 })
    }

    // Student can delete own; coach can delete their students' entries
    const isOwn = entry.studentId === userId
    let isCoachOf = false
    if (role === 'COACH') {
      const student = await prisma.user.findFirst({
        where: { id: entry.studentId, coachId: userId },
      })
      isCoachOf = !!student
    }
    if (!isOwn && !isCoachOf) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    await prisma.rankEntry.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Ranks DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania wpisu' }, { status: 500 })
  }
}
