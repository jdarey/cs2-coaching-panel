import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user as any).role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coachId = (session.user as any).id
    const body = await request.json()
    const { email } = body

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Nieprawidłowy email' }, { status: 400 })
    }

    // Check if student already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      // If they're already a student of this coach
      if (existingUser.coachId === coachId) {
        return NextResponse.json({ error: 'Ten uczeń już należy do Ciebie' }, { status: 400 })
      }
      // If they exist but with another coach or no coach
      return NextResponse.json({ error: 'Użytkownik z tym emailem już istnieje' }, { status: 400 })
    }

    // Check for existing pending invite
    const existingInvite = await prisma.studentInvite.findFirst({
      where: { coachId, email, usedAt: null, expiresAt: { gt: new Date() } }
    })
    if (existingInvite) {
      return NextResponse.json({ error: 'Zaproszenie dla tego emaila zostało już wysłane i jest wciąż ważne' }, { status: 400 })
    }

    // Create invite token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.studentInvite.create({
      data: {
        coachId,
        email,
        token,
        expiresAt,
      },
    })

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/register?invite=${token}`
    const coachName = (session.user as any).name || 'Twój trener'

    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-radius: 16px; padding: 40px; color: white;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #2de5ca 0%, #14b8a6 100%); margin-bottom: 16px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700;">CS2 Coaching Panel</h1>
            </div>

            <p style="font-size: 16px; line-height: 1.6; color: #e2e8f0; margin-bottom: 16px;">
              Cześć! <strong>${coachName}</strong> zaprasza Cię do swojego panelu treningowego CS2.
            </p>

            <p style="font-size: 16px; line-height: 1.6; color: #94a3b8; margin-bottom: 32px;">
              Jako uczeń będziesz mieć dostęp do: biblioteki filmów treningowych, sesji z trenerem, zadań domowych, śledzenia rangi (Premier/Faceit ELO), komunikacji z trenerem i wielu innych narzędzi pomagających w rozwoju w CS2.
            </p>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${inviteUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #2de5ca 0%, #14b8a6 100%); color: #060606; font-weight: 700; border-radius: 12px; text-decoration: none; font-size: 16px;">
                Utwórz konto i dołącz
              </a>
            </div>

            <p style="font-size: 12px; color: #64748b; text-align: center;">
              Link wygasa za 7 dni. Jeśli nie prosiłeś o zaproszenie, zignoruj tę wiadomość.
            </p>
          </div>
        </div>
      `
    const text = `Cześć! ${coachName} zaprasza Cię do panelu CS2 Coaching.\n\nJako uczeń będziesz mieć dostęp do: biblioteki filmów treningowych, sesji z trenerem, zadań domowych, śledzenia rangi (Premier/Faceit ELO), komunikacji z trenerem.\n\nUtwórz konto i dołącz: ${inviteUrl}\n\nLink wygasa za 7 dni.`

    await sendEmail({
      to: email,
      subject: `Zaproszenie do panelu CS2 Coaching od ${coachName}`,
      html,
      text,
    })

    return NextResponse.json({ ok: true, message: 'Zaproszenie wysłane na email ucznia' })
  } catch (error) {
    console.error('Student invite error:', error)
    return NextResponse.json({ error: 'Błąd wysyłania zaproszenia' }, { status: 500 })
  }
}