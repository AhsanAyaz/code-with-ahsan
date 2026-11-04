import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAdminAccess } from "@/lib/adminAccess/server";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";

interface RouteContext {
  params: Promise<{ username: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { username } = await context.params;

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    // Optional admin preview: a staff member's Bearer ID token unlocks
    // non-public / non-accepted profiles. Anything else (no token, invalid
    // token, no admin role) just gets the public view; never a 401/403.
    const adminAccess = await requireAdminAccess(request, "mentorship.mentor.preview");
    const isAdminRequest = adminAccess.ok;

    // Fetch the mentor's profile by username
    const profilesSnapshot = await db
      .collection("mentorship_profiles")
      .where("username", "==", username.toLowerCase())
      .limit(1)
      .get();

    if (profilesSnapshot.empty) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const profileDoc = profilesSnapshot.docs[0];
    const profileData = profileDoc.data();
    const uid = profileDoc.id;

    // Verify mentor role (array-based; legacy `role` field removed)
    if (!Array.isArray(profileData?.roles) || !profileData.roles.includes("mentor")) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    // Verify this is a public, accepted mentor (bypass for admin)
    if (profileData?.status !== "accepted" && !isAdminRequest) {
      return NextResponse.json({ error: "Mentor profile is not available" }, { status: 404 });
    }

    if (profileData?.isPublic === false && !isAdminRequest) {
      return NextResponse.json({ error: "Mentor profile is private" }, { status: 404 });
    }

    // Fetch mentor stats
    const [activeSessionsSnapshot, completedSessionsSnapshot, ratingsSnapshot] = await Promise.all([
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
      isAtCapacity: activeMenteeCount >= (profileData.maxMentees || DEFAULT_MAX_MENTEES),
      hasTimeSlots: !!profileData.timeSlotAvailability?.timezone,
      createdAt: profileData.createdAt?.toDate?.() || null,
      status: profileData.status,
      linkedinUrl: profileData.linkedinUrl,
    };

    return NextResponse.json({ mentor }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mentor profile:", error);
    return NextResponse.json({ error: "Failed to fetch mentor profile" }, { status: 500 });
  }
}
