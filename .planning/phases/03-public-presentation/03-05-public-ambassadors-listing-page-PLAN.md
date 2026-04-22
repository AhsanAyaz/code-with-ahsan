---
phase: 3
plan: "03-05"
title: "Public /ambassadors listing page + current-cohort resolver + cohort presentation video render"
wave: 3
depends_on: ["03-02"]
files_modified:
  - "src/lib/ambassador/currentCohort.ts"
  - "src/app/api/ambassadors/public/route.ts"
  - "src/components/ambassador/AmbassadorCard.tsx"
  - "src/app/ambassadors/page.tsx"
autonomous: true
requirements:
  - "PRESENT-01"
  - "PRESENT-04"
must_haves:
  - "`/ambassadors` renders every ambassador whose `public_ambassadors/{uid}` doc has `active: true` and `cohortId === <currentCohortId>` (D-09) — no N+1 fan-out: a single Firestore `where('active','==',true).where('cohortId','==',id)` query drives the grid."
  - "Each card displays `photoURL`, `displayName`, `publicTagline` (when set), `university`/`city` chips (when set), social link icons for `linkedinUrl` / `twitterUrl` / `githubUrl` / `personalSiteUrl`, and links to `/u/[username]` using `username || uid` fallback — matching the MentorCard 3-column responsive pattern."
  - "When `cohortPresentationVideoUrl` + `cohortPresentationVideoEmbedType` are set on the projection, the shared `VideoEmbed` component renders the cohort presentation video inline in the card (PRESENT-04) — the same `videoUrl.ts` classifier/extractors are reused, no new validators."
  - "Empty state (zero matching ambassadors) and no-active-cohort state render a friendly message — not a crash or empty grid — so the route is never broken in a pre-acceptance cohort."
---

<objective>
Ship the public `/ambassadors` page (PRESENT-01) that lists every accepted ambassador in the current cohort, joined onto their cohort presentation video (PRESENT-04). The page is a thin client that calls a new `GET /api/ambassadors/public` endpoint; the server resolves "current cohort" via a single helper (`getCurrentCohortId()` — D-09: `status === "active"` preferred, fall back to most-recent `startDate`) and then fires one Firestore query against the denormalized `public_ambassadors` collection that plan 03-02 seeds. No joins at request time, no N+1, trivial read rules (public read, Admin-only write). Each card reuses the MentorCard visual pattern (DaisyUI card + ProfileAvatar + badge chips) and drops in the existing `VideoEmbed` component for the cohort presentation video. The route already inherits feature-flag gating from `src/app/ambassadors/layout.tsx` — no per-page flag check needed.
</objective>

<context>
- Depends on plan 03-02: `public_ambassadors/{uid}` projections must exist (seeded in the acceptance transaction) before this page can return anything meaningful. Local dev testing requires at least one accepted ambassador.
- Depends on plan 03-01: `PublicAmbassadorDoc` type + `PUBLIC_AMBASSADORS_COLLECTION` constant must exist.
- Does NOT depend on plan 03-03 or 03-04 — those are independent Wave-2/Wave-3 surfaces.
- Feature flag: already enforced by `src/app/ambassadors/layout.tsx`. The new page tree inherits it.
- Firestore Admin SDK guardrail (MEMORY.md): the server endpoint ONLY reads — no write path here — so the `ignoreUndefinedProperties` issue does not apply to this plan. But any derived/computed fields must still be strictly typed so the client does not receive `undefined` where it expects `null`.
</context>

<tasks>

<task id="1" title="Create getCurrentCohortId helper (D-09 resolution heuristic)">
  <read_first>
    - src/lib/ambassador/constants.ts
    - src/types/ambassador.ts (CohortDoc, CohortStatus)
    - src/lib/firebaseAdmin.ts
    - .planning/phases/03-public-presentation/03-CONTEXT.md (D-09)
  </read_first>
  <action>
    Create `src/lib/ambassador/currentCohort.ts` with a single exported function `getCurrentCohortId(): Promise<string | null>` that implements D-09's "current cohort" heuristic. Contents VERBATIM:

    ```typescript
    import { adminDb } from "@/lib/firebaseAdmin";
    import { AMBASSADOR_COHORTS_COLLECTION } from "./constants";

    /**
     * Resolves the "current cohort" used by the public /ambassadors page
     * per D-09 in 03-CONTEXT.md:
     *
     *   1. Prefer the cohort with `status === "active"`. There is at most
     *      one active cohort at a time (enforced in the admin cohort
     *      lifecycle — Phase 2).
     *   2. Fall back to the cohort with the most recent `startDate` if
     *      none are currently active (e.g. between cohorts, or pre-launch).
     *   3. Return `null` if no cohort documents exist at all.
     *
     * Server-only. Uses Admin SDK. Consumers MUST handle the `null` case.
     */
    export async function getCurrentCohortId(): Promise<string | null> {
      const col = adminDb.collection(AMBASSADOR_COHORTS_COLLECTION);

      // Step 1: try active cohort first.
      const activeSnap = await col
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (!activeSnap.empty) {
        return activeSnap.docs[0].id;
      }

      // Step 2: fall back to the cohort with the most recent startDate.
      const latestSnap = await col
        .orderBy("startDate", "desc")
        .limit(1)
        .get();

      if (!latestSnap.empty) {
        return latestSnap.docs[0].id;
      }

      // Step 3: no cohorts exist yet.
      return null;
    }
    ```

    This helper is server-only (imports `adminDb`). Co-locate with `acceptance.ts` inside `src/lib/ambassador/` — it is an ambassador-subsystem concern.
  </action>
  <acceptance_criteria>
    - `src/lib/ambassador/currentCohort.ts` exists and exports `getCurrentCohortId()`.
    - When called with zero cohort docs, returns `null`.
    - When called with one `status: "active"` cohort, returns that cohort's ID.
    - When called with only `status: "upcoming"` + `status: "closed"` cohorts, returns the one with the most recent `startDate`.
    - `npx tsc --noEmit` passes.
    - `npm run lint -- src/lib/ambassador/currentCohort.ts` passes.
  </acceptance_criteria>
</task>

<task id="2" title="Create GET /api/ambassadors/public endpoint">
  <read_first>
    - src/types/ambassador.ts (PublicAmbassadorDoc, PUBLIC_AMBASSADORS_COLLECTION — added in plan 03-01)
    - src/lib/ambassador/currentCohort.ts (just created)
    - src/lib/firebaseAdmin.ts
    - src/lib/features.ts (isAmbassadorProgramEnabled)
    - src/app/api/mentorship/mentors/route.ts (existing public listing API — shape reference)
  </read_first>
  <action>
    Create `src/app/api/ambassadors/public/route.ts` implementing the Phase 3 public read endpoint.

    Handler contract:
    - Method: `GET`
    - Auth: **none** — public read
    - Feature-flag gate: YES — return 404 if `isAmbassadorProgramEnabled()` is false (matches the `/ambassadors/layout.tsx` gating so the endpoint cannot leak data when the flag is off)
    - Response shape (success):
      ```json
      {
        "cohortId": "<string|null>",
        "items": [ PublicAmbassadorDoc, ... ]
      }
      ```
    - `items` is `[]` when `cohortId` is `null` OR when zero projections match.
    - Sort: `joinedAt` ascending — but `joinedAt` lives on the SUBDOC, not the projection. To keep the single-query invariant, sort by `updatedAt` ascending on the projection (which is effectively a monotonic proxy for acceptance order since updates after accept are rare in v1). Document this tradeoff in a comment.

    Contents VERBATIM:

    ```typescript
    import { NextResponse } from "next/server";
    import { adminDb } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
    import {
      PUBLIC_AMBASSADORS_COLLECTION,
      type PublicAmbassadorDoc,
    } from "@/types/ambassador";

    /**
     * GET /api/ambassadors/public
     *
     * Public, unauthenticated read of the current cohort's accepted ambassadors
     * (PRESENT-01). Backed by the denormalized `public_ambassadors/{uid}`
     * projection that plan 03-02 seeds in the acceptance transaction — single
     * Firestore query, no joins, no N+1.
     *
     * Sort order: by `updatedAt` ascending. `joinedAt` is on the subdoc and
     * intentionally NOT duplicated on the projection; `updatedAt` is a close
     * monotonic proxy since projections rarely churn after accept in v1.
     *
     * Feature-flag gated: returns 404 when the program is disabled (matches
     * the /ambassadors route-tree gate).
     */
    export async function GET() {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }

      const cohortId = await getCurrentCohortId();
      if (!cohortId) {
        return NextResponse.json({ cohortId: null, items: [] });
      }

      const snap = await adminDb
        .collection(PUBLIC_AMBASSADORS_COLLECTION)
        .where("active", "==", true)
        .where("cohortId", "==", cohortId)
        .orderBy("updatedAt", "asc")
        .get();

      const items: PublicAmbassadorDoc[] = snap.docs.map(
        (d) => d.data() as PublicAmbassadorDoc
      );

      return NextResponse.json({ cohortId, items });
    }
    ```

    NOTE on Firestore composite index: `where('active','==',true) + where('cohortId','==',...) + orderBy('updatedAt','asc')` WILL require a composite index. Add the index definition to `firestore.indexes.json` in the same commit:

    ```json
    {
      "collectionGroup": "public_ambassadors",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "active", "order": "ASCENDING" },
        { "fieldPath": "cohortId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "ASCENDING" }
      ]
    }
    ```

    (Append to the existing `indexes` array in `firestore.indexes.json`.)

    Client deploy: user must run `firebase deploy --only firestore:indexes` after merging — noted for the deploy runbook; NOT a planner task to execute.
  </action>
  <acceptance_criteria>
    - `src/app/api/ambassadors/public/route.ts` exists and exports `GET`.
    - `firestore.indexes.json` contains the new composite index on `public_ambassadors`.
    - When `FEATURE_AMBASSADOR_PROGRAM` is false, the endpoint returns `404`.
    - When no cohorts exist, the endpoint returns `200 { cohortId: null, items: [] }`.
    - When an active cohort exists with zero accepted ambassadors, returns `200 { cohortId, items: [] }`.
    - When an active cohort has N accepted ambassadors, returns `200 { cohortId, items: [...N PublicAmbassadorDoc] }` sorted by `updatedAt` ascending.
    - `npx tsc --noEmit` passes.
  </acceptance_criteria>
</task>

<task id="3" title="Create AmbassadorCard component + /ambassadors page">
  <read_first>
    - src/components/mentorship/MentorCard.tsx (DaisyUI card structure + ProfileAvatar usage — visual reference)
    - src/app/mentorship/mentors/page.tsx (client-side listing pattern + stats banner)
    - src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx (shared Phase-2 VideoEmbed — reuse)
    - src/types/ambassador.ts (PublicAmbassadorDoc)
    - src/components/ProfileAvatar.tsx
  </read_first>
  <action>
    Create two files. The card component first, then the page that consumes it.

    ### A. `src/components/ambassador/AmbassadorCard.tsx` (client component)

    Props: `{ ambassador: PublicAmbassadorDoc }`. Layout mirrors MentorCard: DaisyUI `card bg-base-100 shadow-xl`, ProfileAvatar, displayName as h3, publicTagline as `text-base-content/70`, university/city as DaisyUI `badge badge-outline` chips when set, social icons row from Lucide React (`Linkedin`, `Twitter`, `Github`, `Globe`), inline VideoEmbed when `cohortPresentationVideoUrl` + `cohortPresentationVideoEmbedType` are both set, CTA "View profile" → `/u/${ambassador.username || ambassador.uid}` (mirrors the existing `MentorCard.tsx:198` fallback pattern).

    Key invariants (derived from the MEMORY.md feedback rule):
    - Every optional field is null-coalesced before render (`ambassador.publicTagline && <p>...`); never pass `undefined` to JSX where a string is expected.
    - `VideoEmbed` ONLY renders when BOTH `cohortPresentationVideoUrl` AND `cohortPresentationVideoEmbedType` are truthy (prevents a partial projection from throwing).
    - Import `VideoEmbed` from `@/app/admin/ambassadors/[applicationId]/VideoEmbed` — it already classifies and embeds all four supported embed types. Do NOT duplicate the component under `src/components/ambassador/`; if a future refactor wants to co-locate, plan 03-06 is NOT the place for it (out of scope for this plan).

    Contents VERBATIM:

    ```tsx
    "use client";

    import Link from "next/link";
    import { Linkedin, Twitter, Github, Globe } from "lucide-react";
    import ProfileAvatar from "@/components/ProfileAvatar";
    import VideoEmbed from "@/app/admin/ambassadors/[applicationId]/VideoEmbed";
    import AmbassadorBadge from "@/components/ambassador/AmbassadorBadge";
    import type { PublicAmbassadorDoc } from "@/types/ambassador";

    interface Props {
      ambassador: PublicAmbassadorDoc;
    }

    export default function AmbassadorCard({ ambassador }: Props) {
      const profileHref = `/u/${ambassador.username || ambassador.uid}`;

      return (
        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body gap-3">
            <div className="flex items-start gap-4">
              <ProfileAvatar
                photoURL={ambassador.photoURL ?? undefined}
                displayName={ambassador.displayName ?? "Ambassador"}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={profileHref}
                  className="link link-hover no-underline"
                >
                  <h3 className="text-lg font-semibold truncate">
                    {ambassador.displayName ?? "Ambassador"}
                  </h3>
                </Link>
                <div className="mt-1">
                  <AmbassadorBadge role="ambassador" size="sm" />
                </div>
                {ambassador.publicTagline && (
                  <p className="text-sm text-base-content/70 mt-2 line-clamp-2">
                    {ambassador.publicTagline}
                  </p>
                )}
              </div>
            </div>

            {(ambassador.university || ambassador.city) && (
              <div className="flex flex-wrap gap-2">
                {ambassador.university && (
                  <span className="badge badge-outline badge-sm">
                    {ambassador.university}
                  </span>
                )}
                {ambassador.city && (
                  <span className="badge badge-outline badge-sm">
                    {ambassador.city}
                  </span>
                )}
              </div>
            )}

            {ambassador.cohortPresentationVideoUrl &&
              ambassador.cohortPresentationVideoEmbedType && (
                <div className="mt-2">
                  <VideoEmbed
                    videoUrl={ambassador.cohortPresentationVideoUrl}
                    videoEmbedType={ambassador.cohortPresentationVideoEmbedType}
                  />
                </div>
              )}

            <div className="flex items-center gap-3 mt-2">
              {ambassador.linkedinUrl && (
                <a
                  href={ambassador.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-base-content/60 hover:text-primary"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {ambassador.twitterUrl && (
                <a
                  href={ambassador.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className="text-base-content/60 hover:text-primary"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {ambassador.githubUrl && (
                <a
                  href={ambassador.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-base-content/60 hover:text-primary"
                >
                  <Github className="w-5 h-5" />
                </a>
              )}
              {ambassador.personalSiteUrl && (
                <a
                  href={ambassador.personalSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Personal site"
                  className="text-base-content/60 hover:text-primary"
                >
                  <Globe className="w-5 h-5" />
                </a>
              )}
              <Link
                href={profileHref}
                className="btn btn-primary btn-sm ml-auto"
              >
                View profile
              </Link>
            </div>
          </div>
        </div>
      );
    }
    ```

    ### B. `src/app/ambassadors/page.tsx` (SERVER component — fetches via fetch() to the public endpoint)

    Approach: use a Next.js server component that calls the internal endpoint with `{ cache: "no-store" }` so SSR-fresh data ships on each request. This is intentional — the list is small (~25 ambassadors per cohort), the data changes only on accept/patch, and SSR avoids flashing a loading spinner on first paint. Because the page is server-rendered we use a relative fetch; set the base URL from `process.env.NEXT_PUBLIC_SITE_URL` (already used elsewhere in the codebase — grep `NEXT_PUBLIC_SITE_URL` before committing), falling back to the request's `x-forwarded-host`/`host` headers if the env var is not set.

    Actually — keep it simpler. The feature flag and CohortId resolution both live server-side, and we have direct Admin SDK access here. Skip the internal fetch round-trip and call the helpers DIRECTLY from the server component. This eliminates an unnecessary hop and the URL-resolution footgun:

    Contents VERBATIM:

    ```tsx
    import { adminDb } from "@/lib/firebaseAdmin";
    import { getCurrentCohortId } from "@/lib/ambassador/currentCohort";
    import {
      PUBLIC_AMBASSADORS_COLLECTION,
      type PublicAmbassadorDoc,
    } from "@/types/ambassador";
    import AmbassadorCard from "@/components/ambassador/AmbassadorCard";

    export const dynamic = "force-dynamic";

    // NOTE: feature-flag gating is handled by src/app/ambassadors/layout.tsx.
    // This page inherits the 404 when FEATURE_AMBASSADOR_PROGRAM is off.

    async function loadCohortAmbassadors(): Promise<{
      cohortId: string | null;
      items: PublicAmbassadorDoc[];
    }> {
      const cohortId = await getCurrentCohortId();
      if (!cohortId) return { cohortId: null, items: [] };

      const snap = await adminDb
        .collection(PUBLIC_AMBASSADORS_COLLECTION)
        .where("active", "==", true)
        .where("cohortId", "==", cohortId)
        .orderBy("updatedAt", "asc")
        .get();

      return {
        cohortId,
        items: snap.docs.map((d) => d.data() as PublicAmbassadorDoc),
      };
    }

    export default async function AmbassadorsPage() {
      const { cohortId, items } = await loadCohortAmbassadors();

      return (
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">
              <span className="text-primary">🎓</span> Student Ambassadors
            </h1>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              Meet the students representing Code with Ahsan in this cohort.
              They are the community builders running events, writing guides,
              and helping new members get started.
            </p>
          </div>

          {cohortId === null && (
            <div className="alert alert-info">
              <span>
                No active cohort right now. Check back when the next cohort
                starts — or {" "}
                <a href="/ambassadors/apply" className="link">
                  apply to join the next one
                </a>
                .
              </span>
            </div>
          )}

          {cohortId !== null && items.length === 0 && (
            <div className="alert alert-info">
              <span>
                The current cohort is just starting — no ambassadors have been
                accepted yet. Check back soon!
              </span>
            </div>
          )}

          {items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((a) => (
                <AmbassadorCard key={a.uid} ambassador={a} />
              ))}
            </div>
          )}
        </div>
      );
    }
    ```

    Confirm the redundant `GET /api/ambassadors/public` endpoint from task 2 is still wanted. Decision: YES, keep it. Rationale: (1) the endpoint gives us a stable client-callable URL future client-side filters/search can hit without duplicating the server query, (2) it's a trivially small surface, (3) it parallels the `/api/mentorship/mentors?public=true` precedent. No drift risk — both code paths call the same `getCurrentCohortId()` helper and the same collection query.
  </action>
  <acceptance_criteria>
    - `src/components/ambassador/AmbassadorCard.tsx` exists with the above content and compiles.
    - `src/app/ambassadors/page.tsx` exists with the above content and compiles.
    - Navigating to `/ambassadors` with `FEATURE_AMBASSADOR_PROGRAM=true` renders: the header, the info paragraph, and either (a) the no-active-cohort alert, (b) the empty-cohort alert, or (c) the 3-column responsive card grid. Case (c) shows each ambassador's photo, name, Ambassador badge, optional tagline, optional university/city chips, optional cohort video embed, social icons, and a "View profile" button that navigates to `/u/{username || uid}`.
    - Navigating to `/ambassadors` with `FEATURE_AMBASSADOR_PROGRAM=false` returns a 404 (from the layout gate — unchanged from today).
    - `npx tsc --noEmit` passes.
    - `npm run lint -- src/app/ambassadors/page.tsx src/components/ambassador/AmbassadorCard.tsx` passes.
    - `npm run build` completes without errors.
  </acceptance_criteria>
</task>

</tasks>

<verification>
After all three tasks are merged, the phase-level public-listing truth holds:

1. **Local smoke test** — seed a cohort with `status: "active"` and at least one `public_ambassadors/{uid}` doc (either by manual Firestore write or by running through the Phase 2 accept flow once plan 03-02 is merged):
   ```bash
   npm run dev
   # visit http://localhost:3000/ambassadors
   ```
   Expect: 3-column grid of ambassador cards, each linking to `/u/{username||uid}`.

2. **Empty state** — delete all `public_ambassadors` docs for the active cohort and reload; expect the "just starting" alert, not a crash.

3. **No-cohort state** — set every cohort's `status` away from `"active"` AND delete their `startDate` (or rename the collection temporarily); expect the "no active cohort" alert.

4. **Video embed** — set `cohortPresentationVideoUrl` (YouTube/Loom/Drive link) + matching `cohortPresentationVideoEmbedType` on one projection; reload and expect an inline embed inside that card (PRESENT-04).

5. **Feature flag off** — set `FEATURE_AMBASSADOR_PROGRAM=false` in env, restart dev; expect `/ambassadors` to 404.

No automated test file is introduced in this plan — the server component + simple card are thin enough that manual smoke + TS typecheck catches regressions. A future plan can add a Playwright e2e once the broader Phase 3 surface is wired.
</verification>

<success_criteria>
- PRESENT-01 **satisfied**: `/ambassadors` renders the current cohort's accepted ambassadors as public cards.
- PRESENT-04 **partially satisfied** (render side): cohort presentation videos display inline on the public card when set. The EDIT side of PRESENT-04 is covered by plan 03-06.
- One-query invariant holds: the page fetches from a single composite-indexed `public_ambassadors` query — no N+1, no per-card fan-out.
- Graceful degradation: both empty-cohort and no-cohort states render a friendly alert, not a blank page or a crash.
- Feature flag still gates everything via the inherited `src/app/ambassadors/layout.tsx` — no per-page duplication of `isAmbassadorProgramEnabled()`.
</success_criteria>

<output>
New files:
- `src/lib/ambassador/currentCohort.ts`
- `src/app/api/ambassadors/public/route.ts`
- `src/components/ambassador/AmbassadorCard.tsx`
- `src/app/ambassadors/page.tsx`

Modified files:
- `firestore.indexes.json` (new composite index entry)

Summary file: `.planning/phases/03-public-presentation/03-05-SUMMARY.md` — executor produces this after merge, listing every file touched plus any deviation from this plan.
</output>
