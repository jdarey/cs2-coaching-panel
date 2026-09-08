import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { consumePasswordResetToken } from '@/lib/password-reset'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body?.token === 'string' ? body.token : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!token) {
      return NextResponse.json({ error: 'Brakujący lub nieprawidłowy token' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Hasło musi mieć co najmniej 8 znaków' }, { status: 400 })
    }

    const userId = await consumePasswordResetToken(token)
    if (!userId) {
      return NextResponse.json({ error: 'Link wygasł lub został już użyty' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Wystąpił błąd serwera' }, { status: 500 })
  }
}
