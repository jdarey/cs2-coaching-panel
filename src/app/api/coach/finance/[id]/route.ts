import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const entrySchema = z.object({
  kind: z.enum(['INCOME', 'EXPENSE']),
  person: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  amountPln: z.number().positive().max(1000000),
  date: z.string().optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
})

async function ownEntry(userId: string, id: string) {
  return prisma.financeEntry.findFirst({
    where: { id, coachId: userId },
    select: { id: true },
  })
}

function badDate(v: string | null | undefined): boolean {
  if (!v) return false
  return Number.isNaN(new Date(v).getTime())
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id || user.role !== 'COACH') {
      return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
    }

    const entry = await ownEntry(user.id, params.id)
    if (!entry) {
      return NextResponse.json({ error: 'Nie znaleziono wpisu' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = entrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Sprawdź dane: osoba, tytuł i kwota (większa od 0)' }, { status: 400 })
    }
    const v = parsed.data
    if (badDate(v.date)) {
      return NextResponse.json({ error: 'Nieprawidłowa data' }, { status: 400 })
    }

    const updated = await prisma.financeEntry.update({
      where: { id: params.id },
      data: {
        kind: v.kind,
        person: v.person,
        title: v.title,
        amount: Math.round(v.amountPln * 100),
        date: v.date ? new Date(v.date) : undefined,
        note: v.note || null,
      },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Błąd zapisu wpisu' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id || user.role !== 'COACH') {
      return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
    }

    const entry = await ownEntry(user.id, params.id)
    if (!entry) {
      return NextResponse.json({ error: 'Nie znaleziono wpisu' }, { status: 404 })
    }

    await prisma.financeEntry.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Błąd usuwania wpisu' }, { status: 500 })
  }
}
