import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  title: z.string().min(1).max(160),
  content: z.string().min(1).max(8000),
  pinned: z.boolean().optional().default(false),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
  }

  // The session token only carries id + role — load coachId from the DB so
  // students see exactly their own coach's announcements.
  let coachId: string | null = null
  if (user.role === 'COACH') {
    coachId = user.id
  } else if (user.role === 'STUDENT') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coachId: true },
    })
    coachId = dbUser?.coachId ?? null
  }

  const where = coachId ? { coachId } : { coachId: '__none__' }

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      content: true,
      pinned: true,
      createdAt: true,
      coach: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({
    announcements: announcements.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Uzupełnij tytuł i treść ogłoszenia' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: {
      coachId: user.id,
      title: parsed.data.title.trim(),
      content: parsed.data.content.trim(),
      pinned: parsed.data.pinned,
    },
  })

  return NextResponse.json(
    { announcement: { ...announcement, createdAt: announcement.createdAt.toISOString() } },
    { status: 201 },
  )
}
