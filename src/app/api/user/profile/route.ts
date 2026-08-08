import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = profileSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: userId },
      data: validated,
      select: { id: true, email: true, name: true, avatarUrl: true, role: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Profile PUT error:', error)
    return NextResponse.json({ error: 'Błąd aktualizacji profilu' }, { status: 500 })
  }
}