import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może przeglądać uczniów' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        coachId: true,
        _count: { select: { sessionsAsStudent: true, videoProgress: true } },
      },
    })

    if (!student || student.coachId !== userId) {
      return NextResponse.json({ error: 'Uczeń nie znaleziony lub brak uprawnień' }, { status: 404 })
    }

    const progress = await prisma.videoProgress.findMany({
      where: { userId: student.id },
      select: { status: true },
    })

    const progressStats = {
      total: progress.length,
      pending: progress.filter((p) => p.status === 'PENDING').length,
      watching: progress.filter((p) => p.status === 'WATCHING').length,
      watched: progress.filter((p) => p.status === 'WATCHED').length,
      implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
    }

    return NextResponse.json({ ...student, progressStats })
  } catch (error) {
    console.error('Student GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania ucznia' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może usuwać uczniów' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const student = await prisma.user.findUnique({
      where: { id },
      select: { coachId: true },
    })

    if (!student || student.coachId !== userId) {
      return NextResponse.json({ error: 'Uczeń nie znaleziony lub brak uprawnień' }, { status: 404 })
    }

    // Unlink student from coach (don't delete user account)
    await prisma.user.update({
      where: { id },
      data: { coachId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Student DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania ucznia' }, { status: 500 })
  }
}