import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tagSchema, tagUpdateSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    // Coaches see their tags + global tags
    // Students see global tags only (or tags from their coach)
    let where: any = {}

    if (role === 'COACH') {
      where = {
        OR: [{ coachId: userId }, { isGlobal: true }],
      }
    } else {
      // Get student's coach
      const student = await prisma.user.findUnique({
        where: { id: userId },
        select: { coachId: true },
      })
      where = {
        OR: [
          { isGlobal: true },
          ...(student?.coachId ? [{ coachId: student.coachId }] : []),
        ],
      }
    }

    const tags = await prisma.tag.findMany({
      where,
      orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { videos: true } },
      },
    })

    return NextResponse.json(tags)
  } catch (error) {
    console.error('Tags GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania tagów' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może tworzyć tagi' }, { status: 403 })
    }

    const body = await request.json()
    const validated = tagSchema.parse(body)

    const userId = (session.user as any).id

    const tag = await prisma.tag.create({
      data: {
        ...validated,
        coachId: userId,
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Tags POST error:', error)
    return NextResponse.json({ error: 'Błąd tworzenia tagu' }, { status: 500 })
  }
}