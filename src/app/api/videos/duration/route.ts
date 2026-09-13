import { NextRequest, NextResponse } from 'next/server'
import { fetchVideoDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  
  // Note: YouTube oEmbed doesn't return duration, so this returns null.
  // The actual duration is fetched client-side by the YouTube IFrame Player API
  // when the video loads, which is the most reliable method.
  const duration = await fetchVideoDuration(url)
  
  return NextResponse.json({ duration })
}