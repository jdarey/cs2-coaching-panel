import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isCoachRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
})

async function canAccessVideo(user: any, videoCoachId: string): Promise<boolean> {
  if (user.role === 'ADMIN') return true
  if (isCoachRole(user.role)) return videoCoachId === user.id
  if (user.role === 'STUDENT') {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { coachId: true } })
    return (dbUser?.coachId ?? null) === videoCoachId
  }
  return false
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
  }

  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true, coachId: true } })
  if (!video) {
    return NextResponse.json({ error: 'Nie znaleziono filmu' }, { status: 404 })
  }

  // Ten sam guard co w POST — tylko właściciel-trener i jego uczniowie.
  if (!(await canAccessVideo(session.user, video.coachId))) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const comments = await prisma.videoComment.findMany({
    where: { videoId: params.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({
    comments: comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
  }

  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true, coachId: true } })
  if (!video) {
    return NextResponse.json({ error: 'Nie znaleziono filmu' }, { status: 404 })
  }

  // Only the owning coach or students of that coach can comment.
  if (!(await canAccessVideo(user, video.coachId))) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Komentarz nie może być pusty' }, { status: 400 })
  }

  const comment = await prisma.videoComment.create({
    data: { videoId: params.id, authorId: user.id, content: parsed.data.content.trim() },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({ comment: { ...comment, createdAt: comment.createdAt.toISOString() } }, { status: 201 })
}
