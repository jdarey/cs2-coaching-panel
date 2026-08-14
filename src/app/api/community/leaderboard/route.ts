import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeStreak, startOfDay } from '@/lib/community'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
  }

  // Session token only carries id + role — load coachId from the DB.
  let coachId: string | null = user.role === 'COACH' ? user.id : null
  if (user.role === 'STUDENT') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coachId: true },
    })
    coachId = dbUser?.coachId ?? null
  }
  if (!coachId) {
    return NextResponse.json({ leaderboard: [], me: null })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const students = await prisma.user.findMany({
    where: { coachId, role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      practiceSessions: {
        select: { minutes: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const rows = students
    .map((s) => {
      const minutes = s.practiceSessions
        .filter((p) => p.createdAt.getTime() >= weekAgo.getTime())
        .reduce((acc, p) => acc + p.minutes, 0)
      const streak = computeStreak(s.practiceSessions.map((p) => p.createdAt))
      return {
        id: s.id,
        name: s.name || s.email.split('@')[0],
        avatarUrl: s.avatarUrl,
        minutes,
        streak,
      }
    })
    .sort((a, b) => b.minutes - a.minutes)

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }))

  let me: (typeof ranked)[number] | null = null
  if (user.role === 'STUDENT') {
    me = ranked.find((r) => r.id === user.id) ?? null
  }

  return NextResponse.json({ leaderboard: ranked, me, weekStart: startOfDay(new Date(weekAgo)).toISOString() })
}
