import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Obecne hasło jest wymagane'),
  newPassword: z.string().min(6, 'Nowe hasło musi mieć minimum 6 znaków'),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const validated = passwordSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })

    if (!user?.passwordHash) {
      return NextResponse.json({ error: 'Konto nie ma ustawionego hasła (logowanie OAuth)' }, { status: 400 })
    }

    const isValid = await bcrypt.compare(validated.currentPassword, user.passwordHash)

    if (!isValid) {
      return NextResponse.json({ error: 'Nieprawidłowe obecne hasło' }, { status: 400 })
    }

    const newPasswordHash = await bcrypt.hash(validated.newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Password PUT error:', error)
    return NextResponse.json({ error: 'Błąd zmiany hasła' }, { status: 500 })
  }
}