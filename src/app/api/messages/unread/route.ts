import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Reads the session from cookies — never prerender this route statically.
export const dynamic = 'force-dynamic'

// Total unread message + feedback counts for nav badges.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id) {
      return NextResponse.json({ messages: 0, feedback: 0 }, { status: 200 })
    }

    const [messages, feedback] = await Promise.all([
      prisma.message.count({ where: { receiverId: user.id, readAt: null } }),
      user.role === 'COACH'
        ? prisma.feedback.count({ where: { coachId: user.id, status: 'NEW' } })
        : Promise.resolve(0),
    ])

    return NextResponse.json({ messages, feedback })
  } catch (error) {
    console.error('Unread GET error:', error)
    return NextResponse.json({ messages: 0, feedback: 0 }, { status: 200 })
  }
}
