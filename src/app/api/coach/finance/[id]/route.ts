import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const entry = await prisma.financeEntry.findFirst({
    where: { id: params.id, coachId: user.id },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json({ error: 'Nie znaleziono wpisu' }, { status: 404 })
  }

  await prisma.financeEntry.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
