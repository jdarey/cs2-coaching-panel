import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getYouTubeId, getVideoEmbedUrl } from '@/lib/utils'
import { StudentVideoPlayerClient } from './student-video-player-client'

export default async function StudentVideoPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const { id } = await params
  const userId = (session.user as any).id

  // Access control: the student may watch videos assigned to one of their
  // own sessions, OR videos that appear in an active training path created
  // by their own coach (paths link straight into this player).
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { coachId: true },
  })

  const video = await prisma.video.findFirst({
    where: {
      id,
      isActive: true,
      OR: [
        { sessionVideos: { some: { session: { studentId: userId } } } },
        {
          pathVideos: {
            some: { module: { path: { coachId: student?.coachId ?? '', isActive: true } } },
          },
        },
      ],
    },
    include: {
      tags: { include: { tag: true } },
      sessionVideos: {
        include: { session: { select: { id: true, title: true } } },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!video) {
    notFound()
  }

  // Embed the source in-app instead of sending the student out to the host
  // site. YouTube is embedded via youtube-nocookie (no tracking cookies);
  // Vimeo via player.vimeo.com. Anything else simply has no player here.
  const ytId = getYouTubeId(video.url)
  const embedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
    : getVideoEmbedUrl(video.url)

  // Progress records are keyed by (user, video, session) — use the first
  // session the video belongs to so the resume point saved by the player is
  // exactly the one read back here.
  const sessionId = video.sessionVideos[0]?.session.id ?? null
  const savedProgress = await prisma.videoProgress.findFirst({
    where: { userId, videoId: video.id, sessionId },
    select: { positionSeconds: true, status: true },
  })

  return (
    <StudentVideoPlayerClient
      video={{
        id: video.id,
        title: video.title,
        description: video.description,
        source: video.source,
        url: video.url,
        embedUrl,
        sessions: video.sessionVideos.map((sv) => ({ id: sv.session.id, title: sv.session.title })),
        tags: video.tags.map((vt) => ({ name: vt.tag.name, color: vt.tag.color })),
      }}
      initialStartSeconds={savedProgress?.positionSeconds ?? 0}
      sessionId={sessionId}
    />
  )
}
