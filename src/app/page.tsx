import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  const role = (session.user as any).role

  if (role === 'COACH') {
    redirect('/coach/dashboard')
  } else {
    redirect('/student/dashboard')
  }
}