import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVideoId, getVideoEmbedUrl } from '@/lib/utils'
import { StudentVideoPlayerClient } from './student-video-player-client'

export default async function StudentVideoPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user || (session.user as any).role !== 'STUDENT') {
    redirect('/login')
  }

  const { id } = await params
  const userId = (session.user as any).id

  // Access control: the student may only watch videos assigned to one of
  // their own sessions.
  const video = await prisma.video.findFirst({
    where: {
      id,
      isActive: true,
      sessionVideos: { some: { session: { studentId: userId } } },
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
  const ytId = getVideoId(video.url)
  const embedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
    : getVideoEmbedUrl(video.url)

  const studentName = (session.user as any).name || (session.user as any).email || 'Uczeń'

  return (
    <StudentVideoPlayerClient
      video={{
        id: video.id,
        title: video.title,
        description: video.description,
        source: video.source,
        embedUrl,
        sessions: video.sessionVideos.map((sv) => ({ id: sv.session.id, title: sv.session.title })),
        tags: video.tags.map((vt) => ({ name: vt.tag.name, color: vt.tag.color })),
      }}
      studentName={studentName}
    />
  )
}
