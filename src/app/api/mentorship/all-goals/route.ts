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

    // Get all active matches
    const matchesSnapshot = await db.collection('mentorship_sessions')
      .where(fieldToQuery, '==', uid)
      .where('status', '==', 'active')
      .get()

    const matchesWithGoals = await Promise.all(
      matchesSnapshot.docs.map(async (matchDoc) => {
        const matchData = matchDoc.data()
        
        // Get partner name
        const partnerDoc = await db.collection('mentorship_profiles')
          .doc(matchData[partnerField])
          .get()
        const partnerName = partnerDoc.exists ? partnerDoc.data()?.displayName : 'Unknown'

        // Get goals for this match
        const goalsSnapshot = await db.collection('mentorship_goals')
          .where('matchId', '==', matchDoc.id)
          .get()

        const goals = goalsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            matchId: matchDoc.id,
            title: data.title,
            status: data.status,
            targetDate: data.targetDate?.toDate?.() || data.targetDate || null,
          }
        })

        return {
          matchId: matchDoc.id,
          partnerName,
          goals,
        }
      })
    )

    return NextResponse.json({ matchesWithGoals }, { status: 200 })
  } catch (error) {
    console.error('Error fetching all goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}
