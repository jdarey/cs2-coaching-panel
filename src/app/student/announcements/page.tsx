import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { StudentAnnouncementsClient } from './student-announcements-client'

export default async function StudentAnnouncementsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }
  return <StudentAnnouncementsClient />
}
