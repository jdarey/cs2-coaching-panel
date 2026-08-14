import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const templateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.object({
    tagId: z.string(),
    note: z.string().optional(),
    order: z.number().default(0),
  })).optional(),
  videos: z.array(z.object({
    videoId: z.string(),
    tagId: z.string().optional(),
    order: z.number().default(0),
  })).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id

    const templates = await prisma.sessionTemplate.findMany({
      where: { coachId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        tags: { include: { tag: true }, orderBy: { order: 'asc' } },
        videos: { include: { video: { select: { id: true, title: true, thumbnail: true } }, tag: true }, orderBy: { order: 'asc' } },
      },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania szablonów' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = templateSchema.parse(body)

    const template = await prisma.sessionTemplate.create({
      data: {
        coachId: userId,
        title: validated.title,
        description: validated.description,
        tags: validated.tags ? {
          create: validated.tags.map((t, i) => ({ tagId: t.tagId, note: t.note, order: t.order ?? i })),
        } : undefined,
        videos: validated.videos ? {
          create: validated.videos.map((v, i) => ({ videoId: v.videoId, tagId: v.tagId, order: v.order ?? i })),
        } : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        videos: { include: { video: { select: { id: true, title: true, thumbnail: true } }, tag: true } },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Template create error:', error)
    return NextResponse.json({ error: 'Błąd tworzenia szablonu' }, { status: 500 })
  }
}