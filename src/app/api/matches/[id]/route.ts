import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const noteSchema = z.object({
  time: z.number().min(0).max(7200), // seconds into the match/demo
  note: z.string().min(1).max(500),
})

const patchSchema = z.object({
  map: z.string().min(1).max(40).optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW']).optional(),
  eloChange: z.number().int().min(-500).max(500).optional(),
  kills: z.number().int().min(0).max(200).optional().nullable(),
  deaths: z.number().int().min(0).max(200).optional().nullable(),
  reflection: z.string().max(1000).optional().nullable(),
  // Coach demo review — only coaches may set these
  coachNotes: z.array(noteSchema).max(50).optional(),
  coachVerdict: z.string().max(3000).optional().nullable(),
})

async function getOwnedMatch(id: string, userId: string, role: string) {
  const match = await prisma.matchLog.findUnique({ where: { id } })
  if (!match) return null
  if (role === 'STUDENT' && match.studentId !== userId) return null
  if (role === 'COACH') {
    const student = await prisma.user.findFirst({
      where: { id: match.studentId, coachId: userId },
      select: { id: true },
    })
    if (!student) return null
  }
  return match
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { id } = await params

    const existing = await getOwnedMatch(id, userId, role)
    if (!existing) {
      return NextResponse.json({ error: 'Mecz nie znaleziony' }, { status: 404 })
    }

    const body = await request.json()
    const validated = patchSchema.parse(body)

    // Coach review fields are coach-only: students may not fake a review
    let data: any = { ...validated }
    if (role !== 'COACH') {
      delete data.coachNotes
      delete data.coachVerdict
    }
    if (role === 'COACH') {
      const isReview = 'coachNotes' in data || 'coachVerdict' in data
      if (isReview) {
        data.coachReviewedAt = new Date()
      }
    }

    const match = await prisma.matchLog.update({ where: { id }, data })
    return NextResponse.json(match)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Match PATCH error:', error)
    return NextResponse.json({ error: 'Błąd edycji meczu' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { id } = await params

    const existing = await getOwnedMatch(id, userId, role)
    if (!existing) {
      return NextResponse.json({ error: 'Mecz nie znaleziony' }, { status: 404 })
    }

    await prisma.matchLog.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Match DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania meczu' }, { status: 500 })
  }
}
