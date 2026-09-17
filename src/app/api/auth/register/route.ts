import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { registerSchema } from '@/lib/validations'
import { getStarterRoutine } from '@/lib/starter-routine'

/**
 * Dzień 0 bez pustki: każdy nowy uczeń dostaje od razu rutynę startową
 * "Pierwsze 7 dni" (BEGINNER). Research: obietnica landing page'a to
 * "klikasz Start i masz plan" — pusty panel w dniu 0 to najdroższe miejsce
 * na churn. Best-effort: błąd nie blokuje rejestracji.
 */
async function assignStarterRoutine(studentId: string) {
  const def = getStarterRoutine('BEGINNER')
  const routine = await prisma.routine.create({
    data: {
      coachId: studentId,
      title: def.title,
      description: def.description,
      level: 'BEGINNER',
      isStarterRoutine: true,
      recurring: false,
      tasks: {
        create: def.tasks.map((t, i) => ({
          title: t.title,
          description: t.description,
          minutes: t.minutes,
          day: i + 1,
          order: i,
        })),
      },
    },
  })
  await prisma.routineAssignment.create({
    // coachId = uczeń (rutyna systemowa, bez trenera — autor to sam system)
    data: { routineId: routine.id, studentId, coachId: studentId },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inviteToken, coachInviteCode, ...registrationData } = body
    const validated = registerSchema.parse(registrationData)

    // Rejestracja publiczna zakłada ZAWSZE konto ucznia. Konto trenera
    // powstaje tylko z osobistym kodem właściciela (COACH_INVITE_CODE).
    let role: 'COACH' | 'STUDENT' = 'STUDENT'
    if (validated.role === 'COACH') {
      const secret = process.env.COACH_INVITE_CODE
      if (!secret || coachInviteCode !== secret) {
        return NextResponse.json({ error: 'Konta trenerów zakładam osobiście — skontaktuj się z właścicielem po kod.' }, { status: 403 })
      }
      role = 'COACH'
    }

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
        role,
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

    // Uczeń startuje z gotowym planem od pierwszej minuty (dzień 0 zamyka się).
    if (role === 'STUDENT') {
      try {
        await assignStarterRoutine(user.id)
      } catch (starterError) {
        console.error('Starter routine auto-assign failed:', starterError)
      }
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