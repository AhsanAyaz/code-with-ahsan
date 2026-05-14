/**
 * src/lib/ambassador/publicProjection.ts
 *
 * Single source of truth for constructing the `public_ambassadors/{uid}` denormalized
 * projection payload (D-07, D-08). Called from:
 *   1. src/lib/ambassador/acceptance.ts — inside runAcceptanceTransaction
 *   2. src/app/api/ambassador/profile/route.ts (Plan 03-03) — PATCH handler
 *
 * CRITICAL: The Admin SDK initialized in src/lib/firebaseAdmin.ts does NOT set
 * ignoreUndefinedProperties, so ALL optional fields MUST be conditionally spread
 * (`...(value !== undefined && { key: value })`). Passing an object with undefined
 * values to Firestore writes will throw. See MEMORY.md feedback_firestore_admin_undefined.
 *
 * The helper returns a plain object suitable for BOTH `txn.set(ref, payload)` inside a
 * transaction AND `batch.set(ref, payload)` from the PATCH route.
 *
 * `updatedAt` is supplied by the CALLER (a Firestore FieldValue.serverTimestamp() in the
 * transaction path, or a `new Date()` from the PATCH path) — this helper is side-effect
 * free and does not import firebase-admin.
 */

import type {
  AmbassadorSubdoc,
  CohortPresentationVideoEmbedType,
  PublicAmbassadorDoc,
} from "@/types/ambassador";

export interface BuildPublicAmbassadorProjectionArgs {
  uid: string;
  username: string; // Must be non-empty at call time — acceptance backfills if missing (D-01a)
  displayName: string;
  photoURL: string;
  cohortId: string;

  // Joined from parent MentorshipProfile
  linkedinUrl?: string;

  // Joined from ambassador subdoc
  university?: string;
  city?: string;
  publicTagline?: string;
  twitterUrl?: string;
  githubUrl?: string;
  personalSiteUrl?: string;
  cohortPresentationVideoUrl?: string;
  cohortPresentationVideoEmbedType?: CohortPresentationVideoEmbedType;

  /** updatedAt supplied by caller — may be a FieldValue.serverTimestamp() or a Date. */
  updatedAt: unknown;
}

/**
 * Build the projection payload. Empty-string and undefined values are both filtered
 * out (empty string is how the UI represents "cleared" in the PATCH body, but we
 * persist it as field-absent so the card renderer's `if (x)` checks work).
 */
export function buildPublicAmbassadorProjection(
  args: BuildPublicAmbassadorProjectionArgs
): Record<string, unknown> {
  const clean = (v: string | undefined): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;

  const university = clean(args.university);
  const city = clean(args.city);
  const publicTagline = clean(args.publicTagline);
  const linkedinUrl = clean(args.linkedinUrl);
  const twitterUrl = clean(args.twitterUrl);
  const githubUrl = clean(args.githubUrl);
  const personalSiteUrl = clean(args.personalSiteUrl);
  const cohortPresentationVideoUrl = clean(args.cohortPresentationVideoUrl);
  const cohortPresentationVideoEmbedType = args.cohortPresentationVideoEmbedType;

  // CRITICAL: Conditionally spread every optional field — Admin SDK rejects `undefined`.
  return {
    uid: args.uid,
    username: args.username,
    displayName: args.displayName,
    photoURL: args.photoURL,
    cohortId: args.cohortId,
    active: true,
    updatedAt: args.updatedAt,
    ...(linkedinUrl !== undefined && { linkedinUrl }),
    ...(university !== undefined && { university }),
    ...(city !== undefined && { city }),
    ...(publicTagline !== undefined && { publicTagline }),
    ...(twitterUrl !== undefined && { twitterUrl }),
    ...(githubUrl !== undefined && { githubUrl }),
    ...(personalSiteUrl !== undefined && { personalSiteUrl }),
    ...(cohortPresentationVideoUrl !== undefined && { cohortPresentationVideoUrl }),
    ...(cohortPresentationVideoEmbedType !== undefined && { cohortPresentationVideoEmbedType }),
  };
}

/**
 * Narrow an ambassador subdoc + parent profile to the args shape above. Used by
 * the PATCH handler to extract the write payload from the freshly-updated subdoc
 * without duplicating field names.
 */
export function extractPublicFieldsFromSubdoc(
  subdoc: Partial<AmbassadorSubdoc>
): Pick<
  BuildPublicAmbassadorProjectionArgs,
  | "university"
  | "city"
  | "publicTagline"
  | "twitterUrl"
  | "githubUrl"
  | "personalSiteUrl"
  | "cohortPresentationVideoUrl"
  | "cohortPresentationVideoEmbedType"
> {
  return {
    university: subdoc.university,
    city: subdoc.city,
    publicTagline: subdoc.publicTagline,
    twitterUrl: subdoc.twitterUrl,
    githubUrl: subdoc.githubUrl,
    personalSiteUrl: subdoc.personalSiteUrl,
    cohortPresentationVideoUrl: subdoc.cohortPresentationVideoUrl,
    cohortPresentationVideoEmbedType: subdoc.cohortPresentationVideoEmbedType,
  };
}

// Type guard for the PublicAmbassadorDoc shape — used by the /ambassadors page loader
// to narrow Firestore reads in a type-safe way.
export function isPublicAmbassadorDoc(v: unknown): v is PublicAmbassadorDoc {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.uid === "string" &&
    typeof o.username === "string" &&
    typeof o.displayName === "string" &&
    typeof o.photoURL === "string" &&
    typeof o.cohortId === "string" &&
    o.active === true
  );
}
