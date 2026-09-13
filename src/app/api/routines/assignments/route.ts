import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/routines/assignments?studentId=xxx - lista przypisanych rutyn dla ucznia (coach widzi swojego ucznia, student widzi swoje)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const studentId = new URL(request.url).searchParams.get('studentId') || user.id

  if (user.role === 'COACH') {
    if (studentId !== user.id) {
      const s = await prisma.user.findFirst({ where: { id: studentId, coachId: user.id }, select: { id: true } })
      if (!s) return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
  } else if (studentId !== user.id) {
    return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  }

  const assignments = await prisma.routineAssignment.findMany({
    where: { studentId },
    include: {
      routine: {
        include: {
          tasks: {
            select: { id: true, title: true, description: true, videoId: true, steamMapUrl: true, gifUrl: true, linkUrl: true, day: true, minutes: true, order: true },
            orderBy: [{ day: 'asc' }, { order: 'asc' }],
          },
        },
      },
      progress: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(assignments)
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (user.role !== 'COACH') return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
  const assignmentId = new URL(request.url).searchParams.get('assignmentId')
  if (!assignmentId) return NextResponse.json({ error: 'Brak id' }, { status: 400 })
  const assignment = await prisma.routineAssignment.findFirst({ where: { id: assignmentId, coachId: user.id } })
  if (!assignment) return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404 })
  await prisma.routineAssignment.delete({ where: { id: assignmentId } })
  return NextResponse.json({ ok: true })
}
