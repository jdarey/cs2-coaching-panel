import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
  const action = searchParams.get('action')?.trim() || ''
  const actorId = searchParams.get('actorId')?.trim() || ''
  const targetId = searchParams.get('targetId')?.trim() || ''
  const dateFrom = searchParams.get('dateFrom')?.trim() || ''
  const dateTo = searchParams.get('dateTo')?.trim() || ''

  const where: any = {}
  if (action) where.action = action
  if (actorId) where.actorId = actorId
  if (targetId) where.targetId = targetId
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        targetId: true,
        targetType: true,
        details: true,
        ip: true,
        userAgent: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  // Pobierz emaile aktorów dla wyświetlenia
  const actorIds = Array.from(new Set(logs.map((l) => l.actorId)))
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true, name: true },
  })
  const actorMap = new Map(actors.map((a) => [a.id, a]))

  return NextResponse.json({
    logs: logs.map((l) => ({
      ...l,
      actor: actorMap.get(l.actorId) || { email: l.actorId, name: null },
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      actions: await prisma.auditLog.groupBy({ by: ['action'], _count: { action: true } }),
    },
  })
}