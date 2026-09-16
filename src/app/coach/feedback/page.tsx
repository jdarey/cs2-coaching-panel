import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachFeedbackClient } from './coach-feedback-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Opinie',
}

export default async function CoachFeedbackPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }

  return <CoachFeedbackClient />
}
