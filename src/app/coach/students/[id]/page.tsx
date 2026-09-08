import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchBestFaceitElo, resolveStudentSteamId } from '@/lib/gaming'
import { CoachStudentDetailClient } from './coach-student-detail-client'

export default async function CoachStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'COACH') {
    redirect('/login')
  }

  const { id } = await params
  const userId = (session.user as any).id

  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
      coachId: true,
      steamId: true,
      steamVanity: true,
      faceitNickname: true,
    },
  })

  if (!student || student.coachId !== userId) {
    redirect('/coach/students')
  }

  const sessions = await prisma.session.findMany({
    where: { coachId: userId, studentId: id },
    include: {
      tags: { include: { tag: true }, orderBy: { order: 'asc' } },
      _count: { select: { videos: true, notes: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  const progress = await prisma.videoProgress.findMany({
    where: { userId: id },
    select: { status: true },
  })

  const progressStats = {
    total: progress.length,
    pending: progress.filter((p) => p.status === 'PENDING').length,
    watching: progress.filter((p) => p.status === 'WATCHING').length,
    watched: progress.filter((p) => p.status === 'WATCHED').length,
    implemented: progress.filter((p) => p.status === 'IMPLEMENTED').length,
  }

  const coachVideos = await prisma.video.findMany({
    where: { coachId: userId, isActive: true },
    select: { id: true, title: true, thumbnail: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Fresh Faceit ELO for the profile header. Prefer live Faceit legacy API by
  // nickname (saved or auto-discovered from Leetify match history); fall back
  // to Leetify's cached value (can be stale).
  let faceitElo: number | null = null
  let faceitLevel: number | null = null
  let faceitNickname: string | null = student.faceitNickname || null

  // Resolve the student's CURRENT Steam identifier — fresh vanity first, so a
  // stale/wrong stored steam64 (e.g. copied from another account) never shows
  // another player's ELO here. Persists the resolved ID when it changed.
  const steamId = await resolveStudentSteamId(student, async (resolved) => {
    await prisma.user.update({ where: { id: student.id }, data: { steamId: resolved } })
  })

  const best = await fetchBestFaceitElo(steamId, student.faceitNickname)
  faceitElo = best.elo
  faceitLevel = best.level
  faceitNickname = best.nickname || student.faceitNickname

  // Persist an auto-discovered Faceit nickname once, so later page loads use
  // the saved value and skip the Leetify match-history lookup entirely.
  if (best.nickname && best.nickname !== student.faceitNickname && best.source === 'faceit') {
    await prisma.user.update({
      where: { id: student.id },
      data: { faceitNickname: best.nickname },
    })
  }

  return (
    <CoachStudentDetailClient
      student={{
        id: student.id,
        email: student.email,
        name: student.name,
        avatarUrl: student.avatarUrl,
        createdAt: student.createdAt.toISOString(),
        steamId: student.steamId,
        steamVanity: student.steamVanity,
        faceitNickname,
        faceitElo,
        faceitLevel,
      }}
      progressStats={progressStats}
      sessions={sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
        createdAt: s.createdAt.toISOString(),
        videosCount: s._count.videos,
        notesCount: s._count.notes,
        tags: s.tags.map((t) => ({ name: t.tag.name, color: t.tag.color })),
      }))}
      coachVideos={coachVideos.map((v) => ({ id: v.id, title: v.title, thumbnail: v.thumbnail }))}
    />
  )
}
