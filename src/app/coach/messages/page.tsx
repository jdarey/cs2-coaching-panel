import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachMessagesClient } from './coach-messages-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Wiadomości',
}

export default async function CoachMessagesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }

  return <CoachMessagesClient />
}
