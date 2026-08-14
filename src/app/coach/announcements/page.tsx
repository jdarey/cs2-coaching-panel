import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachAnnouncementsClient } from './coach-announcements-client'

export default async function CoachAnnouncementsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }
  return <CoachAnnouncementsClient />
}
