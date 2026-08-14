import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachPathsClient } from './coach-paths-client'

export default async function CoachPathsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }
  return <CoachPathsClient />
}
