import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachPresetsClient } from './coach-presets-client'
import { isCoachRole } from '@/lib/roles'

export const metadata = {
  title: 'Presety',
}

export default async function CoachPresetsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isCoachRole((session.user as any).role)) redirect('/login')
  const userId = (session.user as any).id
  const [presets, videos] = await Promise.all([
    prisma.exercisePreset.findMany({ where: { coachId: userId }, include: { variants: { orderBy: { order: 'asc' } } }, orderBy: { updatedAt: 'desc' } }),
    prisma.video.findMany({ where: { coachId: userId, isActive: true }, select: { id: true, title: true }, orderBy: { createdAt: 'desc' } }),
  ])
  return <CoachPresetsClient initialPresets={presets} initialVideos={videos} />
}
