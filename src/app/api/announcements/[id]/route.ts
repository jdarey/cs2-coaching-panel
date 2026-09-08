import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const existing = await prisma.announcement.findFirst({
    where: { id: params.id, coachId: user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Nie znaleziono ogłoszenia' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const pinned = typeof body?.pinned === 'boolean' ? body.pinned : !existing.pinned

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: { pinned },
  })

  return NextResponse.json({ announcement: { ...updated, createdAt: updated.createdAt.toISOString() } })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const existing = await prisma.announcement.findFirst({
    where: { id: params.id, coachId: user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Nie znaleziono ogłoszenia' }, { status: 404 })
  }

  await prisma.announcement.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
