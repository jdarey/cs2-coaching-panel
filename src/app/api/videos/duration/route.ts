import { NextRequest, NextResponse } from 'next/server'
import { getVideoDuration } from '@/lib/video-duration'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  const duration = await getVideoDuration(url)
  return NextResponse.json({ duration })
}