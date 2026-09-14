import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, ADMIN_EMAIL } from '@/lib/admin'
import { sendEmail } from '@/lib/mail'
import { renderEmail } from '@/lib/email-templates'
import { infoCard } from '@/lib/email-layout'

export const dynamic = 'force-dynamic'

// POST { key }: wyślij test szablonu na adres admina (1 mail z limitu).
// Przykładowe dane, żeby było widać każdą zmienną.
const SAMPLE_VARS: Record<string, any> = {
  'reset-password': { name: 'Darey', resetUrl: 'https://twoja-strona.pl/reset-password?token=PRZYKLAD' },
  'new-message': {
    senderName: 'Trener',
    snippet: 'Świetna robota na wczorajszym treningu…',
    chatUrl: 'https://twoja-strona.pl/student/messages',
    messageHtml: '<div style="margin:0; padding:16px 18px; border-radius:14px; background:#14161c; border:1px solid rgba(255,255,255,0.08); border-left:3px solid #a78bfa; line-height:1.7;">Świetna robota na wczorajszym treningu! Tak trzymaj.</div>',
  },
  invite: {
    coachName: 'Darey',
    inviteUrl: 'https://twoja-strona.pl/register?invite=PRZYKLAD',
    packageHtml: infoCard('Twój pakiet', ['Biblioteka filmów treningowych', 'Sesje 1:1 z trenerem i demo-review']),
  },
  remind: {
    studentName: ' Darey',
    coachName: 'Trener',
    taskCount: 3,
    appUrl: 'https://twoja-strona.pl',
    taskCardsHtml: infoCard('Twoje zadania', ['Obejrzyj film o peekowaniu', 'Zagraj 2 DM-y']),
  },
  'reminder-overdue': {
    studentName: 'uczen@test.pl',
    title: 'Obejrzyj film o peekowaniu',
    videoLine: 'Peekowanie — podstawy',
    dueDate: '12.09.2026',
    profileUrl: 'https://twoja-strona.pl/coach/students/123',
    detailsHtml: infoCard('Szczegóły', ['Uczeń: <strong style="color:#f4f6f7;">uczen@test.pl</strong>', 'Zadanie: <strong style="color:#f4f6f7;">Obejrzyj film o peekowaniu</strong>']),
  },
  'reminder-due-tomorrow': {
    studentName: 'Darey',
    title: 'Obejrzyj film o peekowaniu',
    videoLine: 'Peekowanie — podstawy',
    tasksUrl: 'https://twoja-strona.pl/student/tasks',
    detailsHtml: infoCard('Twoje zadanie', ['<strong style="color:#f4f6f7;">Obejrzyj film o peekowaniu</strong>']),
  },
  'reminder-inactive': {
    studentName: 'uczen@test.pl',
    days: 5,
    lastActivity: '07.09.2026',
    profileUrl: 'https://twoja-strona.pl/coach/students/123',
    detailsHtml: infoCard('Uczeń', ['<strong style="color:#f4f6f7;">uczen@test.pl</strong>', 'Ostatnia aktywność: 07.09.2026']),
  },
}

const SAMPLE_BUTTON_URL: Record<string, string> = {
  'reset-password': 'https://twoja-strona.pl/reset-password?token=PRZYKLAD',
  'new-message': 'https://twoja-strona.pl/student/messages',
  invite: 'https://twoja-strona.pl/register?invite=PRZYKLAD',
  remind: 'https://twoja-strona.pl/student/dashboard',
  'reminder-overdue': 'https://twoja-strona.pl/coach/students/123',
  'reminder-due-tomorrow': 'https://twoja-strona.pl/student/tasks',
  'reminder-inactive': 'https://twoja-strona.pl/coach/students/123',
}

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
