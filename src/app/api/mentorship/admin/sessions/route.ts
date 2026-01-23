import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

// Allowed status transitions state machine
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: ['active'], // Allows revert
  cancelled: [], // Terminal state
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

// DELETE: Remove a mentorship session
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

    await sessionRef.delete()

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Session deleted successfully'
    }, { status: 200 })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
