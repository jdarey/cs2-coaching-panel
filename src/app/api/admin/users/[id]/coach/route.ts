import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// PUT: przepisz ucznia do innego trenera { coachId: string | null }.
// null = bez trenera. Historia (sesje, ELO, mecze) zostaje — zmienia się
// tylko bieżące przypisanie.
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, coachId: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
  }
  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Trenera można zmienić tylko uczniowi' }, { status: 400 })
  }

  const body = await request.json()
  const coachId = typeof body?.coachId === 'string' && body.coachId ? body.coachId : null

  if (coachId) {
    const coach = await prisma.user.findUnique({ where: { id: coachId }, select: { id: true, role: true } })
    if (!coach || (coach.role !== 'COACH' && coach.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Wybrany użytkownik nie jest trenerem' }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { coachId },
    select: { id: true, coachId: true, coach: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ ok: true, coach: updated.coach })
}
