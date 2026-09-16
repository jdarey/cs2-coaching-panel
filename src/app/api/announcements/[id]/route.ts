import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isCoachRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || !isCoachRole(user.role)) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const existing = await prisma.announcement.findFirst({
    where: { id: params.id, coachId: user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Nie znaleziono ogłoszenia' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const data: { pinned?: boolean; title?: string; content?: string } = {}
  if (typeof body?.pinned === 'boolean') data.pinned = body.pinned
  else if (body && !('title' in body) && !('content' in body)) data.pinned = !existing.pinned
  if (typeof body?.title === 'string' && body.title.trim()) {
    if (body.title.trim().length > 200) {
      return NextResponse.json({ error: 'Tytuł max 200 znaków' }, { status: 400 })
    }
    data.title = body.title.trim()
  }
  if (typeof body?.content === 'string' && body.content.trim()) {
    if (body.content.trim().length > 5000) {
      return NextResponse.json({ error: 'Treść max 5000 znaków' }, { status: 400 })
    }
    data.content = body.content.trim()
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Brak zmian' }, { status: 400 })
  }

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json({ announcement: { ...updated, createdAt: updated.createdAt.toISOString() } })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || !isCoachRole(user.role)) {
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
