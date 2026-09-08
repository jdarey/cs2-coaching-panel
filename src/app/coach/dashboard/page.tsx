import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachDashboardClient } from './coach-dashboard-client'

export default async function CoachDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  const [students, sessionsCount, videosCount, tagsCount, recentSessions, progressStats, sessionStatuses, assignments, messages, allStudents, upcomingSessions, sessionsThisWeek, routines] = await Promise.all([
    // All students with their activity snapshot — feeds the attention queue
    prisma.user.findMany({
      where: { coachId: userId },
      select: {
        id: true, name: true, email: true, avatarUrl: true, createdAt: true,
        _count: { select: { videoProgress: true } },
        videoProgress: { select: { updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 1 },
        assignmentsReceived: { select: { id: true, status: true, dueDate: true }, orderBy: { createdAt: 'desc' }, take: 50 },
        sessionsAsStudent: { select: { id: true, status: true, scheduledAt: true }, orderBy: { scheduledAt: 'desc' }, take: 20 },
      },
    }),
    prisma.session.count({ where: { coachId: userId } }),
    prisma.video.count({ where: { coachId: userId, isActive: true } }),
    prisma.tag.count({ where: { coachId: userId } }),
    prisma.session.findMany({
      where: { coachId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: { select: { videos: true, tags: true } },
      },
    }),
    prisma.videoProgress.groupBy({
      by: ['status'],
      where: { user: { coachId: userId } },
      _count: { status: true },
    }),
    prisma.session.groupBy({
      by: ['status'],
      where: { coachId: userId },
      _count: { status: true },
    }),
    prisma.assignment.findMany({
      where: { coachId: userId },
      select: { id: true, status: true, dueDate: true, completedAt: true },
    }),
    prisma.message.groupBy({
      by: ['senderId'],
      where: { receiverId: userId, readAt: null },
      _count: { senderId: true },
    }),
    prisma.user.count({ where: { coachId: userId } }),
    prisma.session.findMany({
      where: { coachId: userId, status: 'ACTIVE', scheduledAt: { gte: now } },
      select: { id: true },
    }),
    prisma.session.count({ where: { coachId: userId, createdAt: { gte: weekAgo } } }),
    prisma.routine.findMany({
      where: { coachId: userId },
      include: {
        _count: { select: { tasks: true, assignments: true } },
        assignments: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            progress: { select: { status: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
  ])

  // ---- Attention queue: who needs the coach's attention right now ----
  const unreadBySender = new Map(messages.map((m) => [m.senderId, m._count.senderId]))

  const attention = students.map((s) => {
    const unread = unreadBySender.get(s.id) ?? 0
    const pending = s.assignmentsReceived.filter((a) => a.status === 'PENDING').length
    const overdue = s.assignmentsReceived.filter((a) => a.status === 'PENDING' && a.dueDate && a.dueDate < now).length
    const lastActivity = s.videoProgress[0]?.updatedAt ?? s.createdAt
    const inactiveDays = Math.floor((now.getTime() - lastActivity.getTime()) / 86400000)
    const hasUpcoming = s.sessionsAsStudent.some((ss) => ss.status === 'ACTIVE' && ss.scheduledAt && ss.scheduledAt >= now)

    let score = 0
    const reasons: { key: string; label: string }[] = []
    if (unread > 0) { score += unread * 3; reasons.push({ key: 'unread', label: `${unread} nieprzeczytanych` }) }
    if (overdue > 0) { score += overdue * 5; reasons.push({ key: 'overdue', label: `${overdue} zadań po terminie` }) }
    else if (pending > 0) { score += 1; reasons.push({ key: 'pending', label: `${pending} zadań w toku` }) }
    if (!hasUpcoming) { score += 2; reasons.push({ key: 'nosession', label: 'brak nadchodzącej sesji' }) }
    if (inactiveDays >= 7) { score += 4; reasons.push({ key: 'inactive', label: `bez aktywności ${inactiveDays}d` }) }

    return {
      id: s.id, name: s.name, email: s.email, avatarUrl: s.avatarUrl,
      unread, pending, overdue, inactiveDays, hasUpcoming,
      score, reasons, videoCount: s._count.videoProgress,
    }
  })
  attention.sort((a, b) => b.score - a.score)

  // ---- Routines: structured programs with live progress ----
  const routinesSummary = routines.map((r) => {
    const taskTotal = r._count.tasks
    const activeAssignments = r.assignments.filter((a) => a.status === 'ACTIVE')
    const completedAssignments = r.assignments.filter((a) => a.status === 'COMPLETED').length
    const doneTasks = r.assignments.reduce(
      (acc, a) => acc + a.progress.filter((p) => p.status === 'DONE').length,
      0,
    )
    const totalAssignedTasks = r.assignments.reduce((acc, a) => acc + taskTotal, 0)
    return {
      id: r.id,
      title: r.title,
      taskTotal,
      assignmentTotal: r.assignments.length,
      activeAssignments: activeAssignments.length,
      completedAssignments,
      doneTasks,
      pct: totalAssignedTasks > 0 ? Math.round((doneTasks / totalAssignedTasks) * 100) : 0,
      students: r.assignments.map((a) => a.student.name || a.student.email),
    }
  })

  // ---- Assignment pipeline ----
  const totalAssignments = assignments.length
  const doneAssignments = assignments.filter((a) => a.status === 'DONE').length
  const overdueAssignments = assignments.filter((a) => a.status === 'PENDING' && a.dueDate && a.dueDate < now).length
  const assignmentRate = totalAssignments > 0 ? Math.round((doneAssignments / totalAssignments) * 100) : 0

  // ---- Effectiveness (real, from the DB) ----
  const totalProgress = progressStats.reduce((s, p) => s + p._count.status, 0)
  const completedProgress = progressStats
    .filter((p) => p.status === 'WATCHED' || p.status === 'IMPLEMENTED')
    .reduce((s, p) => s + p._count.status, 0)
  const totalSessions = sessionStatuses.reduce((s, p) => s + p._count.status, 0)
  const completedSessions = sessionStatuses.find((p) => p.status === 'COMPLETED')?._count.status ?? 0

  const effectiveness =
    totalProgress > 0
      ? Math.round((completedProgress / totalProgress) * 100)
      : totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0

  // ---- Weekly pulse ----
  const doneThisWeek = assignments.filter((a) => a.completedAt && a.completedAt >= weekAgo).length
  const activeStudents = students.filter((s) => s.videoProgress[0]?.updatedAt && s.videoProgress[0].updatedAt >= weekAgo).length

  const initial = {
    studentsCount: allStudents,
    sessionsCount,
    videosCount,
    tagsCount,
    effectiveness,
    assignmentRate,
    overdueAssignments,
    attentionNeeding: attention.filter((a) => a.score > 0).length,
    attention,
    routinesSummary,
    recentSessions,
    sessionsThisWeek,
    doneThisWeek,
    activeStudents,
    upcomingCount: upcomingSessions.length,
  }

  return <CoachDashboardClient initial={initial} />
}
