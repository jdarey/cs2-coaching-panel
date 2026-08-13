import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { id } = await params

    const template = await prisma.sessionTemplate.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true }, orderBy: { order: 'asc' } },
        videos: { include: { video: { select: { id: true, title: true, thumbnail: true } }, tag: true }, orderBy: { order: 'asc' } },
        _count: { select: { assignments: true } },
      },
    })

    if (!template || template.coachId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Szablon nie znaleziony' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Template GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania szablonu' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { id } = await params
    const body = await request.json()

    const template = await prisma.sessionTemplate.findUnique({ where: { id } })
    if (!template || template.coachId !== userId) {
      return NextResponse.json({ error: 'Szablon nie znaleziony' }, { status: 404 })
    }

    const validated = z.object({
      title: z.string().min(1).max(200).optional(),
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
    }).parse(body)

    // Update basic fields
    const updated = await prisma.sessionTemplate.update({
      where: { id },
      data: {
        title: validated.title,
        description: validated.description,
      },
      include: {
        tags: { include: { tag: true } },
        videos: { include: { video: { select: { id: true, title: true, thumbnail: true } }, tag: true } },
      },
    })

    // Sync tags if provided
    if (validated.tags !== undefined) {
      await prisma.sessionTemplateTag.deleteMany({ where: { templateId: id } })
      if (validated.tags.length > 0) {
        await prisma.sessionTemplateTag.createMany({
          data: validated.tags.map((t, i) => ({
            templateId: id,
            tagId: t.tagId,
            note: t.note,
            order: t.order ?? i,
          })),
        })
      }
    }

    // Sync videos if provided
    if (validated.videos !== undefined) {
      await prisma.sessionTemplateVideo.deleteMany({ where: { templateId: id } })
      if (validated.videos.length > 0) {
        await prisma.sessionTemplateVideo.createMany({
          data: validated.videos.map((v, i) => ({
            templateId: id,
            videoId: v.videoId,
            tagId: v.tagId,
            order: v.order ?? i,
          })),
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Template PATCH error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji szablonu' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { id } = await params

    const template = await prisma.sessionTemplate.findUnique({ where: { id } })
    if (!template || template.coachId !== userId) {
      return NextResponse.json({ error: 'Szablon nie znaleziony' }, { status: 404 })
    }

    await prisma.sessionTemplate.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Template DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania szablonu' }, { status: 500 })
  }
}