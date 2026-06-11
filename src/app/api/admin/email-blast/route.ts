import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { getDraftHtml } from "@/lib/ghost/admin";
import { sendEmailBatch } from "@/lib/email";
import { db } from "@/lib/firebaseAdmin";
import { htmlEscape } from "@/lib/email-blast/escapeHtml";

interface RecipientInput {
  name: string;
  email: string;
}

interface SendResult {
  name: string;
  email: string;
  ok: boolean;
  error?: string;
}

/**
 * POST /api/admin/email-blast
 *
 * Accepts { ghostPostId, subject, recipients[] }, fetches draft HTML fresh
 * from Ghost, substitutes {{name}} per recipient, sends sequentially via
 * Resend (250ms gap), writes audit log to Firestore email-blasts/{id}.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body required" }, { status: 400 });
  }

  const { ghostPostId, subject, recipients } = body as Record<string, unknown>;

  if (!ghostPostId || typeof ghostPostId !== "string" || ghostPostId.trim() === "") {
    return NextResponse.json(
      { error: "ghostPostId is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    return NextResponse.json(
      { error: "subject is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  if (subject.length > 200) {
    return NextResponse.json(
      { error: "subject must be 200 characters or fewer" },
      { status: 400 }
    );
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { error: "recipients must be a non-empty array" },
      { status: 400 }
    );
  }

  if (recipients.length > 500) {
    return NextResponse.json(
      { error: "recipients must not exceed 500 items" },
      { status: 413 }
    );
  }

  // Validate each recipient shape
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i] as Record<string, unknown>;
    if (!r || typeof r.name !== "string" || typeof r.email !== "string") {
      return NextResponse.json(
        { error: `recipients[${i}] must have name (string) and email (string)` },
        { status: 400 }
      );
    }
  }

  const validatedRecipients = recipients as RecipientInput[];

  // Fetch fresh draft HTML from Ghost
  const draft = await getDraftHtml(ghostPostId.trim());
  if (!draft) {
    return NextResponse.json(
      { error: "Draft not found or no longer accessible" },
      { status: 404 }
    );
  }

  // Pre-create Firestore audit doc
  const blastRef = db.collection("email-blasts").doc();
  await blastRef.set({
    subject: subject.trim(),
    ghostPostId: ghostPostId.trim(),
    ghostPostTitle: draft.title,
    status: "in_progress",
    sentBy: admin.uid,
    startedAt: FieldValue.serverTimestamp(),
    recipientCount: validatedRecipients.length,
  });

  const results: SendResult[] = [];

  try {
    const batchPayload = validatedRecipients.map((recipient) => ({
      to: recipient.email,
      subject: subject.trim(),
      html: draft.html.split("{{name}}").join(htmlEscape(recipient.name)),
    }));

    const batchResults = await sendEmailBatch(batchPayload);

    for (let i = 0; i < validatedRecipients.length; i++) {
      const { ok, error } = batchResults[i];
      results.push({
        name: validatedRecipients[i].name,
        email: validatedRecipients[i].email,
        ok,
        ...(error ? { error } : {}),
      });
    }

    const sentCount = results.filter((r) => r.ok).length;
    const failedCount = results.filter((r) => !r.ok).length;

    await blastRef.update({
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      recipients: results,
      sentCount,
      failedCount,
    });

    return NextResponse.json({
      blastId: blastRef.id,
      results,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (err) {
    console.error("[email-blast] POST send loop error:", err);

    const sentCount = results.filter((r) => r.ok).length;
    const failedCount = results.filter((r) => !r.ok).length;

    try {
      await blastRef.update({
        status: "errored",
        erroredAt: FieldValue.serverTimestamp(),
        errorMessage: err instanceof Error ? err.message : String(err),
        recipients: results,
        sentCount,
        failedCount,
      });
    } catch (updateErr) {
      console.error("[email-blast] Failed to update Firestore on error:", updateErr);
    }

    return NextResponse.json(
      {
        error: "Blast partially failed",
        blastId: blastRef.id,
        results,
        sent: sentCount,
        failed: failedCount,
      },
      { status: 500 }
    );
  }
}
