import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { renderEmail } from '@/lib/email-templates'
import { SAMPLE_VARS, SAMPLE_BUTTON_URL } from '../test/route'

export const dynamic = 'force-dynamic'

// POST { key, subject?, preheader?, badge?, title?, subtitle?, bodyHtml?,
// buttonLabel?, buttonNote?, footerNote? }: renderuje podgląd maila z roboczej
// (niezapisanej) treści. Nic nie wysyła, nic nie zapisuje.
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const body = await request.json()
  const key = typeof body?.key === 'string' ? body.key : ''
  if (!SAMPLE_VARS[key]) {
    return NextResponse.json({ error: 'Nieznany szablon' }, { status: 400 })
  }

  const str = (v: any) => (typeof v === 'string' ? v.slice(0, 20000) : undefined)
  const { subject, html } = await renderEmail(
    key,
    SAMPLE_VARS[key],
    {
      buttonUrl: SAMPLE_BUTTON_URL[key],
      rawUrl: key === 'reset-password' ? SAMPLE_BUTTON_URL[key] : undefined,
      safeKeys: ['messageHtml', 'packageHtml', 'taskCardsHtml', 'detailsHtml'],
    },
    {
      subject: str(body.subject),
      preheader: str(body.preheader),
      badge: str(body.badge),
      title: str(body.title),
      subtitle: str(body.subtitle),
      bodyHtml: str(body.bodyHtml),
      buttonLabel: str(body.buttonLabel),
      buttonNote: str(body.buttonNote),
      footerNote: str(body.footerNote),
    },
  )
  return NextResponse.json({ subject, html })
}
