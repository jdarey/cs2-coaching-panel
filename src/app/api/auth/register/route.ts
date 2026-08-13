import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inviteToken, ...registrationData } = body
    const validated = registerSchema.parse(registrationData)

    // If invite token provided, validate it
    let invite: { coachId: string; email: string; usedAt: Date | null; expiresAt: Date } | null = null
    if (inviteToken) {
      invite = await prisma.studentInvite.findUnique({
        where: { token: inviteToken },
        select: { coachId: true, email: true, usedAt: true, expiresAt: true },
      })

      if (!invite) {
        return NextResponse.json({ error: 'Nieprawidłowy token zaproszenia' }, { status: 400 })
      }
      if (invite.usedAt) {
        return NextResponse.json({ error: 'To zaproszenie zostało już wykorzystane' }, { status: 400 })
      }
      if (invite.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Token zaproszenia wygasł' }, { status: 400 })
      }
      // Ensure email matches invite
      if (invite.email !== validated.email) {
        return NextResponse.json({ error: 'Email nie zgadza się z zaproszeniem' }, { status: 400 })
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Użytkownik o tym emailu już istnieje' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(validated.password, 12)

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        name: validated.name,
        role: validated.role,
        // Associate with coach if invite provided
        coachId: invite?.coachId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Mark invite as used
    if (inviteToken) {
      await prisma.studentInvite.update({
        where: { token: inviteToken },
        data: { usedAt: new Date() },
      })
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Nieprawidłowe dane', details: error }, { status: 400 })
    }
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Wystąpił błąd podczas rejestracji' }, { status: 500 })
  }
}