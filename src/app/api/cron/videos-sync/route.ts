import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVideoDuration } from '@/lib/video-duration'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Nocna kolejka duration: uzupełnia po 20 najstarszych filmów bez czasu.
// Trener nie musi klikać "Przeładuj" — cron (Vercel Cron) woła ten endpoint.
// Chroni przed 504: limit 20 + CONCURRENCY 4 + timeouty w getVideoDuration.
const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const videos = await prisma.video.findMany({
      where: { duration: null, isActive: true },
      select: { id: true, url: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    let updated = 0
    let failed = 0
    let skipped = 0

    const CONCURRENCY = 4
    for (let i = 0; i < videos.length; i += CONCURRENCY) {
      const chunk = videos.slice(i, i + CONCURRENCY)
      await Promise.all(
        chunk.map(async (v) => {
          const ytId = v.url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([^&\n?#]+)/)?.[1]
          const isVimeo = /vimeo\.com\/\d+/.test(v.url)
          if (!ytId && !isVimeo) {
            skipped++
            return
          }
          try {
            const dur = await getVideoDuration(v.url)
            if (dur && dur > 0) {
              await prisma.video.update({ where: { id: v.id }, data: { duration: dur } })
              updated++
            } else {
              failed++
            }
          } catch {
            failed++
          }
        }),
      )
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checked: videos.length,
      updated,
      failed,
      skipped,
    })
  } catch (error) {
    console.error('Cron videos-sync failed:', error)
    return NextResponse.json(
      { error: 'Videos sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
