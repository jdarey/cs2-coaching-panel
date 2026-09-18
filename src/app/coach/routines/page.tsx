import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachRoutinesClient } from './coach-routines-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Rutyny',
}

export default async function CoachRoutinesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const [routines, students, videos, exercisePresets] = await Promise.all([
    prisma.routine.findMany({
      where: { coachId: userId },
      include: {
        tasks: { select: { id: true, title: true, description: true, videoId: true, steamMapUrl: true, gifUrl: true, linkUrl: true, day: true, minutes: true, order: true, variantLabel: true, variantDifficulty: true }, orderBy: [{ day: 'asc' }, { order: 'asc' }] },
        assignments: {
          select: { id: true, status: true, student: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { tasks: true, assignments: true } },
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
    prisma.exercisePreset.findMany({
      where: { coachId: userId },
      include: { variants: { orderBy: { order: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  return <CoachRoutinesClient initialRoutines={routines} initialStudents={students} initialVideos={videos} initialExercisePresets={exercisePresets} />
}
