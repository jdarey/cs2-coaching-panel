import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function coachId() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'COACH') return { error: NextResponse.json({ error: 'Brak dostępu' }, { status: 403 }) }
  return { id: user.id as string }
}

// GET: wpisy + podsumowanie (?month=YYYY-MM, domyślnie bieżący)
export async function GET(request: NextRequest) {
  const auth = await coachId()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')
  const now = new Date()
  const [y, m] = monthParam?.match(/^(\d{4})-(\d{2})$/)
    ? [Number(RegExp.$1), Number(RegExp.$2)]
    : [now.getFullYear(), now.getMonth() + 1]
  const from = new Date(y, m - 1, 1)
  const to = new Date(y, m, 1)

  const [entries, sums] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { coachId: auth.id, date: { gte: from, lt: to } },
      orderBy: { date: 'desc' },
      take: 200,
    }),
    prisma.financeEntry.groupBy({
      by: ['kind'],
      where: { coachId: auth.id, date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
  ])

  // Suma od początku (do ściągi podatkowej: limit działalności nierejestrowanej)
  const yearFrom = new Date(now.getFullYear(), 0, 1)
  const yearSums = await prisma.financeEntry.groupBy({
    by: ['kind'],
    where: { coachId: auth.id, date: { gte: yearFrom } },
    _sum: { amount: true },
  })

  const sum = (rows: typeof sums, kind: string) => rows.find((r) => r.kind === kind)?._sum.amount ?? 0
  return NextResponse.json({
    month: `${y}-${String(m).padStart(2, '0')}`,
    entries,
    summary: { income: sum(sums, 'INCOME'), expense: sum(sums, 'EXPENSE') },
    yearSummary: { income: sum(yearSums, 'INCOME'), expense: sum(yearSums, 'EXPENSE'), year: now.getFullYear() },
  })
}

const entrySchema = z.object({
  kind: z.enum(['INCOME', 'EXPENSE']),
  person: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  amountPln: z.number().positive().max(1000000),
  date: z.string().optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
})

// POST: nowy wpis (kwota w złotych, np. 149.99 — w bazie ląduje w groszach)
export async function POST(request: NextRequest) {
  const auth = await coachId()
  if (auth.error) return auth.error

  const body = await request.json()
  const parsed = entrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Sprawdź dane: osoba, tytuł i kwota (większa od 0)' }, { status: 400 })
  }
  const v = parsed.data

  const entry = await prisma.financeEntry.create({
    data: {
      coachId: auth.id,
      kind: v.kind,
      person: v.person,
      title: v.title,
      amount: Math.round(v.amountPln * 100),
      date: v.date ? new Date(v.date) : new Date(),
      note: v.note || null,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
