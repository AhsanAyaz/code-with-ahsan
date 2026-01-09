import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, resolved } = body

    if (!alertId) {
      return NextResponse.json({ error: 'Missing alertId' }, { status: 400 })
    }

    await db.collection('mentorship_alerts').doc(alertId).update({
      resolved: resolved ?? true,
      resolvedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
