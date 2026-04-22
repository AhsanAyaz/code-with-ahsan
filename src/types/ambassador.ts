/**
 * Centralized types for the Student Ambassador Program (v6.0 Phase 2).
 * Import from '@/types/ambassador' instead of defining locally.
 *
 * Mirrors the export pattern of src/types/mentorship.ts — Zod enums + TypeScript
 * unions locked together so typos fail at both compile time and API boundary.
 */

import { z } from "zod";
import { APPLICATION_VIDEO_PROMPTS } from "@/lib/ambassador/constants";

/** Application lifecycle status (APPLY-07). */
export const ApplicationStatusSchema = z.enum([
  "submitted",
  "under_review",
  "accepted",
  "declined",
]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

/** Cohort lifecycle status (COHORT-01). */
export const CohortStatusSchema = z.enum(["upcoming", "active", "closed"]);
export type CohortStatus = z.infer<typeof CohortStatusSchema>;

/** Detected embed type for external video links (D-08). Set server-side at submission. */
export const VideoEmbedTypeSchema = z.enum(["youtube", "loom", "drive", "unknown"]);
export type VideoEmbedType = z.infer<typeof VideoEmbedTypeSchema>;

// ─── Phase 3: Ambassador Public Fields (D-02, D-03) ────────────────────────

/**
 * Embed classifier for the (optional) public cohort presentation video (D-04).
 * Same shape as the private application video; re-used so the card renderer can
 * call the shared VideoEmbed component. "unknown" is intentionally excluded here —
 * PATCH validation rejects URLs that don't classify cleanly.
 */
export const CohortPresentationVideoEmbedTypeSchema = z.enum(["youtube", "loom", "drive"]);
export type CohortPresentationVideoEmbedType = z.infer<
  typeof CohortPresentationVideoEmbedTypeSchema
>;

/**
 * Trimmed optional-URL schema used for social fields (twitter/github/personalSite).
 *
 * Two reasons this is NOT a plain `z.string().trim().url()`:
 *
 *   1. The PATCH handler at src/app/api/ambassador/profile/route.ts treats
 *      "empty after trim" as FieldValue.delete() (see plan 03-03 Task 1,
 *      `applyStringField`). A pure `z.string().url()` rejects `"   "` with a
 *      400 before the handler ever sees it — but the user's intent is
 *      "clear this field", not "this is invalid". Preprocessing to trim-first
 *      makes the client-server contract symmetric (whitespace ≡ empty ≡ clear).
 *
 *   2. `z.string().url()` accepts ftp://, javascript:, data:, file:, and other
 *      non-https schemes. Persisting those on the public card is a phishing /
 *      XSS vector — a `javascript:alert(1)` URL that then becomes an
 *      `<a href="…">` is a known MentorCard-class issue. We only allow https://.
 *
 * Applied to: twitterUrl, githubUrl, personalSiteUrl.
 */
const trimmedOptionalUrl = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z
    .string()
    .max(2048)
    .refine((s) => s === "" || /^https:\/\/\S+$/.test(s), {
      message: "must be an https:// URL or empty string",
    })
    .optional(),
);

/**
 * Trimmed optional schema for cohortPresentationVideoUrl. Same trim-first
 * semantics as `trimmedOptionalUrl` (whitespace-only ≡ clear), but NO https://
 * refine here because the PATCH route runs `isValidVideoUrl()` +
 * `classifyVideoUrl()` on the trimmed value to enforce YouTube/Loom/Drive
 * specifically. Adding an https refine here would be redundant and would
 * prevent the server-side classifier from producing a more helpful 400
 * message ("Unsupported video URL provider" vs a generic schema error).
 */
const trimmedOptionalVideoUrl = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : v),
  z.string().max(2048).optional(),
);

/**
 * PATCH /api/ambassador/profile body. All fields optional; at least one must be present.
 *
 * Size limits:
 *   - publicTagline: 120 chars (D-05 discretion — enforced here, single source of truth)
 *   - URLs: 2048 chars defensive cap
 *   - university/city: 120 chars
 *
 * The video URL itself is further validated via isValidVideoUrl() in the route handler,
 * because the classifier needs to run server-side to set cohortPresentationVideoEmbedType
 * on the doc. The schema here only enforces a string shape + length cap + the trim-first
 * preprocess so empty-after-trim round-trips to FieldValue.delete().
 *
 * The `https://` refine on social fields blocks non-https schemes (ftp:, javascript:,
 * data:, etc.) which would otherwise render as <a href> attack vectors on public cards.
 */
export const AmbassadorPublicFieldsSchema = z
  .object({
    university: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    publicTagline: z.string().trim().max(120).optional(),
    twitterUrl: trimmedOptionalUrl,
    githubUrl: trimmedOptionalUrl,
    personalSiteUrl: trimmedOptionalUrl,
    cohortPresentationVideoUrl: trimmedOptionalVideoUrl,
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

export type AmbassadorPublicFieldsInput = z.infer<typeof AmbassadorPublicFieldsSchema>;

/**
 * Shape of the ambassador subdoc at mentorship_profiles/{uid}/ambassador/v1 AFTER
 * Phase 3 extends it. Phase 2 fields are commented for traceability.
 *
 * NOTE: Firestore Timestamp fields are modelled as Date here for application code.
 */
export interface AmbassadorSubdoc {
  // Phase 2 fields
  cohortId: string;
  joinedAt: Date;
  active: boolean;
  strikes: number;
  discordMemberId: string | null;
  endedAt?: Date;

  // Phase 3 fields (D-03)
  university?: string;
  city?: string;
  publicTagline?: string;
  twitterUrl?: string;
  githubUrl?: string;
  personalSiteUrl?: string;
  cohortPresentationVideoUrl?: string;
  cohortPresentationVideoEmbedType?: CohortPresentationVideoEmbedType;
}

/**
 * Shape of the top-level `public_ambassadors/{uid}` denormalized projection (D-07).
 * READ source for `/ambassadors`. Written by:
 *   1. runAcceptanceTransaction (in-transaction, D-08 path 1)
 *   2. PATCH /api/ambassador/profile (batched write, D-08 path 2)
 *
 * linkedinUrl lives on parent MentorshipProfile (D-03a) and is JOINED at write time.
 */
export interface PublicAmbassadorDoc {
  uid: string;
  username: string; // Always populated — acceptance backfills if missing (D-01a)
  displayName: string;
  photoURL: string;
  cohortId: string;
  active: true; // Phase 5 flips to false or deletes the doc
  updatedAt: Date;

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
}

/** Firestore top-level collection name for the denormalized public projection (D-07). */
export const PUBLIC_AMBASSADORS_COLLECTION = "public_ambassadors";

/** Two-path academic verification (D-13). */
export const AcademicVerificationPathSchema = z.enum(["email", "student_id"]);
export type AcademicVerificationPath = z.infer<typeof AcademicVerificationPathSchema>;

// ─── Firestore document shapes ─────────────────────────────────────

/**
 * Firestore doc: applications/{applicationId}
 *
 * NOTE: Firestore Timestamp fields are represented as `Date` here for the
 * application-layer type. API routes convert Timestamp → Date on read.
 */
export interface ApplicationDoc {
  applicationId: string;
  applicantUid: string;
  applicantEmail: string;
  applicantName: string;
  university: string;
  yearOfStudy: string;
  country: string;
  city: string;
  discordHandle: string;
  /** Resolved at submission time (DISC-01). null = not found; admin retries on detail page. */
  discordMemberId: string | null;
  /** Present when academicVerificationPath === "email". */
  academicEmail?: string;
  /** Output of src/lib/ambassador/academicEmail.ts validator (APPLY-04). */
  academicEmailVerified: boolean;
  /** Present when academicVerificationPath === "student_id". Firebase Storage path. */
  studentIdStoragePath?: string;
  academicVerificationPath: AcademicVerificationPath;
  motivation: string;
  experience: string;
  pitch: string;
  /** External link (Loom/YouTube/Drive). D-06 forbids Firebase Storage video upload. */
  videoUrl: string;
  videoEmbedType: VideoEmbedType;
  targetCohortId: string;
  status: ApplicationStatus;
  reviewerNotes?: string;
  reviewedBy?: string;
  submittedAt: Date;
  decidedAt?: Date;
  /** Set only on decline. Used by cleanup cron (REVIEW-04). */
  declinedAt?: Date;
  discordRoleAssigned: boolean;
  discordRetryNeeded: boolean;
}

/**
 * Firestore doc: cohorts/{cohortId}
 */
export interface CohortDoc {
  cohortId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  maxSize: number;
  /** Maintained via FieldValue.increment in the accept transaction (COHORT-04). */
  acceptedCount: number;
  status: CohortStatus;
  /** Toggled independently of `status` (COHORT-02). Applications only accepted when true AND status === "upcoming". */
  applicationWindowOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API boundary Zod schemas ──────────────────────────────────────

/** Motivation prompt labels as a fixed-length tuple for schema reuse. */
const _PROMPT_LABELS = APPLICATION_VIDEO_PROMPTS;
void _PROMPT_LABELS; // referenced for docs

/**
 * POST /api/ambassador/applications body (APPLY-02).
 *
 * Video URL format validation lives in src/lib/ambassador/videoUrl.ts (Plan 02);
 * this schema only enforces presence — format validation is applied by the route
 * handler via `isValidVideoUrl()`.
 */
export const ApplicationSubmitSchema = z
  .object({
    applicantName: z.string().trim().min(2, "Name must be at least 2 characters"),
    university: z.string().trim().min(1, "University is required"),
    yearOfStudy: z.string().trim().min(1, "Year of study is required"),
    country: z.string().trim().min(1, "Country is required"),
    city: z.string().trim().min(1, "City is required"),
    discordHandle: z.string().trim().min(1, "Discord handle is required"),
    motivation: z.string().trim().min(50, "Please write at least 50 characters"),
    experience: z.string().trim().min(50, "Please write at least 50 characters"),
    pitch: z.string().trim().min(50, "Please write at least 50 characters"),
    videoUrl: z.string().trim().min(1, "Video URL is required"),
    targetCohortId: z.string().trim().min(1, "Cohort is required"),
    academicVerificationPath: AcademicVerificationPathSchema,
    academicEmail: z.string().trim().email().optional(),
    studentIdStoragePath: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.academicVerificationPath === "email"
        ? typeof data.academicEmail === "string" && data.academicEmail.length > 0
        : typeof data.studentIdStoragePath === "string" && data.studentIdStoragePath.length > 0,
    {
      message:
        "academicEmail required when path=email; studentIdStoragePath required when path=student_id",
      path: ["academicVerificationPath"],
    }
  );

export type ApplicationSubmitInput = z.infer<typeof ApplicationSubmitSchema>;

/** POST /api/ambassador/cohorts body (COHORT-01). */
export const CohortCreateSchema = z
  .object({
    name: z.string().trim().min(3, "Cohort name must be at least 3 characters"),
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }),
    maxSize: z.number().int().min(1).max(500),
    status: CohortStatusSchema,
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "endDate must be after startDate",
    path: ["endDate"],
  });

export type CohortCreateInput = z.infer<typeof CohortCreateSchema>;

/** PATCH /api/ambassador/cohorts/[id] body (COHORT-02). */
export const CohortPatchSchema = z
  .object({
    name: z.string().trim().min(3).optional(),
    maxSize: z.number().int().min(1).max(500).optional(),
    status: CohortStatusSchema.optional(),
    applicationWindowOpen: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

export type CohortPatchInput = z.infer<typeof CohortPatchSchema>;

/** PATCH /api/ambassador/applications/[id] body (REVIEW-03). */
export const ApplicationReviewSchema = z.object({
  action: z.enum(["accept", "decline"]),
  notes: z.string().trim().max(2000).optional(),
});
export type ApplicationReviewInput = z.infer<typeof ApplicationReviewSchema>;
