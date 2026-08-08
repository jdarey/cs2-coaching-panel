import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentProgressClient } from './student-progress-client'

export default async function StudentProgressPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const [progress, sessions, tags] = await Promise.all([
    prisma.videoProgress.findMany({
      where: { userId },
      include: {
        video: { include: { tags: { include: { tag: true } } } },
        session: { select: { id: true, title: true, scheduledAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.session.findMany({
      where: { studentId: userId },
      orderBy: { scheduledAt: 'desc' },
      select: { id: true, title: true, status: true, scheduledAt: true, createdAt: true },
    }),
    prisma.tag.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { coachId: (await prisma.user.findUnique({ where: { id: userId }, select: { coachId: true } }))?.coachId || '' },
        ],
      },
      select: { id: true, name: true, color: true, icon: true },
    }),
  ])

  return <StudentProgressClient initialProgress={progress} initialSessions={sessions} initialTags={tags} />
}