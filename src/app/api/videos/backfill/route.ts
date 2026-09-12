import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchVideoDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'
// Vercel ma limit 10s na Hobby, wiec zwiekszamy timeout na max (300s na Pro) i robimy rownolegle
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'COACH') {
    return NextResponse.json({ error: 'Tylko trener' }, { status: 403 })
  }
  const userId = (session.user as any).id
  const force = new URL(request.url).searchParams.get('force') === '1'
  const videos = await prisma.video.findMany({
    where: force ? { coachId: userId } : { coachId: userId, duration: null },
    select: { id: true, url: true, duration: true },
    orderBy: { createdAt: 'desc' },
    // bez limitu take - trener rzadko ma >500 filmow, a przycisk ma naprawic "wszędzie"
  })
  let updated = 0
  let failed = 0
  let skipped = 0

  // Rownolegle z limitem 5 jednoczesnych requestow - bez 300ms delay, szybkie
  const CONCURRENCY = 5
  for (let i = 0; i < videos.length; i += CONCURRENCY) {
    const chunk = videos.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      chunk.map(async (v) => {
        // pomin drive/other ktore nigdy nie maja duration (oszczedza requesty)
        if (v.url.includes('drive.google.com')) {
          skipped++
          return
        }
        try {
          const dur = await fetchVideoDuration(v.url, { noCache: true })
          if (dur && dur > 0) {
            // przy force nadpisujemy tylko gdy sie rozni - zeby nie robic zbędnych UPDATE
            if (dur !== v.duration) {
              await prisma.video.update({ where: { id: v.id }, data: { duration: dur } })
              updated++
            }
          } else {
            failed++
          }
        } catch {
          failed++
        }
      })
    )
    // Promise.allSettled juz obsluzone wewnatrz, ale liczymy rejections
    for (const r of results) if (r.status === 'rejected') failed++
  }
  return NextResponse.json({ updated, failed, skipped, total: videos.length, checked: videos.length })
}
