import { Resend } from 'resend'

// Email is optional: without RESEND_API_KEY the app still works and the
// "sent" mail is logged to the server console instead (handy for local dev).
const apiKey = process.env.RESEND_API_KEY

function resend(): Resend | null {
  if (!apiKey) return null
  return new Resend(apiKey)
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<{ ok: boolean; note?: string }> {
  const client = resend()

  if (!client) {
    console.log(`[mail:dry-run] to=${to} subject="${subject}"\n${text}`)
    return { ok: true, note: 'RESEND_API_KEY not set — email logged instead of sent' }
  }

  const from = process.env.EMAIL_FROM || 'CS2 Coaching <onboarding@resend.dev>'

  try {
    await client.emails.send({
      from,
      to: [to],
      subject,
      html,
      text,
    })
    return { ok: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { ok: false, note: 'Email service error' }
  }
}
