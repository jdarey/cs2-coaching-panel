import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StudentSettingsClient } from './student-settings-client'

export default async function StudentSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const userId = (session.user as any).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  })

  if (!user) {
    redirect('/login')
  }

  return <StudentSettingsClient initialUser={user} />
}