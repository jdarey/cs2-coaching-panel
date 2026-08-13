import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchFaceitLegacy, fetchLeetifyProfile, parseSteamIdentifier, resolveSteamVanity } from '@/lib/gaming'
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

  // Fresh Faceit ELO for the profile header. Prefer the saved Faceit nickname
  // (Faceit legacy API, keyless); fall back to Leetify by Steam ID.
  let faceitElo: number | null = null
  let faceitLevel: number | null = null
  let faceitNickname: string | null = student.faceitNickname || null

  // Older profiles may only have the vanity URL stored (steamId null) — resolve
  // it to a numeric steam64 so Leetify can be queried.
  let steamId = student.steamId
  if (!steamId && student.steamVanity) {
    const parsed = parseSteamIdentifier(student.steamVanity)
    if (parsed.type === 'steam64') {
      steamId = parsed.value
    } else if (parsed.type === 'vanity') {
      steamId = await resolveSteamVanity(parsed.value)
    }
  }

  if (student.faceitNickname) {
    const legacy = await fetchFaceitLegacy(student.faceitNickname)
    if (legacy) {
      faceitElo = legacy.elo
      faceitLevel = legacy.skillLevel
      faceitNickname = legacy.nickname || faceitNickname
    }
  }
  if (faceitElo == null && steamId) {
    const leetify = await fetchLeetifyProfile(steamId)
    if (leetify) {
      faceitElo = leetify.faceitElo
      faceitLevel = leetify.faceitLevel
    }
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
