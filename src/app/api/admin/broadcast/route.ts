import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { sendEmailBatch } from "@/lib/email";
import { db } from "@/lib/firebaseAdmin";
import { isBroadcastGroup, BROADCAST_GROUP_LABELS } from "@/lib/admin-broadcast/groups";
import { renderBroadcastHtml } from "@/lib/admin-broadcast/renderMessage";
import { resolveGroupRecipients } from "@/lib/admin-broadcast/resolveRecipients";

const MAX_SUBJECT = 200;
const MAX_MESSAGE = 20000;

interface SendResult {
  name: string;
  email: string;
  ok: boolean;
  error?: string;
}

/**
 * POST /api/admin/broadcast  (GH#298)
 *
 * Admin composes a plain-text message and sends it to ONE recipient group
 * (mentors | mentees | collaborators | ambassadors). Recipients are resolved
 * from the existing collections; delivery reuses the shared Resend batch sender.
 * An audit doc is written to `admin-broadcasts/{id}` (mirrors email-blast).
 *
 * v1 is email-only — no in-app messaging/threads/replies (see PR follow-ups).
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body required" }, { status: 400 });
  }

  const { group, subject, message } = body as Record<string, unknown>;

  if (!isBroadcastGroup(group)) {
    return NextResponse.json(
      { error: "group must be one of: mentors, mentees, collaborators, ambassadors" },
      { status: 400 }
    );
  }

  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    return NextResponse.json(
      { error: "subject is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (subject.length > MAX_SUBJECT) {
    return NextResponse.json(
      { error: `subject must be ${MAX_SUBJECT} characters or fewer` },
      { status: 400 }
    );
  }

  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "message is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `message must be ${MAX_MESSAGE} characters or fewer` },
      { status: 400 }
    );
  }

  const cleanSubject = subject.trim();

  // Resolve recipients from the existing collections for this group.
  const recipients = await resolveGroupRecipients(db, group);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: `No recipients with an email found for group "${BROADCAST_GROUP_LABELS[group]}"` },
      { status: 404 }
    );
  }

  const html = renderBroadcastHtml(message, cleanSubject);

  // Pre-create Firestore audit doc (mirrors email-blast/route.ts).
  const broadcastRef = db.collection("admin-broadcasts").doc();
  await broadcastRef.set({
    group,
    subject: cleanSubject,
    status: "in_progress",
    sentBy: admin.uid,
    startedAt: FieldValue.serverTimestamp(),
    recipientCount: recipients.length,
  });

  const results: SendResult[] = [];

  try {
    const batchResults = await sendEmailBatch(
      recipients.map((r) => ({ to: r.email, subject: cleanSubject, html }))
    );

    for (let i = 0; i < recipients.length; i++) {
      const { ok, error } = batchResults[i];
      results.push({
        name: recipients[i].name,
        email: recipients[i].email,
        ok,
        ...(error ? { error } : {}),
      });
    }

    const sentCount = results.filter((r) => r.ok).length;
    const failedCount = results.filter((r) => !r.ok).length;

    await broadcastRef.update({
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      sentCount,
      failedCount,
    });

    return NextResponse.json({
      broadcastId: broadcastRef.id,
      group,
      results,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (err) {
    console.error("[admin-broadcast] POST send error:", err);

    const sentCount = results.filter((r) => r.ok).length;
    const failedCount = results.filter((r) => !r.ok).length;

    try {
      await broadcastRef.update({
        status: "errored",
        erroredAt: FieldValue.serverTimestamp(),
        errorMessage: err instanceof Error ? err.message : String(err),
        sentCount,
        failedCount,
      });
    } catch (updateErr) {
      console.error("[admin-broadcast] Failed to update Firestore on error:", updateErr);
    }

    return NextResponse.json(
      {
        error: "Broadcast partially failed",
        broadcastId: broadcastRef.id,
        results,
        sent: sentCount,
        failed: failedCount,
      },
      { status: 500 }
    );
  }
}
