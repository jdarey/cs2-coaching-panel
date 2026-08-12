// Lightweight in-memory pub/sub used to push instant events to connected
// clients (Server-Sent Events). Works per server instance — perfect for the
// dev server and single-instance Vercel deploys; polling remains the fallback
// for multi-instance setups and for clients that drop the connection.

type Listener = (event: RealtimeEvent) => void

export type RealtimeEventType = 'message:new' | 'feedback:new' | 'rank:updated' | 'task:updated'

export interface RealtimeEvent {
  type: RealtimeEventType
  // userId this event is addressed to (the receiver, or the owner of the data)
  to: string
  // Optional context — e.g. the other party of a conversation
  payload?: Record<string, unknown>
  at: number
}

const listeners = new Map<string, Set<Listener>>()

export function subscribe(userId: string, listener: Listener): () => void {
  let set = listeners.get(userId)
  if (!set) {
    set = new Set()
    listeners.set(userId, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) listeners.delete(userId)
  }
}

export function publish(event: RealtimeEvent) {
  const set = listeners.get(event.to)
  if (!set) return
  set.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('Realtime listener error:', error)
    }
  })
}

export function publishToUsers(userIds: string[], event: Omit<RealtimeEvent, 'to' | 'at'>) {
  for (const id of userIds) publish({ ...event, to: id, at: Date.now() })
}
