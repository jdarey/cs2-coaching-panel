import { infoCard } from '@/lib/email-layout'

// Przykładowe dane do testu i podglądu szablonów (żeby było widać każdą
// zmienną). Używane przez /api/admin/email-templates/test i .../preview.
export const SAMPLE_VARS: Record<string, any> = {
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

export const SAMPLE_BUTTON_URL: Record<string, string> = {
  'reset-password': 'https://twoja-strona.pl/reset-password?token=PRZYKLAD',
  'new-message': 'https://twoja-strona.pl/student/messages',
  invite: 'https://twoja-strona.pl/register?invite=PRZYKLAD',
  remind: 'https://twoja-strona.pl/student/dashboard',
  'reminder-overdue': 'https://twoja-strona.pl/coach/students/123',
  'reminder-due-tomorrow': 'https://twoja-strona.pl/student/tasks',
  'reminder-inactive': 'https://twoja-strona.pl/coach/students/123',
}
