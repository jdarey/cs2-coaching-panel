import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendDiscordNotification } from '@/lib/discord'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id) {
      return NextResponse.json({ error: 'Nieautoryzowany' }, { status: 401 })
    }

    if (user.role === 'COACH') {
      const feedback = await prisma.feedback.findMany({
        where: { coachId: user.id },
        include: {
          student: { select: { id: true, name: true, email: true, avatarUrl: true } },
          session: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      return NextResponse.json({ feedback })
    }

    // Student: own feedback + coach info
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coachId: true },
    })

    const feedback = await prisma.feedback.findMany({
      where: { studentId: user.id },
      include: {
        session: { select: { id: true, title: true } },
        coach: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ feedback, coachId: me?.coachId ?? null })
  } catch (error) {
    console.error('Feedback GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania opinii' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id) {
      return NextResponse.json({ error: 'Nieautoryzowany' }, { status: 401 })
    }
    if (user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Tylko uczeń może wysyłać opinię' }, { status: 403 })
    }

    const body = await request.json()
    const { content, type, sessionId } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Treść opinii jest wymagana' }, { status: 400 })
    }
    if (content.trim().length > 4000) {
      return NextResponse.json({ error: 'Opinia jest zbyt długa' }, { status: 400 })
    }

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coachId: true },
    })
    if (!me?.coachId) {
      return NextResponse.json({ error: 'Nie masz przypisanego trenera' }, { status: 400 })
    }

    // Session must belong to this student if provided
    if (sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { studentId: true },
      })
      if (!session || session.studentId !== user.id) {
        return NextResponse.json({ error: 'Sesja nie znaleziona' }, { status: 400 })
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        studentId: user.id,
        coachId: me.coachId,
        content: content.trim(),
        type: type || 'GENERAL',
        sessionId: sessionId || null,
      },
      select: { id: true, studentId: true, coachId: true, sessionId: true, type: true, content: true, status: true, createdAt: true },
    })

    // Discord notification to the coach (fire-and-forget).
    await sendDiscordNotification({
      coachId: me.coachId,
      title: '💬 Nowa opinia od ucznia',
      description: `Typ: ${feedback.type}`,
      fields: [{ name: 'Opinia', value: feedback.content.slice(0, 1024) }],
    })

    return NextResponse.json({ feedback }, { status: 201 })
  } catch (error) {
    console.error('Feedback POST error:', error)
    return NextResponse.json({ error: 'Błąd wysyłania opinii' }, { status: 500 })
  }
}
