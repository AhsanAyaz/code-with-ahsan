import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import {
  sendChannelMessage,
  sendDirectMessage,
  isDiscordConfigured,
  archiveMentorshipChannel,
} from '@/lib/discord'
import { sendMentorshipRemovedEmail } from '@/lib/email'

// Allowed status transitions state machine
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: ['active'], // Allows revert
  cancelled: ['active'], // Can be re-activated by admin
}

// PUT: Update session status with state machine validation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, status } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    // Validate target status
    if (!status || !['active', 'completed'].includes(status)) {
      return NextResponse.json({
        error: 'Invalid status. Must be "active" or "completed"'
      }, { status: 400 })
    }

    const sessionRef = db.collection('mentorship_sessions').doc(sessionId)
    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const currentStatus = sessionDoc.data()?.status

    // Validate state machine transition
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || []
    if (!allowedTargets.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from ${currentStatus} to ${status}`
      }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    }

    // Add completedAt timestamp when marking as completed
    if (status === 'completed') {
      updateData.completedAt = new Date()
    }

    // Add revertedAt timestamp when reverting from completed to active
    if (currentStatus === 'completed' && status === 'active') {
      updateData.revertedAt = new Date()
    }

    // Add reactivatedAt timestamp when re-activating from cancelled to active
    if (currentStatus === 'cancelled' && status === 'active') {
      updateData.reactivatedAt = new Date()
    }

    await sessionRef.update(updateData)

    return NextResponse.json({
      success: true,
      sessionId,
      status,
      message: `Session status updated to ${status}`
    }, { status: 200 })
  } catch (error) {
    console.error('Error updating session status:', error)
    return NextResponse.json({ error: 'Failed to update session status' }, { status: 500 })
  }
}

// DELETE: End a mentorship session (mark as cancelled, archive Discord, notify participants)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session id parameter' }, { status: 400 })
    }

    const sessionRef = db.collection('mentorship_sessions').doc(sessionId)
    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionDoc.data()!

    // If already cancelled/completed, just delete the record
    if (sessionData.status === 'cancelled' || sessionData.status === 'completed') {
      await sessionRef.delete()
      return NextResponse.json({
        success: true,
        sessionId,
        message: 'Session record deleted'
      }, { status: 200 })
    }

    // For active/pending sessions: mark as cancelled and handle notifications
    await sessionRef.update({
      status: 'cancelled',
      cancellationReason: 'ended_by_admin',
      cancelledAt: new Date(),
      cancelledBy: 'admin',
    })

    // Fetch profiles for notifications
    const [mentorProfile, menteeProfile] = await Promise.all([
      db.collection('mentorship_profiles').doc(sessionData.mentorId).get(),
      db.collection('mentorship_profiles').doc(sessionData.menteeId).get(),
    ])

    const mentorData = mentorProfile.exists ? mentorProfile.data() : null
    const menteeData = menteeProfile.exists ? menteeProfile.data() : null

    const notificationTasks: Promise<unknown>[] = []

    // Send message to Discord channel before archiving
    if (isDiscordConfigured() && sessionData.discordChannelId) {
      notificationTasks.push(
        sendChannelMessage(
          sessionData.discordChannelId,
          `📢 This mentorship has been ended by an administrator. The channel will be archived.`
        ).catch((err) =>
          console.error('Channel message before archive failed:', err)
        )
      )
    }

    // Archive Discord channel
    if (isDiscordConfigured() && sessionData.discordChannelId) {
      notificationTasks.push(
        archiveMentorshipChannel(sessionData.discordChannelId).catch((err) =>
          console.error('Discord channel archiving failed:', err)
        )
      )
    }

    // Notify mentor via DM
    if (isDiscordConfigured() && mentorData?.discordUsername) {
      notificationTasks.push(
        sendDirectMessage(
          mentorData.discordUsername,
          `📢 Your mentorship with **${menteeData?.displayName || 'your mentee'}** has been ended by an administrator.`
        ).catch((err) => console.error('Mentor DM failed:', err))
      )
    }

    // Notify mentee via DM
    if (isDiscordConfigured() && menteeData?.discordUsername) {
      notificationTasks.push(
        sendDirectMessage(
          menteeData.discordUsername,
          `📢 Your mentorship with **${mentorData?.displayName || 'your mentor'}** has been ended by an administrator.\n\n` +
            `You can browse for a new mentor: https://codewithahsan.dev/mentorship/browse`
        ).catch((err) => console.error('Mentee DM failed:', err))
      )
    }

    // Send email to both parties
    if (mentorData && menteeData) {
      notificationTasks.push(
        sendMentorshipRemovedEmail(
          {
            uid: sessionData.mentorId,
            displayName: mentorData.displayName || '',
            email: mentorData.email || '',
            role: 'mentor',
          },
          {
            uid: sessionData.menteeId,
            displayName: menteeData.displayName || '',
            email: menteeData.email || '',
            role: 'mentee',
          }
        ).catch((err) => console.error('Failed to send end email:', err))
      )
    }

    await Promise.allSettled(notificationTasks)

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Mentorship ended successfully'
    }, { status: 200 })
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
  }
}
