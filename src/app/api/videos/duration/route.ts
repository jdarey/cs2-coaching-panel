import { NextRequest, NextResponse } from 'next/server'
import { fetchVideoDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  const duration = await fetchVideoDuration(url).catch(() => null)
  if (duration == null) return NextResponse.json({ duration: null }, { status: 200 })
  return NextResponse.json({ duration })
}
