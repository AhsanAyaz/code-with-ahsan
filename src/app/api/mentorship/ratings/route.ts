import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { sendRatingReceivedEmail } from '@/lib/email'


// POST: Submit a rating for a completed mentorship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mentorId, menteeId, sessionId, rating, feedback } = body

    // Validate required fields
    if (!mentorId || !menteeId || !sessionId || !rating) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate rating is 1-5
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Verify the session exists and is completed
    const sessionDoc = await db.collection('mentorship_sessions').doc(sessionId).get()
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const sessionData = sessionDoc.data()!
    if (sessionData.status !== 'completed') {
      return NextResponse.json({ error: 'Can only rate completed mentorships' }, { status: 400 })
    }

    // Verify the mentee is part of this session
    if (sessionData.menteeId !== menteeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if rating already exists for this session
    const existingRating = await db.collection('mentor_ratings')
      .where('sessionId', '==', sessionId)
      .get()

    if (!existingRating.empty) {
      return NextResponse.json({ error: 'You have already rated this mentorship' }, { status: 400 })
    }

    // Create the rating
    const ratingDoc = await db.collection('mentor_ratings').add({
      mentorId,
      menteeId,
      sessionId,
      rating,
      feedback: feedback || null,
      createdAt: new Date(),
    })

    // Update session to mark as rated
    await db.collection('mentorship_sessions').doc(sessionId).update({
      hasRating: true,
      ratingId: ratingDoc.id,
    })

    // Send rating notification to mentor
    const mentorProfile = await db.collection('mentorship_profiles').doc(mentorId).get()
    if (mentorProfile.exists) {
      const mentorData = mentorProfile.data()
      sendRatingReceivedEmail(
        {
          uid: mentorId,
          displayName: mentorData?.displayName || '',
          email: mentorData?.email || '',
          role: 'mentor',
        },
        { rating, feedback: feedback || undefined }
      ).catch(err => console.error('Failed to send rating email:', err))
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Thank you for your feedback!' 
    }, { status: 201 })
  } catch (error) {
    console.error('Error submitting rating:', error)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
}

// GET: Get ratings for a mentor or average ratings summary
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mentorId = searchParams.get('mentorId')
  const summary = searchParams.get('summary') === 'true'

  try {
    if (!mentorId && !summary) {
      return NextResponse.json({ error: 'Missing mentorId or summary parameter' }, { status: 400 })
    }

    // Get overall summary for admin dashboard
    if (summary) {
      const ratingsSnapshot = await db.collection('mentor_ratings').get()
      
      let totalRating = 0
      let ratingCount = 0
      
      ratingsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.rating) {
          totalRating += data.rating
          ratingCount++
        }
      })

      const avgRating = ratingCount > 0 ? (totalRating / ratingCount) : 0

      return NextResponse.json({
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratingCount,
      }, { status: 200 })
    }

    // Get ratings for a specific mentor
    const ratingsSnapshot = await db.collection('mentor_ratings')
      .where('mentorId', '==', mentorId)
      .get()

    let totalRating = 0
    const ratings = ratingsSnapshot.docs.map(doc => {
      const data = doc.data()
      totalRating += data.rating || 0
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
    })

    const avgRating = ratings.length > 0 ? (totalRating / ratings.length) : 0

    return NextResponse.json({
      ratings,
      avgRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length,
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}
