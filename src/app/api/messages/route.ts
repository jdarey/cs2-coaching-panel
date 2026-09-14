import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { renderEmail } from '@/lib/email-templates'
import { sendDiscordNotification } from '@/lib/discord'
import { publishToUsers } from '@/lib/realtime'

// Validate that two users are allowed to talk: a coach with their own student
// (either direction), and only in that relationship.
async function assertConversationAllowed(myId: string, myRole: string, otherId: string) {
  if (myRole === 'COACH') {
    const student = await prisma.user.findUnique({
      where: { id: otherId },
      select: { coachId: true },
    })
    return !!student && student.coachId === myId
  }
  const me = await prisma.user.findUnique({
    where: { id: myId },
    select: { coachId: true },
  })
  return !!me && me.coachId === otherId
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id) {
      return NextResponse.json({ error: 'Nieautoryzowany' }, { status: 401 })
    }

    const withId = request.nextUrl.searchParams.get('with')

    // Thread with a specific user
    if (withId) {
      const allowed = await assertConversationAllowed(user.id, user.role, withId)
      if (!allowed) {
        return NextResponse.json({ error: 'Brak uprawnień do tej rozmowy' }, { status: 403 })
      }

      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: withId },
            { senderId: withId, receiverId: user.id },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      })

      // Mark inbound messages as read
      await prisma.message.updateMany({
        where: { senderId: withId, receiverId: user.id, readAt: null },
        data: { readAt: new Date() },
      })

      return NextResponse.json({ messages })
    }

    // Conversation list
    if (user.role === 'COACH') {
      const students = await prisma.user.findMany({
        where: { coachId: user.id },
        select: { id: true, name: true, email: true, avatarUrl: true },
        orderBy: { createdAt: 'desc' },
      })

      const conversations = await Promise.all(
        students.map(async (student) => {
          const last = await prisma.message.findFirst({
            where: {
              OR: [
                { senderId: user.id, receiverId: student.id },
                { senderId: student.id, receiverId: user.id },
              ],
            },
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true, senderId: true },
          })
          const unread = await prisma.message.count({
            where: { senderId: student.id, receiverId: user.id, readAt: null },
          })
          return { ...student, lastMessage: last, unread }
        }),
      )

      conversations.sort((a, b) => {
        const ta = a.lastMessage?.createdAt?.getTime() || 0
        const tb = b.lastMessage?.createdAt?.getTime() || 0
        return tb - ta
      })

      return NextResponse.json({ conversations })
    }

    // Student: single conversation with their coach
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coachId: true },
    })
    if (!me?.coachId) {
      return NextResponse.json({ conversations: [], coach: null })
    }

    const coach = await prisma.user.findUnique({
      where: { id: me.coachId },
      select: { id: true, name: true, email: true, avatarUrl: true },
    })

    const last = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId: me.coachId },
          { senderId: me.coachId, receiverId: user.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { content: true, createdAt: true, senderId: true },
    })
    const unread = await prisma.message.count({
      where: { senderId: me.coachId, receiverId: user.id, readAt: null },
    })

    return NextResponse.json({ conversations: [{ ...coach, lastMessage: last, unread }], coach })
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json({ error: 'Błąd pobierania wiadomości' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    if (!user?.id) {
      return NextResponse.json({ error: 'Nieautoryzowany' }, { status: 401 })
    }

    const body = await request.json()
    const { receiverId, content } = body

    if (!receiverId || !content?.trim()) {
      return NextResponse.json({ error: 'Odbiorca i treść są wymagane' }, { status: 400 })
    }
    if (content.trim().length > 4000) {
      return NextResponse.json({ error: 'Wiadomość jest zbyt długa' }, { status: 400 })
    }

    const allowed = await assertConversationAllowed(user.id, user.role, receiverId)
    if (!allowed) {
      return NextResponse.json({ error: 'Możesz pisać tylko ze swoim trenerem / swoimi uczniami' }, { status: 403 })
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        content: content.trim(),
      },
      select: { id: true, senderId: true, receiverId: true, content: true, readAt: true, createdAt: true },
    })

    // Push to both parties instantly over SSE (fire-and-forget).
    publishToUsers([user.id, receiverId], { type: 'message:new', payload: { message } })

    // Email + Discord notifications to the receiver/coach (fire-and-forget —
    // the message is already stored; a notification failure must not fail the
    // request).
    try {
      const [sender, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: receiverId }, select: { email: true, name: true, role: true, coachId: true } }),
      ])
      if (receiver?.email) {
        const senderName = sender?.name || (user.role === 'COACH' ? 'Twój trener' : 'Twój uczeń')
        const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`
        const link = user.role === 'COACH' ? `${baseUrl}/student/messages` : `${baseUrl}/coach/messages`

        const safeContent = message.content.replace(/</g, '&lt;').replace(/\n/g, '<br/>')
        // Treść z szablonu (edytowalna w /admin/emails, klucz new-message)
        const snippet = `${message.content.slice(0, 60)}${message.content.length > 60 ? '…' : ''}`
        const { subject, html: msgHtml, text } = await renderEmail(
          'new-message',
          {
            senderName,
            snippet,
            chatUrl: link,
            messageHtml: `<div style="margin:0; padding:16px 18px; border-radius:14px; background:#14161c; border:1px solid rgba(255,255,255,0.08); border-left:3px solid #a78bfa; line-height:1.7;">${safeContent}</div>`,
          },
          { buttonUrl: link, safeKeys: ['messageHtml'] },
        )
        await sendEmail({ to: receiver.email, subject, html: msgHtml, text })
      }

      // Discord: notify the coach when a student writes. When a student sends,
      // the coach is the receiver (coaches have no coachId, so receiverId is
      // the right lookup for the coach's webhook settings).
      if (user.role === 'STUDENT') {
        await sendDiscordNotification({
          coachId: receiverId,
          title: '📩 Nowa wiadomość od ucznia',
          description: sender?.name || 'Uczeń',
          fields: [{ name: 'Wiadomość', value: message.content.slice(0, 1024) }],
        })
      }
    } catch (notificationError) {
      console.error('Message notification error:', notificationError)
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json({ error: 'Błąd wysyłania wiadomości' }, { status: 500 })
  }
}
