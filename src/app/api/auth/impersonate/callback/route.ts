import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: callback po impersonacji - weryfikuje token i loguje jako target user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const targetId = searchParams.get('targetId')

  if (!token || !targetId) {
    return NextResponse.redirect(new URL('/admin/users?error=invalid_token', request.url))
  }

  // TODO: Weryfikacja tokena z bazy/redis
  // Na razie prosty check - token musi istnieć i targetUser musi istnieć
  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, name: true, role: true },
  })

  if (!targetUser || targetUser.role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/users?error=invalid_target', request.url))
  }

  // Używamy NextAuth do zalogowania jako target user
  // To wymaga sesji NextAuth - najprościej zrobić to przez signIn na stronie klienckiej
  // Tutaj tylko przekierowujemy do strony logowania z parametrami
  const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`
  const callbackUrl = `${baseUrl}/admin/impersonate/confirm?targetId=${targetId}`

  return NextResponse.redirect(callbackUrl)
}