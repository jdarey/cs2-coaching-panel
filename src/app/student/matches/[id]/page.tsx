import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { StudentMatchDetailClient } from './student-match-detail-client'

export default async function StudentMatchDetailPage() {
  const session = await getServerSession(authOptions)

  // Both students and coaches may open a match detail page
  if (!session?.user) {
    redirect('/login')
  }

  return <StudentMatchDetailClient />
}
