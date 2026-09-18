import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Mapa feature-flagów dla klienta: { flags: { chat_enabled: true, ... } }.
// Nie zwraca pól administracyjnych — tylko klucz i stan.
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const flags = await prisma.featureFlag.findMany({
      select: { key: true, enabled: true },
    })

    const map: Record<string, boolean> = {}
    for (const f of flags) map[f.key] = f.enabled

    return NextResponse.json({ flags: map })
  } catch (error) {
    console.error('Feature flags read error:', error)
    return NextResponse.json({ flags: {} })
  }
}
