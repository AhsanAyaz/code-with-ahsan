import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const menteeId = searchParams.get('menteeId')

  if (!menteeId) {
    return NextResponse.json({ error: 'Missing menteeId parameter' }, { status: 400 })
  }

  try {
    // Get all requests made by this mentee (pending, declined, active, or completed)
    const requestsSnapshot = await db.collection('mentorship_sessions')
      .where('menteeId', '==', menteeId)
      .get()

    const requests = requestsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        sessionId: doc.id, // Include session ID for rating
        mentorId: data.mentorId,
        status: data.status,
        requestedAt: data.requestedAt?.toDate?.() || null,
        hasRated: data.hasRating || false, // Include rating status
      }
    })

    return NextResponse.json({ requests }, { status: 200 })
  } catch (error) {
    console.error('Error fetching mentee requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
