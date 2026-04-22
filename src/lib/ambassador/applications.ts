/**
 * src/lib/ambassador/applications.ts
 *
 * Shared server-side helpers for the ambassador application submission pipeline.
 * No HTTP imports — all I/O is via Firestore Admin SDK only.
 *
 * Consumed by:
 *   - POST /api/ambassador/applications (Plan 05 Task 2)
 *   - PATCH /api/ambassador/applications/[id] (Plan 06, accept/decline)
 */

import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import {
  AMBASSADOR_APPLICATIONS_COLLECTION,
  AMBASSADOR_COHORTS_COLLECTION,
  AMBASSADOR_DISCORD_MIN_AGE_DAYS,
} from "@/lib/ambassador/constants";
import { classifyVideoUrl, isValidVideoUrl } from "@/lib/ambassador/videoUrl";
import { validateAcademicEmail } from "@/lib/ambassador/academicEmail";
import { lookupMemberByUsername } from "@/lib/discord";
import type { ApplicationDoc, ApplicationSubmitInput } from "@/types/ambassador";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface EligibilityCheck {
  eligible: boolean;
  reason?: "profile_missing" | "too_new";
  profileAgeDays?: number;
  requiredDays: number;
}

/**
 * APPLY-01 age gate. Reads mentorship_profiles/{uid}.createdAt.
 * Returns eligible:false if the doc is missing (safer default).
 */
export async function ensureDiscordAgeEligible(uid: string): Promise<EligibilityCheck> {
  const snap = await db.collection("mentorship_profiles").doc(uid).get();
  if (!snap.exists) {
    return { eligible: false, reason: "profile_missing", requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS };
  }
  const data = snap.data();
  const createdAt = data?.createdAt;
  if (!createdAt) {
    return { eligible: false, reason: "profile_missing", requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS };
  }
  // createdAt may be a Firestore Timestamp or a serialized number. Handle both.
  const createdMs = typeof createdAt.toMillis === "function" ? createdAt.toMillis() : Number(createdAt);
  const ageDays = (Date.now() - createdMs) / MS_PER_DAY;
  if (ageDays < AMBASSADOR_DISCORD_MIN_AGE_DAYS) {
    return {
      eligible: false,
      reason: "too_new",
      profileAgeDays: Math.floor(ageDays),
      requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS,
    };
  }
  return { eligible: true, profileAgeDays: Math.floor(ageDays), requiredDays: AMBASSADOR_DISCORD_MIN_AGE_DAYS };
}

/**
 * DISC-01 fail-soft Discord resolver.
 * Always returns a value — never throws, never blocks submission.
 */
export async function resolveDiscordMemberSoft(
  discordHandle: string,
): Promise<{ id: string; username: string } | null> {
  try {
    return await lookupMemberByUsername(discordHandle);
  } catch {
    return null;
  }
}

/**
 * Prevent duplicate submitted/under_review/accepted applications for the same (uid, cohortId).
 * Only "declined" applications allow re-submission.
 */
export async function checkDuplicateApplication(
  applicantUid: string,
  targetCohortId: string,
): Promise<{ duplicate: boolean; existingApplicationId?: string; existingStatus?: string }> {
  const snap = await db
    .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
    .where("applicantUid", "==", applicantUid)
    .where("targetCohortId", "==", targetCohortId)
    .where("status", "in", ["submitted", "under_review", "accepted"])
    .limit(1)
    .get();
  if (snap.empty) return { duplicate: false };
  const doc = snap.docs[0];
  return {
    duplicate: true,
    existingApplicationId: doc.id,
    existingStatus: (doc.data() as ApplicationDoc).status,
  };
}

export interface CohortWindowCheck {
  open: boolean;
  cohortName?: string;
  reason?: "not_found" | "window_closed" | "wrong_status" | "full";
}

/**
 * Server-side gate — a client cannot bypass by calling the API with a closed cohort.
 * COHORT-04 (maxSize) is re-checked at accept time (Plan 06); here we block submission
 * to a cohort already at capacity to avoid wasted review work.
 */
export async function checkCohortAcceptingSubmissions(cohortId: string): Promise<CohortWindowCheck> {
  const snap = await db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(cohortId).get();
  if (!snap.exists) return { open: false, reason: "not_found" };
  const c = snap.data()!;
  if (c.status !== "upcoming") return { open: false, reason: "wrong_status", cohortName: c.name };
  if (c.applicationWindowOpen !== true) return { open: false, reason: "window_closed", cohortName: c.name };
  // Block submission to an already-full cohort (saves review capacity).
  if (typeof c.maxSize === "number" && typeof c.acceptedCount === "number" && c.acceptedCount >= c.maxSize) {
    return { open: false, reason: "full", cohortName: c.name };
  }
  return { open: true, cohortName: c.name };
}

export interface BuildApplicationArgs {
  applicantUid: string;
  applicantEmail: string;
  applicantName: string;
  input: ApplicationSubmitInput;
  discordMemberId: string | null;
  academicEmailVerified: boolean;
}

/**
 * Shape the Firestore write payload.
 * Caller generates the applicationId and the doc ref.
 */
export function buildApplicationDoc(
  args: BuildApplicationArgs,
  applicationId: string,
): ApplicationDoc {
  const { input, applicantUid, applicantEmail, applicantName, discordMemberId, academicEmailVerified } = args;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const now = FieldValue.serverTimestamp() as unknown as any;
  const videoEmbedType = classifyVideoUrl(input.videoUrl);
  return {
    applicationId,
    applicantUid,
    applicantEmail,
    applicantName,
    university: input.university,
    yearOfStudy: input.yearOfStudy,
    country: input.country,
    city: input.city,
    discordHandle: input.discordHandle,
    discordMemberId,
    academicEmail: input.academicEmail,
    academicEmailVerified,
    studentIdStoragePath: input.studentIdStoragePath,
    academicVerificationPath: input.academicVerificationPath,
    motivation: input.motivation,
    experience: input.experience,
    pitch: input.pitch,
    videoUrl: input.videoUrl,
    // never persist "unknown"; validation above rejects invalid URLs before this point
    videoEmbedType: videoEmbedType === "unknown" ? "loom" : videoEmbedType,
    targetCohortId: input.targetCohortId,
    status: "submitted",
    submittedAt: now,
    discordRoleAssigned: false,
    discordRetryNeeded: false,
  } as ApplicationDoc;
}

/**
 * Additional validation guards for POST handler — does NOT duplicate Zod shape checks,
 * only runtime rules Zod cannot express.
 *
 * Rules checked:
 *   1. Video URL must match accepted regex patterns (D-07, defense-in-depth).
 *   2. academicVerificationPath cross-field consistency (should already be caught by
 *      Zod refine, but server re-validates as a second defense layer).
 */
export function runServerSideContentChecks(
  input: ApplicationSubmitInput,
): { ok: true } | { ok: false; field: string; error: string } {
  if (!isValidVideoUrl(input.videoUrl)) {
    return { ok: false, field: "videoUrl", error: "Video URL must be a Loom, YouTube, or Google Drive link." };
  }
  // Cross-field: path A requires academicEmail; path B requires studentIdStoragePath.
  if (input.academicVerificationPath === "email" && !input.academicEmail) {
    return { ok: false, field: "academicEmail", error: "Academic email is required when verification path is 'email'." };
  }
  if (input.academicVerificationPath === "student_id" && !input.studentIdStoragePath) {
    return { ok: false, field: "studentIdStoragePath", error: "Student ID storage path is required when verification path is 'student_id'." };
  }
  return { ok: true };
}

/**
 * APPLY-04: classify the academic email and return the persisted `academicEmailVerified`
 * flag + admin-review hint.
 *
 * Path B (student ID) — always flagged for manual review regardless of email (D-13).
 * Path A (email) — verified if syntaxValid AND (academicTldMatch OR hipoMatch).
 */
export function classifyAcademicEmailPath(
  input: ApplicationSubmitInput,
): { verified: boolean; needsManualVerification: boolean } {
  if (input.academicVerificationPath === "student_id") {
    // D-13 path B: uploader path always needs manual verification.
    return { verified: false, needsManualVerification: true };
  }
  if (!input.academicEmail) return { verified: false, needsManualVerification: true };
  const r = validateAcademicEmail(input.academicEmail);
  return {
    verified: r.syntaxValid && (r.academicTldMatch || r.hipoMatch),
    needsManualVerification: r.needsManualVerification,
  };
}
