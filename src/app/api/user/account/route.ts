import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'

// Fraza potwierdzająca usunięcie konta (wpisywana w UI — chroni przed
// przypadkowym klikiem i przed CSRF-owym podstępem).
// (Nie eksportujemy — Next.js wymaga, by route eksportował tylko handlery.)
const DELETE_CONFIRM_PHRASE = 'USUŃ KONTO'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const role = (session.user as any).role

    // Double opt-in: fraza + aktualne hasło (re-auth jak przy zmianie hasła).
    const body = await request.json().catch(() => null)
    if (body?.confirm !== DELETE_CONFIRM_PHRASE) {
      return NextResponse.json({ error: 'Wpisz frazę potwierdzającą' }, { status: 400 })
    }
    if (typeof body?.password !== 'string' || !body.password) {
      return NextResponse.json({ error: 'Podaj aktualne hasło' }, { status: 400 })
    }
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })
    if (!me?.passwordHash || !(await bcrypt.compare(body.password, me.passwordHash))) {
      return NextResponse.json({ error: 'Nieprawidłowe hasło' }, { status: 401 })
    }

    await prisma.$transaction(async (tx) => {
      if (isCoachRole(role)) {
        // Unlink students (CoachStudent relation uses Restrict by default)
        await tx.user.updateMany({
          where: { coachId: userId },
          data: { coachId: null },
        })
        // Delete the coach's videos and tags first (both use Restrict)
        await tx.video.deleteMany({ where: { coachId: userId } })
        await tx.tag.deleteMany({ where: { coachId: userId } })
      }

      // Sessions, notes, progress and coach settings cascade from here
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account DELETE error:', error)
    return NextResponse.json({ error: 'Błąd usuwania konta' }, { status: 500 })
  }
}
