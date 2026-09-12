import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchVideoDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Tylko trener' }, { status: 403 })
  }
  const userId = (session.user as any).id
  const force = new URL(request.url).searchParams.get('force') === '1'
  const videos = await prisma.video.findMany({
    where: force ? { coachId: userId } : { coachId: userId, duration: null },
    select: { id: true, url: true },
    take: 50,
  })
  let updated = 0
  for (const v of videos) {
    try {
      const dur = await fetchVideoDuration(v.url)
      if (dur) {
        await prisma.video.update({ where: { id: v.id }, data: { duration: dur } })
        updated++
      }
      // small delay to avoid hammering YouTube
      await new Promise((r) => setTimeout(r, 300))
    } catch {}
  }
  return NextResponse.json({ updated, total: videos.length })
}
