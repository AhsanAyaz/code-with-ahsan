import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAdminAccess, logAdminAction } from "@/lib/adminAccess/server";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(request: NextRequest) {
  const access = await requireAdminAccess(request, "mentorship.alert.resolve");
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const { alertId, resolved } = body;

    if (!alertId) {
      return NextResponse.json({ error: "Missing alertId" }, { status: 400 });
    }

    await db
      .collection("mentorship_alerts")
      .doc(alertId)
      .update({
        resolved: resolved ?? true,
        resolvedAt: FieldValue.serverTimestamp(),
      });

    await logAdminAction(
      access.actor,
      "mentorship.alert.resolve",
      { type: "mentorship_alert", id: alertId },
      { resolved: resolved ?? true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
