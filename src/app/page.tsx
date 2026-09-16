import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminRole, isCoachRole } from '@/lib/roles'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  const role = (session.user as any).role

  if (isAdminRole(role)) {
    redirect('/admin')
  } else if (isCoachRole(role)) {
    redirect('/coach/dashboard')
  } else {
    redirect('/student/dashboard')
  }
}