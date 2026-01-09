import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')
  const role = searchParams.get('role')

  if (!uid || !role) {
    return NextResponse.json({ error: 'Missing uid or role parameter' }, { status: 400 })
  }

  try {
    let matchesQuery
    let pendingQuery

    if (role === 'mentor') {
      // Mentor sees their mentees
      matchesQuery = db.collection('mentorship_sessions')
        .where('mentorId', '==', uid)
        .where('status', '==', 'active')
      
      pendingQuery = db.collection('mentorship_sessions')
        .where('mentorId', '==', uid)
        .where('status', '==', 'pending')
    } else {
      // Mentee sees their mentors
      matchesQuery = db.collection('mentorship_sessions')
        .where('menteeId', '==', uid)
        .where('status', '==', 'active')
      
      pendingQuery = db.collection('mentorship_sessions')
        .where('menteeId', '==', uid)
        .where('status', '==', 'pending')
    }

    const [matchesSnapshot, pendingSnapshot] = await Promise.all([
      matchesQuery.get(),
      pendingQuery.get(),
    ])

    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.() || null,
      approvedAt: doc.data().approvedAt?.toDate?.() || null,
      lastContactAt: doc.data().lastContactAt?.toDate?.() || null,
    }))

    const pendingRequests = pendingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.() || null,
    }))

    return NextResponse.json({ matches, pendingRequests }, { status: 200 })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { menteeId, mentorId, matchScore } = body

    if (!menteeId || !mentorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if a match already exists
    const existingMatch = await db.collection('mentorship_sessions')
      .where('menteeId', '==', menteeId)
      .where('mentorId', '==', mentorId)
      .get()

    if (!existingMatch.empty) {
      const existingDoc = existingMatch.docs[0]
      const status = existingDoc.data().status
      return NextResponse.json({ 
        error: `Match request already exists with status: ${status}`,
        existingMatchId: existingDoc.id,
        status
      }, { status: 409 })
    }

    const matchData = {
      menteeId,
      mentorId,
      status: 'pending',
      requestedAt: FieldValue.serverTimestamp(),
      matchScore: matchScore || null,
    }

    const docRef = await db.collection('mentorship_sessions').add(matchData)

    return NextResponse.json({ 
      success: true, 
      matchId: docRef.id,
      message: 'Match request sent successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating match request:', error)
    return NextResponse.json({ error: 'Failed to create match request' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, action, mentorId } = body

    if (!matchId || !action) {
      return NextResponse.json({ error: 'Missing matchId or action' }, { status: 400 })
    }

    const matchRef = db.collection('mentorship_sessions').doc(matchId)
    const matchDoc = await matchRef.get()

    if (!matchDoc.exists) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const matchData = matchDoc.data()

    // Verify the mentor is the one making the decision
    if (mentorId && matchData?.mentorId !== mentorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (action === 'approve') {
      await matchRef.update({
        status: 'active',
        approvedAt: FieldValue.serverTimestamp(),
        lastContactAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, message: 'Match approved' }, { status: 200 })
    } else if (action === 'decline') {
      await matchRef.update({
        status: 'declined',
      })
      return NextResponse.json({ success: true, message: 'Match declined' }, { status: 200 })
    } else if (action === 'complete') {
      await matchRef.update({
        status: 'completed',
      })
      return NextResponse.json({ success: true, message: 'Mentorship marked as complete' }, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
