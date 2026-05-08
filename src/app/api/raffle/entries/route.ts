import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";

// Simple email regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/raffle/entries — public, no auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, newsletter } = body ?? {};

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (typeof newsletter !== "boolean") {
      return NextResponse.json({ error: "newsletter must be a boolean" }, { status: 400 });
    }

    const date = getTodayUTC();

    await db.collection("raffle-entries").add({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      newsletter,
      date,
      submittedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[raffle/entries] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
