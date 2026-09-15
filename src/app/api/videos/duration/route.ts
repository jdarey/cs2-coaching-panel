import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVideoDuration } from '@/lib/video-duration'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Nie zalogowano' }, { status: 401 })
    }
    const url = new URL(request.url).searchParams.get('url')
    if (!url || url.length > 500) return NextResponse.json({ error: 'url required' }, { status: 400 })
    const duration = await getVideoDuration(url)
    return NextResponse.json({ duration })
  } catch {
    return NextResponse.json({ error: 'Błąd pobierania czasu filmu' }, { status: 500 })
  }
}