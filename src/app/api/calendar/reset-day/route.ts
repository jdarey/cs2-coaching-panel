import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
export const dynamic = 'force-dynamic'
const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
    const userId = (session.user as any).id
    const { date } = schema.parse(await req.json())
    const start = new Date(date + 'T00:00:00')
    const end = new Date(date + 'T23:59:59.999')
    // delete completions for that day
    try { await prisma.routineCompletion.deleteMany({ where: { studentId: userId, completedAt: { gte: start, lte: end } } }) } catch {}
    // delete day note
    try { await prisma.dayNote.deleteMany({ where: { studentId: userId, date } }) } catch {}
    // reset progress for that day? For simplicity, if the day is today, reset current progress if it was completed today
    // We don't have per-day progress history, so just ensure today's progress can be redone by resetting any COMPLETED assignments that were completed today
    const todayStr = new Date().toISOString().split('T')[0] // local? use toLocalDate
    const toLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    if (toLocal(new Date()) === date) {
      const assigns = await prisma.routineAssignment.findMany({ where: { studentId: userId, status: 'COMPLETED' }, select: { id: true, completedAt: true } })
      for (const a of assigns) {
        if (a.completedAt && toLocal(new Date(a.completedAt)) === date) {
          await prisma.routineTaskProgress.updateMany({ where: { assignmentId: a.id }, data: { status: 'PENDING', completedAt: null } })
          await prisma.routineAssignment.update({ where: { id: a.id }, data: { status: 'ACTIVE', completedAt: null } })
        }
      }
    }
    return NextResponse.json({ok:true})
  } catch(e){ console.error(e); return NextResponse.json({error:'Błąd resetu dnia'},{status:500})}
}
