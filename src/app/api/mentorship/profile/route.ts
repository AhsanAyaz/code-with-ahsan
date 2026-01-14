import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { sendAdminMentorPendingEmail } from "@/lib/email";

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
      status,
      displayName: displayName || "",
      email: email || "",
      photoURL: photoURL || "",
      ...profileData,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("mentorship_profiles").doc(uid).set(profile);

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

    return NextResponse.json(
      {
        success: true,
        profile: {
          ...profile,
          createdAt: profile.createdAt.toISOString(),
          updatedAt: profile.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
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

    await profileRef.update({
      ...updates,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating mentorship profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
