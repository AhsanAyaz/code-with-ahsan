import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

// Helper function to split arrays into chunks for batch queries
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// GET: Fetch mentorship matches with joined profile data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') // 'mentor' | 'mentee'

  if (!role || !['mentor', 'mentee'].includes(role)) {
    return NextResponse.json({ error: 'Invalid or missing role parameter. Use "mentor" or "mentee".' }, { status: 400 })
  }

  try {
    // Fetch all matches with relevant statuses
    const matchesSnapshot = await db.collection('mentorship_matches')
      .where('status', 'in', ['active', 'completed', 'pending', 'cancelled'])
      .get()

    // Extract unique mentor and mentee IDs
    const mentorIds = [...new Set(matchesSnapshot.docs.map(doc => doc.data().mentorId as string))]
    const menteeIds = [...new Set(matchesSnapshot.docs.map(doc => doc.data().menteeId as string))]

    // Batch fetch mentor profiles (Firestore 'in' query limit is 30)
    const mentorSnapshots = await Promise.all(
      chunkArray(mentorIds, 30).map(ids =>
        db.collection('mentorship_profiles').where('uid', 'in', ids).get()
      )
    )

    // Batch fetch mentee profiles
    const menteeSnapshots = await Promise.all(
      chunkArray(menteeIds, 30).map(ids =>
        db.collection('mentorship_profiles').where('uid', 'in', ids).get()
      )
    )

    // Build lookup maps for profiles
    const mentorMap = new Map<string, any>()
    mentorSnapshots.forEach(snap =>
      snap.docs.forEach(doc => {
        const data = doc.data()
        mentorMap.set(doc.id, {
          uid: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        })
      })
    )

    const menteeMap = new Map<string, any>()
    menteeSnapshots.forEach(snap =>
      snap.docs.forEach(doc => {
        const data = doc.data()
        menteeMap.set(doc.id, {
          uid: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        })
      })
    )

    // Join profile data onto each match and convert timestamps
    const matchesWithProfiles = matchesSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        status: data.status,
        discordChannelId: data.discordChannelId,
        discordChannelUrl: data.discordChannelUrl,
        matchScore: data.matchScore,
        cancellationReason: data.cancellationReason,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || null,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || null,
        lastContactAt: data.lastContactAt?.toDate?.()?.toISOString() || null,
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || null,
        cancelledBy: data.cancelledBy,
        mentorProfile: mentorMap.get(data.mentorId),
        menteeProfile: menteeMap.get(data.menteeId),
      }
    })

    // Group matches by requested role
    let grouped: any[]
    if (role === 'mentor') {
      // Group by mentor
      const mentorGroupMap = new Map<string, any>()

      matchesWithProfiles.forEach(match => {
        if (!mentorGroupMap.has(match.mentorId)) {
          mentorGroupMap.set(match.mentorId, {
            profile: match.mentorProfile,
            mentorships: []
          })
        }

        // Add this mentorship with partner profile
        mentorGroupMap.get(match.mentorId).mentorships.push({
          id: match.id,
          status: match.status,
          discordChannelId: match.discordChannelId,
          discordChannelUrl: match.discordChannelUrl,
          approvedAt: match.approvedAt,
          lastContactAt: match.lastContactAt,
          requestedAt: match.requestedAt,
          cancelledAt: match.cancelledAt,
          cancelledBy: match.cancelledBy,
          cancellationReason: match.cancellationReason,
          partnerProfile: match.menteeProfile
        })
      })

      // Fetch ALL mentor profiles to include those with no matches
      const allMentorsSnapshot = await db.collection('mentorship_profiles')
        .where('role', '==', 'mentor')
        .get()

      allMentorsSnapshot.docs.forEach(doc => {
        if (!mentorGroupMap.has(doc.id)) {
          const data = doc.data()
          mentorGroupMap.set(doc.id, {
            profile: {
              uid: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
            },
            mentorships: []
          })
        }
      })

      grouped = Array.from(mentorGroupMap.values())
    } else {
      // Group by mentee
      const menteeGroupMap = new Map<string, any>()

      matchesWithProfiles.forEach(match => {
        if (!menteeGroupMap.has(match.menteeId)) {
          menteeGroupMap.set(match.menteeId, {
            profile: match.menteeProfile,
            mentorships: []
          })
        }

        // Add this mentorship with partner profile
        menteeGroupMap.get(match.menteeId).mentorships.push({
          id: match.id,
          status: match.status,
          discordChannelId: match.discordChannelId,
          discordChannelUrl: match.discordChannelUrl,
          approvedAt: match.approvedAt,
          lastContactAt: match.lastContactAt,
          requestedAt: match.requestedAt,
          cancelledAt: match.cancelledAt,
          cancelledBy: match.cancelledBy,
          cancellationReason: match.cancellationReason,
          partnerProfile: match.mentorProfile
        })
      })

      // Fetch ALL mentee profiles to include those with no matches
      const allMenteesSnapshot = await db.collection('mentorship_profiles')
        .where('role', '==', 'mentee')
        .get()

      allMenteesSnapshot.docs.forEach(doc => {
        if (!menteeGroupMap.has(doc.id)) {
          const data = doc.data()
          menteeGroupMap.set(doc.id, {
            profile: {
              uid: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
            },
            mentorships: []
          })
        }
      })

      grouped = Array.from(menteeGroupMap.values())
    }

    // Calculate summary stats
    const activeMentorships = matchesWithProfiles.filter(m => m.status === 'active').length
    const completedMentorships = matchesWithProfiles.filter(m => m.status === 'completed').length

    // Update stats to reflect ALL mentors/mentees (including those with no matches)
    const totalMentors = grouped.filter(g => g.profile?.role === 'mentor').length || grouped.length
    const totalMentees = grouped.filter(g => g.profile?.role === 'mentee').length || grouped.length

    return NextResponse.json({
      matches: grouped,
      summary: {
        totalMentors,
        totalMentees,
        activeMentorships,
        completedMentorships
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching matches:', error)
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
  }
}
