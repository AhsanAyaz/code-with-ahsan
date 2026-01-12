import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { sendRegistrationStatusEmail, sendAccountStatusEmail } from '@/lib/email'


// GET: Fetch all profiles with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') // 'mentor' | 'mentee' | null for all
  const status = searchParams.get('status') // 'pending' | 'accepted' | 'declined' | 'disabled' | null for all

  try {
    let query: FirebaseFirestore.Query = db.collection('mentorship_profiles')
    
    if (role) {
      query = query.where('role', '==', role)
    }
    
    if (status) {
      query = query.where('status', '==', status)
    }
    
    // Also fetch disabled sessions count and ratings for each profile
    const [snapshot, sessionsSnapshot, ratingsSnapshot] = await Promise.all([
      query.get(),
      db.collection('mentorship_sessions').where('status', '==', 'disabled').get(),
      db.collection('mentor_ratings').get()
    ])

    // Count disabled sessions per user
    const disabledSessionsMap: Record<string, number> = {}
    sessionsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.mentorId) {
        disabledSessionsMap[data.mentorId] = (disabledSessionsMap[data.mentorId] || 0) + 1
      }
      if (data.menteeId) {
        disabledSessionsMap[data.menteeId] = (disabledSessionsMap[data.menteeId] || 0) + 1
      }
    })

    // Calculate average ratings per mentor
    const mentorRatings: Record<string, { total: number; count: number }> = {}
    ratingsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const mentorId = data.mentorId
      if (!mentorRatings[mentorId]) {
        mentorRatings[mentorId] = { total: 0, count: 0 }
      }
      mentorRatings[mentorId].total += data.rating || 0
      mentorRatings[mentorId].count += 1
    })

    const profiles = snapshot.docs.map(doc => {
      const data = doc.data()
      const ratings = mentorRatings[doc.id]
      const avgRating = ratings ? Math.round((ratings.total / ratings.count) * 10) / 10 : 0
      const ratingCount = ratings?.count || 0
      
      return {
        uid: doc.id,
        ...data,
        disabledSessionsCount: disabledSessionsMap[doc.id] || 0,
        avgRating,
        ratingCount,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      }
    })

    return NextResponse.json({ profiles }, { status: 200 })
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 })
  }
}

// PUT: Update profile status (accept/decline/disable)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, status, adminNotes, reactivateSessions } = body

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
    }

    if (!status || !['pending', 'accepted', 'declined', 'disabled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const profileRef = db.collection('mentorship_profiles').doc(uid)
    const profileDoc = await profileRef.get()

    if (!profileDoc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const previousStatus = profileDoc.data()?.status
    
    // Update the profile status
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    }
    
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes
    }

    // Track when status changed to accepted
    if (status === 'accepted' && previousStatus !== 'accepted') {
      updateData.acceptedAt = new Date()
    }

    await profileRef.update(updateData)

    // If disabling a profile, also deactivate their mentorship sessions
    if (status === 'disabled') {
      const sessionsSnapshot = await db.collection('mentorship_sessions')
        .where('status', '==', 'active')
        .get()

      const batch = db.batch()
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        // Check if this user is involved in the session
        if (data.mentorId === uid || data.menteeId === uid) {
          batch.update(doc.ref, { 
            status: 'disabled',
            disabledAt: new Date(),
            disabledReason: 'Profile disabled by admin'
          })
        }
      })
      
      await batch.commit()
    }

    // If re-enabling and reactivateSessions flag is true, reactivate disabled sessions
    let reactivatedCount = 0
    if (status === 'accepted' && reactivateSessions) {
      const disabledSessionsSnapshot = await db.collection('mentorship_sessions')
        .where('status', '==', 'disabled')
        .get()

      const batch = db.batch()
      disabledSessionsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        // Check if this user is involved in the session and it was disabled by admin
        if ((data.mentorId === uid || data.menteeId === uid) && data.disabledReason === 'Profile disabled by admin') {
          batch.update(doc.ref, { 
            status: 'active',
            reactivatedAt: new Date(),
            disabledAt: null,
            disabledReason: null
          })
          reactivatedCount++
        }
      })
      
      await batch.commit()
    }

    // Send email notifications for status changes
    const profileData = profileDoc.data()
    if (profileData?.email) {
      const userProfile = {
        uid,
        displayName: profileData.displayName || '',
        email: profileData.email,
        role: profileData.role,
      }
      
      // Registration approval/decline emails (only for pending -> accepted/declined)
      if (status === 'accepted' && previousStatus === 'pending') {
        sendRegistrationStatusEmail(userProfile, true)
          .catch(err => console.error('Failed to send approval email:', err))
      } else if (status === 'declined' && previousStatus === 'pending') {
        sendRegistrationStatusEmail(userProfile, false)
          .catch(err => console.error('Failed to send decline email:', err))
      }
      
      // Account disabled/enabled emails
      if (status === 'disabled' && previousStatus !== 'disabled') {
        sendAccountStatusEmail(userProfile, 'disabled', adminNotes)
          .catch(err => console.error('Failed to send disabled email:', err))
      } else if (status === 'accepted' && previousStatus === 'disabled') {
        sendAccountStatusEmail(userProfile, 'enabled')
          .catch(err => console.error('Failed to send enabled email:', err))
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Profile ${status === 'accepted' ? 'approved' : status === 'declined' ? 'declined' : status === 'disabled' ? 'disabled' : 'updated'} successfully`,
      reactivatedSessions: reactivatedCount
    }, { status: 200 })
  } catch (error) {
    console.error('Error updating profile status:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
