import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { normalizeAccessCode } from '@/lib/access-codes'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  code: z.string().min(6).max(32),
})

/**
 * Aktywacja kodu dostępu do produktu (rutyna CS2: film + tekst na ćwiczenie).
 *
 * Transakcja:
 * 1. kod istnieje i jest niewykorzystany (atomic updateMany = race-safe),
 * 2. właściciel produktu = konto z ADMIN_EMAIL (tam budowana jest rutyna),
 * 3. przypisanie rutyny produktowej (isProductRoutine) do konta kupującego,
 * 4. rutyna startowa (darmowa) zostaje zdjęta, by nie konkurowała o uwagę.
 *
 * Idempotentne: ponowna aktywacja TEGO SAMEGO kodu przez TEGO SAMEGO
 * użytkownika zwraca ok (klient może odświeżyć stronę).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const role = (session.user as any).role
    if (role !== 'STUDENT') {
      return NextResponse.json({ error: 'Kod aktywuje konto ucznia' }, { status: 403 })
    }
    const userId = (session.user as any).id

    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.parse(body ?? {})
    const code = normalizeAccessCode(parsed.code)

    // Właściciel produktu — jedyny admin. Rutyna produktowa żyje na jego koncie.
    const { ADMIN_EMAIL } = await import('@/lib/roles')
    if (!ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Produkt skonfigurowany błędnie (brak ADMIN_EMAIL)' }, { status: 500 })
    }
    const owner = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } })
    if (!owner) {
      return NextResponse.json({ error: 'Produkt skonfigurowany błędnie (brak konta właściciela)' }, { status: 500 })
    }

    const productRoutine = await prisma.routine.findFirst({
      where: { isProductRoutine: true, coachId: owner.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    })
    if (!productRoutine) {
      return NextResponse.json({ error: 'Produkt nie jest jeszcze dostępny — skontaktuj się z nami' }, { status: 503 })
    }

    // Race-safe: updateMany podbija tylko, gdy kod wciąż jest wolny LUB już
    // nasz (idempotencja). Wskazówka: używamy dwóch przebiegów zamiast
    // jednego warunku, żeby rozróżnić komunikaty bez enumeracji kodów.
    const existing = await prisma.accessCode.findUnique({ where: { code } })
    if (!existing) {
      return NextResponse.json({ error: 'Nieprawidłowy kod — sprawdź i spróbuj ponownie' }, { status: 404 })
    }
    if (existing.usedById && existing.usedById !== userId) {
      return NextResponse.json({ error: 'Ten kod został już wykorzystany' }, { status: 409 })
    }

    const claimed = await prisma.accessCode.updateMany({
      where: { code, OR: [{ usedById: null }, { usedById: userId }] },
      data: { usedById: userId, usedAt: new Date() },
    })
    if (claimed.count === 0) {
      return NextResponse.json({ error: 'Ten kod został już wykorzystany' }, { status: 409 })
    }

    const assignment = await prisma.$transaction(async (tx) => {
      // Rutyna produktowa na NOWO (idempotentnie: jedna żywotna)
      const alreadyActive = await tx.routineAssignment.findFirst({
        where: { studentId: userId, status: 'ACTIVE', routine: { isProductRoutine: true } },
        select: { id: true },
      })
      let productAssignmentId = alreadyActive?.id ?? null
      if (!productAssignmentId) {
        const created = await tx.routineAssignment.create({
          data: {
            routineId: productRoutine.id,
            studentId: userId,
            coachId: owner.id,
          },
          select: { id: true },
        })
        productAssignmentId = created.id
      }

      // Darmowa rutyna startowa konkurowałaby o uwagę — zdejmujemy ją,
      // gdy gracz właśnie kupił pełny produkt. Historia zostaje.
      await tx.routineAssignment.updateMany({
        where: { studentId: userId, status: 'ACTIVE', routine: { isStarterRoutine: true } },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      return productAssignmentId
    })

    return NextResponse.json({ ok: true, assignmentId: assignment })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Wpisz kod w formacie CS2-XXXX-XXXX' }, { status: 400 })
    }
    console.error('Access code redeem error:', error)
    return NextResponse.json({ error: 'Nie udało się aktywować kodu — spróbuj ponownie' }, { status: 500 })
  }
}
