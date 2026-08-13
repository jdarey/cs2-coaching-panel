import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.studentInvite.findUnique({
      where: { token },
      include: { coach: { select: { name: true } } },
    })

    if (!invite) {
      return NextResponse.json({ valid: false, error: 'Nieprawidłowy token zaproszenia' }, { status: 404 })
    }

    if (invite.usedAt) {
      return NextResponse.json({ valid: false, error: 'To zaproszenie zostało już wykorzystane' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: 'Token zaproszenia wygasł' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      coachName: invite.coach?.name || 'Twój trener',
    })
  } catch (error) {
    console.error('Validate invite error:', error)
    return NextResponse.json({ valid: false, error: 'Błąd walidacji tokenu' }, { status: 500 })
  }
}