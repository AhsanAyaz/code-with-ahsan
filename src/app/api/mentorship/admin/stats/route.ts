import { NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'

export async function GET() {
  try {
    // Get mentor count
    const mentorsSnapshot = await db.collection('mentorship_profiles')
      .where('role', '==', 'mentor')
      .get()
    const totalMentors = mentorsSnapshot.size

    // Get mentee count
    const menteesSnapshot = await db.collection('mentorship_profiles')
      .where('role', '==', 'mentee')
      .get()
    const totalMentees = menteesSnapshot.size

    // Get match stats
    const matchesSnapshot = await db.collection('mentorship_sessions').get()
    const totalMatches = matchesSnapshot.size
    const activeMatches = matchesSnapshot.docs.filter(d => d.data().status === 'active').length
    const pendingMatches = matchesSnapshot.docs.filter(d => d.data().status === 'pending').length

    // Get goal stats
    const goalsSnapshot = await db.collection('mentorship_goals').get()
    const totalGoals = goalsSnapshot.size
    const completedGoals = goalsSnapshot.docs.filter(d => d.data().status === 'completed').length

    // Get session stats
    const sessionsSnapshot = await db.collection('mentorship_sessions').get()
    const totalSessions = sessionsSnapshot.size

    // Get ratings from mentor_ratings collection
    const ratingsSnapshot = await db.collection('mentor_ratings').get()
    const ratingsSum = ratingsSnapshot.docs.reduce((sum, doc) => {
      const rating = doc.data().rating
      return rating ? sum + rating : sum
    }, 0)
    const totalRatings = ratingsSnapshot.size
    const averageRating = totalRatings > 0 ? ratingsSum / totalRatings : 0

    // Get unresolved alerts
    const alertsSnapshot = await db.collection('mentorship_alerts')
      .where('resolved', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    const alerts = alertsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
    }))

    // Get pending project and roadmap counts
    const [pendingProjectsSnapshot, pendingRoadmapsSnapshot, pendingDraftRoadmapsSnapshot] = await Promise.all([
      db.collection('projects').where('status', '==', 'pending').get(),
      db.collection('roadmaps').where('status', '==', 'pending').get(),
      db.collection('roadmaps').where('hasPendingDraft', '==', true).get(),
    ]);
    const pendingProjects = pendingProjectsSnapshot.size;
    // Deduplicate: a roadmap could be both pending AND hasPendingDraft (unlikely but safe)
    const pendingRoadmapIds = new Set([
      ...pendingRoadmapsSnapshot.docs.map(d => d.id),
      ...pendingDraftRoadmapsSnapshot.docs.map(d => d.id),
    ]);
    const pendingRoadmaps = pendingRoadmapIds.size;

    return NextResponse.json({
      stats: {
        totalMentors,
        totalMentees,
        totalMatches,
        activeMatches,
        pendingMatches,
        completedGoals,
        totalGoals,
        totalSessions,
        averageRating,
        lowRatingAlerts: alerts.length,
        pendingProjects,
        pendingRoadmaps,
      },
      alerts,
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
