import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";

interface MentorProfile {
  uid: string;
  username?: string;
  expertise?: string[];
  maxMentees?: number;
  activeMenteeCount?: number;
  completedMentorships?: number;
  avgRating?: number;
  ratingCount?: number;
  isAtCapacity?: boolean;
  isPublic?: boolean;
  status?: "pending" | "accepted" | "declined" | "disabled";
  createdAt: Date | null;
  updatedAt: Date | null;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const expertise = searchParams.get("expertise");
  const publicOnly = searchParams.get("public") === "true";

  try {
    const query = db
      .collection("mentorship_profiles")
      .where("role", "==", "mentor");

    const snapshot = await query.get();

    // Get all sessions for counting
    const [activeSessionsSnapshot, completedSessionsSnapshot, ratingsSnapshot] =
      await Promise.all([
        db
          .collection("mentorship_sessions")
          .where("status", "==", "active")
          .get(),
        db
          .collection("mentorship_sessions")
          .where("status", "==", "completed")
          .get(),
        db.collection("mentor_ratings").get(),
      ]);

    // Count active and completed mentees per mentor
    const mentorMenteeCounts: Record<string, number> = {};
    const mentorCompletedCounts: Record<string, number> = {};

    activeSessionsSnapshot.docs.forEach((doc) => {
      const mentorId = doc.data().mentorId;
      mentorMenteeCounts[mentorId] = (mentorMenteeCounts[mentorId] || 0) + 1;
    });

    completedSessionsSnapshot.docs.forEach((doc) => {
      const mentorId = doc.data().mentorId;
      mentorCompletedCounts[mentorId] =
        (mentorCompletedCounts[mentorId] || 0) + 1;
    });

    // Calculate average ratings per mentor
    const mentorRatings: Record<string, { total: number; count: number }> = {};
    ratingsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const mentorId = data.mentorId;
      if (!mentorRatings[mentorId]) {
        mentorRatings[mentorId] = { total: 0, count: 0 };
      }
      mentorRatings[mentorId].total += data.rating || 0;
      mentorRatings[mentorId].count += 1;
    });

    let mentors: MentorProfile[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const maxMentees = data.maxMentees || DEFAULT_MAX_MENTEES;
      const activeMenteeCount = mentorMenteeCounts[doc.id] || 0;
      const completedMentorships = mentorCompletedCounts[doc.id] || 0;
      const ratings = mentorRatings[doc.id];
      const avgRating = ratings
        ? Math.round((ratings.total / ratings.count) * 10) / 10
        : 0;
      const ratingCount = ratings?.count || 0;

      return {
        uid: doc.id,
        ...data,
        maxMentees,
        activeMenteeCount,
        completedMentorships,
        avgRating,
        ratingCount,
        isAtCapacity: activeMenteeCount >= maxMentees,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      } as MentorProfile;
    });

    // Always exclude disabled mentors from listings
    mentors = mentors.filter((m) => m.status !== "disabled");

    // Filter by public only if requested - only show accepted and public mentors
    if (publicOnly) {
      mentors = mentors.filter(
        (m) => m.isPublic !== false && m.status === "accepted"
      );
    }

    // Filter by expertise if specified
    if (expertise) {
      mentors = mentors.filter(
        (m) => m.expertise && m.expertise.includes(expertise)
      );
    }

    return NextResponse.json({ mentors }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    return NextResponse.json(
      { error: "Failed to fetch mentors" },
      { status: 500 }
    );
  }
}
