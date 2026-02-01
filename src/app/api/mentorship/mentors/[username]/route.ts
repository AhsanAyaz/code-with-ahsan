import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";

interface RouteContext {
  params: Promise<{ username: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { username } = await context.params;

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    // Check for admin token
    const adminToken = request.headers.get("x-admin-token");
    let isAdminRequest = false;

    if (adminToken) {
      // Validate admin token
      const sessionDoc = await db.collection("admin_sessions").doc(adminToken).get();
      if (sessionDoc.exists) {
        const session = sessionDoc.data();
        const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);
        if (expiresAt >= new Date()) {
          isAdminRequest = true;
        }
      }
    }

    // Fetch the mentor's profile by username
    const profilesSnapshot = await db
      .collection("mentorship_profiles")
      .where("username", "==", username.toLowerCase())
      .where("role", "==", "mentor")
      .limit(1)
      .get();

    if (profilesSnapshot.empty) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const profileDoc = profilesSnapshot.docs[0];
    const profileData = profileDoc.data();
    const uid = profileDoc.id;

    // Verify this is a public, accepted mentor (bypass for admin)
    if (profileData?.status !== "accepted" && !isAdminRequest) {
      return NextResponse.json(
        { error: "Mentor profile is not available" },
        { status: 404 }
      );
    }

    if (profileData?.isPublic === false && !isAdminRequest) {
      return NextResponse.json(
        { error: "Mentor profile is private" },
        { status: 404 }
      );
    }

    // Fetch mentor stats
    const [activeSessionsSnapshot, completedSessionsSnapshot, ratingsSnapshot] =
      await Promise.all([
        db
          .collection("mentorship_sessions")
          .where("mentorId", "==", uid)
          .where("status", "==", "active")
          .get(),
        db
          .collection("mentorship_sessions")
          .where("mentorId", "==", uid)
          .where("status", "==", "completed")
          .get(),
        db.collection("mentor_ratings").where("mentorId", "==", uid).get(),
      ]);

    const activeMenteeCount = activeSessionsSnapshot.size;
    const completedMentorships = completedSessionsSnapshot.size;

    // Calculate average rating
    let avgRating = 0;
    let ratingCount = 0;
    if (ratingsSnapshot.size > 0) {
      ratingCount = ratingsSnapshot.size;
      const totalRating = ratingsSnapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().rating || 0);
      }, 0);
      avgRating = Math.round((totalRating / ratingCount) * 10) / 10;
    }

    const mentor = {
      uid,
      username: profileData.username,
      displayName: profileData.displayName,
      photoURL: profileData.photoURL,
      currentRole: profileData.currentRole,
      bio: profileData.bio,
      majorProjects: profileData.majorProjects,
      expertise: profileData.expertise || [],
      availability: profileData.availability || {},
      maxMentees: profileData.maxMentees || DEFAULT_MAX_MENTEES,
      activeMenteeCount,
      completedMentorships,
      avgRating,
      ratingCount,
      isAtCapacity:
        activeMenteeCount >= (profileData.maxMentees || DEFAULT_MAX_MENTEES),
      createdAt: profileData.createdAt?.toDate?.() || null,
      status: profileData.status,
    };

    return NextResponse.json({ mentor }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mentor profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch mentor profile" },
      { status: 500 }
    );
  }
}
