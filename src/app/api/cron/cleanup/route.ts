import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await prisma.$transaction(async (tx) => {
      // 1. Clean up old draft sessions (older than 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const deletedDrafts = await tx.session.deleteMany({
        where: {
          status: 'DRAFT',
          createdAt: { lt: thirtyDaysAgo },
        },
      })

      // 2. Clean up orphaned video progress (sessions that no longer exist)
      const orphanedProgress = await tx.videoProgress.deleteMany({
        where: {
          sessionId: { not: null },
          session: { id: null },
        },
      })

      // 3. Clean up inactive videos not used in any session (older than 90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const unusedVideos = await tx.video.findMany({
        where: {
          isActive: false,
          createdAt: { lt: ninetyDaysAgo },
          sessions: { none: {} },
        },
        select: { id: true },
      })

      let deletedVideos = 0
      if (unusedVideos.length > 0) {
        const videoIds = unusedVideos.map((v) => v.id)
        await tx.videoTag.deleteMany({ where: { videoId: { in: videoIds } } })
        await tx.videoProgress.deleteMany({ where: { videoId: { in: videoIds } } })
        const result = await tx.video.deleteMany({ where: { id: { in: videoIds } } })
        deletedVideos = result.count
      }

      return {
        deletedDrafts: deletedDrafts.count,
        orphanedProgress: orphanedProgress.count,
        deletedVideos,
      }
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    console.error('Cron cleanup failed:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}