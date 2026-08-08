import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachStudentsClient } from './coach-students-client'

export default async function CoachStudentsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const students = await prisma.user.findMany({
    where: { coachId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { sessionsAsStudent: true, videoProgress: true } },
    },
  })

  // Get progress stats for each student
  const studentsWithStats = await Promise.all(
    students.map(async (student) => {
      const progress = await prisma.videoProgress.findMany({
        where: { userId: student.id },
        select: { status: true },
      })

      const stats = {
        total: progress.length,
        pending: progress.filter((p) => p.status === 'PENDING').length,
        watching: progress.filter((p) => p.status === 'WATCHING').length,
        watched: progress.filter((p) => p.status === 'WATCHED').length,
        implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
      }

      return { ...student, progressStats: stats }
    })
  )

  return <CoachStudentsClient initialStudents={studentsWithStats} />
}