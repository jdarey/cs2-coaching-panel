import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { subscribe, RealtimeEvent } from '@/lib/realtime'

// Server-Sent Events stream. Same-origin fetch carries the NextAuth session
// cookie, so no extra auth headers are needed. The connection stays open and
// the client receives a JSON event whenever something addressed to them
// changes (new message, feedback, rank update, …). A heartbeat keeps the
// connection alive through proxies that idle-timeout.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          /* stream closed */
        }
      }

      const unsubscribe = subscribe(user.id, send)

      // Heartbeat every 25s so idle proxies don't drop the connection.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          /* stream closed */
        }
      }, 25000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
