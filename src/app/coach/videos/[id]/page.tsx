import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getYouTubeId, getVideoEmbedUrl } from '@/lib/utils'
import { CoachVideoPlayerClient } from './coach-video-player-client'

export default async function CoachVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'COACH') redirect('/login')
  const { id } = await params
  const userId = (session.user as any).id
  const video = await prisma.video.findFirst({
    where: { id, coachId: userId },
    include: { tags: { include: { tag: true } } },
  })
  if (!video) notFound()
  const ytId = getYouTubeId(video.url)
  const embedUrl = ytId ? `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1` : getVideoEmbedUrl(video.url)
  return <CoachVideoPlayerClient video={{ id: video.id, title: video.title, description: video.description, source: video.source, url: video.url, embedUrl, tags: video.tags.map(vt=>({name: vt.tag.name, color: vt.tag.color})) }} />
}
