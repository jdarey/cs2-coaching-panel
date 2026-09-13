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

  // Sekwencyjnie z malym delay - YouTube blokuje masowe rownolegle requesty z Vercel IP (10/10 failed)
  let idx = 0
  for (const v of videos) {
    idx++
    const ytId = v.url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([^&\n?#]+)/)?.[1]
    const isVimeo = /vimeo\.com\/\d+/.test(v.url)
    const isSupported = !!ytId || isVimeo
    if (!isSupported) {
      skipped++
      continue
    }
    try {
      const dur = await fetchVideoDuration(v.url, { noCache: true })
      if (dur && dur > 0) {
        if (dur !== v.duration) {
          await prisma.video.update({ where: { id: v.id }, data: { duration: dur } })
          updated++
        }
      } else {
        failed++
        console.warn(`[backfill] brak czasu dla ${v.id} (${ytId || v.url})`)
      }
    } catch (e) {
      failed++
      console.warn(`[backfill] error ${v.id}`, e)
    }
    // 150ms przerwy żeby nie triggerować rate-limitu YT (Vercel IP jest współdzielony)
    if (idx < videos.length) await new Promise((r) => setTimeout(r, 150))
  }
  return NextResponse.json({ updated, failed, skipped, total: videos.length, checked: videos.length })
}
