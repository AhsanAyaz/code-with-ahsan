/**
 * POST /api/ambassador/applications/[applicationId]/discord-resolve
 *
 * Admin retries Discord handle resolution and role assignment after a soft failure.
 *
 * Pitfall 2: the stored `discordMemberId` may be stale if the applicant changed their
 * Discord username between submission and acceptance. This endpoint ALWAYS re-resolves
 * the handle freshly via `lookupMemberByUsername` rather than trusting `app.discordMemberId`.
 *
 * Flow:
 *   1. Gate: isAmbassadorProgramEnabled() + requireAdmin()
 *   2. Validate application exists and is accepted.
 *   3. Re-resolve Discord handle freshly (Pitfall 2).
 *   4. Persist fresh memberId (or null) to the application doc.
 *   5. Attempt role assignment via assignAmbassadorDiscordRoleSoft.
 *   6. Return structured result — HTTP 200 even on resolution failure
 *      (soft operation; payload has resolved/success fields).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { lookupMemberByUsername } from "@/lib/discord";
import { assignAmbassadorDiscordRoleSoft } from "@/lib/ambassador/acceptance";
import { AMBASSADOR_APPLICATIONS_COLLECTION } from "@/lib/ambassador/constants";
import type { ApplicationDoc } from "@/types/ambassador";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ambassador/discord-resolve");

type RouteParams = { params: Promise<{ applicationId: string }> };

/**
 * POST — admin clicks "Retry Discord" on the application detail page.
 *
 * Returns HTTP 200 in all non-error cases; the response body's `resolved` and
 * `success` fields indicate the actual outcome. This allows the UI to render
 * specific failure messages without treating them as HTTP errors.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const { applicationId } = await params;
  const ref = db.collection(AMBASSADOR_APPLICATIONS_COLLECTION).doc(applicationId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const app = snap.data() as ApplicationDoc;

  // Only accepted applications qualify for Discord role retries.
  if (app.status !== "accepted") {
    return NextResponse.json(
      { error: "Application must be accepted before Discord retry" },
      { status: 409 },
    );
  }

  // Pitfall 2: ALWAYS re-resolve by username on retry — never trust the stored memberId.
  // The applicant may have changed their Discord username since submission.
  let freshMember: { id: string; username: string } | null = null;
  try {
    freshMember = await lookupMemberByUsername(app.discordHandle);
  } catch (e) {
    logger.warn("discord lookup error during retry", {
      applicationId,
      handle: app.discordHandle,
      error: e,
    });
  }

  // Persist the freshly resolved (or null) memberId before attempting role assignment,
  // so the admin panel reflects reality even if the next step fails.
  await ref.update({
    discordMemberId: freshMember?.id ?? null,
    discordHandleResolved: freshMember != null,
  });

  if (!freshMember) {
    await ref.update({ discordRoleAssigned: false, discordRetryNeeded: true });
    return NextResponse.json({
      success: false,
      resolved: false,
      reason: "handle_not_found",
      message: `Could not find '${app.discordHandle}' in the Discord server. Ask the applicant to verify their handle and try again.`,
    });
  }

  // Re-attempt role assignment via the soft wrapper (never throws, persists result to doc).
  const discord = await assignAmbassadorDiscordRoleSoft(applicationId, freshMember.id);

  return NextResponse.json({
    success: discord.ok,
    resolved: true,
    discordMemberId: freshMember.id,
    reason: discord.ok ? null : (discord as { ok: false; reason: string }).reason,
  });
}
