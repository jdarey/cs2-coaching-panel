import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (role === 'COACH') {
      // Coach analytics - overview of all students or specific student
      let where: any = { coachId: userId }
      if (studentId) where.id = studentId

      const students = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          _count: { select: { sessionsAsStudent: true, videoProgress: true } },
        },
      })

      // Get tag frequency for coach's sessions
      const tagStats = await prisma.sessionTag.groupBy({
        by: ['tagId'],
        where: { session: { coachId: userId } },
        _count: { tagId: true },
        orderBy: { _count: { tagId: 'desc' } },
        take: 10,
      })

      const tagDetails = await prisma.tag.findMany({
        where: { id: { in: tagStats.map((t) => t.tagId) } },
      })

      const tagHeatmap = tagStats.map((stat) => {
        const tag = tagDetails.find((t) => t.id === stat.tagId)
        return { tag, count: stat._count.tagId }
      })

      // Video completion rates
      const progressStats = await prisma.videoProgress.groupBy({
        by: ['status'],
        where: { user: { coachId: userId } },
        _count: { status: true },
      })

      // Sessions over time (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const sessionsOverTime = await prisma.session.groupBy({
        by: ['status'],
        where: {
          coachId: userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { status: true },
      })

      return NextResponse.json({
        students,
        tagHeatmap,
        progressStats,
        sessionsOverTime,
      })
    } else {
      // Student analytics - own progress
      if (!studentId || studentId !== userId) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 })
      }

      const progress = await prisma.videoProgress.findMany({
        where: { userId },
        include: { video: { include: { tags: { include: { tag: true } } } }, session: true },
      })

      const progressByStatus = progress.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Tag progress
      const tagProgress: Record<string, { total: number; completed: number }> = {}
      progress.forEach((p) => {
        p.video.tags.forEach((vt) => {
          const tagId = vt.tagId
          if (!tagProgress[tagId]) tagProgress[tagId] = { total: 0, completed: 0 }
          tagProgress[tagId].total++
          if (p.status === 'WATCHED' || p.status === 'IMPLEMENTED') tagProgress[tagId].completed++
        })
      })

      const tagDetails = await prisma.tag.findMany({
        where: { id: { in: Object.keys(tagProgress) } },
      })

      const tagProgressList = Object.entries(tagProgress).map(([tagId, stats]) => {
        const tag = tagDetails.find((t) => t.id === tagId)
        return { tag, ...stats, rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0 }
      })

      // Weekly progress
      const weeklyProgress = progress
        .filter((p) => p.watchedAt)
        .reduce((acc, p) => {
          const week = new Date(p.watchedAt!).toISOString().split('W')[0] + 'W' + new Date(p.watchedAt!).getWeek()
          acc[week] = (acc[week] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      return NextResponse.json({
        progressByStatus,
        tagProgress: tagProgressList,
        weeklyProgress: Object.entries(weeklyProgress).map(([week, count]) => ({ week, count })),
        totalVideos: progress.length,
      })
    }
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania analityki' }, { status: 500 })
  }
}

// Helper to get week number
declare global {
  interface Date {
    getWeek(): number
  }
}

Date.prototype.getWeek = function (): number {
  const date = new Date(this.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}