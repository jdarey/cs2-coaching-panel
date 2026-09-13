// Wspólny layout maili — 1:1 ze stylem strony (dark glass + fiolet).
// Wszystkie maile przechodzą przez tę funkcję, więc wyglądają identycznie:
// nagłówek z logo, tytuł, treść, fioletowy CTA, stopka. Table-based, inline
// style — działa w Gmail/Outlook/Apple Mail.

const ACCENT = '#a78bfa'
const ACCENT_DARK = '#6d28d9'
const BG = '#0a0c0e'
const CARD = '#14161c'
const TEXT = '#f4f6f7'
const MUTED = 'rgba(244,246,247,0.6)'
const FAINT = 'rgba(244,246,247,0.35)'

export interface EmailButton {
  label: string
  url: string
}

export function emailLayout(opts: {
  preheader?: string
  badge?: string
  title: string
  subtitle?: string
  bodyHtml: string
  button?: EmailButton
  buttonNote?: string
  footerNote?: string
}): { html: string } {
  const { preheader, badge, title, subtitle, bodyHtml, button, buttonNote, footerNote } = opts

  const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#060709; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#060709; padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%; background-color:${BG}; border:1px solid rgba(255,255,255,0.08); border-radius:20px; overflow:hidden;">
  <tr><td style="padding:28px 28px 0; text-align:center;">
    <div style="display:inline-block; width:48px; height:48px; line-height:48px; border-radius:14px; background:linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%); font-size:22px; font-weight:800; color:#ffffff;">C</div>
    <p style="margin:10px 0 0; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${FAINT};">CS2 Coaching</p>
  </td></tr>
  <tr><td style="padding:20px 28px 0;">
    ${badge ? `<p style="margin:0 0 8px; display:inline-block; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:${ACCENT}; background:${ACCENT}1a; border:1px solid ${ACCENT}40; border-radius:999px; padding:5px 12px;">${escapeHtml(badge)}</p>` : ''}
    <h1 style="margin:0; font-size:22px; line-height:1.3; font-weight:800; color:${TEXT};">${escapeHtml(title)}</h1>
    ${subtitle ? `<p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:${MUTED};">${escapeHtml(subtitle)}</p>` : ''}
  </td></tr>
  <tr><td style="padding:16px 28px 0; font-size:14px; line-height:1.7; color:${MUTED};">
    ${bodyHtml}
  </td></tr>
  ${button ? `<tr><td style="padding:24px 28px 0; text-align:center;">
    <a href="${button.url}" style="display:inline-block; padding:14px 32px; border-radius:14px; background:linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none;">${escapeHtml(button.label)}</a>
    ${buttonNote ? `<p style="margin:12px 0 0; font-size:12px; color:${FAINT};">${escapeHtml(buttonNote)}</p>` : ''}
  </td></tr>` : ''}
  <tr><td style="padding:24px 28px 28px; border-top:1px solid rgba(255,255,255,0.06); margin-top:24px;">
    <p style="margin:0; font-size:11px; line-height:1.6; color:${FAINT}; text-align:center;">${escapeHtml(footerNote || 'To wiadomość automatyczna z Twojego panelu coachingowego. Jeśli jej nie oczekiwałeś, zignoruj ją.')}</p>
  </td></tr>
</table>
<p style="margin:16px 0 0; font-size:11px; color:${FAINT}; text-align:center;">Nie odpowiadaj na tę wiadomość — napisz bezpośrednio w panelu.</p>
</td></tr>
</table>
</body>
</html>`.trim()

  return { html }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function infoCard(title: string, lines: string[]): string {
  const rows = lines.map((l) => `<p style="margin:4px 0; font-size:14px; color:${TEXT};">${l}</p>`).join('')
  return `<div style="background:${CARD}; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px 18px; margin:16px 0;"><p style="margin:0 0 6px; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:${ACCENT};">${escapeHtml(title)}</p>${rows}</div>`
}
