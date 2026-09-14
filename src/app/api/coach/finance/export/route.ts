import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: eksport wszystkich wpisów do CSV (Excel-friendly, BOM + średniki).
export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id || user.role !== 'COACH') {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 })
  }

  const entries = await prisma.financeEntry.findMany({
    where: { coachId: user.id },
    orderBy: { date: 'asc' },
    take: 5000,
  })

  const esc = (v: any): string => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const fmtDate = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
  const fmtPln = (grosze: number) => (grosze / 100).toFixed(2).replace('.', ',')

  const header = ['Data', 'Typ', 'Osoba', 'Tytul', 'Kwota PLN', 'Notatka'].join(';')
  const lines = entries.map((e) =>
    [
      esc(fmtDate(new Date(e.date))),
      esc(e.kind === 'INCOME' ? 'Wplyw' : 'Wydatek'),
      esc(e.person),
      esc(e.title),
      esc(fmtPln(e.amount)),
      esc(e.note),
    ].join(';'),
  )

  const csv = '﻿' + [header, ...lines].join('\r\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="finanse-${date}.csv"`,
    },
  })
}
