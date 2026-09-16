import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

// PATCH /api/videos/[id]/duration { duration: number }
// Uzupełnia duration z playera (IFrame API) - może wywołać coach i student (ten sam coach)
// Nie nadpisuje ręcznie wpisanej wartości jeśli już jest i się zgadza; aktualizuje jeśli null lub różni się >2s
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json().catch(() => null)
    const duration = body?.duration

    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json({ error: 'Nieprawidłowy duration' }, { status: 400 })
    }
    const dur = Math.round(duration)

    const video = await prisma.video.findUnique({ where: { id }, select: { id: true, coachId: true, duration: true } })
    if (!video) return NextResponse.json({ error: 'Film nie znaleziony' }, { status: 404 })

    const user = session.user as any
    const userId = user.id
    const role = user.role

    // Coach może zawsze, student tylko jeśli należy do tego samego coacha
    if (!isCoachRole(role)) {
      const student = await prisma.user.findUnique({ where: { id: userId }, select: { coachId: true } })
      if (!student?.coachId || student.coachId !== video.coachId) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
    } else {
      if (video.coachId !== userId) return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    // Nie nadpisuj jeśli już jest i różnica <2s (unikaj oscylacji)
    if (video.duration != null && Math.abs(video.duration - dur) < 2) {
      return NextResponse.json({ duration: video.duration, updated: false })
    }

    const updated = await prisma.video.update({ where: { id }, data: { duration: dur }, select: { duration: true } })
    return NextResponse.json({ duration: updated.duration, updated: true })
  } catch (e) {
    console.error('[duration PATCH] err', e)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
