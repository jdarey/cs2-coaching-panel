import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// GET: lista flag
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: 'asc' },
  })

  return NextResponse.json({ flags })
}

// POST: tworzenie nowej flagi
export async function POST(request: NextRequest) {
  let admin: { id: string; role: string }
  try {
    admin = await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const body = await request.json()
  const key = typeof body?.key === 'string' ? body.key.trim().toLowerCase() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const enabled = body?.enabled === true

  if (!key || !/^[a-z0-9_]+$/.test(key)) {
    return NextResponse.json({ error: 'Klucz musi zawierać tylko małe litery, cyfry i podkreślenia' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'Nazwa jest wymagana' }, { status: 400 })
  }

  const existing = await prisma.featureFlag.findUnique({ where: { key } })
  if (existing) {
    return NextResponse.json({ error: 'Flaga o tym kluczu już istnieje' }, { status: 400 })
  }

  const flag = await prisma.featureFlag.create({
    data: { key, name, description: description || null, enabled },
  })

  await audit.featureFlagToggled(admin.id, admin.role, flag.key, flag.enabled)

  return NextResponse.json({ flag }, { status: 201 })
}

// PUT: aktualizacja flagi (włącz/wyłącz, zmiana nazwy/opisu)
export async function PUT(request: NextRequest) {
  let admin: { id: string; role: string }
  try {
    admin = await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const body = await request.json()
  const key = typeof body?.key === 'string' ? body.key.trim().toLowerCase() : ''
  if (!key) {
    return NextResponse.json({ error: 'Klucz jest wymagany' }, { status: 400 })
  }

  const flag = await prisma.featureFlag.findUnique({ where: { key } })
  if (!flag) {
    return NextResponse.json({ error: 'Nie znaleziono flagi' }, { status: 404 })
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : flag.name
  const description = typeof body?.description === 'string' ? body.description.trim() : flag.description
  const enabled = typeof body?.enabled === 'boolean' ? body.enabled : flag.enabled

  const updated = await prisma.featureFlag.update({
    where: { key },
    data: { name, description: description || null, enabled },
  })

  if (enabled !== flag.enabled) {
    await audit.featureFlagToggled(admin.id, admin.role, key, enabled)
  }

  return NextResponse.json({ flag: updated })
}

// DELETE: usunięcie flagi
export async function DELETE(request: NextRequest) {
  let admin: { id: string; role: string }
  try {
    admin = await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')?.trim().toLowerCase() || ''

  if (!key) {
    return NextResponse.json({ error: 'Klucz jest wymagany' }, { status: 400 })
  }

  const flag = await prisma.featureFlag.findUnique({ where: { key } })
  if (!flag) {
    return NextResponse.json({ error: 'Nie znaleziono flagi' }, { status: 404 })
  }

  await prisma.featureFlag.delete({ where: { key } })

  return NextResponse.json({ ok: true })
}