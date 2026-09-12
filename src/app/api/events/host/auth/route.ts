import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";

// POST: Verify presenter/host password (accepts either the dedicated host
// password or the admin password, since an admin should also be able to run
// the deck without a second credential).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const [hostConfigDoc, adminConfigDoc] = await Promise.all([
      db.collection("config").doc("host").get(),
      db.collection("config").doc("admin").get(),
    ]);

    const hostHash = hostConfigDoc.exists ? hostConfigDoc.data()?.passwordHash : undefined;
    const adminHash = adminConfigDoc.exists ? adminConfigDoc.data()?.passwordHash : undefined;

    if (!hostHash && !adminHash) {
      return NextResponse.json(
        {
          error: "Host password not configured — run scripts/set-host-password.js",
        },
        { status: 500 }
      );
    }

    let role: "host" | "admin" | null = null;

    if (hostHash && (await bcrypt.compare(password, hostHash))) {
      role = "host";
    } else if (adminHash && (await bcrypt.compare(password, adminHash))) {
      role = "admin";
    }

    if (!role) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Generate a simple session token (in production, use proper JWT)
    const sessionToken = Buffer.from(`host:${Date.now()}:${Math.random()}`).toString("base64");

    // Store session in Firestore with expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.collection("host_sessions").doc(sessionToken).set({
      createdAt: new Date(),
      expiresAt,
      role,
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
