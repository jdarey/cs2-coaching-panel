import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
export const dynamic = 'force-dynamic'
const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), content: z.string().min(1).max(2000), sleep: z.number().int().min(1).max(10).optional().nullable() })

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const studentId = searchParams.get('studentId')
  // coach can query student notes
  let targetId = userId
  if ((session.user as any).role==='COACH' && studentId) {
    const s = await prisma.user.findFirst({where:{id:studentId, coachId:userId}, select:{id:true}})
    if (!s) return NextResponse.json({error:'Brak uprawnień'},{status:403})
    targetId = studentId
  }
  if (date) {
    const note = await prisma.dayNote.findUnique({ where: { studentId_date: { studentId: targetId, date } } })
    return NextResponse.json(note)
  }
  const notes = await prisma.dayNote.findMany({ where: { studentId: targetId }, orderBy: { date: 'desc' }, take: 100 })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId = (session.user as any).id
  const body = await req.json()
  const { date, content, sleep } = schema.parse(body)
  const note = await prisma.dayNote.upsert({
    where: { studentId_date: { studentId: userId, date } },
    update: { content, sleep: sleep ?? undefined },
    create: { studentId: userId, date, content, sleep: sleep ?? null },
  })
  return NextResponse.json(note)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId = (session.user as any).id
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({error:'Brak daty'},{status:400})
  await prisma.dayNote.deleteMany({ where: { studentId: userId, date } })
  return NextResponse.json({ok:true})
}
