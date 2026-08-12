import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const matchSchema = z.object({
  map: z.string().min(1).max(40),
  result: z.enum(['WIN', 'LOSS', 'DRAW']),
  eloChange: z.number().int().min(-500).max(500).default(0),
  kills: z.number().int().min(0).max(200).optional().nullable(),
  deaths: z.number().int().min(0).max(200).optional().nullable(),
  reflection: z.string().max(1000).optional().nullable(),
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

    if (role === 'COACH') {
      // Coach: all students' matches, optionally filtered by student
      const studentId = searchParams.get('studentId')
      const myStudents = await prisma.user.findMany({
        where: { coachId: userId },
        select: { id: true },
      })
      const ids = myStudents.map((s) => s.id)
      const where: any = { studentId: { in: ids } }
      if (studentId) {
        if (!ids.includes(studentId)) {
          return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
        }
        where.studentId = studentId
      }
      const matches = await prisma.matchLog.findMany({
        where,
        include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      return NextResponse.json(matches)
    }

    // Student: own matches
    const matches = await prisma.matchLog.findMany({
      where: { studentId: userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(matches)
  } catch (error) {
    console.error('Matches GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania meczów' }, { status: 500 })
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
    const validated = matchSchema.parse(body)

    // Coach can log for a student
    let studentId = userId
    if (role === 'COACH') {
      if (!body.studentId) {
        return NextResponse.json({ error: 'Podaj studentId' }, { status: 400 })
      }
      const student = await prisma.user.findFirst({
        where: { id: body.studentId, coachId: userId },
        select: { id: true },
      })
      if (!student) {
        return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
      }
      studentId = body.studentId
    }

    const match = await prisma.matchLog.create({
      data: {
        studentId,
        map: validated.map,
        result: validated.result,
        eloChange: validated.eloChange,
        kills: validated.kills ?? null,
        deaths: validated.deaths ?? null,
        reflection: validated.reflection ?? null,
      },
    })

    return NextResponse.json(match, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Matches POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania meczu' }, { status: 500 })
  }
}
