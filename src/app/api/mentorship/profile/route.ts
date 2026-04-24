import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { sendAdminMentorPendingEmail } from "@/lib/email";
import {
  lookupMemberByUsername,
  isDiscordConfigured,
  assignDiscordRole,
  DISCORD_MENTOR_ROLE_ID,
  DISCORD_MENTEE_ROLE_ID
} from "@/lib/discord";
import { syncRoleClaim } from "@/lib/ambassador/roleMutation";
import { consumeReferral } from "@/lib/ambassador/referral";
import { REFERRAL_COOKIE_NAME } from "@/lib/ambassador/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return NextResponse.json(
      { error: "Missing uid parameter" },
      { status: 400 }
    );
  }

  try {
    const profileDoc = await db
      .collection("mentorship_profiles")
      .doc(uid)
      .get();

    if (!profileDoc.exists) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const profileData = profileDoc.data();
    return NextResponse.json(
      {
        profile: {
          ...profileData,
          uid: profileDoc.id,
          createdAt: profileData?.createdAt?.toDate?.() || null,
          updatedAt: profileData?.updatedAt?.toDate?.() || null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching mentorship profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, role, displayName, email, photoURL, ...profileData } = body;

    if (!uid || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Set initial status: mentors require approval (pending), mentees are auto-accepted
    const status = role === "mentor" ? "pending" : "accepted";

    // Generate default username from email (before @)
    // Make it URL-safe by removing special characters and lowercasing
    const baseUsername =
      (email || "")
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "") || `user${Date.now()}`;
    let username = baseUsername;

    // Ensure username uniqueness
    let counter = 1;
    let usernameExists = true;
    while (usernameExists) {
      const existingProfile = await db
        .collection("mentorship_profiles")
        .where("username", "==", username)
        .limit(1)
        .get();

      if (existingProfile.empty) {
        usernameExists = false;
      } else {
        username = `${baseUsername}${counter}`;
        counter++;
      }
    }

    const profile = {
      uid,
      username,
      role,
      roles: [role], // dual-write: legacy `role` + new `roles` array (per Plan 07)
      status,
      displayName: displayName || "",
      email: email || "",
      photoURL: photoURL || "",
      ...profileData,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("mentorship_profiles").doc(uid).set(profile);

    // Sync Firebase Auth custom claims so the user's next ID token carries the
    // updated roles within seconds (per D-14 — no >1hr stale-claim window).
    // Non-fatal: a claim-sync failure is logged but does not reject the request.
    // scripts/sync-custom-claims.ts cleans up any drift on its next run.
    const claimSync = await syncRoleClaim(uid, {
      roles: profile.roles ?? [],
      admin: profile.isAdmin === true,
    });
    if (!claimSync.ok) {
      console.warn(`[profile.POST] claim sync failed for ${uid}:`, claimSync.error);
    }

    // Assign Discord role (fire-and-forget)
    if (isDiscordConfigured() && profileData.discordUsername) {
      const roleId = role === "mentor" ? DISCORD_MENTOR_ROLE_ID : DISCORD_MENTEE_ROLE_ID;
      assignDiscordRole(profileData.discordUsername, roleId).catch((err) =>
        console.error("Failed to assign Discord role:", err)
      );
    }

    // Send admin notification for pending mentor registration
    if (role === "mentor") {
      // Fire and forget - don't block the response
      sendAdminMentorPendingEmail({
        uid,
        displayName: displayName || "",
        email: email || "",
        role: "mentor",
        expertise: profileData.expertise,
        currentRole: profileData.currentRole,
        bio: profileData.bio,
      }).catch((err) =>
        console.error("Failed to send admin notification:", err)
      );
    }

    // Phase 4 (REF-03): If a cwa_ref cookie is present, consume it now.
    // HttpOnly cookie — only readable server-side. Must be synchronous (await) so the
    // Set-Cookie clear header lands on the outgoing response (RESEARCH Pitfall 1).
    // consumeReferral never throws (wraps all in try/catch) — signup always completes.
    const refCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
    let referralConsumed = false;
    if (refCode) {
      const result = await consumeReferral(uid, refCode);
      if (result.ok) {
        console.log(
          `[profile.POST] Referral attribution success: ambassador=${result.ambassadorId} user=${uid} code=${refCode} referralId=${result.referralId}`,
        );
      } else {
        console.log(
          `[profile.POST] Referral attribution skipped: user=${uid} code=${refCode} reason=${result.reason}`,
        );
      }
      // WR-05: Only clear the cookie on non-retriable outcomes. A transient
      // Firestore error (reason="error") should NOT permanently delete the cookie
      // — the next signup attempt should retry attribution. Definitive outcomes
      // (ok, unknown_code, self_attribution, already_attributed) clear the cookie
      // so the user isn't retried endlessly on a code that will never succeed.
      if (result.ok || result.reason !== "error") {
        referralConsumed = true;
      }
    }

    const response = NextResponse.json(
      {
        success: true,
        profile: {
          ...profile,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
        _claimSync: claimSync.ok
          ? { refreshed: true }
          : { refreshed: false, error: claimSync.error },
      },
      { status: 201 }
    );

    if (referralConsumed) {
      // Phase 4 (REF-03): clear cookie on the outgoing response — one-time consumption
      response.cookies.delete(REFERRAL_COOKIE_NAME);
    }

    return response;
  } catch (error) {
    console.error("Error creating mentorship profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, username, ...updates } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const profileRef = db.collection("mentorship_profiles").doc(uid);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // If username is being updated, validate it
    if (username !== undefined) {
      // Validate username format
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (cleanUsername !== username.toLowerCase()) {
        return NextResponse.json(
          {
            error:
              "Username can only contain letters, numbers, underscores, and hyphens",
          },
          { status: 400 }
        );
      }

      if (username.length < 3 || username.length > 30) {
        return NextResponse.json(
          { error: "Username must be between 3 and 30 characters" },
          { status: 400 }
        );
      }

      // Check uniqueness (excluding current user)
      const existingProfile = await db
        .collection("mentorship_profiles")
        .where("username", "==", username.toLowerCase())
        .limit(1)
        .get();

      if (!existingProfile.empty && existingProfile.docs[0].id !== uid) {
        return NextResponse.json(
          { error: "This username is already taken" },
          { status: 409 }
        );
      }

      updates.username = username.toLowerCase();
    }

    // If discordUsername is being updated, validate it against the Discord server
    if (updates.discordUsername !== undefined && isDiscordConfigured()) {
      const cleanDiscordUsername = updates.discordUsername
        .trim()
        .toLowerCase()
        .replace(/^@/, "");
      
      if (cleanDiscordUsername) {
        try {
          const member = await lookupMemberByUsername(cleanDiscordUsername);
          updates.discordUsernameValidated = !!member;
          // Use the exact username from Discord if found
          if (member?.username) {
            updates.discordUsername = member.username;
          }
        } catch (error) {
          console.error("Discord validation error:", error);
          // Don't fail the update, just mark as not validated
          updates.discordUsernameValidated = false;
        }
      } else {
        // Empty discord username
        updates.discordUsernameValidated = undefined;
      }
    }

    const updatePayload: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date(),
    };

    // Handle resubmit: reset status from changes_requested to pending
    if (body.resubmit === true) {
      const currentData = profileDoc.data();
      if (currentData?.status === 'changes_requested') {
        updatePayload.status = 'pending';
        updatePayload.changesFeedback = null;
        updatePayload.changesFeedbackAt = null;
      }
    }

    await profileRef.update(updatePayload);

    // Sync Firebase Auth custom claims on every profile update — even if this
    // particular PUT doesn't touch roles/isAdmin (per D-14, keeping claims in
    // lock-step with Firestore is cheap insurance and costs ~1 Admin SDK RPC).
    // Post-update state = existing doc data overlaid with updatePayload.
    // Non-fatal: a claim-sync failure is logged but does not reject the request.
    const existingData = profileDoc.data() ?? {};
    const postUpdate = { ...existingData, ...updatePayload };
    const profile = {
      roles: Array.isArray(postUpdate.roles) ? (postUpdate.roles as string[]) : [],
      isAdmin: postUpdate.isAdmin === true,
    };
    const claimSync = await syncRoleClaim(uid, {
      roles: profile.roles ?? [],
      admin: profile.isAdmin === true,
    });
    if (!claimSync.ok) {
      console.warn(`[profile.PUT] claim sync failed for ${uid}:`, claimSync.error);
    }

    return NextResponse.json(
      {
        success: true,
        discordUsernameValidated: updates.discordUsernameValidated,
        _claimSync: claimSync.ok
          ? { refreshed: true }
          : { refreshed: false, error: claimSync.error },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating mentorship profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
