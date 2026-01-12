import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

// GET - Fetch scheduled sessions for a mentorship session
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 })
  }

  try {
    const sessionsSnapshot = await db.collection('mentorship_scheduled_sessions')
      .where('sessionId', '==', sessionId)
      .orderBy('scheduledAt', 'asc')
      .get()

    const sessions = sessionsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt || null,
      }
    })

    return NextResponse.json({ sessions }, { status: 200 })
  } catch (error) {
    console.error('Error fetching scheduled sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// POST - Create a new scheduled session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, scheduledAt, duration, agenda, templateId } = body

    if (!sessionId || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sessionData = {
      sessionId,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 30,
      agenda: agenda || '',
      templateId: templateId || null,
      notes: '',
      createdAt: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection('mentorship_scheduled_sessions').add(sessionData)

    // Note: Email notification skipped - Google Calendar invite handles this

    return NextResponse.json({
      scheduledSession: {
        id: docRef.id,
        ...sessionData,
        scheduledAt,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating scheduled session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}


// PUT - Update a scheduled session (rating, feedback, notes)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { scheduledSessionId, rating, feedback, notes } = body

    if (!scheduledSessionId) {
      return NextResponse.json({ error: 'Missing scheduledSessionId' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
    
    if (rating !== undefined) updateData.rating = rating
    if (feedback !== undefined) updateData.feedback = feedback
    if (notes !== undefined) updateData.notes = notes

    await db.collection('mentorship_scheduled_sessions').doc(scheduledSessionId).update(updateData)

    // If rating is 1, create an admin alert
    if (rating === 1) {
      await db.collection('mentorship_alerts').add({
        type: 'low_rating',
        scheduledSessionId,
        rating,
        feedback: feedback || '',
        createdAt: FieldValue.serverTimestamp(),
        resolved: false,
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error updating scheduled session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
