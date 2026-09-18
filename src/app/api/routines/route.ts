import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isCoachRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  videoId: z.string().optional().nullable(),
  steamMapUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  gifUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  linkUrl: z.string().url().max(500).optional().nullable().or(z.literal('')),
  day: z.number().int().min(1).default(1),
  minutes: z.number().int().min(1).max(600).optional().nullable(),
  // Wariant trudności dobrany temu uczniowi (np. "Trudny") — uczeń może
  // sam zmienić na inny wariant tego samego ćwiczenia.
  variantLabel: z.string().max(60).optional().nullable(),
  variantDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional().nullable(),
})

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
const routineSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  recurring: z.boolean().default(true),
  // Poziom rutyny (opcjonalny) — wyświetlany uczniowi jako sygnał "dla kogo"
  level: z.enum(LEVELS).optional().nullable(),
  tasks: z.array(taskSchema).min(1).max(60),
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

    if (isCoachRole(role)) {
      const full = searchParams.get('full') === '1'
      const routines = await prisma.routine.findMany({
        where: { coachId: userId },
        include: {
          // Wersja skrócona (dropdown „Przypisz rutynę”) bierze take:3 — ale
          // _count.tasks zwraca PEŁNĄ liczbę zadań, więc etykieta „· N zadań”
          // nigdy nie kłamie. Bez full=1 nie wybieraj tej listy do liczenia.
          tasks: full
            ? { select: { id: true, title: true, description: true, videoId: true, steamMapUrl: true, gifUrl: true, linkUrl: true, day: true, minutes: true, order: true }, orderBy: [{ day: 'asc' }, { order: 'asc' }] }
            : { select: { id: true, title: true, day: true, minutes: true, order: true }, orderBy: [{ day: 'asc' }, { order: 'asc' }], take: 3 },
          assignments: {
            select: { id: true, status: true, student: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: { select: { tasks: true, assignments: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })
      return NextResponse.json(routines)
    }

    // Student: routines assigned to them with their progress
    const studentId = searchParams.get('studentId')
    if (studentId && studentId !== userId) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }
    let assignments = await prisma.routineAssignment.findMany({
      where: { studentId: userId },
      include: {
        routine: {
          include: { tasks: { select: { id: true, title: true, description: true, videoId: true, steamMapUrl: true, gifUrl: true, linkUrl: true, day: true, minutes: true, order: true, variantLabel: true, variantDifficulty: true, video: { select: { id: true, title: true, url: true, thumbnail: true } } }, orderBy: [{ day: 'asc' }, { order: 'asc' }] } },
        },
        progress: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    // Daily reset dla rutyn codziennych: od nowego dnia wszystkie zadania sie odznaczaja same (jak powtorz rutyne), niezaleznie czy ukonczona
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    for (const a of assignments) {
      if (!a.routine.recurring) continue
      if (a.endsAt && new Date(a.endsAt) <= new Date()) continue
      const hasDone = (a.progress as any[]).some((p: any) => p.status === 'DONE')
      if (!hasDone) continue
      // ostatnia aktywnosc (dowolne DONE) przed dzisiaj -> reset
      const dones = (a.progress as any[]).filter((p: any) => p.status === 'DONE' && p.completedAt).sort((x: any, y: any) => new Date(y.completedAt).getTime() - new Date(x.completedAt).getTime())
      const lastActivity = dones.length ? new Date(dones[0].completedAt) : (a.completedAt ? new Date(a.completedAt) : null)
      if (lastActivity && lastActivity < todayStart) {
        await prisma.routineTaskProgress.updateMany({ where: { assignmentId: a.id }, data: { status: 'PENDING', completedAt: null } })
        await prisma.routineAssignment.update({ where: { id: a.id }, data: { status: 'ACTIVE', completedAt: null } })
        a.status = 'ACTIVE'; (a as any).completedAt = null; (a as any).progress = (a as any).progress.map((p:any)=> ({...p, status:'PENDING', completedAt:null}))
      }
    }
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Routines GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania rutyn' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isCoachRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = routineSchema.parse(body)

    // Verify videos belong to coach if provided (dedupe so the same video
    // assigned to multiple tasks doesn't trip the count check)
    const videoIds = Array.from(new Set(validated.tasks.map((t) => t.videoId).filter(Boolean) as string[]))
    if (videoIds.length) {
      const count = await prisma.video.count({
        where: { id: { in: videoIds }, coachId: userId },
      })
      if (count !== videoIds.length) {
        return NextResponse.json({ error: 'Niektóre filmy nie należą do Ciebie' }, { status: 403 })
      }
    }

    const routine = await prisma.routine.create({
      data: {
        coachId: userId,
        title: validated.title,
        description: validated.description ?? null,
        recurring: validated.recurring,
        level: validated.level ?? null,
        tasks: {
          create: validated.tasks.map((t, i) => ({
            title: t.title,
            description: t.description ?? null,
            videoId: t.videoId ?? null,
            steamMapUrl: t.steamMapUrl || null,
            gifUrl: t.gifUrl || null,
            linkUrl: t.linkUrl || null,
            day: t.day,
            minutes: t.minutes ?? null,
            order: i,
            variantLabel: t.variantLabel ?? null,
            variantDifficulty: t.variantDifficulty ?? null,
          })),
        },
      },
      include: {
        tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      },
    })

    return NextResponse.json(routine, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Routines POST error:', error)
    return NextResponse.json({ error: 'Błąd tworzenia rutyny' }, { status: 500 })
  }
}
