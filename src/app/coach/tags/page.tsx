import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachTagsClient } from './coach-tags-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Tagi',
}

export default async function CoachTagsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const tags = await prisma.tag.findMany({
    where: { coachId: userId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { videos: true, sessions: true } },
    },
  })

  return <CoachTagsClient initialTags={tags} />
}