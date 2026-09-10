import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  content: z.string().min(1).max(5000),
  isPrivate: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const note = await prisma.sessionNote.findUnique({ where: { id: params.id }, include: { session: true } })
    if (!note) return NextResponse.json({ error: 'Notatka nie znaleziona' }, { status: 404 })

    // only author or coach of the session can edit
    const isAuthor = note.userId === userId
    const isCoachOfSession = note.session.coachId === userId
    if (!isAuthor && !isCoachOfSession) return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })

    const body = await request.json()
    const parsed = patchSchema.parse(body)

    // students cannot make private
    const role = (session.user as any).role
    const isPrivate = role === 'COACH' && typeof parsed.isPrivate === 'boolean' ? parsed.isPrivate : note.isPrivate

    const updated = await prisma.sessionNote.update({
      where: { id: params.id },
      data: { content: parsed.content, isPrivate },
      include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Error && e.name === 'ZodError') return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
    console.error('Notes PATCH error', e)
    return NextResponse.json({ error: 'Błąd edycji notatki' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const note = await prisma.sessionNote.findUnique({ where: { id: params.id }, include: { session: true } })
    if (!note) return NextResponse.json({ error: 'Notatka nie znaleziona' }, { status: 404 })

    const isAuthor = note.userId === userId
    const isCoachOfSession = note.session.coachId === userId
    if (!isAuthor && !isCoachOfSession) return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })

    await prisma.sessionNote.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Notes DELETE error', e)
    return NextResponse.json({ error: 'Błąd usuwania notatki' }, { status: 500 })
  }
}
