import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mentorId = searchParams.get("mentorId");

  if (!mentorId) {
    return NextResponse.json(
      { error: "Missing mentorId parameter" },
      { status: 400 },
    );
  }

  try {
    // Get pending requests for this mentor
    const requestsSnapshot = await db
      .collection("mentorship_sessions")
      .where("mentorId", "==", mentorId)
      .where("status", "==", "pending")
      .get();

    const requests = await Promise.all(
      requestsSnapshot.docs.map(async (doc) => {
        const matchData = doc.data();

        // Fetch mentee profile
        const menteeDoc = await db
          .collection("mentorship_profiles")
          .doc(matchData.menteeId)
          .get();

        const menteeProfile = menteeDoc.exists ? menteeDoc.data() : null;

        return {
          id: doc.id,
          ...matchData,
          requestedAt: matchData.requestedAt?.toDate?.() || null,
          menteeProfile: menteeProfile
            ? {
                displayName: menteeProfile.displayName,
                photoURL: menteeProfile.photoURL,
                email: menteeProfile.email,
                discordUsername: menteeProfile.discordUsername,
                education: menteeProfile.education,
                skillsSought: menteeProfile.skillsSought,
                careerGoals: menteeProfile.careerGoals,
                mentorshipGoals: menteeProfile.mentorshipGoals,
                learningStyle: menteeProfile.learningStyle,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mentor requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 },
    );
  }
}
