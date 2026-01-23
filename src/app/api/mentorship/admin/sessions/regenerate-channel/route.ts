import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { createMentorshipChannel } from '@/lib/discord'

// POST: Regenerate Discord channel for a mentorship session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Fetch the session
    const sessionRef = db.collection('mentorship_sessions').doc(sessionId)
    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionDoc.data()!

    // Validate session status - only allow for active or completed mentorships
    if (!['active', 'completed'].includes(sessionData.status)) {
      return NextResponse.json({
        error: 'Can only regenerate channel for active or completed mentorships'
      }, { status: 400 })
    }

    const mentorId = sessionData.mentorId as string
    const menteeId = sessionData.menteeId as string

    // Fetch mentor profile
    const mentorRef = db.collection('mentorship_profiles').doc(mentorId)
    const mentorDoc = await mentorRef.get()

    if (!mentorDoc.exists) {
      return NextResponse.json({ error: 'Mentor profile not found' }, { status: 404 })
    }

    const mentorProfile = mentorDoc.data()

    // Fetch mentee profile
    const menteeRef = db.collection('mentorship_profiles').doc(menteeId)
    const menteeDoc = await menteeRef.get()

    if (!menteeDoc.exists) {
      return NextResponse.json({ error: 'Mentee profile not found' }, { status: 404 })
    }

    const menteeProfile = menteeDoc.data()

    // Create new Discord channel
    const channelResult = await createMentorshipChannel(
      mentorProfile?.displayName || 'Unknown Mentor',
      menteeProfile?.displayName || 'Unknown Mentee',
      sessionId,
      mentorProfile?.discordUsername,
      menteeProfile?.discordUsername
    )

    if (!channelResult) {
      return NextResponse.json({
        error: 'Failed to create Discord channel'
      }, { status: 500 })
    }

    // Update session with new channel info
    await sessionRef.update({
      discordChannelId: channelResult.channelId,
      discordChannelUrl: channelResult.channelUrl,
      updatedAt: new Date()
    })

    return NextResponse.json({
      success: true,
      channelUrl: channelResult.channelUrl,
      message: 'Discord channel regenerated successfully'
    }, { status: 200 })
  } catch (error) {
    console.error('Error regenerating Discord channel:', error)
    return NextResponse.json({ error: 'Failed to regenerate Discord channel' }, { status: 500 })
  }
}
