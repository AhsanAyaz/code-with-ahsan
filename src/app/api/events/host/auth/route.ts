import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// POST: Verify the presenter/host password. Staff use their own admin portal
// sign-in; the shared admin password is retired and no longer accepted here.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const hostConfigDoc = await db.collection("config").doc("host").get();
    const hostHash = hostConfigDoc.exists ? hostConfigDoc.data()?.passwordHash : undefined;

    if (!hostHash) {
      return NextResponse.json(
        {
          error: "Host password not configured. Run scripts/set-host-password.js",
        },
        { status: 500 }
      );
    }

    if (!(await bcrypt.compare(password, hostHash))) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // 256-bit CSPRNG session token; base64url is safe as a Firestore doc ID
    const sessionToken = randomBytes(32).toString("base64url");

    // Store session in Firestore with expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.collection("host_sessions").doc(sessionToken).set({
      createdAt: new Date(),
      expiresAt,
      role: "host",
    });

    return NextResponse.json(
      {
        success: true,
        token: sessionToken,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying host password:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

// GET: Verify if a session token is valid
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("x-host-token");

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const sessionDoc = await db.collection("host_sessions").doc(token).get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const session = sessionDoc.data();
    const expiresAt = session?.expiresAt?.toDate?.() || new Date(0);

    if (expiresAt < new Date()) {
      // Session expired, delete it
      await db.collection("host_sessions").doc(token).delete();
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error("Error verifying session:", error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}

// DELETE: Logout / invalidate session
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("x-host-token");

    if (token) {
      await db.collection("host_sessions").doc(token).delete();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error logging out:", error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
