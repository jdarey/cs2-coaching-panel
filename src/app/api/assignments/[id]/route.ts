import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  status: z.enum(['PENDING', 'DONE']).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role
    const body = await request.json()
    const validated = patchSchema.parse(body)

    const existing = await prisma.assignment.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Zadanie nie znalezione' }, { status: 404 })
    }

    // Access control
    if (role === 'COACH' && existing.coachId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    if (role === 'STUDENT' && existing.studentId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    // Students may only toggle status
    const data: any = {}
    if (role === 'STUDENT') {
      if (!validated.status) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
      data.status = validated.status
      data.completedAt = validated.status === 'DONE' ? new Date() : null
    } else {
      if (validated.status) {
        data.status = validated.status
        data.completedAt = validated.status === 'DONE' ? (existing.completedAt ?? new Date()) : null
      }
      if (validated.title !== undefined) data.title = validated.title
      if (validated.description !== undefined) data.description = validated.description
      if (validated.videoId !== undefined) data.videoId = validated.videoId
      if (validated.dueDate !== undefined) data.dueDate = validated.dueDate ? new Date(validated.dueDate) : null
    }

    const assignment = await prisma.assignment.update({
      where: { id: params.id },
      data,
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        video: { select: { id: true, title: true, url: true, thumbnail: true } },
      },
    })

    return NextResponse.json(assignment)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Assignments PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji zadania' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    const existing = await prisma.assignment.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Zadanie nie znalezione' }, { status: 404 })
    }

    // Coach can delete their own assignments; students cannot
    if (role !== 'COACH' || existing.coachId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    await prisma.assignment.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Assignments DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania zadania' }, { status: 500 })
  }
}
