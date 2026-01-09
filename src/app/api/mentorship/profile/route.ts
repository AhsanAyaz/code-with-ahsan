import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 })
  }

  try {
    const profileDoc = await db.collection('mentorship_profiles').doc(uid).get()
    
    if (!profileDoc.exists) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    const profileData = profileDoc.data()
    return NextResponse.json({ 
      profile: {
        ...profileData,
        uid: profileDoc.id,
        createdAt: profileData?.createdAt?.toDate?.() || null,
        updatedAt: profileData?.updatedAt?.toDate?.() || null,
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching mentorship profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, role, displayName, email, photoURL, ...profileData } = body

    if (!uid || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const now = new Date()
    const profile = {
      uid,
      role,
      displayName: displayName || '',
      email: email || '',
      photoURL: photoURL || '',
      ...profileData,
      createdAt: now,
      updatedAt: now,
    }

    await db.collection('mentorship_profiles').doc(uid).set(profile)

    return NextResponse.json({ 
      success: true, 
      profile: {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating mentorship profile:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, ...updates } = body

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
    }

    const profileRef = db.collection('mentorship_profiles').doc(uid)
    const profileDoc = await profileRef.get()

    if (!profileDoc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await profileRef.update({
      ...updates,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error updating mentorship profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
