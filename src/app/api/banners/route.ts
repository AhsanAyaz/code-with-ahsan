import { NextResponse } from 'next/server'

const strapiUrl = process.env.STRAPI_URL
const strapiAPIKey = process.env.STRAPI_API_KEY

export async function GET() {
  if (!strapiUrl) {
    // Return empty if not configured
    return NextResponse.json({ success: false, banners: [] })
  }
  const url = `${strapiUrl}/api/banners`

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${strapiAPIKey}`,
      },
    })

    if (!res.ok) {
      // Silently fail or return empty logic from old code
      return NextResponse.json({ success: false, banners: [] }, { status: 400 })
    }
    const data = await res.json()
    const banners = data.data || []
    return NextResponse.json({ success: !!banners.length, banners })
  } catch (error) {
    return NextResponse.json({ success: false, banners: [] }, { status: 400 })
  }
}
