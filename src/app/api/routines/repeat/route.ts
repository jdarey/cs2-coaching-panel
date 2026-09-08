import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
export const dynamic = 'force-dynamic'
const schema = z.object({ assignmentId: z.string() })
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({error:'Unauthorized'},{status:401})
    const userId = (session.user as any).id
    const { assignmentId } = schema.parse(await req.json())
    const assignment = await prisma.routineAssignment.findFirst({ where: { id: assignmentId, studentId: userId } })
    if (!assignment) return NextResponse.json({error:'Nie znaleziono'},{status:404})
    await prisma.routineTaskProgress.updateMany({ where: { assignmentId }, data: { status:'PENDING', completedAt:null } })
    await prisma.routineAssignment.update({ where:{id:assignmentId}, data:{status:'ACTIVE', completedAt:null}})
    const updated = await prisma.routineAssignment.findUnique({ where:{id:assignmentId}, include:{ routine:{include:{tasks:{select:{id:true,title:true,description:true,videoId:true,steamMapUrl:true,gifUrl:true,day:true,minutes:true,order:true,video:{select:{id:true,title:true,url:true,thumbnail:true}}}, orderBy:[{day:'asc'},{order:'asc'}]}}}, progress:true } })
    return NextResponse.json(updated)
  } catch(e){ console.error(e); return NextResponse.json({error:'Błąd powtarzania'},{status:500})}
}
