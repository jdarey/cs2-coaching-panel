import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id) {
      return NextResponse.json({ error: 'Nieautoryzowany' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.feedback.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Opinia nie znaleziona' }, { status: 404 })
    }

    if (user.role === 'COACH') {
      if (existing.coachId !== user.id) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
      const data: { status?: string; response?: string; respondedAt?: Date } = {}
      if (body.status) data.status = body.status
      if (typeof body.response === 'string') {
        data.response = body.response.trim() || null
        data.respondedAt = data.response ? new Date() : undefined
        if (data.response) data.status = 'RESPONDED'
      }
      const feedback = await prisma.feedback.update({
        where: { id },
        data,
        include: {
          student: { select: { id: true, name: true, avatarUrl: true } },
          session: { select: { id: true, title: true } },
        },
      })
      return NextResponse.json({ feedback })
    }

    return NextResponse.json({ error: 'Tylko trener może odpowiadać na opinie' }, { status: 403 })
  } catch (error) {
    console.error('Feedback PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji opinii' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id) {
      return NextResponse.json({ error: 'Nieautoryzowany' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.feedback.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Opinia nie znaleziona' }, { status: 404 })
    }
    if (existing.studentId !== user.id) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    await prisma.feedback.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania opinii' }, { status: 500 })
  }
}
