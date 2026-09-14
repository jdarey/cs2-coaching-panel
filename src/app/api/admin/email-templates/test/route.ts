import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ADMIN_EMAIL } from '@/lib/admin'
import { sendEmail } from '@/lib/mail'
import { renderEmail } from '@/lib/email-templates'
import { SAMPLE_VARS, SAMPLE_BUTTON_URL } from '@/lib/email-test-samples'

export const dynamic = 'force-dynamic'

// POST { key }: wyślij test szablonu na adres admina (1 mail z limitu).
export async function POST(request: NextRequest) {
  let admin: { email?: string | null }
  try {
    admin = await requireAdmin()
  } catch (e) {
    return e as Response
  }

  const body = await request.json()
  const key = typeof body?.key === 'string' ? body.key : ''
  if (!SAMPLE_VARS[key]) {
    return NextResponse.json({ error: 'Nieznany szablon' }, { status: 400 })
  }

  const to = admin.email || ADMIN_EMAIL
  const { subject, html, text } = await renderEmail(
    key,
    SAMPLE_VARS[key],
    {
      buttonUrl: SAMPLE_BUTTON_URL[key],
      rawUrl: key === 'reset-password' ? SAMPLE_BUTTON_URL[key] : undefined,
      safeKeys: ['messageHtml', 'packageHtml', 'taskCardsHtml', 'detailsHtml'],
    },
  )
  const result = await sendEmail({ to, subject: `[TEST] ${subject}`, html, text })
  return NextResponse.json({ ok: result.ok, to })
}
