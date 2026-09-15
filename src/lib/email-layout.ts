// Premium SaaS layout maili — poziom "strona za $10k".
// Uczciwa uwaga: klienci poczty (Gmail/Outlook/Apple) BLOKUJĄ animacje,
// JS i większość CSS (żadnych keyframes, backdrop-filter, hover). Efekt
// premium robimy statycznie: duża typografia, warstwowe gradienty, glow
// przez box-shadow, VML button dla Outlooka, pigułki społecznościowe.
// Table-based + inline style + bgcolor fallbacki — działa w Gmail/Outlook/Apple.

const ACCENT = '#a78bfa'
const ACCENT_LIGHT = '#c4b5fd'
const ACCENT_DARK = '#6d28d9'
const ACCENT_DEEP = '#4c1d95'
const BG = '#0a0c10'
const CARD = '#13151d'
const CARD_EDGE = 'rgba(255,255,255,0.09)'
const TEXT = '#f4f6f7'
const MUTED = 'rgba(244,246,247,0.68)'
const FAINT = 'rgba(244,246,247,0.38)'

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
  /** Surowy URL pod przyciskiem (do wklejenia jakby przycisk nie zadziałał). */
  rawUrl?: string
  footerNote?: string
}): { html: string } {
  const { preheader, badge, title, subtitle, bodyHtml, button, buttonNote, rawUrl, footerNote } = opts

  const html = `
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#05060a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">${escapeHtml(preheader)}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#05060a; padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; border-collapse:separate;">
  <tr><td style="background:linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_DARK} 55%, #2de5ca 135%); border-radius:22px 22px 0 0; font-size:0; line-height:0; height:5px;">&nbsp;</td></tr>
  <tr><td bgcolor="${BG}" style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:36px 36px 0; text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr><td align="center" bgcolor="${ACCENT_DARK}" style="background-color:${ACCENT_DARK}; border-radius:20px; font-size:0; line-height:0;">
      <img src="${LOGO_URL}" width="64" height="64" alt="CS2 Coaching" style="display:block; width:64px; height:64px; border:0; outline:none; text-decoration:none; border-radius:20px; background-color:${ACCENT_DARK}; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold;" />
    </td></tr></table>
    <p style="margin:14px 0 0; font-size:10px; letter-spacing:5px; text-transform:uppercase; color:${FAINT}; font-weight:700;">CS2 Coaching</p>
  </td></tr>
  <tr><td bgcolor="${BG}" style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:24px 36px 0;">
    ${badge ? `<p style="margin:0 0 12px;"><span style="display:inline-block; font-size:11px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:${ACCENT}; background:rgba(167,139,250,0.12); border:1px solid rgba(167,139,250,0.38); border-radius:999px; padding:7px 16px;">${escapeHtml(badge)}</span></p>` : ''}
    <h1 style="margin:0; font-size:27px; line-height:1.25; font-weight:800; color:${TEXT}; letter-spacing:-0.4px;">${escapeHtml(title)}</h1>
    ${subtitle ? `<p style="margin:12px 0 0; font-size:15px; line-height:1.65; color:${MUTED};">${escapeHtml(subtitle)}</p>` : ''}
    <div style="margin:20px 0 0; height:1px; line-height:1px; font-size:0; background:linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.4) 30%, rgba(167,139,250,0.4) 70%, transparent 100%);">&nbsp;</div>
  </td></tr>
  <tr><td bgcolor="${BG}" style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:20px 36px 0; font-size:15px; line-height:1.8; color:${MUTED};">
    ${bodyHtml}
  </td></tr>
  ${button ? `<tr><td bgcolor="${BG}" style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:28px 36px 0; text-align:center;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${button.url}" style="width:320px; height:56px; v-text-anchor:middle;" arcsize="28%" fillcolor="${ACCENT_DARK}" stroke="f">
      <center style="color:#ffffff; font-family:sans-serif; font-size:16px; font-weight:bold;">${escapeHtml(button.label)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${button.url}" style="display:inline-block; padding:17px 44px; border-radius:16px; background:linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%); box-shadow:0 14px 36px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.25); color:#ffffff; font-size:16px; font-weight:800; letter-spacing:0.2px; text-decoration:none;">${escapeHtml(button.label)}</a>
    <!--<![endif]-->
    ${buttonNote ? `<p style="margin:14px 0 0; font-size:12px; color:${FAINT};">${escapeHtml(buttonNote)}</p>` : ''}
    ${rawUrl ? `<p style="margin:12px 0 0; font-size:11px; line-height:1.6; color:${FAINT}; word-break:break-all; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px 12px;">${escapeHtml(rawUrl)}</p>` : ''}
  </td></tr>` : ''}
  <tr><td bgcolor="${BG}" style="background-color:${BG}; border:1px solid ${CARD_EDGE}; border-top:none; border-radius:0 0 22px 22px; padding:26px 36px 28px; text-align:center;">
    <p style="margin:0 0 14px;">
      ${socialPill(SITE_URL, 'Strona')}
      ${YOUTUBE_URL ? `&nbsp;&nbsp;${socialPill(YOUTUBE_URL, 'YouTube')}` : ''}
      ${DISCORD_URL
        ? `&nbsp;&nbsp;${socialPill(DISCORD_URL, 'Discord')}`
        : DISCORD_NAME
          ? `&nbsp;&nbsp;<span style="display:inline-block; font-size:12px; font-weight:700; color:${MUTED}; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:999px; padding:8px 18px;">Discord: ${escapeHtml(DISCORD_NAME)}</span>`
          : ''}
    </p>
    <p style="margin:0; font-size:11px; line-height:1.7; color:${FAINT};">${escapeHtml(footerNote || 'To wiadomość automatyczna z Twojego panelu coachingowego. Jeśli jej nie oczekiwałeś, zignoruj ją.')}</p>
    <p style="margin:10px 0 0; font-size:11px; color:${FAINT};">Nie odpowiadaj na tę wiadomość — napisz bezpośrednio w panelu.</p>
  </td></tr>
</table>
<p style="margin:20px 0 0; font-size:10px; letter-spacing:3px; text-transform:uppercase; color:${FAINT}; text-align:center;">Trenuj mądrze · Graj lepiej</p>
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
  const rows = lines
    .map((l) => `<p style="margin:6px 0; font-size:14px; line-height:1.65; color:${TEXT};"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${ACCENT}; box-shadow:0 0 8px rgba(167,139,250,0.8); margin-right:10px; vertical-align:2px;"></span>${l}</p>`)
    .join('')
  return `<div style="background:${CARD}; border:1px solid rgba(255,255,255,0.09); border-left:3px solid ${ACCENT}; border-radius:0 16px 16px 0; padding:18px 20px; margin:18px 0; box-shadow:0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05);"><p style="margin:0 0 10px; font-size:11px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:${ACCENT};">${escapeHtml(title)}</p>${rows}</div>`
}

// Linki do stopki — ze zmiennych środowiskowych, żeby trener podmienił bez
// grzebania w kodzie. SITE_URL ma sensowny domyślny (strona reklamowa).
const SITE_URL = process.env.SITE_URL || 'https://dareycs2.vercel.app/'
// Logo w mailu MUSI mieć absolutny URL (klienci poczty nie widzą plików
// względnych). Plik leży w public/, więc jest serwowany spod adresu strony.
const LOGO_URL = `${SITE_URL.replace(/\/$/, '')}/icon.png`
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://www.youtube.com/@DareyCS2'
const DISCORD_URL = process.env.DISCORD_URL || ''
const DISCORD_NAME = process.env.DISCORD_NAME || 'jdarey'

function socialPill(url: string, label: string): string {
  const safe = url.replace(/"/g, '%22')
  return `<a href="${safe}" style="display:inline-block; font-size:12px; font-weight:700; color:${ACCENT_LIGHT}; background:rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.3); border-radius:999px; padding:8px 18px; text-decoration:none;">${label}</a>`
}

export { ACCENT, ACCENT_DARK, ACCENT_DEEP }
