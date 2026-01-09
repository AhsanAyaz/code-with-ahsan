import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('matchId')

  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId parameter' }, { status: 400 })
  }

  try {
    const goalsSnapshot = await db.collection('mentorship_goals')
      .where('matchId', '==', matchId)
      .orderBy('createdAt', 'desc')
      .get()

    const goals = goalsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        targetDate: data.targetDate?.toDate?.() || data.targetDate || null,
        createdAt: data.createdAt?.toDate?.() || null,
      }
    })

    return NextResponse.json({ goals }, { status: 200 })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, createdBy, title, description, targetDate } = body

    if (!matchId || !createdBy || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const goalData = {
      matchId,
      createdBy,
      title,
      description: description || '',
      targetDate: targetDate ? new Date(targetDate) : null,
      status: 'in-progress',
      createdAt: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection('mentorship_goals').add(goalData)

    return NextResponse.json({
      goal: {
        id: docRef.id,
        ...goalData,
        targetDate: targetDate || null,
        createdAt: new Date().toISOString(),
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { goalId, status } = body

    if (!goalId || !status) {
      return NextResponse.json({ error: 'Missing goalId or status' }, { status: 400 })
    }

    await db.collection('mentorship_goals').doc(goalId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}
