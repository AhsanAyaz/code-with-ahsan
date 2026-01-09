import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

interface MentorProfile {
  uid: string
  expertise?: string[]
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

    let mentors: MentorProfile[] = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        uid: doc.id,
        ...data,
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
