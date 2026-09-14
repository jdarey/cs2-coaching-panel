import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// GET: eksport logów audytu do CSV
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')?.trim() || ''
  const actorId = searchParams.get('actorId')?.trim() || ''
  const targetId = searchParams.get('targetId')?.trim() || ''
  const dateFrom = searchParams.get('dateFrom')?.trim() || ''
  const dateTo = searchParams.get('dateTo')?.trim() || ''
  const limit = Math.min(10000, Math.max(1, parseInt(searchParams.get('limit') || '5000')))

  const where: any = {}
  if (action) where.action = action
  if (actorId) where.actorId = actorId
  if (targetId) where.targetId = targetId
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Pobierz emaile aktorów
  const actorIds = Array.from(new Set(logs.map((l) => l.actorId)))
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true, name: true },
  })
  const actorMap = new Map(actors.map((a) => [a.id, a]))

  const esc = (v: any): string => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const header = ['Data', 'Akcja', 'Aktor (email)', 'Aktor (nazwa)', 'Rola aktora', 'Typ obiektu', 'ID obiektu', 'Szczegóły (JSON)', 'IP', 'User Agent'].join(';')
  const lines = logs.map((l) => {
    const actor = actorMap.get(l.actorId)
    return [
      esc(new Date(l.createdAt).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' })),
      esc(l.action),
      esc(actor?.email || l.actorId),
      esc(actor?.name || ''),
      esc(l.actorRole),
      esc(l.targetType || ''),
      esc(l.targetId || ''),
      esc(JSON.stringify(l.details || {})),
      esc(l.ip || ''),
      esc(l.userAgent || ''),
    ].join(';')
  })

  const csv = '﻿' + [header, ...lines].join('\r\n')
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs-${date}.csv"`,
    },
  })
}