import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { fetchFaceitLegacy } from '@/lib/gaming'

export const dynamic = 'force-dynamic'

// POST: pobierz live ELO z Faceit dla ucznia i dopisz punkt trajektorii.
// Klikane ręcznie przez admina (np. zaraz po wpisaniu nicka).
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, faceitNickname: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
  }
  if (!user.faceitNickname) {
    return NextResponse.json({ error: 'Uczeń nie ma wpisnego nicku Faceit' }, { status: 400 })
  }

  const live = await fetchFaceitLegacy(user.faceitNickname)
  if (!live || typeof live.elo !== 'number') {
    return NextResponse.json({ error: `Nie znaleziono gracza „${user.faceitNickname}" na Faceit (sprawdź nick)'` }, { status: 404 })
  }

  // Nie dubluj: jak ostatni wpis ma to samo ELO, tylko zwróć wartość.
  const last = await prisma.rankEntry.findFirst({
    where: { studentId: user.id, mode: 'FACEIT' },
    orderBy: { recordedAt: 'desc' },
    select: { elo: true },
  })

  let saved = false
  if (last?.elo !== live.elo) {
    await prisma.rankEntry.create({
      data: {
        studentId: user.id,
        mode: 'FACEIT',
        rank: `${live.elo} ELO`,
        elo: live.elo,
        source: 'FACEIT_LIVE',
        note: 'Pobrano przez admina',
      },
    })
    saved = true
  }

  return NextResponse.json({ ok: true, elo: live.elo, level: live.skillLevel, saved })
}
