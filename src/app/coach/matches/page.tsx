import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachMatchesClient } from './coach-matches-client'

export default async function CoachMatchesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  return <CoachMatchesClient />
}
