/**
 * src/lib/ambassador/constants.ts
 *
 * Named constants for the Student Ambassador Program (v6.0 Phase 2).
 * Single source of truth — no other file should hardcode these values.
 */

/**
 * Minimum days between a user's CWA profile creation and their ambassador application submission.
 *
 * DECISION D-03 (CONTEXT.md): Surfaced as a named constant so the threshold can be
 * changed without code search. Default 30 days per spec §4 eligibility; 7-day alternative
 * explicitly reviewed in Plan 09 pre-flight checkpoint.
 *
 * Changing this value to 7 is a supported one-line edit — all callers import this constant.
 */
export const AMBASSADOR_DISCORD_MIN_AGE_DAYS = 30;

/** Firestore top-level collection name for ambassador applications (APPLY-06). */
export const AMBASSADOR_APPLICATIONS_COLLECTION = "applications";

/** Firestore top-level collection name for cohort docs (COHORT-01). */
export const AMBASSADOR_COHORTS_COLLECTION = "cohorts";

/**
 * Motivation-prompt labels (D-04). Exactly three, in this order.
 * UI wizard Step 3 renders these; the API schema enforces all three are present.
 */
export const APPLICATION_VIDEO_PROMPTS = [
  "Why do you want to be a Student Ambassador?",
  "What relevant experience or community work do you have?",
  "What would you do as an ambassador in your first 3 months?",
] as const;

/** Age (in days) after which declined application student-ID uploads are deleted (REVIEW-04). */
export const DECLINED_APPLICATION_RETENTION_DAYS = 30;

/** Signed-URL expiry for admin Storage reads (REVIEW-02). */
export const ADMIN_SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
