import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { TEMPLATE_DEFAULTS } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

// GET: lista szablonów (wiersz z bazy albo domyślny tekst z kodu)
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const rows = await prisma.emailTemplate.findMany()
  const byKey = new Map(rows.map((r) => [r.key, r]))

  const templates = Object.entries(TEMPLATE_DEFAULTS).map(([key, def]) => {
    const row = byKey.get(key)
    return {
      key,
      label: def.label,
      hint: def.hint,
      customized: !!row,
      updatedAt: row?.updatedAt ?? null,
      subject: row?.subject ?? def.subject,
      preheader: row?.preheader ?? def.preheader ?? '',
      badge: row?.badge ?? def.badge ?? '',
      title: row?.title ?? def.title,
      subtitle: row?.subtitle ?? def.subtitle ?? '',
      bodyHtml: row?.bodyHtml ?? def.bodyHtml,
      buttonLabel: row?.buttonLabel ?? def.buttonLabel ?? '',
      buttonNote: row?.buttonNote ?? def.buttonNote ?? '',
      footerNote: row?.footerNote ?? def.footerNote ?? '',
    }
  })

  return NextResponse.json({ templates })
}

// PUT: zapis szablonu { key, subject, preheader, badge, title, subtitle,
// bodyHtml, buttonLabel, buttonNote, footerNote }
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const body = await request.json()
  const key = typeof body?.key === 'string' ? body.key : ''
  if (!key || !TEMPLATE_DEFAULTS[key]) {
    return NextResponse.json({ error: 'Nieznany szablon' }, { status: 400 })
  }

  const str = (v: any) => (typeof v === 'string' ? v.slice(0, 20000) : '')
  const data = {
    subject: str(body.subject) || TEMPLATE_DEFAULTS[key].subject,
    preheader: str(body.preheader),
    badge: str(body.badge),
    title: str(body.title) || TEMPLATE_DEFAULTS[key].title,
    subtitle: str(body.subtitle),
    bodyHtml: str(body.bodyHtml) || TEMPLATE_DEFAULTS[key].bodyHtml,
    buttonLabel: str(body.buttonLabel),
    buttonNote: str(body.buttonNote),
    footerNote: str(body.footerNote),
  }

  const saved = await prisma.emailTemplate.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
  })

  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt })
}
