// Premium SaaS layout maili — ciemny glass + fiolet, spójny ze stroną.
// Uczciwa uwaga: klienci poczty (Gmail/Outlook/Apple) BLOKUJĄ animacje,
// JS i większość CSS (żadnych keyframes, backdrop-filter, hover). Jedyna
// "animacja" jaka przejdzie to osadzony GIF. Dlatego efekt premium robimy
// statycznie: warstwowe gradienty, glow przez box-shadow, VML button dla
// Outlooka, letter-spacing, preheader. Table-based + inline style.

const ACCENT = '#a78bfa'
const ACCENT_DARK = '#6d28d9'
const ACCENT_DEEP = '#4c1d95'
const BG = '#0a0c10'
const CARD = '#12141b'
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
  footerNote?: string
}): { html: string } {
  const { preheader, badge, title, subtitle, bodyHtml, button, buttonNote, footerNote } = opts

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
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#05060a; background-image:linear-gradient(180deg, #0d0a1f 0%, #05060a 320px); padding:36px 16px;">
<tr><td align="center">
<table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px; width:100%; border-collapse:separate;">
  <tr><td style="background:linear-gradient(90deg, ${ACCENT} 0%, ${ACCENT_DARK} 55%, #2de5ca 130%); border-radius:20px 20px 0 0; font-size:0; line-height:0; height:4px;">&nbsp;</td></tr>
  <tr><td style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:30px 32px 0; text-align:center;">
    <div style="display:inline-block; width:56px; height:56px; line-height:56px; border-radius:16px; background:linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%); box-shadow:0 8px 28px rgba(167,139,250,0.45), inset 0 1px 0 rgba(255,255,255,0.25); font-size:26px; font-weight:800; color:#ffffff;">C</div>
    <p style="margin:12px 0 0; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:${FAINT}; font-weight:700;">CS2 Coaching · Premium</p>
  </td></tr>
  <tr><td style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:22px 32px 0;">
    ${badge ? `<p style="margin:0 0 10px;"><span style="display:inline-block; font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:${ACCENT}; background:rgba(167,139,250,0.12); border:1px solid rgba(167,139,250,0.35); border-radius:999px; padding:6px 14px;">${escapeHtml(badge)}</span></p>` : ''}
    <h1 style="margin:0; font-size:25px; line-height:1.25; font-weight:800; color:${TEXT}; letter-spacing:-0.3px;">${escapeHtml(title)}</h1>
    ${subtitle ? `<p style="margin:10px 0 0; font-size:14px; line-height:1.65; color:${MUTED};">${escapeHtml(subtitle)}</p>` : ''}
    <div style="margin:18px 0 0; height:1px; line-height:1px; font-size:0; background:linear-gradient(90deg, transparent 0%, ${ACCENT}55 30%, ${ACCENT}55 70%, transparent 100%);">&nbsp;</div>
  </td></tr>
  <tr><td style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:18px 32px 0; font-size:14px; line-height:1.75; color:${MUTED};">
    ${bodyHtml}
  </td></tr>
  ${button ? `<tr><td style="background-color:${BG}; border-left:1px solid ${CARD_EDGE}; border-right:1px solid ${CARD_EDGE}; padding:26px 32px 0; text-align:center;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${button.url}" style="width:300px; height:52px; v-text-anchor:middle;" arcsize="25%" fillcolor="${ACCENT_DARK}" stroke="f">
      <center style="color:#ffffff; font-family:sans-serif; font-size:15px; font-weight:bold;">${escapeHtml(button.label)}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="${button.url}" style="display:inline-block; padding:15px 38px; border-radius:14px; background:linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%); box-shadow:0 10px 30px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.22); color:#ffffff; font-size:15px; font-weight:800; letter-spacing:0.2px; text-decoration:none;">${escapeHtml(button.label)}</a>
    <!--<![endif]-->
    ${buttonNote ? `<p style="margin:14px 0 0; font-size:12px; color:${FAINT};">${escapeHtml(buttonNote)}</p>` : ''}
  </td></tr>` : ''}
  <tr><td style="background-color:${BG}; border:1px solid ${CARD_EDGE}; border-top:none; border-radius:0 0 20px 20px; padding:22px 32px 26px;">
    <p style="margin:0; font-size:11px; line-height:1.7; color:${FAINT}; text-align:center;">${escapeHtml(footerNote || 'To wiadomość automatyczna z Twojego panelu coachingowego. Jeśli jej nie oczekiwałeś, zignoruj ją.')}</p>
    <p style="margin:14px 0 0; font-size:13px; text-align:center;">
      ${socialLink(SITE_URL, '🌐 Strona')}
      ${YOUTUBE_URL ? `<span style="color:${FAINT};">&nbsp;·&nbsp;</span>${socialLink(YOUTUBE_URL, '▶️ YouTube')}` : ''}
      ${DISCORD_URL
        ? `<span style="color:${FAINT};">&nbsp;·&nbsp;</span>${socialLink(DISCORD_URL, '💬 Discord')}`
        : DISCORD_NAME
          ? `<span style="color:${FAINT};">&nbsp;·&nbsp;</span><span style="color:${MUTED}; font-weight:700;">💬 Discord: ${escapeHtml(DISCORD_NAME)}</span>`
          : ''}
    </p>
    <p style="margin:10px 0 0; font-size:11px; color:${FAINT}; text-align:center;">Nie odpowiadaj na tę wiadomość — napisz bezpośrednio w panelu. ✨</p>
  </td></tr>
</table>
<p style="margin:18px 0 0; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:${FAINT}; text-align:center;">Trenuj mądrze · Graj lepiej</p>
</td></tr>
</table>
</body>
</html>`.trim()

  return { html }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Linki do stopki — ze zmiennych środowiskowych, żeby trener podmienił bez
// grzebania w kodzie. SITE_URL ma sensowny domyślny (strona reklamowa).
const SITE_URL = process.env.SITE_URL || 'https://dareycs2.vercel.app/'
const YOUTUBE_URL = process.env.YOUTUBE_URL || 'https://www.youtube.com/@DareyCS2'
const DISCORD_URL = process.env.DISCORD_URL || ''
const DISCORD_NAME = process.env.DISCORD_NAME || 'jdarey'

function socialLink(url: string, label: string): string {
  const safe = url.replace(/"/g, '%22')
  return `<a href="${safe}" style="color:${ACCENT}; font-weight:700; text-decoration:none;">${label}</a>`
}

export function infoCard(title: string, lines: string[]): string {
  const rows = lines.map((l) => `<p style="margin:5px 0; font-size:14px; line-height:1.6; color:${TEXT};">${l}</p>`).join('')
  return `<div style="background:${CARD}; border:1px solid rgba(255,255,255,0.09); border-left:3px solid ${ACCENT}; border-radius:0 14px 14px 0; padding:16px 18px; margin:16px 0; box-shadow:0 6px 20px rgba(0,0,0,0.35);"><p style="margin:0 0 8px; font-size:11px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; color:${ACCENT};">${escapeHtml(title)}</p>${rows}</div>`
}

export { ACCENT, ACCENT_DARK, ACCENT_DEEP }
