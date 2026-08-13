import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.studentInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 404 })
    }

    if (invite.usedAt) {
      return NextResponse.json({ error: 'Już wykorzystane' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Wygasł' }, { status: 400 })
    }

    await prisma.studentInvite.update({
      where: { token },
      data: { usedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Use invite error:', error)
    return NextResponse.json({ error: 'Błąd' }, { status: 500 })
  }
}