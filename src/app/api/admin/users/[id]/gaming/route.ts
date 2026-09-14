import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// PUT: edycja kont gracza { faceitNickname?, steamId?, steamVanity? }.
// Pusty string czyści pole. Sam admin decyduje co wpisać — bez weryfikacji
// (Faceit zweryfikuje się sam przy "Pobierz ELO").
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ error: 'Nie znaleziono użytkownika' }, { status: 404 })
  }

  const body = await request.json()
  const clean = (v: any, max = 100) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      faceitNickname: clean(body?.faceitNickname),
      steamId: clean(body?.steamId),
      steamVanity: clean(body?.steamVanity),
    },
    select: { id: true, faceitNickname: true, steamId: true, steamVanity: true },
  })

  return NextResponse.json({ ok: true, gaming: updated })
}
