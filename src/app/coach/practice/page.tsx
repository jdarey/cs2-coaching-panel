import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachPracticeClient } from './coach-practice-client'

export default async function CoachPracticePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id
  const now = new Date()
  const weeks = 8

  const students = await prisma.user.findMany({
    where: { coachId: userId, role: 'STUDENT' },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      practiceSessions: {
        select: { minutes: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Week boundaries (Monday start)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)
  const lastWeekStart = new Date(startOfWeek)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const from = new Date(startOfWeek)
  from.setDate(from.getDate() - (weeks - 1) * 7)

  const rows = students.map((s) => {
    // 8-week bars
    const bars = Array.from({ length: weeks }, (_, i) => {
      const ws = new Date(from)
      ws.setDate(from.getDate() + i * 7)
      const we = new Date(ws)
      we.setDate(ws.getDate() + 7)
      const minutes = s.practiceSessions
        .filter((p) => p.createdAt >= ws && p.createdAt < we)
        .reduce((acc, p) => acc + p.minutes, 0)
      return { label: `${ws.getDate()}.${String(ws.getMonth() + 1).padStart(2, '0')}`, minutes, isCurrent: i === weeks - 1 }
    })

    const thisWeek = s.practiceSessions
      .filter((p) => p.createdAt >= startOfWeek)
      .reduce((acc, p) => acc + p.minutes, 0)
    const lastWeek = s.practiceSessions
      .filter((p) => p.createdAt >= lastWeekStart && p.createdAt < startOfWeek)
      .reduce((acc, p) => acc + p.minutes, 0)
    const total = s.practiceSessions
      .filter((p) => p.createdAt >= from)
      .reduce((acc, p) => acc + p.minutes, 0)
    const sessions = s.practiceSessions.filter((p) => p.createdAt >= from).length
    const delta = thisWeek - lastWeek

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      avatarUrl: s.avatarUrl,
      bars,
      thisWeek,
      lastWeek,
      delta,
      total,
      sessions,
    }
  })

  const allTime = students.reduce((acc, s) => acc + s.practiceSessions.reduce((a, p) => a + p.minutes, 0), 0)
  const activeThisWeek = rows.filter((r) => r.thisWeek > 0).length

  return <CoachPracticeClient rows={rows} stats={{ students: rows.length, allTime, activeThisWeek }} />
}
