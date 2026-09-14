import { Resend } from 'resend'
import nodemailer from 'nodemailer'

// Kolejność wysyłki: Resend (jeśli klucz) -> Gmail SMTP (darmowy, najlepsza
// dostarczalność za 0 zł) -> dry-run (log, dev). Dzięki temu maile nie lądują
// w spamie: Gmail wysyła z prawdziwego konta z poprawnym SPF/DKIM Google.
const resendKey = process.env.RESEND_API_KEY

function resend(): Resend | null {
  if (!resendKey) return null
  return new Resend(resendKey)
}

function smtpTransport() {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE ?? 'true') !== 'false',
    auth: { user, pass },
  })
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<{ ok: boolean; note?: string }> {
  const from = process.env.EMAIL_FROM || 'CS2 Coaching <onboarding@resend.dev>'

  const client = resend()
  if (client) {
    try {
      await client.emails.send({ from, to: [to], subject, html, text })
      return { ok: true }
    } catch (error) {
      console.error('Email send error (resend):', error)
      return { ok: false, note: 'Email service error' }
    }
  }

  const smtp = smtpTransport()
  if (smtp) {
    try {
      await smtp.sendMail({ from, to, subject, html, text })
      return { ok: true }
    } catch (error) {
      console.error('Email send error (smtp):', error)
      return { ok: false, note: 'Email service error' }
    }
  }

  console.log(`[mail:dry-run] to=${to} subject="${subject}"\n${text}`)
  return { ok: true, note: 'RESEND_API_KEY/SMTP not set — email logged instead of sent' }
}
