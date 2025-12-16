import { NextRequest, NextResponse } from 'next/server'
// @ts-ignore
import { getYouTubeComments } from '@/services/YouTubeService'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const videoId = searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ success: false, error: 'Missing videoId' }, { status: 400 })
  }

  try {
    const comments = await getYouTubeComments(videoId)
    return NextResponse.json({ success: true, comments })
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 400 })
  }
}
