import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

// GET: Fetch reviews for a specific mentor with mentee details
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mentorId = searchParams.get('mentorId')

  if (!mentorId) {
    return NextResponse.json({ error: 'Missing mentorId parameter' }, { status: 400 })
  }

  try {
    // Fetch all reviews for this mentor
    const ratingsSnapshot = await db.collection('mentor_ratings')
      .where('mentorId', '==', mentorId)
      .orderBy('createdAt', 'desc')
      .get()

    // Get unique mentee IDs to fetch their profiles
    const menteeIds = [...new Set(ratingsSnapshot.docs.map(doc => doc.data().menteeId))]
    
    // Fetch mentee profiles
    const menteeProfiles: Record<string, { displayName?: string; email?: string; photoURL?: string }> = {}
    
    if (menteeIds.length > 0) {
      const menteeDocs = await Promise.all(
        menteeIds.map(id => db.collection('mentorship_profiles').doc(id).get())
      )
      
      menteeDocs.forEach(doc => {
        if (doc.exists) {
          const data = doc.data()!
          menteeProfiles[doc.id] = {
            displayName: data.displayName,
            email: data.email,
            photoURL: data.photoURL,
          }
        }
      })
    }

    // Map reviews with mentee details
    const reviews = ratingsSnapshot.docs.map(doc => {
      const data = doc.data()
      const mentee = menteeProfiles[data.menteeId] || {}
      
      return {
        id: doc.id,
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        sessionId: data.sessionId,
        rating: data.rating,
        feedback: data.feedback || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        menteeName: mentee.displayName || 'Unknown',
        menteeEmail: mentee.email || '',
        menteePhoto: mentee.photoURL || null,
      }
    })

    return NextResponse.json({ reviews }, { status: 200 })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}
