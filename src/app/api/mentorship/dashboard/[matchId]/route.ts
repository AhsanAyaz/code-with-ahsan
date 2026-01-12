import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { sendMentorshipCompletedEmail } from '@/lib/email'

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

// PUT: Update match status (e.g., mark as completed)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const resolvedParams = await params
  
  try {
    const body = await request.json()
    const { uid, action, completionNotes } = body

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
    }

    const matchDoc = await db.collection('mentorship_sessions').doc(resolvedParams.matchId).get()

    if (!matchDoc.exists) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const matchData = matchDoc.data()!

    // Verify user is part of this match
    if (matchData.mentorId !== uid && matchData.menteeId !== uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only mentors can mark as completed
    const isMentor = matchData.mentorId === uid
    
    if (action === 'complete') {
      if (!isMentor) {
        return NextResponse.json({ error: 'Only mentors can mark mentorship as complete' }, { status: 403 })
      }

      if (matchData.status !== 'active') {
        return NextResponse.json({ error: 'Can only complete active mentorships' }, { status: 400 })
      }

      await db.collection('mentorship_sessions').doc(resolvedParams.matchId).update({
        status: 'completed',
        completedAt: new Date(),
        completedBy: uid,
        completionNotes: completionNotes || null,
      })

      // Send completion email to both mentor and mentee
      const [mentorProfile, menteeProfile] = await Promise.all([
        db.collection('mentorship_profiles').doc(matchData.mentorId).get(),
        db.collection('mentorship_profiles').doc(matchData.menteeId).get(),
      ])
      
      if (mentorProfile.exists && menteeProfile.exists) {
        const mentorData = mentorProfile.data()
        const menteeData = menteeProfile.data()
        sendMentorshipCompletedEmail(
          {
            uid: matchData.mentorId,
            displayName: mentorData?.displayName || '',
            email: mentorData?.email || '',
            role: 'mentor',
          },
          {
            uid: matchData.menteeId,
            displayName: menteeData?.displayName || '',
            email: menteeData?.email || '',
            role: 'mentee',
          }
        ).catch(err => console.error('Failed to send completion email:', err))
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Mentorship marked as complete!' 
      }, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
