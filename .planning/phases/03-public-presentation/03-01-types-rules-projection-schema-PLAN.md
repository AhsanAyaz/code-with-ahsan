---
phase: 3
plan: "03-01"
title: "Types + Firestore rules + public projection schema"
wave: 1
depends_on: []
files_modified:
  - "src/types/ambassador.ts"
  - "src/types/mentorship.ts"
  - "src/lib/ambassador/publicProjection.ts"
  - "firestore.rules"
autonomous: true
requirements:
  - "PRESENT-01"
  - "PRESENT-02"
  - "PRESENT-03"
  - "PRESENT-04"
must_haves:
  - "A `public_ambassadors/{uid}` Firestore collection exists with read-public, write-denied rules so the Admin SDK is the only writer."
  - "The ambassador subdoc shape `mentorship_profiles/{uid}/ambassador/v1` is extended with the seven public fields (`university?`, `city?`, `publicTagline?`, `twitterUrl?`, `githubUrl?`, `personalSiteUrl?`, `cohortPresentationVideoUrl?`, `cohortPresentationVideoEmbedType?`) and Zod-validated via a new `AmbassadorPublicFieldsSchema`."
  - "A single `buildPublicAmbassadorProjection` helper returns the exact `PublicAmbassadorDoc` payload that both `acceptance.ts` (D-06/D-08) and the `PATCH /api/ambassador/profile` handler will write — optional fields conditionally spread so Firestore Admin SDK never receives `undefined` (feedback_firestore_admin_undefined)."
  - "URL fields on `AmbassadorPublicFieldsSchema` accept whitespace-only input as an intentional clear (trimmed to `\"\"` before validation) AND reject non-https schemes (ftp://, javascript:, data:, etc.) — matches the PATCH handler's `empty-after-trim ⇒ FieldValue.delete()` contract, and prevents XSS/phishing surface via pasted URLs."
---

<objective>
Lay the type, schema, and security foundation Phase 3 builds on. This plan is pure data-layer plumbing — no runtime behaviour changes yet. It (1) extends the ambassador subdoc TypeScript type and Zod schema with the seven new public fields per D-02/D-03, (2) introduces the `PublicAmbassadorDoc` interface + `AmbassadorPublicFieldsSchema` Zod schema keyed to the PATCH endpoint body, (3) adds a `buildPublicAmbassadorProjection(…)` helper that both write paths (acceptance + PATCH) will call so the denormalized projection is produced in exactly one place, and (4) ships the `firestore.rules` block for `public_ambassadors/{uid}` with `allow read: if true; allow write: if false;` so only the Admin SDK can write. All optional fields in the helper are conditionally spread (`...(university !== undefined && { university })`) per the MEMORY.md feedback rule — the Admin SDK in this project does NOT set `ignoreUndefinedProperties`.
</objective>

<tasks>

<task id="1" title="Add AmbassadorPublicFields + PublicAmbassadorDoc types + Zod schema">
  <read_first>
    - src/types/ambassador.ts
    - src/types/mentorship.ts
    - src/lib/ambassador/videoUrl.ts
    - .planning/phases/03-public-presentation/03-CONTEXT.md
  </read_first>
  <action>
    Open `src/types/ambassador.ts`. Below the existing `VideoEmbedTypeSchema` (around line 27), add the following exports VERBATIM:

    ```typescript
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
    ```

    Then verify the file still parses cleanly with `npx tsc --noEmit`.

    Runtime sanity check (executor runs this as a quick assertion — no new test file):

    ```bash
    node -e "
    const { AmbassadorPublicFieldsSchema } = require('./src/types/ambassador.ts');
    // (adjust for ts-node/tsx as needed; if ambiguous, skip this inline probe and cover via
    // a throwaway REPL in your editor. The grep-based acceptance criteria below are
    // the authoritative checks.)
    "
    ```

    If inline probing is awkward under the project's TS setup, rely on the grep-based acceptance criteria below + the behavioural cases enumerated there.
  </action>
  <acceptance_criteria>
    - `grep -q "export const AmbassadorPublicFieldsSchema" src/types/ambassador.ts`
    - `grep -q "export interface PublicAmbassadorDoc" src/types/ambassador.ts`
    - `grep -q "export interface AmbassadorSubdoc" src/types/ambassador.ts`
    - `grep -q "PUBLIC_AMBASSADORS_COLLECTION = \"public_ambassadors\"" src/types/ambassador.ts`
    - `grep -q "CohortPresentationVideoEmbedTypeSchema" src/types/ambassador.ts`
    - `grep -q "trimmedOptionalUrl" src/types/ambassador.ts` (the shared preprocess constant exists)
    - `grep -q "trimmedOptionalVideoUrl" src/types/ambassador.ts`
    - `grep -qE "\\^https://" src/types/ambassador.ts` (https-scheme refine is present — blocks ftp:/javascript:/data:)
    - `grep -q "z.preprocess" src/types/ambassador.ts` (trim-first preprocess is wired in)
    - `! grep -q "z.string().trim().url().max(2048).optional().or(z.literal(\"\"))" src/types/ambassador.ts` (the rejected old schema shape is gone — SHOULD-FIX-4/5)
    - Behavioural cases the schema MUST satisfy (verify by spinning up a quick REPL or an ad-hoc script; no test file required in this plan):
      - `AmbassadorPublicFieldsSchema.safeParse({ twitterUrl: "   " }).success === true` AND the parsed `twitterUrl` is `""` (whitespace-only → clear, not 400)
      - `AmbassadorPublicFieldsSchema.safeParse({ twitterUrl: "" }).success === true` (empty string → clear)
      - `AmbassadorPublicFieldsSchema.safeParse({ twitterUrl: "https://twitter.com/x" }).success === true` (valid https)
      - `AmbassadorPublicFieldsSchema.safeParse({ twitterUrl: "javascript:alert(1)" }).success === false` (XSS scheme rejected)
      - `AmbassadorPublicFieldsSchema.safeParse({ twitterUrl: "ftp://example.com" }).success === false` (non-https scheme rejected)
      - `AmbassadorPublicFieldsSchema.safeParse({ twitterUrl: "http://example.com" }).success === false` (plain http rejected — https only)
      - `AmbassadorPublicFieldsSchema.safeParse({ cohortPresentationVideoUrl: "   " }).success === true` with parsed value `""` (video URL also trim-first, server classifier handles provider)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
</task>

<task id="2" title="Add buildPublicAmbassadorProjection helper with conditional-spread write payload">
  <read_first>
    - src/lib/ambassador/acceptance.ts
    - src/lib/firebaseAdmin.ts
    - src/types/ambassador.ts (after Task 1)
    - src/types/mentorship.ts
  </read_first>
  <action>
    Create a NEW file `src/lib/ambassador/publicProjection.ts` with the following contents VERBATIM:

    ```typescript
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
    ```

    Run `npx tsc --noEmit` to confirm the file type-checks against the Phase-3 additions from Task 1.
  </action>
  <acceptance_criteria>
    - `test -f src/lib/ambassador/publicProjection.ts`
    - `grep -q "export function buildPublicAmbassadorProjection" src/lib/ambassador/publicProjection.ts`
    - `grep -q "export function extractPublicFieldsFromSubdoc" src/lib/ambassador/publicProjection.ts`
    - `grep -q "...(university !== undefined && { university })" src/lib/ambassador/publicProjection.ts`
    - `grep -q "...(cohortPresentationVideoEmbedType !== undefined" src/lib/ambassador/publicProjection.ts`
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
</task>

<task id="3" title="Add public_ambassadors Firestore rules block">
  <read_first>
    - firestore.rules
    - .planning/phases/03-public-presentation/03-CONTEXT.md
  </read_first>
  <action>
    Open `firestore.rules`. Immediately AFTER the closing `}` of the `match /cohorts/{cohortId}` block (currently ending around line 217, right before the closing `}` of `match /databases/{database}/documents`), INSERT the following block VERBATIM:

    ```
        // ─── Ambassador Public Projection (Phase 3, D-07) ───────
        // PRESENT-01 / PRESENT-02: Read source for the public /ambassadors page.
        // Public-readable by design (no auth required) — page is unauthenticated.
        // Admin SDK only writes this collection; two write paths keep it in sync (D-08):
        //   1. runAcceptanceTransaction (src/lib/ambassador/acceptance.ts)
        //   2. PATCH /api/ambassador/profile
        // Phase 5 alumni transition + offboarding will also Admin-SDK write this (D-12).
        match /public_ambassadors/{uid} {
          allow read: if true;
          allow write: if false;
        }
    ```

    Ensure correct brace nesting: the new block lives inside `match /databases/{database}/documents { ... }`. Run `grep -c '^    match' firestore.rules` before and after to confirm exactly one new `match` statement was added.

    NOTE: these rules ship to production via Plan 03-05 Task 4 (the blocking deploy checkpoint). Merging this plan alone does NOT activate the rules in Firestore; the deploy in 03-05 is what publishes both the rules AND the composite index together.
  </action>
  <acceptance_criteria>
    - `grep -q "match /public_ambassadors/{uid}" firestore.rules`
    - `grep -A2 "match /public_ambassadors/{uid}" firestore.rules | grep -q "allow read: if true;"`
    - `grep -A3 "match /public_ambassadors/{uid}" firestore.rules | grep -q "allow write: if false;"`
    - Brace balance intact: `node -e "const s=require('fs').readFileSync('firestore.rules','utf8'); const o=(s.match(/{/g)||[]).length; const c=(s.match(/}/g)||[]).length; if(o!==c){process.exit(1)}"` exits 0
  </acceptance_criteria>
</task>

</tasks>

<verification>
- `grep -q "PublicAmbassadorDoc" src/types/ambassador.ts` (type exists)
- `grep -q "AmbassadorPublicFieldsSchema" src/types/ambassador.ts` (schema exists)
- `grep -q "trimmedOptionalUrl" src/types/ambassador.ts` (preprocess-based URL schema exists — SHOULD-FIX-4)
- `grep -qE "\\^https://" src/types/ambassador.ts` (https-only scheme constraint — SHOULD-FIX-5)
- `grep -q "buildPublicAmbassadorProjection" src/lib/ambassador/publicProjection.ts` (helper exists)
- `grep -q "match /public_ambassadors/{uid}" firestore.rules` (rules added)
- `npx tsc --noEmit` exits 0
- `npm run lint -- --quiet src/types/ambassador.ts src/lib/ambassador/publicProjection.ts` exits 0
</verification>

<must_haves>
- A `public_ambassadors/{uid}` Firestore collection exists with read-public, write-denied rules so the Admin SDK is the only writer.
- The ambassador subdoc shape `mentorship_profiles/{uid}/ambassador/v1` is extended with the seven public fields and Zod-validated via a new `AmbassadorPublicFieldsSchema`.
- A single `buildPublicAmbassadorProjection` helper returns the exact `PublicAmbassadorDoc` payload that both `acceptance.ts` (D-06/D-08) and the `PATCH /api/ambassador/profile` handler will write — optional fields conditionally spread so Firestore Admin SDK never receives `undefined`.
- URL fields on `AmbassadorPublicFieldsSchema` accept whitespace-only input as an intentional clear (trimmed to `""` before validation) AND reject non-https schemes (ftp://, javascript:, data:, etc.) — matches the PATCH handler's `empty-after-trim ⇒ FieldValue.delete()` contract, and prevents XSS/phishing surface via pasted URLs.
</must_haves>
