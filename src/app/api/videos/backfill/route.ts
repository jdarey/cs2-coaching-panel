import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchVideoDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

export async function POST(request: NextRequest) {
  try {
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
    })
    let updated = 0
    let failed = 0
    let skipped = 0

    const CONCURRENCY = 5
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
            const dur = await Promise.race([
              fetchVideoDuration(v.url, { noCache: true }),
              new Promise<null>((res) => setTimeout(() => res(null), 6000)),
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
  } catch (e: any) {
    console.error('[backfill] fatal', e)
    return NextResponse.json({ error: 'Błąd serwera backfill', details: String(e?.message || e), updated: 0, failed: 0, skipped: 0, total: 0 }, { status: 500 })
  }
}
