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
