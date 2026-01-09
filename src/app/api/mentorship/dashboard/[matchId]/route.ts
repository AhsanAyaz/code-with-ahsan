import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const resolvedParams = await params
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 })
  }

  try {
    const matchDoc = await db.collection('mentorship_sessions').doc(resolvedParams.matchId).get()

    if (!matchDoc.exists) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const matchData = matchDoc.data()!

    // Verify user is part of this match
    if (matchData.mentorId !== uid && matchData.menteeId !== uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check match is active
    if (matchData.status !== 'active') {
      return NextResponse.json({ error: 'Match is not active' }, { status: 403 })
    }

    // Get partner profile
    const partnerId = matchData.mentorId === uid ? matchData.menteeId : matchData.mentorId
    const partnerDoc = await db.collection('mentorship_profiles').doc(partnerId).get()
    
    const partnerData = partnerDoc.exists ? partnerDoc.data() : null

    return NextResponse.json({
      match: {
        id: matchDoc.id,
        mentorId: matchData.mentorId,
        menteeId: matchData.menteeId,
        status: matchData.status,
        approvedAt: matchData.approvedAt?.toDate?.() || null,
        lastContactAt: matchData.lastContactAt?.toDate?.() || null,
        discordChannelUrl: matchData.discordChannelUrl || null,
        partner: partnerData ? {
          uid: partnerDoc.id,
          ...partnerData,
          createdAt: partnerData.createdAt?.toDate?.() || null,
          updatedAt: partnerData.updatedAt?.toDate?.() || null,
        } : null,
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching match details:', error)
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 })
  }
}
