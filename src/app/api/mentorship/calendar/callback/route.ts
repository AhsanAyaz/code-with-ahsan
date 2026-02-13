/**
 * Google Calendar OAuth Callback Endpoint
 *
 * GET /api/mentorship/calendar/callback?code={code}&state={mentorId}
 * - Handles OAuth callback from Google
 * - Exchanges authorization code for tokens
 * - Stores encrypted refresh token in Firestore
 * - Redirects user back to profile page
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import {
  exchangeCodeForTokens,
  encryptToken,
} from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const mentorId = searchParams.get("state");

    // Validate parameters
    if (!code || !mentorId) {
      console.error("Missing code or state parameter", { code, mentorId });
      return NextResponse.redirect(
        new URL("/profile?calendar=error&reason=missing_params", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Check if we got a refresh token
    if (!tokens.refresh_token) {
      console.error("No refresh token received from Google", { mentorId });
      return NextResponse.redirect(
        new URL(
          "/profile?calendar=error&reason=no_refresh_token",
          request.url
        )
      );
    }

    // Encrypt refresh token
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    // Update mentor profile
    const profileQuery = await db
      .collection("mentorship_profiles")
      .where("uid", "==", mentorId)
      .limit(1)
      .get();

    if (profileQuery.empty) {
      console.error("Mentor profile not found", { mentorId });
      return NextResponse.redirect(
        new URL("/profile?calendar=error&reason=profile_not_found", request.url)
      );
    }

    await profileQuery.docs[0].ref.update({
      googleCalendarRefreshToken: encryptedRefreshToken,
      googleCalendarConnected: true,
      googleCalendarConnectedAt: new Date(),
    });

    console.log("Successfully connected Google Calendar", { mentorId });

    // Redirect back to profile with success message
    return NextResponse.redirect(
      new URL("/profile?calendar=connected", request.url)
    );
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/profile?calendar=error", request.url)
    );
  }
}
