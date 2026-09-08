import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { videoSchema, videoUpdateSchema } from '@/lib/validations'
import { getVideoThumbnail } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    let where: any = { isActive: true }

    if (role === 'COACH') {
      where.coachId = userId
    } else {
      // Students see videos from their coach
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: { coachId: true },
      })
      if (student?.coachId) {
        where.coachId = student.coachId
      } else {
        return NextResponse.json([])
      }
    }

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    if (tagId) {
      where.tags = { some: { tagId } }
    }

    const videos = await prisma.video.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { progress: true } },
      },
    })

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Videos GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania filmów' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może dodawać filmy' }, { status: 403 })
    }

    const body = await request.json()
    const validated = videoSchema.parse(body)

    const userId = (session.user as any).id

    // Auto-fetch thumbnail for YouTube
    const thumbnail = getVideoThumbnail(validated.url) || undefined

    // tagIds is a validation-layer field, not a Prisma column - it must be
    // handled through the relation create below instead of being spread into data.
    const { tagIds, ...videoData } = validated

    const video = await prisma.video.create({
      data: {
        ...videoData,
        coachId: userId,
        thumbnail,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { progress: true, sessionVideos: true } },
      },
    })

    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Videos POST error:', error)
    return NextResponse.json({ error: 'Błąd dodawania filmu' }, { status: 500 })
  }
}