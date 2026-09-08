import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  map: z.string().optional(),
  result: z.enum(['WIN', 'LOSS', 'DRAW']).optional(),
  score: z.tuple([z.number(), z.number()]).optional().nullable(),
  eloChange: z.number().optional(),
  kills: z.number().optional().nullable(),
  deaths: z.number().optional().nullable(),
  reflection: z.string().optional().nullable(),
  leetifyRating: z.number().optional().nullable(),
  preaim: z.number().optional().nullable(),
  reactionMs: z.number().optional().nullable(),
  accuracyEnemySpotted: z.number().optional().nullable(),
  accuracyHead: z.number().optional().nullable(),
  sprayAccuracy: z.number().optional().nullable(),
  coachNotes: z.array(z.object({
    round: z.number(),
    side: z.enum(['CT', 'T']),
    won: z.boolean(),
    timestamp: z.number(),
    note: z.string(),
  })).optional(),
  coachVerdict: z.string().optional().nullable(),
  coachReviewedAt: z.string().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const match = await prisma.matchLog.findUnique({
      where: { id },
      include: { student: { select: { coachId: true } } },
    })

    if (!match || match.student.coachId !== userId) {
      return NextResponse.json({ error: 'Mecz nie znaleziony' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateSchema.parse(body)

    const updated = await prisma.matchLog.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Match update error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji meczu' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const match = await prisma.matchLog.findUnique({
      where: { id },
      include: { student: { select: { coachId: true } } },
    })

    if (!match || match.student.coachId !== userId) {
      return NextResponse.json({ error: 'Mecz nie znaleziony' }, { status: 404 })
    }

    await prisma.matchLog.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Match delete error:', error)
    return NextResponse.json({ error: 'Błąd usuwania meczu' }, { status: 500 })
  }
}