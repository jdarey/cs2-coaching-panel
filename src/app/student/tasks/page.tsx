import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { StudentTasksClient } from './student-tasks-client'

export default async function StudentTasksPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  return <StudentTasksClient />
}
