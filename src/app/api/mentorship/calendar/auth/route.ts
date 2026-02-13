/**
 * Google Calendar OAuth Authorization Endpoint
 *
 * GET /api/mentorship/calendar/auth
 * - Initiates OAuth flow by redirecting mentor to Google consent screen
 * - Authenticated endpoint (mentor-only)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/firebaseAdmin";
import { getAuthUrl, isCalendarConfigured } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a mentor
    const profileQuery = await db
      .collection("mentorship_profiles")
      .where("uid", "==", auth.uid)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const profile = profileQuery.docs[0].data();
    if (profile.role !== "mentor") {
      return NextResponse.json(
        { error: "Only mentors can connect Google Calendar" },
        { status: 403 }
      );
    }

    // Check if Google Calendar is configured
    if (!isCalendarConfigured()) {
      console.error("Google Calendar integration not configured");
      return NextResponse.json(
        { error: "Google Calendar integration not configured" },
        { status: 503 }
      );
    }

    // Generate OAuth URL
    const authUrl = getAuthUrl(auth.uid);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
