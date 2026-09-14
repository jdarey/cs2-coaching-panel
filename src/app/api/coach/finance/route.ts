import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { taxStatus, UNREGISTERED_MONTHLY_LIMIT_PLN, TAX_YEAR } from '@/lib/finance-tax'

export const dynamic = 'force-dynamic'

async function coachId() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'COACH') return { error: NextResponse.json({ error: 'Brak dostępu' }, { status: 403 }) }
  return { id: user.id as string }
}

// GET: wpisy + podsumowanie (?month=YYYY-MM, domyślnie bieżący; ?all=1 — całość)
export async function GET(request: NextRequest) {
  const auth = await coachId()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const showAll = searchParams.get('all') === '1'
  const monthParam = searchParams.get('month')
  const now = new Date()
  const [y, m] = monthParam?.match(/^(\d{4})-(\d{2})$/)
    ? [Number(RegExp.$1), Number(RegExp.$2)]
    : [now.getFullYear(), now.getMonth() + 1]
  const from = new Date(y, m - 1, 1)
  const to = new Date(y, m, 1)
  const range = showAll ? {} : { date: { gte: from, lt: to } }

  const [entries, sums] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { coachId: auth.id, ...range },
      orderBy: { date: 'desc' },
      take: showAll ? 2000 : 200,
    }),
    prisma.financeEntry.groupBy({
      by: ['kind'],
      where: { coachId: auth.id, ...range },
      _sum: { amount: true },
    }),
  ])

  // Suma od początku roku + rozbicie na miesiące (do statusu podatkowego)
  const yearFrom = new Date(now.getFullYear(), 0, 1)
  const yearSums = await prisma.financeEntry.groupBy({
    by: ['kind'],
    where: { coachId: auth.id, date: { gte: yearFrom } },
    _sum: { amount: true },
  })
  const yearEntries = await prisma.financeEntry.findMany({
    where: { coachId: auth.id, kind: 'INCOME', date: { gte: yearFrom } },
    select: { amount: true, date: true },
    take: 2000,
  })
  const byMonth = new Map<string, number>()
  for (const e of yearEntries) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, '0')}`
    byMonth.set(key, (byMonth.get(key) ?? 0) + e.amount)
  }
  const months: { month: string; income: number }[] = []
  byMonth.forEach((income, month) => {
    months.push({ month, income })
  })
  const yearIncome = yearEntries.reduce((s, e) => s + e.amount, 0)
  const status = taxStatus({ months, yearIncome })

  const sum = (rows: typeof sums, kind: string) => rows.find((r) => r.kind === kind)?._sum.amount ?? 0
  return NextResponse.json({
    month: `${y}-${String(m).padStart(2, '0')}`,
    entries,
    summary: { income: sum(sums, 'INCOME'), expense: sum(sums, 'EXPENSE') },
    yearSummary: { income: sum(yearSums, 'INCOME'), expense: sum(yearSums, 'EXPENSE'), year: now.getFullYear() },
    tax: {
      status,
      monthlyLimitPln: UNREGISTERED_MONTHLY_LIMIT_PLN,
      year: TAX_YEAR,
      worstMonth: months.reduce<{ month: string; income: number } | null>(
        (best, m) => (!best || m.income > best.income ? m : best),
        null,
      ),
    },
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
