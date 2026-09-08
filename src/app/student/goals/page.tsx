import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { StudentGoalsClient } from './student-goals-client'

export default async function StudentGoalsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  return <StudentGoalsClient />
}
