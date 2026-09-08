import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const goalSchema = z.object({
  title: z.string().min(1).max(200),
  target: z.string().max(100).optional().nullable(),
  deadline: z.string().optional().nullable(),
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
      const studentId = searchParams.get('studentId')
      if (!studentId) {
        return NextResponse.json({ error: 'Podaj studentId' }, { status: 400 })
      }
      const student = await prisma.user.findFirst({
        where: { id: studentId, coachId: userId },
        select: { id: true },
      })
      if (!student) {
        return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
      }
      const goals = await prisma.goal.findMany({
        where: { studentId },
        orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      })
      return NextResponse.json(goals)
    }

    const goals = await prisma.goal.findMany({
      where: { studentId: userId },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
    })
    return NextResponse.json(goals)
  } catch (error) {
    console.error('Goals GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania celów' }, { status: 500 })
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
    const validated = goalSchema.parse(body)

    let studentId = userId
    let coachId: string | null = null
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
      coachId = userId
    }

    // Cap active goals at 5 — "less is more"
    const activeCount = await prisma.goal.count({
      where: { studentId, status: 'ACTIVE' },
    })
    if (activeCount >= 5) {
      return NextResponse.json({ error: 'Maksymalnie 5 aktywnych celów. Ukończ lub usuń jeden, aby dodać nowy.' }, { status: 400 })
    }

    const goal = await prisma.goal.create({
      data: {
        studentId,
        coachId,
        title: validated.title,
        target: validated.target ?? null,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
      },
    })
    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Goals POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania celu' }, { status: 500 })
  }
}
