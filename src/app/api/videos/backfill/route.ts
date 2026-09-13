import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchVideoDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

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

  // Rownolegle z limitem 3 + bez delay - poprzednie sekwencyjne 150ms bylo zbyt wolne (10 filmow ~12s)
  // 10/10 failed wczesniej bylo bez UA, nie przez rownoleglosc - z UA i fallbackami mozna rownolegle
  const CONCURRENCY = 3
  for (let i = 0; i < videos.length; i += CONCURRENCY) {
    const chunk = videos.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (v) => {
        const ytId = v.url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([^&\n?#]+)/)?.[1]
        const isVimeo = /vimeo\.com\/\d+/.test(v.url)
        const isSupported = !!ytId || isVimeo
        if (!isSupported) {
          skipped++
          return
        }
        try {
          // timeout 8s - watch page potrafi wisiec 20s na Vercel
          const dur = await Promise.race([
            fetchVideoDuration(v.url, { noCache: true }),
            new Promise<null>((res) => setTimeout(() => res(null), 8000)),
          ])
          if (dur && dur > 0) {
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
  }
  return NextResponse.json({ updated, failed, skipped, total: videos.length, checked: videos.length })
}
