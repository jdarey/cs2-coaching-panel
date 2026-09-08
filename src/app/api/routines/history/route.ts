import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = (session.user as any).id
    const role = (session.user as any).role
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')
    const routineId = searchParams.get('routineId')
    const months = parseInt(searchParams.get('months') || '12')

    let studentId = userId
    if (role === 'COACH') {
      const target = searchParams.get('studentId')
      if (target) {
        const s = await prisma.user.findFirst({ where: { id: target, coachId: userId }, select: { id: true } })
        if (!s) return NextResponse.json({ error: 'Uczeń nie należy do Ciebie' }, { status: 403 })
        studentId = target
      }
    }

    const from = new Date(); from.setMonth(from.getMonth()-months); from.setHours(0,0,0,0)

    // 1) immutable completions (full days) — survives recurring reset
    const completionWhere: any = { studentId, completedAt: { gte: from } }
    if (assignmentId) completionWhere.assignmentId = assignmentId
    else if (routineId) completionWhere.routineId = routineId
    const completions = await prisma.routineCompletion.findMany({ where: completionWhere, include: { assignment: { include: { routine: { select: { title: true } } } } }, orderBy: { completedAt: 'asc' } })

    // 2) current pending progress (for today partial)
    const progressWhere: any = { studentId, status: 'DONE', completedAt: { gte: from, not: null } }
    if (assignmentId) progressWhere.assignmentId = assignmentId
    else if (routineId) {
      const assigns = await prisma.routineAssignment.findMany({ where: { routineId, studentId }, select: { id: true } })
      progressWhere.assignmentId = { in: assigns.map(a=>a.id) }
    }
    const progress = await prisma.routineTaskProgress.findMany({
      where: progressWhere,
      include: { assignment: { include: { routine: { select: { id:true, title:true } } } }, task: { select: { id:true, title:true, day:true, minutes:true } } },
      orderBy: { completedAt: 'asc' },
    })

    // build calendar: merge completions (full) + progress (partial today)
    const byDate = new Map<string, { date: string; count: number; full: boolean; tasks: any[]; minutes: number; times: number; routines: string[] }>()

    const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    for (const c of completions) {
      const d = toLocalDate(new Date(c.completedAt))
      const routineTitle = (c as any).assignment?.routine?.title || 'Rutyna'
      const e = byDate.get(d)
      if (e) { e.count += c.tasksDone; e.times = (e.times||0)+1; e.full = e.full || c.tasksDone >= c.tasksTotal; e.minutes += c.minutesDone||0; if (!e.routines.includes(routineTitle)) e.routines.push(routineTitle); e.tasks.push({ routineTitle, tasksDone: c.tasksDone, tasksTotal: c.tasksTotal }) }
      else byDate.set(d, { date: d, count: c.tasksDone, full: c.tasksDone >= c.tasksTotal, tasks: [{ routineTitle, tasksDone: c.tasksDone, tasksTotal: c.tasksTotal }], minutes: c.minutesDone||0, times: 1, routines: [routineTitle] })
    }
    for (const p of progress) {
      if (!p.completedAt) continue
      const d = toLocalDate(new Date(p.completedAt))
      if (byDate.has(d)) continue // already counted as full completion that day
      const e = byDate.get(d)
      const info = { taskId: p.taskId, title: p.task.title, day: p.task.day, minutes: p.task.minutes, routineTitle: p.assignment.routine.title }
      if (e) { e.count++; e.tasks.push(info); e.minutes += p.task.minutes||0; if (!e.routines.includes(info.routineTitle)) e.routines.push(info.routineTitle) }
      else byDate.set(d, { date: d, count: 1, full: false, tasks: [info], minutes: p.task.minutes||0, times: 0, routines: [info.routineTitle] })
    }

    const calendar = Array.from(byDate.values()).sort((a,b)=>a.date.localeCompare(b.date))
    const totalSessions = completions.reduce((acc,c)=>acc+c.tasksDone,0) + progress.filter(p=> !byDate.has(p.completedAt!.toISOString().split('T')[0]) || false).length
    // simpler: sum calendar counts
    const total = calendar.reduce((acc,d)=>acc+d.count,0)
    const totalMinutes = calendar.reduce((acc,d)=>acc+d.minutes,0)

    return NextResponse.json({ calendar, summary: { totalDays: calendar.length, totalSessions: total, totalMinutes, months } })
  } catch (error) {
    console.error('Routines history GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania historii rutyn' }, { status: 500 })
  }
}
