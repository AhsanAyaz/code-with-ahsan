import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import bcrypt from 'bcryptjs'

// POST: Verify admin password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    // Get the admin config from Firestore
    const configDoc = await db.collection('config').doc('admin').get()
    
    if (!configDoc.exists) {
      return NextResponse.json({ 
        error: 'Admin password not configured. Please run the setup script.' 
      }, { status: 500 })
    }

    const config = configDoc.data()
    const hashedPassword = config?.passwordHash

    if (!hashedPassword) {
      return NextResponse.json({ 
        error: 'Admin password not configured' 
      }, { status: 500 })
    }

    // Verify password using bcrypt
    const isValid = await bcrypt.compare(password, hashedPassword)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate a simple session token (in production, use proper JWT)
    const sessionToken = Buffer.from(`admin:${Date.now()}:${Math.random()}`).toString('base64')
    
    // Store session in Firestore with expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    await db.collection('admin_sessions').doc(sessionToken).set({
      createdAt: new Date(),
      expiresAt,
    })

    return NextResponse.json({ 
      success: true,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    }, { status: 200 })
  } catch (error) {
    console.error('Error verifying admin password:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

// GET: Verify if a session token is valid
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('x-admin-token')

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    const sessionDoc = await db.collection('admin_sessions').doc(token).get()
    
    if (!sessionDoc.exists) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    const session = sessionDoc.data()
    const expiresAt = session?.expiresAt?.toDate?.() || new Date(0)
    
    if (expiresAt < new Date()) {
      // Session expired, delete it
      await db.collection('admin_sessions').doc(token).delete()
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    return NextResponse.json({ valid: true }, { status: 200 })
  } catch (error) {
    console.error('Error verifying session:', error)
    return NextResponse.json({ valid: false }, { status: 200 })
  }
}

// DELETE: Logout / invalidate session
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('x-admin-token')

    if (token) {
      await db.collection('admin_sessions').doc(token).delete()
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error logging out:', error)
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
