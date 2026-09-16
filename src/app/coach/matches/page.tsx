import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachMatchesClient } from './coach-matches-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Mecze',
}

export default async function CoachMatchesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }

  return <CoachMatchesClient />
}
