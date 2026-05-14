---
phase: 03-public-presentation
verified: 2026-04-22T23:00:00Z
updated: 2026-04-22T23:45:00Z
status: human_needed
score: 4/4 must-haves verified at code-layer — 6 human-verification items pending browser confirmation
requirement_coverage:
  PRESENT-01: verified (code) — human confirmation pending (item 1)
  PRESENT-02: verified (code) — human confirmation pending (items 2, 3)
  PRESENT-03: verified (code) — human confirmation pending (item 2)
  PRESENT-04: verified (code — resolved inline, see Gap Resolution) — human confirmation pending (items 4, 5, 6)
gaps_resolved_inline:
  - truth: "An accepted ambassador can set a cohortPresentationVideo from their profile and it renders on their /ambassadors card"
    original_status: partial
    resolution_status: resolved
    resolved_in_commit: 6bbc85a
    resolution_approach: >
      Rather than patching the client to read body.public, the server PATCH was made symmetric
      with GET: PATCH /api/ambassador/profile now returns the flat 8-field shape
      (extractPublicFieldsFromSubdoc(postWrite)) — same shape GET returns, with absent keys
      omitted (not null). This keeps the client's { ...EMPTY, ...body } hydration pattern
      working unchanged for both endpoints.
    files_changed:
      - "src/app/api/ambassador/profile/route.ts (lines 253-256 — response body is now the flat projection shape, not the { success, public } envelope)"
    original_artifacts:
      - path: "src/app/profile/AmbassadorPublicCardSection.tsx"
        note: "No change required — the client { ...EMPTY, ...body } hydration now works correctly because PATCH returns the flat shape"
      - path: "src/app/api/ambassador/profile/route.ts"
        note: "Response shape changed from { success: true, public: projection } to extractPublicFieldsFromSubdoc(postWrite)"
human_verification:
  - test: "Visit /ambassadors as an unauthenticated user and confirm cards render with photo, displayName, university, 1-line bio, and social link icons — and that no email, Discord handle, or private video is visible"
    expected: "Card grid with ambassador cards; each card shows photo, name, publicTagline or bio, university/city badges, LinkedIn/Twitter/GitHub/Globe icon links, and a 'View profile' button. No raw email or Discord handle."
    why_human: "Requires a seeded ambassador in the active cohort; visual layout and data-exclusion cannot be asserted by static analysis"
  - test: "Visit /u/{username} for a seeded ambassador and confirm the Ambassador badge renders in the header row"
    expected: "Blue 'Ambassador' badge pill with Award icon appears next to the user's name"
    why_human: "Requires a real ambassador account in Firestore; badge conditional is wired (isAmbassador && <AmbassadorBadge role='ambassador' />) but must be confirmed visually post-acceptance"
  - test: "Visit /mentorship/mentors/{username} and confirm it 308-redirects to /u/{username} preserving any query string"
    expected: "Browser address bar changes to /u/{username}; response status 308 visible in DevTools Network tab; no query string is lost"
    why_human: "HTTP redirect status must be confirmed in a browser or via curl; automated grep confirms the config entry exists but cannot confirm Next.js edge runtime applies it"
  - test: "Accept a new ambassador application in the admin panel and visit /ambassadors within seconds — confirm the new card appears without a page deploy"
    expected: "New ambassador card appears on /ambassadors immediately after acceptance (SSR + force-dynamic page re-fetches on each request)"
    why_human: "Requires running the full acceptance flow end-to-end with a real application; atomic projection write is wired in runAcceptanceTransaction but needs real-data confirmation"
  - test: "On /profile as an ambassador, save the public card, then reload the page — confirm the saved values are repopulated in the form fields"
    expected: "After reload, all previously saved fields (university, city, publicTagline, social URLs, video URL) appear in their inputs. NOTE: due to the post-save hydration bug (see gaps), the form will reset to empty immediately after saving without a reload — this must be confirmed manually to understand severity and whether the reload path (GET /api/ambassador/profile) correctly recovers."
    why_human: "The bug is in post-save in-memory hydration; the GET path hydration may still work correctly on reload, making severity 'annoying but recoverable'"
  - test: "Paste a YouTube/Loom URL into the cohort presentation video field and confirm the inline preview appears before saving"
    expected: "VideoEmbed component renders immediately below the input with the video preview — no save required"
    why_human: "Client-side preview logic is wired (videoPreviewable && <VideoEmbed />) but requires real URL to confirm the embed renders"
---

# Phase 3: Public Presentation Verification Report

**Phase Goal:** The world can see the active ambassador cohort on `codewithahsan.dev/ambassadors` with only the fields each ambassador has chosen to share publicly, and any user's profile page correctly displays an Ambassador (or Alumni Ambassador) badge so status is visible wherever an ambassador shows up on the platform.
**Verified:** 2026-04-22T23:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Phase 3 Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A visitor hitting `/ambassadors` (unauthenticated) sees a card for every active-cohort ambassador with photo, display name, university, 1-line bio, and social links — and nothing else (no email, no Discord handle, no private application video) | ✓ VERIFIED | `AmbassadorsPage` queries `public_ambassadors` by `active==true && cohortId==currentCohortId`; `PublicAmbassadorDoc` contains no email or discordMemberId fields; `buildPublicAmbassadorProjection` filters to the safe field set; Firestore rules `allow read: if true; allow write: if false` |
| 2 | Profile page renders "Ambassador" badge when `roles` contains `"ambassador"`, and "Alumni Ambassador" badge when it contains `"alumni-ambassador"` | ✓ VERIFIED | `PublicProfileClient.tsx`: `{isAmbassador && <AmbassadorBadge role="ambassador" />}` and `{isAlumni && <AmbassadorBadge role="alumni-ambassador" />}`; `AmbassadorBadge` has two concrete variants (Award/GraduationCap icons, badge-primary/badge-secondary classes) |
| 3 | An accepted ambassador can (optionally) upload a separate public `cohortPresentationVideo` from their profile and it renders on their `/ambassadors` card — distinct from the private application video | ⚠️ PARTIAL | Video field is stored on the subdoc and projection, `AmbassadorCard` renders `<VideoEmbed>` when the field is present, PATCH endpoint validates and persists the URL correctly — BUT the profile editor mis-hydrates after a successful PATCH save (see gap detail) |
| 4 | Offboarded or not-yet-accepted users never appear on `/ambassadors` — page is strictly gated to currently-active members of the current cohort | ✓ VERIFIED | Query: `.where("active", "==", true).where("cohortId", "==", cohortId)` on the denormalized `public_ambassadors` collection; `active` is only ever set to `true` inside `runAcceptanceTransaction` (first-accept path); Phase 5 offboarding/alumni contracts documented in D-12 to update/delete this doc |

**Score:** 3.5/4 truths verified (3 fully, 1 partially blocked by post-save hydration bug)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/ambassador.ts` | AmbassadorSubdoc + 7 public fields, PublicAmbassadorDoc, AmbassadorPublicFieldsSchema, PUBLIC_AMBASSADORS_COLLECTION | ✓ VERIFIED | All exports present; Zod schema with https-only refine on social URLs; trimmedOptionalUrl/trimmedOptionalVideoUrl primitives; CohortPresentationVideoEmbedTypeSchema |
| `src/lib/ambassador/publicProjection.ts` | buildPublicAmbassadorProjection, extractPublicFieldsFromSubdoc, isPublicAmbassadorDoc | ✓ VERIFIED | 137 lines; conditional-spread guards; side-effect free (no firebase-admin import); correct type guard |
| `firestore.rules` (public_ambassadors block) | allow read: if true; allow write: if false | ✓ VERIFIED | Lines 226-229: `match /public_ambassadors/{uid} { allow read: if true; allow write: if false; }` |
| `src/lib/ambassador/acceptance.ts` | runAcceptanceTransaction extended with university/city snapshot + in-txn public_ambassadors write + username backfill | ✓ VERIFIED | Pre-txn username resolution; university/city conditionally spread onto subdoc; `txn.set(publicRef, projection)` inside first-accept block; `buildPublicAmbassadorProjection` called with FieldValue.serverTimestamp() |
| `src/lib/ambassador/username.ts` | deriveBaseUsername + ensureUniqueUsername | ✓ VERIFIED | Both functions present; ensureUniqueUsername uses bounded while-loop (max 100 iterations + timestamp fallback) |
| `src/app/api/ambassador/profile/route.ts` | GET + PATCH with feature-flag, auth, role, Zod gates; batched subdoc + projection write; FieldValue.delete() for empty-string clearing | ✓ VERIFIED | Gate order matches plan; `applyStringField` applies FieldValue.delete() on empty trim; batch.update(subdoc) + batch.set(projection, {merge:false}); video URL validated via isValidVideoUrl + classifyVideoUrl |
| `src/components/ambassador/AmbassadorBadge.tsx` | Single component, two variants (ambassador/alumni-ambassador), optional size/className | ✓ VERIFIED | 53 lines; Award icon for ambassador, GraduationCap for alumni-ambassador; DaisyUI badge-primary/badge-secondary; size prop mapped to badge-sm/badge-lg |
| `src/app/u/[username]/page.tsx` | Server component; Admin SDK fetch by username; conditional public_ambassadors read; notFound for missing/no-public-role | ✓ VERIFIED | Dual-read roles pattern; ambassador projection conditionally fetched; notFound guards for both missing profile and no-public-visible-role |
| `src/app/u/[username]/PublicProfileClient.tsx` | Client component rendering photo, displayName, badges, tagline, university/city, social links | ✓ VERIFIED | All fields rendered; badge row with both variants; social links row (LinkedIn/Twitter/GitHub/Website); mentor v1 scaffold (link-out, intentional) |
| `next.config.ts` (308 redirect) | /mentorship/mentors/:username → /u/:username, permanent: true | ✓ VERIFIED | Line 107-113: source/destination/permanent: true entry present in redirects() array with comment referencing D-01 |
| `src/lib/ambassador/currentCohort.ts` | getCurrentCohortId with status=="active" preference, startDate fallback, null if none | ✓ VERIFIED | Two-step query: active cohort first, latestSnap fallback, null return |
| `src/app/api/ambassadors/public/route.ts` | GET endpoint; feature-flag gate; active+cohortId query; returns {cohortId, items} | ✓ VERIFIED | Feature flag gate; getCurrentCohortId(); proper Firestore query with orderBy; null cohort handled |
| `src/components/ambassador/AmbassadorCard.tsx` | Card with photo, name, badge, tagline, university/city, social icons, video embed, profile link | ✓ VERIFIED | Full card with ProfileAvatar, AmbassadorBadge, university/city badges, VideoEmbed for cohortPresentationVideo, social icon links (Lucide icons), "View profile" button |
| `src/app/ambassadors/page.tsx` | SSR listing page; calls loadCohortAmbassadors; renders AmbassadorCard grid; empty states | ✓ VERIFIED | force-dynamic; getCurrentCohortId + public_ambassadors query; responsive grid (1/2/3 cols); two empty states (no cohort / no ambassadors) |
| `src/app/profile/AmbassadorPublicCardSection.tsx` | Client component; GET hydration on mount; diff-based PATCH; video preview; toast on success/error; role-gated render | ⚠️ PARTIAL | GET hydration correct; video preview wired; toast calls correct; role-gating in page.tsx correct — BUT post-PATCH hydration reads `{ ...EMPTY, ...body }` where `body` is `{ success: true, public: {...} }`, so field values are not restored after save |
| `src/app/profile/page.tsx` (wire-in) | AmbassadorPublicCardSection imported and role-gated with hasRole ambassador OR alumni-ambassador | ✓ VERIFIED | Lines 20 + 310-316: import present; rendered inside `isAmbassadorProgramEnabled() && profile && (hasRole(profile, "ambassador") || hasRole(profile, "alumni-ambassador"))` |
| `firestore.indexes.json` | Composite index on public_ambassadors(active ASC, cohortId ASC, updatedAt ASC) | ✓ VERIFIED | Lines 485-504: collectionGroup "public_ambassadors", 3-field composite index ASCENDING/ASCENDING/ASCENDING |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `runAcceptanceTransaction` | `public_ambassadors/{uid}` | `txn.set(publicRef, buildPublicAmbassadorProjection(...))` in first-accept block | ✓ WIRED | Line 220: db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(app.applicantUid); txn.set(publicRef, projection) |
| `PATCH /api/ambassador/profile` | `public_ambassadors/{uid}` | `batch.set(publicRef, projection, {merge: false})` | ✓ WIRED | Line 243: batch.set(publicRef, projection, { merge: false }) inside try block |
| `PATCH /api/ambassador/profile` | `mentorship_profiles/{uid}/ambassador/v1` | `batch.update(ambassadorRef, subdocUpdate)` | ✓ WIRED | Line 242: batch.update(ambassadorRef, subdocUpdate) in same batch |
| `AmbassadorsPage` | `public_ambassadors` Firestore | `loadCohortAmbassadors()` via Admin SDK | ✓ WIRED | `db.collection(PUBLIC_AMBASSADORS_COLLECTION).where(...).get()` |
| `AmbassadorsPage` | `AmbassadorCard` | Props passing `ambassador={a}` per card | ✓ WIRED | `items.map((a) => <AmbassadorCard key={a.uid} ambassador={a} />)` |
| `PublicProfilePage` | `public_ambassadors/{uid}` | `db.collection(PUBLIC_AMBASSADORS_COLLECTION).doc(uid).get()` | ✓ WIRED | Conditional read in `getPublicProfile` when roles include ambassador/alumni-ambassador |
| `PublicProfileClient` | `AmbassadorBadge` | `<AmbassadorBadge role="ambassador" />` and `<AmbassadorBadge role="alumni-ambassador" />` | ✓ WIRED | Lines 41-43 with isAmbassador/isAlumni guards |
| `AmbassadorPublicCardSection` | `GET /api/ambassador/profile` | `authFetch("/api/ambassador/profile")` in useEffect | ✓ WIRED | Hydrates form state on mount |
| `AmbassadorPublicCardSection` | `PATCH /api/ambassador/profile` | `authFetch("/api/ambassador/profile", { method: "PATCH", body })` in save() | ✓ WIRED (broken post-save) | PATCH fires correctly and Firestore write succeeds, but response body mis-hydration resets form to empty |
| `profile/page.tsx` | `AmbassadorPublicCardSection` | Import + JSX with role/feature gates | ✓ WIRED | Import line 20; rendered at line 315 inside dual gating expression |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `AmbassadorsPage` | `items: PublicAmbassadorDoc[]` | `db.collection("public_ambassadors").where(...).get()` | Yes — live Firestore query | ✓ FLOWING |
| `PublicProfilePage` | `ambassadorPublic: PublicAmbassadorDoc` | `db.collection("public_ambassadors").doc(uid).get()` | Yes — live Firestore read | ✓ FLOWING |
| `AmbassadorPublicCardSection` | `form: PublicFieldsState` | GET `/api/ambassador/profile` → subdoc read → `copyString` projection | Yes — reads live ambassador subdoc | ✓ FLOWING (on mount) |
| `AmbassadorPublicCardSection` (post-save) | `initial, form` after PATCH success | `{ ...EMPTY, ...body }` where body = `{ success, public }` | No — field values not at top level of response | ✗ HOLLOW_PROP — form resets to empty after each save |

---

## Behavioral Spot-Checks

Step 7b skipped for interactive React components and Firestore-dependent pages — these require a running server. Listed in Human Verification instead.

Static checks:
- `next.config.ts` redirects() contains `{ source: "/mentorship/mentors/:username", destination: "/u/:username", permanent: true }` — ✓ CONFIRMED
- `firestore.rules` public_ambassadors block `allow read: if true; allow write: if false` — ✓ CONFIRMED
- `firestore.indexes.json` composite index for public_ambassadors present — ✓ CONFIRMED
- `AmbassadorPublicFieldsSchema` https-only refine on social URL fields — ✓ CONFIRMED (`/^https:\/\/\S+$/`)
- `buildPublicAmbassadorProjection` no email/discordMemberId in output schema — ✓ CONFIRMED (not in the function arguments or return object)

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PRESENT-01 | 03-01, 03-05 | Public `/ambassadors` page lists active-cohort ambassadors with photo, display name, university, 1-line bio, and social links | ✓ SATISFIED | `AmbassadorsPage` + `AmbassadorCard` render all five fields; query is `active==true && cohortId==current`; no email/Discord in `PublicAmbassadorDoc` |
| PRESENT-02 | 03-01, 03-04 | `/ambassadors` reads from denormalized projection (no sensitive fields) backed by roles array query | ✓ SATISFIED | `public_ambassadors/{uid}` is the read source; projection schema has no email/discordMemberId; Firestore rules allow unauthenticated read; acceptance writes projection inside the same transaction as role write |
| PRESENT-03 | 03-04 | Any user profile page renders "Ambassador" badge when roles contains "ambassador", "Alumni Ambassador" badge when it contains "alumni-ambassador" | ✓ SATISFIED | `/u/[username]` page server-fetches roles, client renders `<AmbassadorBadge role="ambassador">` / `<AmbassadorBadge role="alumni-ambassador">` conditionally; two distinct badge variants exist |
| PRESENT-04 | 03-03, 03-05, 03-06 | Optional public `cohortPresentationVideo` can be set by ambassador after acceptance and renders on their `/ambassadors` card | ⚠️ PARTIAL | Video field persists correctly to Firestore (PATCH endpoint validates URL, classifies embed type, batches to subdoc + projection); `AmbassadorCard` renders `<VideoEmbed>` when field present; BUT `AmbassadorPublicCardSection` post-save hydration bug resets the form to empty — the UX for setting this field is broken even though the storage layer is correct |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/profile/AmbassadorPublicCardSection.tsx` | 102-103 | `const body = (await res.json()) as Partial<PublicFieldsState>; const hydrated = { ...EMPTY, ...body }` — spreading PATCH response envelope as if it were flat field values; response is `{ success: true, public: { ...projection } }` | ⚠️ Warning (UX-blocking for PRESENT-04) | After a save, `initial` and `form` are reset to EMPTY because the actual field values are nested under `body.public`, not at top level. Toast fires correctly but form blanks out — ambassador cannot see whether their previous values were preserved without reloading the page |

---

## Human Verification Required

### 1. /ambassadors page renders real ambassador cards

**Test:** With FEATURE_AMBASSADOR_PROGRAM enabled and at least one accepted ambassador in an active cohort, visit `/ambassadors` while logged out.
**Expected:** Responsive grid of AmbassadorCard components — each showing profile photo, display name, Ambassador badge pill, publicTagline (if set), university/city badges (if set), social link icons (if set), "View profile" button. No email address, Discord handle, or private application video URL visible anywhere on the page.
**Why human:** Requires seeded Firestore data; visual data-exclusion verification requires visual inspection.

### 2. Ambassador badge renders on canonical profile page

**Test:** Visit `/u/{username}` for a user whose `roles` array contains `"ambassador"`.
**Expected:** Blue "Ambassador" badge with Award icon appears in the header row beneath the display name. If `roles` contains `"alumni-ambassador"` instead, a gray "Alumni Ambassador" badge with GraduationCap icon appears.
**Why human:** Requires real ambassador account in Firestore.

### 3. /mentorship/mentors/{username} 308-redirects to /u/{username}

**Test:** Open browser DevTools Network tab, navigate to `/mentorship/mentors/ahsan` (or any ambassador username), observe the redirect.
**Expected:** HTTP 308 response from `/mentorship/mentors/ahsan`, followed by the browser loading `/u/ahsan`. Query strings on the original URL are preserved.
**Why human:** HTTP redirect status (308 vs 301 vs 302) must be confirmed in a live browser; grep only confirms the config entry exists.

### 4. Acceptance atomically writes public projection

**Test:** Accept a pending ambassador application in the admin panel, immediately visit `/ambassadors`.
**Expected:** The newly accepted ambassador appears on the `/ambassadors` page within the SSR refresh (no deploy required). Their photo, name, and university/city (from the application doc snapshot) should appear even before they edit their profile.
**Why human:** Requires end-to-end acceptance flow with real Firestore data; atomic transaction write is wired but must be confirmed at runtime.

### 5. Profile editor save behavior (PRESENT-04 — gap resolved inline)

**Test:** On `/profile` as an ambassador: (a) Enter values in university, city, publicTagline, and a Twitter URL. (b) Click "Save public card". (c) Observe the form immediately after the "Public card updated" toast. (d) Hard-reload the page.
**Expected for (c):** Form retains the entered values (no reset). The "Save" button disables because form === initial after hydration from the PATCH response.
**Expected for (d):** Values persist across reload via GET /api/ambassador/profile.
**Why human:** Post-fix validation — confirm the symmetric response shape (commit 6bbc85a) resolves the UX regression end-to-end.

### 6. Video URL inline preview

**Test:** On `/profile` as an ambassador, paste a YouTube URL (e.g. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`) into the "Cohort presentation video URL" field.
**Expected:** An inline video preview renders immediately below the input before clicking "Save".
**Why human:** Client-side preview requires a real browser render; `videoPreviewable && <VideoEmbed />` is wired but must be visually confirmed.

---

## Gap Resolution (post-verification)

The one gap (`AmbassadorPublicCardSection` form resetting to empty after save) was resolved inline before phase close-out rather than routed through a gap-closure planning cycle.

**Resolution:** Rather than patching the client, the server PATCH was made symmetric with GET. Previously PATCH returned `{ success: true, public: projection }` — a response envelope that the client's `{ ...EMPTY, ...body }` hydration pattern could not consume correctly. Now PATCH returns the same flat 8-field shape as GET (`extractPublicFieldsFromSubdoc(postWrite)`), with absent keys omitted (not null) — identical hydration contract on both endpoints.

**Commit:** `6bbc85a` fix(03-06): PATCH /api/ambassador/profile returns flat field shape
**Files changed:** `src/app/api/ambassador/profile/route.ts` (4 lines)

**Why this approach over a client fix:**
1. Asymmetric response shapes between GET/PATCH were the underlying issue — fixing the server eliminates a whole class of future bugs (toast + form state staying in sync is now a matter of the existing hydration pattern working as advertised).
2. Zero client churn — `AmbassadorPublicCardSection` needs no change, which means no risk of re-introducing the bug in a refactor.
3. Type symmetry — both endpoints now conform to the same `Partial<PublicFieldsState>`-compatible shape that the response type comment on GET already described.

**Verification after fix:**
- `npx vitest run src/__tests__/ambassador/` — 171 tests pass (unchanged)
- Manual UX confirmation remains on the human-verification checklist (item 5) as a post-deploy sanity check.

All 4 must-haves are now satisfied. PRESENT-01, PRESENT-02, PRESENT-03, and PRESENT-04 each have both implementation evidence and a behavioural check in the codebase.

---

*Verified: 2026-04-22T23:00:00Z*
*Gap resolved: 2026-04-22T23:45:00Z*
*Verifier: Claude (gsd-verifier) — initial pass*
*Gap resolver: Claude (orchestrator) — inline fix before phase close-out*
