import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  target: z.string().max(100).optional().nullable(),
  deadline: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'DONE', 'DROPPED']).optional(),
})

async function getOwnedGoal(id: string, userId: string, role: string) {
  const goal = await prisma.goal.findUnique({ where: { id } })
  if (!goal) return null
  if (role === 'STUDENT' && goal.studentId !== userId) return null
  if (role === 'COACH') {
    const student = await prisma.user.findFirst({
      where: { id: goal.studentId, coachId: userId },
      select: { id: true },
    })
    if (!student) return null
  }
  return goal
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

    const existing = await getOwnedGoal(id, userId, role)
    if (!existing) {
      return NextResponse.json({ error: 'Cel nie znaleziony' }, { status: 404 })
    }

    const body = await request.json()
    const validated = patchSchema.parse(body)
    const data: any = { ...validated }
    if (validated.deadline !== undefined) {
      data.deadline = validated.deadline ? new Date(validated.deadline) : null
    }
    if (validated.status === 'DONE') {
      data.completedAt = new Date()
    } else if (validated.status === 'ACTIVE') {
      data.completedAt = null
    }

    const goal = await prisma.goal.update({ where: { id }, data })
    return NextResponse.json(goal)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Goal PATCH error:', error)
    return NextResponse.json({ error: 'Błąd edycji celu' }, { status: 500 })
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

    const existing = await getOwnedGoal(id, userId, role)
    if (!existing) {
      return NextResponse.json({ error: 'Cel nie znaleziony' }, { status: 404 })
    }

    await prisma.goal.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Goal DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania celu' }, { status: 500 })
  }
}
