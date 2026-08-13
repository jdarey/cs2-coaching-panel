import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachDemoReviewClient } from './coach-demo-review-client'

export default async function CoachDemoReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const { id } = await params
  const userId = (session.user as any).id

  const match = await prisma.matchLog.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true, avatarUrl: true, steamId: true } },
    },
  })

  if (!match || match.student.coachId !== userId) {
    redirect('/coach/matches')
  }

  return <CoachDemoReviewClient initialMatch={match} />
}