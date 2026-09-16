import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachFinanceClient } from './coach-finance-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Finanse',
}

export default async function CoachFinancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || !isCoachRole((session.user as any).role)) {
    redirect('/login')
  }

  return <CoachFinanceClient />
}
