import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')
  const role = searchParams.get('role')

  if (!uid || !role) {
    return NextResponse.json({ error: 'Missing uid or role parameter' }, { status: 400 })
  }

  try {
    const fieldToQuery = role === 'mentor' ? 'mentorId' : 'menteeId'
    const partnerField = role === 'mentor' ? 'menteeId' : 'mentorId'

    // Get active matches
    const activeSnapshot = await db.collection('mentorship_sessions')
      .where(fieldToQuery, '==', uid)
      .where('status', '==', 'active')
      .get()

    // Get pending matches
    const pendingSnapshot = await db.collection('mentorship_sessions')
      .where(fieldToQuery, '==', uid)
      .where('status', '==', 'pending')
      .get()

    // Get completed matches
    const completedSnapshot = await db.collection('mentorship_sessions')
      .where(fieldToQuery, '==', uid)
      .where('status', '==', 'completed')
      .get()

    const fetchPartnerProfile = async (partnerId: string) => {
      const profileDoc = await db.collection('mentorship_profiles').doc(partnerId).get()
      if (!profileDoc.exists) return null
      const data = profileDoc.data()
      return {
        uid: profileDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.() || null,
        updatedAt: data?.updatedAt?.toDate?.() || null,
      }
    }

    const activeMatches = await Promise.all(
      activeSnapshot.docs.map(async (doc) => {
        const data = doc.data()
        const partnerProfile = await fetchPartnerProfile(data[partnerField])
        return {
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.() || null,
          approvedAt: data.approvedAt?.toDate?.() || null,
          lastContactAt: data.lastContactAt?.toDate?.() || null,
          partnerProfile,
        }
      })
    )

    const pendingMatches = await Promise.all(
      pendingSnapshot.docs.map(async (doc) => {
        const data = doc.data()
        const partnerProfile = await fetchPartnerProfile(data[partnerField])
        return {
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.() || null,
          partnerProfile,
        }
      })
    )

    const completedMatches = await Promise.all(
      completedSnapshot.docs.map(async (doc) => {
        const data = doc.data()
        const partnerProfile = await fetchPartnerProfile(data[partnerField])
        return {
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.() || null,
          approvedAt: data.approvedAt?.toDate?.() || null,
          completedAt: data.completedAt?.toDate?.() || null,
          hasRating: data.hasRating || false,
          partnerProfile,
        }
      })
    )

    return NextResponse.json({ activeMatches, pendingMatches, completedMatches }, { status: 200 })
  } catch (error) {
    console.error('Error fetching my matches:', error)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }
}
