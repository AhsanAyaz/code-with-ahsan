import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { socialReach } from '@/data/socialReach';

type CachedStats = {
  community: {
    mentors: number;
    mentees: number;
    activeMentorships: number;
    completedMentorships: number;
    averageRating: number;
  };
  social: typeof socialReach;
  cachedAt: string;
};

// In-memory cache
let statsCache: CachedStats | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (statsCache && now - cacheTimestamp < CACHE_TTL_MS) {
      return NextResponse.json(statsCache, {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      });
    }

    // Query Firestore in parallel
    const [mentorsSnapshot, menteesSnapshot, sessionsSnapshot, ratingsSnapshot] = await Promise.all([
      db.collection('mentorship_profiles')
        .where('role', '==', 'mentor')
        .where('status', '==', 'accepted')
        .get(),
      db.collection('mentorship_profiles')
        .where('role', '==', 'mentee')
        .get(),
      db.collection('mentorship_sessions').get(),
      db.collection('mentor_ratings').get(),
    ]);

    const mentors = mentorsSnapshot.size;
    const mentees = menteesSnapshot.size;

    const activeMentorships = sessionsSnapshot.docs.filter(
      (d) => d.data().status === 'active'
    ).length;
    const completedMentorships = sessionsSnapshot.docs.filter(
      (d) => d.data().status === 'completed'
    ).length;

    const ratingsSum = ratingsSnapshot.docs.reduce((sum, doc) => {
      const rating = doc.data().rating;
      return typeof rating === 'number' ? sum + rating : sum;
    }, 0);
    const totalRatings = ratingsSnapshot.size;
    const averageRating = totalRatings > 0 ? Math.round((ratingsSum / totalRatings) * 10) / 10 : 0;

    const cachedAt = new Date().toISOString();

    statsCache = {
      community: {
        mentors,
        mentees,
        activeMentorships,
        completedMentorships,
        averageRating,
      },
      social: socialReach,
      cachedAt,
    };
    cacheTimestamp = now;

    return NextResponse.json(statsCache, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
