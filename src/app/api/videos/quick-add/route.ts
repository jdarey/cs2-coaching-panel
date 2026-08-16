import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getYouTubeId, getVideoThumbnail } from '@/lib/utils'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  url: z.string().url('Nieprawidłowy URL'),
  title: z.string().max(200).optional(),
})

// Best-effort title fetch from YouTube oEmbed (keyless, no CORS server-side).
async function fetchTitleFromUrl(url: string): Promise<string | null> {
  const ytId = getYouTubeId(url)
  if (!ytId) return null
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytId}`)}&format=json`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 200) : null
  } catch {
    return null
  }
}

// Quick-add a video from just a link — used by the training-path builder so
// the coach can paste a URL and keep building, without leaving the page.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Podaj poprawny link' }, { status: 400 })
  }

  const url = parsed.data.url.trim()
  let title = parsed.data.title?.trim() || ''
  if (!title) {
    const fetched = await fetchTitleFromUrl(url)
    title = fetched || 'Film'
  }

  const thumbnail = getVideoThumbnail(url) || undefined
  const source = getYouTubeId(url) ? 'youtube' : url.includes('vimeo.com') ? 'vimeo' : 'other'

  const video = await prisma.video.create({
    data: { title, url, thumbnail, source, coachId: user.id, isActive: true },
  })

  return NextResponse.json(video, { status: 201 })
}
