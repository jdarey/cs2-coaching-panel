import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { searchParams } = new URL(request.url)

    const routineId = searchParams.get('routineId')
    const assignmentId = searchParams.get('assignmentId')
    const months = parseInt(searchParams.get('months') || '12')

    let studentId = userId
    if (role === 'COACH') {
      const target = searchParams.get('studentId')
      if (target) {
        const student = await prisma.user.findFirst({
          where: { id: target, coachId: userId },
          select: { id: true },
        })
        if (!student) return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
        studentId = target
      }
    }

    const where: any = {
      studentId,
      status: 'DONE',
      completedAt: { not: null },
    }

    if (assignmentId) {
      where.assignmentId = assignmentId
    } else if (routineId) {
      const assignments = await prisma.routineAssignment.findMany({
        where: { routineId, studentId },
        select: { id: true },
      })
      where.assignmentId = { in: assignments.map((a) => a.id) }
    }

    const from = new Date()
    from.setMonth(from.getMonth() - months)
    from.setHours(0, 0, 0, 0)
    where.completedAt.gte = from

    const progress = await prisma.routineTaskProgress.findMany({
      where,
      include: {
        assignment: {
          include: {
            routine: {
              select: { id: true, title: true, recurring: true },
            },
          },
        },
        task: {
          select: { id: true, title: true, day: true, minutes: true },
        },
      },
      orderBy: { completedAt: 'asc' },
    })

    const byDate = new Map<string, { date: string; count: number; tasks: { taskId: string; title: string; day: number; minutes: number | null; routineTitle: string }[] }>()

    for (const p of progress) {
      if (!p.completedAt) continue
      const dateStr = p.completedAt.toISOString().split('T')[0]
      const existing = byDate.get(dateStr)
      const taskInfo = {
        taskId: p.taskId,
        title: p.task.title,
        day: p.task.day,
        minutes: p.task.minutes,
        routineTitle: p.assignment.routine.title,
      }
      if (existing) {
        existing.count++
        existing.tasks.push(taskInfo)
      } else {
        byDate.set(dateStr, { date: dateStr, count: 1, tasks: [taskInfo] })
      }
    }

    const calendar = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))

    const totalSessions = calendar.reduce((acc, d) => acc + d.count, 0)
    const totalMinutes = progress
      .filter((p) => p.task.minutes)
      .reduce((acc, p) => acc + (p.task.minutes || 0), 0)

    return NextResponse.json({
      calendar,
      summary: {
        totalDays: calendar.length,
        totalSessions,
        totalMinutes,
        months,
      },
    })
  } catch (error) {
    console.error('Routines history GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania historii rutyn' }, { status: 500 })
  }
}