import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachSettingsClient } from './coach-settings-client'

export default async function CoachSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    }),
    prisma.coachSettings.findUnique({
      where: { coachId: userId },
    }),
  ])

  if (!user) {
    redirect('/login')
  }

  return <CoachSettingsClient initialUser={user} initialSettings={settings} />
}