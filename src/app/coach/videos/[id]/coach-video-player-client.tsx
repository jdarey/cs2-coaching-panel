'use client'
import Link from 'next/link'
import { ArrowLeft, Film } from 'lucide-react'
import { CoachLayout } from '@/components/coach-layout-export'
import { YoutubeCustomPlayer } from '@/components/youtube-custom-player'
import { ProtectedEmbed } from '@/components/protected-embed'
import { getYouTubeId } from '@/lib/utils'
import { useSession } from 'next-auth/react'

export function CoachVideoPlayerClient({ video }: { video: { id: string, title: string, description: string | null, source: string, url: string, embedUrl: string | null, tags: { name: string, color: string }[] } }) {
  const ytId = getYouTubeId(video.url)
  const { data: session } = useSession()
  const watermark = (session?.user as any)?.email || 'coach'
  return (
    <CoachLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 select-none" onContextMenu={e=>e.preventDefault()}>
        <Link href="/coach/videos" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-white/65 hover:text-white bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] mb-6">
          <ArrowLeft className="w-4 h-4"/> Powrót do biblioteki
        </Link>
        <div className="rounded-3xl glass-card overflow-hidden">
          <div className="aspect-video w-full bg-black">
            {ytId ? <YoutubeCustomPlayer videoId={ytId} title={video.title} watermark={watermark} /> : video.embedUrl ? <ProtectedEmbed src={video.embedUrl} title={video.title} /> : <div className="w-full h-full grid place-items-center bg-white/[0.03]"><Film className="w-8 h-8 text-white/30"/></div>}
          </div>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-6">{video.title}</h1>
        {video.description && <p className="mt-3 text-sm text-white/55 whitespace-pre-wrap">{video.description}</p>}
        {video.tags.length>0 && <div className="mt-3 flex flex-wrap gap-1.5">{video.tags.map(t=> <span key={t.name} className="px-2 py-1 rounded-lg text-xs font-semibold" style={{background: `${t.color}14`, color: t.color, border: `1px solid ${t.color}30`}}>{t.name}</span>)}</div>}
        <p className="mt-6 text-[11px] text-white/25">Podgląd trenera — ten sam odtwarzacz co u ucznia, z ochroną i znakiem wodnym.</p>
      </div>
    </CoachLayout>
  )
}
