import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
  const userId = (session.user as any).id
  try { await prisma.dayNote.deleteMany({ where: { studentId: userId } }) } catch {}
  try { await prisma.routineCompletion.deleteMany({ where: { studentId: userId } }) } catch {}
  return NextResponse.json({ok:true})
}
