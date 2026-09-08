import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachPresetsClient } from './coach-presets-client'

export default async function CoachPresetsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'COACH') redirect('/login')
  const userId = (session.user as any).id
  const [presets, videos] = await Promise.all([
    prisma.exercisePreset.findMany({ where: { coachId: userId }, orderBy: { updatedAt: 'desc' } }),
    prisma.video.findMany({ where: { coachId: userId, isActive: true }, select: { id: true, title: true }, orderBy: { createdAt: 'desc' } }),
  ])
  return <CoachPresetsClient initialPresets={presets} initialVideos={videos} />
}
