import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const taskSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  day: z.number().int().min(1).default(1),
  minutes: z.number().int().min(1).max(600).optional().nullable(),
})

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  tasks: z.array(taskSchema).min(1).max(60).optional(),
})

async function getRoutine(id: string, coachId: string) {
  return prisma.routine.findFirst({
    where: { id, coachId },
    include: { tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
  })
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { id } = await params

    const routine = await prisma.routine.findFirst({
      where: { id },
      include: { tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
    })
    if (!routine) {
      return NextResponse.json({ error: 'Rutyna nie znaleziona' }, { status: 404 })
    }
    // Coach must own it; student must have it assigned
    if (role === 'COACH') {
      if (routine.coachId !== userId) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
    } else {
      const assignment = await prisma.routineAssignment.findFirst({
        where: { routineId: id, studentId: userId },
      })
      if (!assignment) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }
    }

    return NextResponse.json(routine)
  } catch (error) {
    console.error('Routine GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania rutyny' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const { id } = await params
    const existing = await getRoutine(id, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Rutyna nie znaleziona' }, { status: 404 })
    }

    const body = await request.json()
    const validated = patchSchema.parse(body)

    // Verify videos belong to coach if any provided
    const videoIds = (validated.tasks ?? []).map((t) => t.videoId).filter(Boolean) as string[]
    if (videoIds.length) {
      const count = await prisma.video.count({
        where: { id: { in: videoIds }, coachId: userId },
      })
      if (count !== videoIds.length) {
        return NextResponse.json({ error: 'Niektóre filmy nie należą do Ciebie' }, { status: 403 })
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (validated.tasks) {
        // Replace all tasks: delete missing, update existing, create new
        const incomingIds = validated.tasks.map((t) => t.id).filter(Boolean) as string[]
        await tx.routineTask.deleteMany({
          where: { routineId: id, id: { notIn: incomingIds } },
        })
        for (let i = 0; i < validated.tasks.length; i++) {
          const t = validated.tasks[i]
          const data = {
            title: t.title,
            description: t.description ?? null,
            videoId: t.videoId ?? null,
            day: t.day,
            minutes: t.minutes ?? null,
            order: i,
          }
          if (t.id) {
            await tx.routineTask.updateMany({
              where: { id: t.id, routineId: id },
              data,
            })
          } else {
            await tx.routineTask.create({ data: { routineId: id, ...data } })
          }
        }
      }
      return tx.routine.update({
        where: { id },
        data: {
          title: validated.title,
          description: validated.description === undefined ? undefined : validated.description,
        },
        include: { tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Routine PATCH error:', error)
    return NextResponse.json({ error: 'Błąd edycji rutyny' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const { id } = await params
    const existing = await getRoutine(id, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Rutyna nie znaleziona' }, { status: 404 })
    }

    await prisma.routine.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Routine DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania rutyny' }, { status: 500 })
  }
}
