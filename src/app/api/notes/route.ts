import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const noteSchema = z.object({
  sessionId: z.string(),
  content: z.string().min(1).max(5000),
  isPrivate: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const sessionRecord = await prisma.session.findUnique({ where: { id: sessionId } })
    if (!sessionRecord) {
      return NextResponse.json({ error: 'Sesja nie znaleziona' }, { status: 404 })
    }

    // Check access
    if (role === 'COACH' && sessionRecord.coachId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    if (role === 'STUDENT' && sessionRecord.studentId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    let where: any = { sessionId }
    if (role === 'STUDENT') {
      where.isPrivate = false
    }

    const notes = await prisma.sessionNote.findMany({
      where,
      include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Notes GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania notatek' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role
    const body = await request.json()
    const validated = noteSchema.parse(body)

    const sessionRecord = await prisma.session.findUnique({ where: { id: validated.sessionId } })
    if (!sessionRecord) {
      return NextResponse.json({ error: 'Sesja nie znaleziona' }, { status: 404 })
    }

    // Check access
    if (role === 'COACH' && sessionRecord.coachId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    if (role === 'STUDENT' && sessionRecord.studentId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    // Students can't create private notes
    const isPrivate = role === 'COACH' ? validated.isPrivate : false

    const note = await prisma.sessionNote.create({
      data: {
        sessionId: validated.sessionId,
        userId,
        content: validated.content,
        isPrivate,
      },
      include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Notes POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania notatki' }, { status: 500 })
  }
}