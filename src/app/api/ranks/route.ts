import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { publishToUsers } from '@/lib/realtime'
import { z } from 'zod'
import { isCoachRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

const rankSchema = z.object({
  mode: z.enum(['PREMIER', 'FACEIT', 'OTHER']).default('PREMIER'),
  rank: z.string().min(1).max(100),
  elo: z.number().int().optional().nullable(),
  source: z.enum(['FACEIT_LIVE', 'LEETIFY', 'MANUAL']).default('MANUAL'),
  note: z.string().max(500).optional().nullable(),
  recordedAt: z.string().optional().nullable(),
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
    const studentId = searchParams.get('studentId')

    let where: any = {}

    if (isCoachRole(role)) {
      const myStudents = await prisma.user.findMany({
        where: { coachId: userId },
        select: { id: true },
      })
      const ids = myStudents.map((s) => s.id)
      if (studentId) {
        if (!ids.includes(studentId)) {
          return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
        }
        where.studentId = studentId
      } else {
        where.studentId = { in: ids }
      }
    } else {
      where.studentId = userId
    }

    const entries = await prisma.rankEntry.findMany({
      where,
      select: { id: true, mode: true, rank: true, elo: true, source: true, note: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
      take: 200,
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Ranks GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania rang' }, { status: 500 })
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
    const validated = rankSchema.parse(body)

    // Coach can log entries for their own students; student logs their own
    let studentId = userId
    if (isCoachRole(role)) {
      const targetId = body.studentId
      if (!targetId) {
        return NextResponse.json({ error: 'studentId wymagany' }, { status: 400 })
      }
      const student = await prisma.user.findFirst({
        where: { id: targetId, coachId: userId },
      })
      if (!student) {
        return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
      }
      studentId = targetId
    }

    const entry = await prisma.rankEntry.create({
      data: {
        studentId,
        mode: validated.mode,
        rank: validated.rank,
        elo: validated.elo ?? null,
        source: validated.source,
        note: validated.note ?? null,
        recordedAt: validated.recordedAt ? new Date(validated.recordedAt) : new Date(),
      },
    })

    try {
      const targets = studentId === userId ? [userId] : [studentId, userId]
      publishToUsers(targets, { type: 'rank:updated', payload: { studentId } })
    } catch { /* realtime best-effort */ }

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Ranks POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania rangi' }, { status: 500 })
  }
}
