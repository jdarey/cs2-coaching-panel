import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachAnnouncementsClient } from './coach-announcements-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Ogłoszenia',
}

export default async function CoachAnnouncementsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }
  return <CoachAnnouncementsClient />
}
