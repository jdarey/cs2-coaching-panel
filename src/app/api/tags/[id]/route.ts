import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tagUpdateSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może edytować tagi' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const validated = tagUpdateSchema.parse(body)

    const userId = (session.user as any).id

    // Check ownership
    const existingTag = await prisma.tag.findUnique({ where: { id } })
    if (!existingTag || (existingTag.coachId && existingTag.coachId !== userId)) {
      return NextResponse.json({ error: 'Tag nie znaleziony lub brak uprawnień' }, { status: 404 })
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json(tag)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Tag PUT error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji tagu' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Tylko trener może usuwać tagi' }, { status: 403 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    // Check ownership
    const existingTag = await prisma.tag.findUnique({ where: { id } })
    if (!existingTag || (existingTag.coachId && existingTag.coachId !== userId)) {
      return NextResponse.json({ error: 'Tag nie znaleziony lub brak uprawnień' }, { status: 404 })
    }

    await prisma.tag.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tag DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania tagu' }, { status: 500 })
  }
}