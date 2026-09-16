import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachPathsClient } from './coach-paths-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Ścieżki',
}

export default async function CoachPathsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }
  return <CoachPathsClient />
}
