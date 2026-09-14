import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// GET: eksport wszystkich użytkowników do CSV (Excel-friendly, BOM + średniki).
// Kolumny: email, nazwa, rola, trener, faceit, steam, ostatnia aktywność,
// utworzono, sesje.
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true,
      faceitNickname: true,
      steamId: true,
      steamVanity: true,
      lastActiveAt: true,
      createdAt: true,
      coach: { select: { email: true } },
      _count: { select: { sessionsAsStudent: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 5000,
  })

  const esc = (v: any): string => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const fmtDate = (d: Date | null) =>
    d ? new Date(d).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }) : ''

  const header = ['Email', 'Nazwa', 'Rola', 'Trener', 'Faceit', 'SteamID', 'SteamVanity', 'Ostatnia aktywnosc', 'Utworzono', 'Sesje'].join(';')
  const lines = users.map((u) =>
    [
      esc(u.email),
      esc(u.name),
      esc(u.role),
      esc(u.coach?.email),
      esc(u.faceitNickname),
      esc(u.steamId),
      esc(u.steamVanity),
      esc(fmtDate(u.lastActiveAt)),
      esc(fmtDate(u.createdAt)),
      esc(u._count.sessionsAsStudent),
    ].join(';'),
  )

  const csv = '﻿' + [header, ...lines].join('\r\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="uczniowie-${date}.csv"`,
    },
  })
}
