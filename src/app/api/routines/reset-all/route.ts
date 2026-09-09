import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId = (session.user as any).id
  const assigns = await prisma.routineAssignment.findMany({ where: { studentId: userId }, select: { id: true } })
  for (const a of assigns) {
    await prisma.routineTaskProgress.updateMany({ where: { assignmentId: a.id }, data: { status:'PENDING', completedAt:null } })
    await prisma.routineAssignment.update({ where: { id: a.id }, data: { status:'ACTIVE', completedAt:null } })
  }
  return NextResponse.json({ok:true})
}
