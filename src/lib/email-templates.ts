import { prisma } from '@/lib/prisma'
import { emailLayout } from '@/lib/email-layout'

// Edytowalne treści maili. Admin zmienia je w /admin/emails (tabela
// EmailTemplate). Brak wiersza w bazie = DEFAULTS poniżej, więc panel działa
// też przed pierwszym zapisem. Zmienne {{nazwa}} podmieniane przy wysyłce;
// wartości są escapowane (HTML), poza kluczami z safeKeys.

export interface TemplateVars {
  [key: string]: string | number | null | undefined
}

interface TemplateDefault {
  label: string // nazwa w panelu admina
  hint: string // opis + lista zmiennych
  subject: string
  preheader?: string
  badge?: string
  title: string
  subtitle?: string
  bodyHtml: string
  buttonLabel?: string
  buttonNote?: string
  footerNote?: string
}

export const TEMPLATE_DEFAULTS: Record<string, TemplateDefault> = {
  'reset-password': {
    label: 'Reset hasła',
    hint: 'Mail z linkiem do nowego hasła. Zmienne: {{name}}, {{resetUrl}}',
    subject: 'Zresetuj hasło — CS2 Coaching',
    preheader: 'Ustaw nowe hasło — link ważny 1 godzinę',
    badge: 'Reset hasła',
    title: 'Cześć {{name}}, ustaw nowe hasło',
    subtitle: 'Dostałeś tę wiadomość, bo ktoś poprosił o reset hasła do Twojego konta. Dasz radę w mniej niż minutę — obiecujemy, że to prostsze niż clutch 1v3.',
    bodyHtml: `<p style="margin:0;">Kliknij wielki fioletowy przycisk poniżej i wpisz nowe hasło (min. 8 znaków). Link działa <strong style="color:#f4f6f7;">tylko 1 godzinę</strong> i tylko raz — potem wygasa dla Twojego bezpieczeństwa.</p>
<p style="margin:12px 0 0;">Po zmianie od razu zalogujesz się nowym hasłem i wrócisz do treningu. Powodzenia na serwerze!</p>`,
    buttonLabel: 'Ustaw nowe hasło →',
    buttonNote: 'Przycisk nie działa? Wklej poniższy link do przeglądarki.',
    footerNote: 'Nie prosiłeś o reset? Zignoruj tę wiadomość — Twoje hasło zostaje bez zmian, a link sam wygaśnie.',
  },
  'new-message': {
    label: 'Nowa wiadomość w czacie',
    hint: 'Powiadomienie o nowej wiadomości. Zmienne: {{senderName}}, {{snippet}}, {{chatUrl}}. Treść wiadomości wstawiana automatycznie (bezpieczna).',
    subject: '{{senderName}}: {{snippet}}',
    preheader: '{{senderName}}: {{snippet}}',
    badge: 'Nowa wiadomość',
    title: '{{senderName}} napisał do Ciebie',
    subtitle: 'Nie przegap — szybka odpowiedź trzyma trening w rytmie.',
    bodyHtml: '{{messageHtml}}',
    buttonLabel: 'Odpisz w czacie →',
  },
  invite: {
    label: 'Zaproszenie ucznia',
    hint: 'Mail z dostępem do platformy. Zmienne: {{coachName}}, {{inviteUrl}}',
    subject: 'Zaproszenie do panelu CS2 Coaching od {{coachName}}',
    preheader: 'Kupiłeś coaching u {{coachName}} — oto Twój dostęp do platformy',
    badge: 'Twój dostęp',
    title: 'Dzięki za zakup coachingu! Oto Twój dostęp',
    subtitle: 'Kupiłeś coaching u trenera {{coachName}}. Ten link to Twoje wejście na platformę — załóż konto i zacznij trenować już dziś.',
    bodyHtml: `<p style="margin:0;">Cześć! Trener <strong style="color:#f4f6f7;">{{coachName}}</strong> aktywował Ci dostęp do platformy CS2 Coaching. W środku czeka Twój wykupiony program:</p>
{{packageHtml}}
<p style="margin:0;">Założenie konta zajmie Ci mniej niż minutę. Do zobaczenia na serwerze!</p>`,
    buttonLabel: 'Aktywuj dostęp →',
    buttonNote: 'Link wygasa za 7 dni.',
  },
  remind: {
    label: 'Przypomnienie trenera (ręczne)',
    hint: 'Przycisk „Przypomnij" u trenera. Zmienne: {{studentName}}, {{coachName}}, {{taskCount}}, {{appUrl}}. Lista zadań wstawiana automatycznie.',
    subject: '{{coachName}} przypomina o treningu — {{taskCount}} zadań czeka',
    preheader: '{{coachName}} przypomina o treningu — {{taskCount}} zadań czeka',
    badge: 'Twój coaching',
    title: 'Cześć {{studentName}}, Twój coaching czeka!',
    subtitle: 'Trener {{coachName}} sprawdził Twój wykupiony plan i podrzuca rzeczy do nadrobienia. Wykorzystaj coaching w 100% — mały krok dziś to duży skok ELO jutro.',
    bodyHtml: '{{taskCardsHtml}}',
    buttonLabel: 'Otwórz panel ucznia →',
  },
  'reminder-overdue': {
    label: 'Auto: zadanie po terminie (do trenera)',
    hint: 'Cron, gdy uczeń spóźnia się z zadaniem. Zmienne: {{studentName}}, {{title}}, {{videoLine}}, {{dueDate}}, {{profileUrl}}',
    subject: 'Po terminie: {{title}} ({{studentName}})',
    preheader: '{{studentName}} spóźnia się z zadaniem',
    badge: 'Po terminie',
    title: 'Zadanie po terminie: {{title}}',
    subtitle: 'Warto napisać do ucznia — jedno zdanie potrafi uratować serię treningową.',
    bodyHtml: '{{detailsHtml}}',
    buttonLabel: 'Otwórz profil ucznia →',
  },
  'reminder-due-tomorrow': {
    label: 'Auto: termin jutro (do ucznia)',
    hint: 'Cron dzień przed terminem. Zmienne: {{studentName}}, {{title}}, {{videoLine}}, {{tasksUrl}}',
    subject: 'Jutro termin: {{title}} — dasz radę!',
    preheader: 'Jutro mija termin: {{title}}',
    badge: 'Jutro termin',
    title: 'Hej {{studentName}}, jutro termin!',
    subtitle: 'Wykorzystaj swój wykupiony coaching — jedno zadanie dziś wieczorem i seria uratowana.',
    bodyHtml: '{{detailsHtml}}<p style="margin:0;">Wejdź w zadania, odhacz je i idź spać ze spokojną głową.</p>',
    buttonLabel: 'Otwórz zadania →',
  },
  'reminder-inactive': {
    label: 'Auto: brak aktywności (do trenera)',
    hint: 'Cron, gdy uczeń nie trenuje. Zmienne: {{studentName}}, {{days}}, {{lastActivity}}, {{profileUrl}}',
    subject: '{{studentName}} nieaktywny od {{days}} dni',
    preheader: '{{studentName}} nie trenuje od {{days}} dni',
    badge: 'Brak aktywności',
    title: '{{studentName}} nie korzysta z coachingu od {{days}} dni',
    subtitle: 'Wykupiony program sam się nie zrobi — krótka wiadomość od trenera często wystarcza, żeby wrócić do gry.',
    bodyHtml: '{{detailsHtml}}',
    buttonLabel: 'Napisz do ucznia →',
  },
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fill(text: string | null | undefined, vars: TemplateVars, safeKeys: Set<string>): string {
  if (!text) return ''
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = vars[key]
    if (v == null) return ''
    const s = String(v)
    return safeKeys.has(key) ? s : escapeHtml(s)
  })
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface TemplateOverrides {
  subject?: string
  preheader?: string
  badge?: string
  title?: string
  subtitle?: string
  bodyHtml?: string
  buttonLabel?: string
  buttonNote?: string
  footerNote?: string
}

export async function renderEmail(
  key: string,
  vars: TemplateVars,
  opts: { buttonUrl?: string; rawUrl?: string; safeKeys?: string[] } = {},
  overrides?: TemplateOverrides,
): Promise<{ subject: string; html: string; text: string }> {
  const def = TEMPLATE_DEFAULTS[key]
  if (!def) throw new Error(`Nieznany szablon maila: ${key}`)

  const row = await prisma.emailTemplate.findUnique({ where: { key } }).catch(() => null)
  const pick = (field: keyof TemplateOverrides, fallback: string): string => {
    const o = overrides?.[field]
    if (typeof o === 'string') return o
    const db = row?.[field as keyof typeof row]
    if (typeof db === 'string') return db
    return fallback
  }
  const tpl = {
    subject: pick('subject', def.subject),
    preheader: pick('preheader', def.preheader ?? ''),
    badge: pick('badge', def.badge ?? ''),
    title: pick('title', def.title),
    subtitle: pick('subtitle', def.subtitle ?? ''),
    bodyHtml: pick('bodyHtml', def.bodyHtml),
    buttonLabel: pick('buttonLabel', def.buttonLabel ?? ''),
    buttonNote: pick('buttonNote', def.buttonNote ?? ''),
    footerNote: pick('footerNote', def.footerNote ?? ''),
  }

  const safe = new Set(opts.safeKeys ?? [])
  const subject = fill(tpl.subject, vars, safe)
  const title = fill(tpl.title, vars, safe)
  const bodyHtml = fill(tpl.bodyHtml, vars, safe)
  const button = tpl.buttonLabel && opts.buttonUrl ? { label: fill(tpl.buttonLabel, vars, safe), url: opts.buttonUrl } : undefined

  const { html } = emailLayout({
    preheader: fill(tpl.preheader, vars, safe) || undefined,
    badge: fill(tpl.badge, vars, safe) || undefined,
    title,
    subtitle: fill(tpl.subtitle, vars, safe) || undefined,
    bodyHtml,
    button,
    buttonNote: fill(tpl.buttonNote, vars, safe) || undefined,
    rawUrl: opts.rawUrl,
    footerNote: fill(tpl.footerNote, vars, safe) || undefined,
  })

  const textParts = [title, stripHtml(fill(tpl.subtitle, vars, safe)), stripHtml(bodyHtml)]
  if (opts.buttonUrl) textParts.push(`${stripHtml(fill(tpl.buttonLabel, vars, safe))}: ${opts.buttonUrl}`.trim())
  if (opts.rawUrl && opts.rawUrl !== opts.buttonUrl) textParts.push(opts.rawUrl)
  const text = textParts.filter(Boolean).join('\n\n')

  return { subject, html, text }
}

// Czy cron ma wysyłać dany typ maila? Brak wiersza = włączone (domyślnie).
export async function isTemplateEnabled(key: string): Promise<boolean> {
  const row = await prisma.emailTemplate.findUnique({ where: { key }, select: { enabled: true } }).catch(() => null)
  return row?.enabled ?? true
}

// Szablony wysyłane automatycznie przez crona (te mają włącznik w panelu).
export const AUTO_TEMPLATE_KEYS = ['reminder-overdue', 'reminder-due-tomorrow', 'reminder-inactive']
