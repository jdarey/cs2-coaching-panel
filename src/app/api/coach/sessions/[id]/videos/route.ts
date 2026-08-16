import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getYouTubeId, getVideoThumbnail } from '@/lib/utils'
import { z } from 'zod'

// Same include shape the coach session detail page passes to the client,
// so the client can replace its local session state with the response.
const sessionInclude = {
  coach: { select: { id: true, name: true, email: true, avatarUrl: true } },
  student: { select: { id: true, name: true, email: true, avatarUrl: true } },
  tags: { include: { tag: true }, orderBy: { order: 'asc' } },
  videos: {
    include: { video: { include: { tags: { include: { tag: true } } } }, tag: true },
    orderBy: { order: 'asc' },
  },
  notes: {
    include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  },
} as const

function detectSource(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/vimeo\.com/i.test(url)) return 'vimeo'
  if (/drive\.google\.com/i.test(url)) return 'drive'
  return 'other'
}

async function fetchYoutubeTitle(url: string): Promise<string | null> {
  const id = getYouTubeId(url)
  if (!id) return null
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.title === 'string' && data.title ? data.title : null
  } catch {
    return null
  }
}

/**
 * POST /api/coach/sessions/[id]/videos
 *
 * Body: { videoId }  — attach an existing library video to the session
 *   or: { url, title? } — create a new video from the URL and attach it
 *
 * Creates the student's VideoProgress record if missing and returns the
 * fully-updated session.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może przypisywać filmy' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const existing = await prisma.session.findUnique({
      where: { id },
      select: { id: true, coachId: true, studentId: true },
    })
    if (!existing || existing.coachId !== userId) {
      return NextResponse.json({ error: 'Sesja nie znaleziona lub brak uprawnień' }, { status: 404 })
    }

    const body = await request.json()
    const { videoId, url, title } = body as { videoId?: string; url?: string; title?: string }

    let targetVideoId: string

    if (videoId) {
      targetVideoId = videoId
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { coachId: true, isActive: true },
      })
      if (!video || video.coachId !== userId || video.isActive === false) {
        return NextResponse.json({ error: 'Film nie znaleziony lub brak uprawnień' }, { status: 404 })
      }
    } else if (url) {
      const parsed = z.string().url().safeParse(url)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Nieprawidłowy URL' }, { status: 400 })
      }
      const source = detectSource(url)
      const ytTitle = source === 'youtube' ? await fetchYoutubeTitle(url) : null
      const created = await prisma.video.create({
        data: {
          title: title?.trim() || ytTitle || 'Nowy film treningowy',
          url,
          source,
          coachId: userId,
          thumbnail: getVideoThumbnail(url) || undefined,
        },
      })
      targetVideoId = created.id
    } else {
      return NextResponse.json({ error: 'Podaj videoId lub url' }, { status: 400 })
    }

    // Attach the video to the session (no-op if already attached)
    const already = await prisma.sessionVideo.findFirst({
      where: { sessionId: id, videoId: targetVideoId },
      select: { id: true },
    })
    if (!already) {
      const last = await prisma.sessionVideo.findFirst({
        where: { sessionId: id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      await prisma.sessionVideo.create({
        data: { sessionId: id, videoId: targetVideoId, order: (last?.order ?? -1) + 1 },
      })
    }

    // Ensure the student has a progress record for this video
    await prisma.videoProgress.createMany({
      data: [{ userId: existing.studentId, videoId: targetVideoId, sessionId: id, status: 'PENDING' }],
      skipDuplicates: true,
    })

    const updated = await prisma.session.findUnique({ where: { id }, include: sessionInclude })
    return NextResponse.json(updated, { status: 201 })
  } catch (error) {
    console.error('Coach session videos POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania filmu do sesji' }, { status: 500 })
  }
}

/**
 * DELETE /api/coach/sessions/[id]/videos
 *
 * Body: { videoId } — removes the video from the session and deletes the
 * student's progress records for it. Returns the fully-updated session.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może usuwać filmy z sesji' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const existing = await prisma.session.findUnique({
      where: { id },
      select: { id: true, coachId: true, studentId: true },
    })
    if (!existing || existing.coachId !== userId) {
      return NextResponse.json({ error: 'Sesja nie znaleziona lub brak uprawnień' }, { status: 404 })
    }

    const body = await request.json()
    const { videoId } = body as { videoId?: string }
    if (!videoId) {
      return NextResponse.json({ error: 'Brak videoId' }, { status: 400 })
    }

    await prisma.sessionVideo.deleteMany({ where: { sessionId: id, videoId } })
    await prisma.videoProgress.deleteMany({
      where: { sessionId: id, videoId, userId: existing.studentId },
    })

    const updated = await prisma.session.findUnique({ where: { id }, include: sessionInclude })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Coach session videos DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania filmu z sesji' }, { status: 500 })
  }
}
