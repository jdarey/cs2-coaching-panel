'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Film } from 'lucide-react'
import { StudentLayout } from '@/components/student-layout'
import { YoutubeCustomPlayer } from '@/components/youtube-custom-player'
import { ProtectedEmbed } from '@/components/protected-embed'
import { VideoComments } from '@/components/community/video-comments'
import { getYouTubeId } from '@/lib/utils'

interface PlayerVideo {
  id: string
  title: string
  description: string | null
  source: string
  url: string
  embedUrl: string | null
  sessions: { id: string; title: string }[]
  tags: { name: string; color: string }[]
}

interface StudentVideoPlayerClientProps {
  video: PlayerVideo
  initialStartSeconds?: number
  sessionId?: string | null
}

export function StudentVideoPlayerClient({
  video,
  initialStartSeconds = 0,
  sessionId = null,
}: StudentVideoPlayerClientProps) {
  const ytId = getYouTubeId(video.url)

  // Persist playback position (throttled inside the player): status flips to
  // WATCHING as soon as the student actually watches, and to WATCHED at the
  // end (>=95%). positionSeconds is the resume point for the next visit.
  const handleProgress = useCallback(
    (info: { position: number; duration: number; ended: boolean }) => {
      const pct =
        info.duration > 0 ? Math.min(100, Math.round((info.position / info.duration) * 100)) : 0
      const status = info.ended || pct >= 95 ? 'WATCHED' : pct > 0 ? 'WATCHING' : 'PENDING'
      void fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          // Path videos have no session — omit the key entirely so Zod's
          // optional() accepts it (null would fail validation with 400).
          ...(sessionId ? { sessionId } : {}),
          status,
          progress: pct,
          positionSeconds: Math.floor(info.position),
        }),
      }).catch(() => {})
    },
    [video.id, sessionId]
  )
  return (
    <StudentLayout>
      {/* Right-click and selection are blocked around the player so the
          video URL / embed code is not one click away. Note: inside the
          YouTube iframe itself we have no control (cross-origin). */}
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* ===== Breadcrumb ===== */}
        <Link
          href="/student/videos"
          className="rise-in inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-white/65 hover:text-white bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do biblioteki
        </Link>

        {/* ===== Player card ===== */}
        <div className="relative rounded-3xl glass-card overflow-hidden rise-in" style={{ animationDelay: '0.05s' }}>
          <div className="relative aspect-video w-full bg-black">
            {ytId ? (
              <YoutubeCustomPlayer
                videoId={ytId}
                title={video.title}
                initialStartSeconds={initialStartSeconds}
                onProgressChange={handleProgress}
              />
            ) : video.embedUrl ? (
              <>
                <ProtectedEmbed src={video.embedUrl} title={video.title} />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[0.03] to-transparent">
                <div className="grid place-items-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white/40">
                  <Film className="w-8 h-8" />
                </div>
                <p className="text-white/55 text-sm">To źródło nie obsługuje odtwarzania w aplikacji</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== Title + meta ===== */}
        <div className="mt-6 rise-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gradient-vantor leading-tight">
            {video.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {video.sessions.map((s) => (
              <Link
                key={s.id}
                href={`/student/sessions/${s.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/65 bg-white/[0.04] border border-white/[0.08] hover:text-white hover:border-[#a78bfa]/30 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#c4b5fd]" />
                {s.title}
              </Link>
            ))}
          </div>

          {video.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {video.tags.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1"
                  style={{
                    background: `${t.color}14`,
                    color: t.color,
                    borderColor: `${t.color}30`,
                    ['--tw-ring-color' as string]: `${t.color}25`,
                  }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {video.description && (
            <p className="mt-4 text-sm text-white/55 leading-relaxed max-w-3xl whitespace-pre-wrap">
              {video.description}
            </p>
          )}

          <p className="mt-6 text-[11px] text-white/35">
            Film jest dostępny tylko w tym panelu — nie udostępniaj go poza aplikacją.
          </p>
        </div>

        {/* ===== Community discussion ===== */}
        <VideoComments videoId={video.id} myRole="student" />
      </div>
    </StudentLayout>
  )
}
