import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { coachSettingsSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = (session.user as any).id

    let settings = await prisma.coachSettings.findUnique({ where: { coachId: userId } })

    if (!settings) {
      settings = await prisma.coachSettings.create({
        data: { coachId: userId },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania ustawień' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = coachSettingsSchema.parse(body)

    const settings = await prisma.coachSettings.upsert({
      where: { coachId: userId },
      update: validated,
      create: { coachId: userId, ...validated },
    })

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji ustawień' }, { status: 500 })
  }
}