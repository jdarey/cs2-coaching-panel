import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { CoachFinanceClient } from './coach-finance-client'

export const metadata = {
  title: 'Finanse',
}

export default async function CoachFinancePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  return <CoachFinanceClient />
}
