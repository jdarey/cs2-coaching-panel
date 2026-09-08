import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachRoutinesClient } from './coach-routines-client'

export default async function CoachRoutinesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const [routines, students, videos] = await Promise.all([
    prisma.routine.findMany({
      where: { coachId: userId },
      include: {
        tasks: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
        assignments: {
          include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { coachId: userId, role: 'STUDENT' },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    }),
    prisma.video.findMany({
      where: { coachId: userId, isActive: true },
      select: { id: true, title: true, url: true, thumbnail: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return <CoachRoutinesClient initialRoutines={routines} initialStudents={students} initialVideos={videos} />
}
