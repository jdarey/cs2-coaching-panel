import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
  }

  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!video) {
    return NextResponse.json({ error: 'Nie znaleziono filmu' }, { status: 404 })
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
  let studentCoachId: string | null = null
  if (user.role === 'STUDENT') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coachId: true },
    })
    studentCoachId = dbUser?.coachId ?? null
  }
  const allowed =
    user.role === 'COACH' ? video.coachId === user.id : user.role === 'STUDENT' && studentCoachId === video.coachId
  if (!allowed) {
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
