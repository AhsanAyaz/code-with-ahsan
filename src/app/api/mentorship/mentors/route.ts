import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

interface MentorProfile {
  uid: string
  expertise?: string[]
  maxMentees?: number
  activeMenteeCount?: number
  isAtCapacity?: boolean
  createdAt: Date | null
  updatedAt: Date | null
  [key: string]: unknown
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const expertise = searchParams.get('expertise')

  try {
    const query = db.collection('mentorship_profiles').where('role', '==', 'mentor')
    
    const snapshot = await query.get()

    // Get active session counts for all mentors
    const activeSessionsSnapshot = await db.collection('mentorship_sessions')
      .where('status', '==', 'active')
      .get()

    // Count active mentees per mentor
    const mentorMenteeCounts: Record<string, number> = {}
    activeSessionsSnapshot.docs.forEach(doc => {
      const mentorId = doc.data().mentorId
      mentorMenteeCounts[mentorId] = (mentorMenteeCounts[mentorId] || 0) + 1
    })

    let mentors: MentorProfile[] = snapshot.docs.map(doc => {
      const data = doc.data()
      const maxMentees = data.maxMentees || 3
      const activeMenteeCount = mentorMenteeCounts[doc.id] || 0
      
      return {
        uid: doc.id,
        ...data,
        maxMentees,
        activeMenteeCount,
        isAtCapacity: activeMenteeCount >= maxMentees,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      } as MentorProfile
    })

    // Filter by expertise if specified
    if (expertise) {
      mentors = mentors.filter(m => 
        m.expertise && m.expertise.includes(expertise)
      )
    }

    return NextResponse.json({ mentors }, { status: 200 })
  } catch (error) {
    console.error('Error fetching mentors:', error)
    return NextResponse.json({ error: 'Failed to fetch mentors' }, { status: 500 })
  }
}
