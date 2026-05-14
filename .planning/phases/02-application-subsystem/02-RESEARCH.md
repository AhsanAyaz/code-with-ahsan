# Phase 2: Application Subsystem - Research

**Researched:** 2026-04-22
**Domain:** Multi-step application form, admin review panel, Firebase Storage, Discord integration, transactional email, Firestore data model, scheduled cleanup
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Multi-step wizard, 4 steps: (1) Eligibility pre-check (Discord age gate), (2) Personal info + university + cohort selection, (3) Motivation prompts (3x) + Discord handle + academic verification + video link, (4) Review + submit.

**D-02:** Eligibility pre-check is Step 1 — verify Discord membership age before showing the rest of the wizard. User sees "come back in N days" if ineligible.

**D-03:** Discord membership age threshold: named constant `AMBASSADOR_DISCORD_MIN_AGE_DAYS`. Default 30 days. Planner MUST surface as a decision item before launch (7 days vs. 30 days).

**D-04:** 3 motivation prompts: (1) motivation for applying, (2) relevant experience, (3) pitch for what they'd do as ambassador.

**D-05:** Cohort selection: dropdown of cohorts with `status="upcoming"` and open application window. No auto-assignment. "No open cohorts" message with "Notify me" CTA if none available.

**D-06:** External link ONLY — no Firebase Storage video upload. Applicant pastes a Loom, YouTube, or Google Drive URL.

**D-07:** URL validation: format check only (regex match). Do NOT fetch the URL server-side. Accepted patterns: `loom.com/share/`, `youtu.be/`, `youtube.com/watch`, `youtube.com/shorts/`, `drive.google.com/file/d/`.

**D-08:** Admin video embed: `react-lite-youtube-embed` for YouTube; Google Drive `/file/d/{id}/preview` iframe; Loom standard embed iframe. URL type detected server-side.

**D-09:** Application list at `/admin/ambassadors` → detail page at `/admin/ambassadors/[applicationId]`. First admin detail-page pattern in codebase.

**D-10:** List page columns: Name, University, Target Cohort, Status badge, Submitted date. Filters: cohort, status, submission date range.

**D-11:** Accept / Decline buttons on detail page only. Optional notes textarea before confirming.

**D-12:** Post-accept UX is optimistic: Firestore commit fires first, Discord fires async after. If Discord fails, retry banner on detail page. Status label updates optimistically to "accepted".

**D-13:** Explicit two-path choice at start of academic verification section: "I have an academic email" vs. "I don't have a .edu email" (shows student-ID upload directly).

**D-14:** Student-ID photo stored at `applications/{applicantUid}/{applicationId}/student_id.{ext}`. Admin reads via short-lived signed URL.

**D-15:** Academic email validation: regex for `.edu`, `.edu.{cc}`, `.ac.{cc}` + Hipo `world_universities_and_domains.json` snapshot. Unknown TLD → soft warning, not hard block.

**D-16:** Discord member ID resolved at submission time. Fails soft: `discordMemberId: null` → admin sees warning banner. Admin can still review and accept.

**D-17:** Acceptance is two-stage: Firestore write is atomic and independent of Discord. Discord failure never rolls back Firestore commit.

**D-18:** Discord role assignment is idempotent — accept endpoint checks current member roles before assigning.

**D-19:** Admin cohort panel at `/admin/ambassadors/cohorts`. Create cohort (name, startDate, endDate, maxSize, status), open/close window, view attached accepted ambassadors.

**D-20:** `maxSize` enforced at acceptance time server-side. 409 "Cohort is full" if accepted count equals maxSize.

**D-21:** Three transactional emails using existing `sendEmail` / `wrapEmailHtml` pattern from `src/lib/email.ts`.
- EMAIL-01: confirmation on submission
- EMAIL-02: acceptance with onboarding steps
- EMAIL-03: decline with kind messaging and reapply encouragement

### Claude's Discretion

- Exact wizard step progress bar style (step dots, numbered steps, percentage bar) — match existing DaisyUI patterns
- Pagination implementation for the admin application list (server-side cursor pagination consistent with existing admin pages)
- Specific error messages and toast notifications — follow existing toast/UiToast patterns
- Firestore security rules for `applications/` and `cohorts/` collections (write from Phase 1 dual-claim pattern)
- Declined video cleanup cron scheduling (REVIEW-04) — use GitHub Actions as established in STATE.md workflow notes

### Deferred Ideas (OUT OF SCOPE)

- "Notify me when applications open" subscription — future phase
- Multi-reviewer voting with partial-acceptance state machine (FUTURE-REVIEW-01) — single-reviewer only in v1
- On-platform interview scheduling (FUTURE-APPLY-01) — Calendly sufficient for cohort 1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COHORT-01 | Admin can create a cohort (name, startDate, endDate, maxSize, status) from the admin panel | Firestore `cohorts/` collection, new admin page at `/admin/ambassadors/cohorts`, POST `/api/ambassador/cohorts` |
| COHORT-02 | Admin can open/close application window on a cohort | PATCH endpoint toggling `applicationWindowOpen` field on cohort doc |
| COHORT-03 | Admin can view list of all accepted ambassadors attached to a cohort | Query `applications` where `cohortId == X` and `status == "accepted"` |
| COHORT-04 | System enforces cohort `maxSize` at acceptance time | Count query before accept; 409 if full |
| APPLY-01 | Public `/ambassadors/apply` page with Firebase auth gate, Discord age check | `isAmbassadorProgramEnabled()` already gates route tree; Discord age = `(now - profile.createdAt) >= AMBASSADOR_DISCORD_MIN_AGE_DAYS` |
| APPLY-02 | Application form captures all required fields | Multi-step wizard captures all specified fields |
| APPLY-03 | External video link (Loom / YouTube / Google Drive) with validation | D-06/D-07: regex-only validation, no server-side fetch |
| APPLY-04 | Academic email validated against `.edu`/`.ac.{cc}` regex + Hipo snapshot | Server-side validator at `src/lib/ambassador/academicEmail.ts` |
| APPLY-05 | Student-ID photo upload as fallback path | Firebase Storage at `applications/{uid}/{appId}/student_id.{ext}` |
| APPLY-06 | `applications/{applicationId}` doc + Storage with deny-by-default rules | New Firestore collection; Firestore rules: write = applicant only, read = applicant + admin |
| APPLY-07 | Applicant sees own application status on profile | Query `applications` where `applicantUid == uid` (client-side reads via API route, not direct Firestore) |
| APPLY-08 | Applicant receives confirmation email on submit and pass/fail email on decision | EMAIL-01 on submission; EMAIL-02/03 on decision |
| REVIEW-01 | Admin list at `/admin/ambassadors` with filters and pagination | New admin page; server-side cursor pagination matching existing admin pattern |
| REVIEW-02 | Admin detail page — all fields, video embed, signed URL (1-hour), reviewer notes | `/admin/ambassadors/[applicationId]`; signed URL via `storage.file(path).getSignedUrl()` |
| REVIEW-03 | Admin accept/decline with optional note; single-reviewer workflow | Detail page buttons; PATCH `/api/ambassador/applications/[id]` with `{action, notes}` |
| REVIEW-04 | Declined video cleanup: delete stored video 30 days after decline | GitHub Actions cron script; query `applications` where `status=declined` and `declinedAt < 30d ago`; delete Storage object if present |
| REVIEW-05 | Admin panel Discord banner if `discordMemberId` is null on acceptance attempt | Banner component on detail page; retry triggers re-lookup + role assignment |
| DISC-01 | Discord handle resolved to `discordMemberId` at submission | Call `lookupMemberByUsername()` on submit; store result (or null) on application doc |
| DISC-02 | Two-stage acceptance: Firestore commit independent of Discord | Firestore batch write first; Discord `assignDiscordRole()` called after, errors caught |
| DISC-03 | Idempotent role assignment — retry never double-assigns | Check member's current roles before PUT; `assignDiscordRole()` already uses PUT which is idempotent at the Discord API level |
| EMAIL-01 | Application-submitted confirmation email | `sendEmail()` + `wrapEmailHtml()` in POST `/api/ambassador/applications` handler |
| EMAIL-02 | Acceptance email with onboarding steps | Called in acceptance path of PATCH handler |
| EMAIL-03 | Decline email with kind messaging | Called in decline path of PATCH handler |
</phase_requirements>

---

## Summary

Phase 2 builds the complete end-to-end pipeline from public application submission through admin review to ambassador acceptance. All decisions are locked; the planner has no architectural free choices — only implementation detail discretion (pagination style, progress bar variant, toast wording, Firestore rules structure).

The key complexity areas are: (1) the 4-step wizard with two academic-verification paths, (2) the two-stage acceptance commit (Firestore-first, Discord-async) with admin-visible retry, and (3) the signed-URL pattern for admin video review. None of these require new infrastructure: the codebase already has all the building blocks (`assignDiscordRole`, `lookupMemberByUsername`, `sendEmail`, `wrapEmailHtml`, `syncRoleClaim`, Firebase Admin Storage SDK, DaisyUI step components, admin auth layout).

The REVIEW-04 declined-video cleanup is a GitHub Actions cron script following the exact same shape as `cleanup-archived-discord-channels.yml`. There is no video upload to Storage (D-06 decided external links only), but the student-ID photo upload at `applications/{uid}/{appId}/student_id.{ext}` IS in Storage — the cleanup only needs to remove it for declined applications after 30 days.

**Primary recommendation:** Build in the plan order — Firestore data model + rules first (unblocks all other tasks), then API routes (cohorts, applications, acceptance), then UI (wizard, admin list, admin detail page), then emails and cron last.

---

## Standard Stack

### Core (already in codebase — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.0.10 | Page routing, API routes | Existing pattern; all admin pages use it |
| Firebase Admin SDK | 13.6.0 | Firestore writes, Storage signed URLs, Auth | Already used in every API route |
| Firebase Client SDK | 12.6.0 | Client-side auth, file upload (student-ID) | Already used in mentorship onboarding |
| DaisyUI 5 | 5.5.1-beta.2 | UI components: steps, badges, dropdowns, modals | All existing UI uses DaisyUI |
| Zod | 4.3.6 | Schema validation on API boundaries | Used in `src/types/mentorship.ts` and throughout |
| react-lite-youtube-embed | 3.3.3 | YouTube video embed on admin detail page | Already in package.json; used elsewhere |
| Mailgun (mailgun.js) | 12.6.1 | Transactional emails | `sendEmail()` / `wrapEmailHtml()` already wrap it |
| Vitest | 4.0.18 | Unit tests for new validators and logic | Already configured in `vitest.config.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date arithmetic (Discord age check, 30-day cleanup window) | Already in codebase |
| Winston logger | 3.19.0 | Structured logging in API routes | `createLogger("ambassador")` pattern |
| `use-debounce` | (in codebase) | Debounced search in admin list | Already used in admin/mentors/page.tsx |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| External video link only | Firebase Storage video upload | D-06 decision: Storage upload rejected (mobile flakiness, cost, complexity vs. Loom/YouTube link) |
| GitHub Actions cron | Vercel cron or Next.js API route | STATE.md workflow note: "Cron jobs — always use GitHub Actions + scripts/" |
| Firestore Admin SDK reads in API routes | Client-side Firestore listeners | Admin routes use Admin SDK (no client-side token needed); applicant status reads go through API route |

**Installation:** No new dependencies required. All needed libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── ambassador/
│       ├── roleMutation.ts          # EXISTING — syncRoleClaim(); Phase 2 hardens accept flow
│       ├── academicEmail.ts         # NEW — regex + Hipo snapshot validator
│       ├── videoUrl.ts              # NEW — video link regex validator + embed-type detector
│       └── cohorts.ts               # NEW — cohort helper (maxSize check, open-window query)
├── app/
│   ├── ambassadors/
│   │   ├── layout.tsx               # EXISTING — feature flag gate
│   │   └── apply/
│   │       └── page.tsx             # NEW — 4-step application wizard (client component)
│   └── admin/
│       └── ambassadors/
│           ├── layout.tsx           # EXISTING — feature flag gate
│           ├── page.tsx             # NEW — application list with filters + pagination
│           ├── [applicationId]/
│           │   └── page.tsx         # NEW — application detail (video embed, accept/decline)
│           └── cohorts/
│               └── page.tsx         # NEW — cohort management panel
├── api/
│   └── ambassador/
│       ├── applications/
│       │   ├── route.ts             # POST submit, GET list (admin)
│       │   └── [id]/
│       │       └── route.ts         # GET detail, PATCH accept/decline
│       ├── cohorts/
│       │   ├── route.ts             # GET list (open), POST create
│       │   └── [id]/
│       │       └── route.ts         # PATCH update (open/close window)
│       └── discord-resolve/
│           └── route.ts             # POST re-resolve discordMemberId (retry flow)
└── __tests__/
    ├── ambassador/
    │   ├── academicEmail.test.ts    # NEW — unit tests for email validator
    │   └── videoUrl.test.ts        # NEW — unit tests for URL validator
    └── (existing tests unchanged)
scripts/
└── cleanup-declined-application-media.ts  # NEW — GitHub Actions cron
.github/workflows/
└── cleanup-declined-application-media.yml # NEW — weekly cron trigger
```

### Pattern 1: Two-Stage Acceptance (DISC-02)

**What:** Firestore batch write (roles mutation + ambassador subdoc + cohort counter) commits first. Discord role assignment runs immediately after in the same API request but its failure is caught and stored as a flag, never rolling back Firestore.

**When to use:** Every acceptance invocation.

**Example:**
```typescript
// Source: mirrors existing non-blocking pattern in src/lib/discord.ts
// POST /api/ambassador/applications/[id] with { action: "accept", notes: "..." }

// Step 1: Firestore atomic commit
const batch = db.batch();
const profileRef = db.collection("mentorship_profiles").doc(applicantUid);
const appRef = db.collection("applications").doc(applicationId);
const cohortRef = db.collection("cohorts").doc(cohortId);

// Check maxSize before committing (COHORT-04)
const cohortDoc = await cohortRef.get();
const cohort = cohortDoc.data()!;
if (cohort.acceptedCount >= cohort.maxSize) {
  return NextResponse.json({ error: "Cohort is full" }, { status: 409 });
}

batch.update(profileRef, { roles: FieldValue.arrayUnion("ambassador") });
batch.set(profileRef.collection("ambassador").doc("v1"), {
  cohortId, joinedAt: FieldValue.serverTimestamp(), active: true, strikes: 0,
  discordMemberId: application.discordMemberId ?? null,
});
batch.update(appRef, { status: "accepted", reviewerNotes: notes, decidedAt: FieldValue.serverTimestamp() });
batch.update(cohortRef, { acceptedCount: FieldValue.increment(1) });
await batch.commit();

// Sync custom claims (non-fatal if it fails)
await syncRoleClaim(applicantUid, { roles: updatedRoles, admin: false });

// Step 2: Discord (non-blocking — failure stored as flag, not thrown)
let discordSuccess = false;
if (application.discordMemberId) {
  discordSuccess = await assignDiscordRole(application.discordHandle, DISCORD_AMBASSADOR_ROLE_ID);
  if (!discordSuccess) {
    await appRef.update({ discordRoleAssigned: false, discordRetryNeeded: true });
  } else {
    await appRef.update({ discordRoleAssigned: true, discordRetryNeeded: false });
  }
}

// Step 3: Send acceptance email (non-blocking)
await sendAmbassadorAcceptanceEmail(applicant);

return NextResponse.json({ success: true, discordAssigned: discordSuccess });
```

### Pattern 2: Admin Signed URL for Storage Assets (REVIEW-02)

**What:** Every admin page load for an application generates a fresh 1-hour signed URL for any Firebase Storage assets (student-ID photo). Never expose `getDownloadURL()` (persistent public URL).

**When to use:** Admin detail page loader for student-ID photo. Video links are external (no Storage URL needed for video per D-06).

**Example:**
```typescript
// Source: Firebase Admin SDK — storage.file().getSignedUrl()
import { storage } from "@/lib/firebaseAdmin";

async function getShortLivedUrl(storagePath: string): Promise<string | null> {
  if (!storage || !storagePath) return null;
  try {
    const [url] = await storage.file(storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });
    return url;
  } catch {
    return null;
  }
}
```

### Pattern 3: Video URL Detection and Embed (D-08)

**What:** Server-side URL classification returns embed type; client renders the appropriate embed.

```typescript
// Source: src/lib/ambassador/videoUrl.ts (new file)
export type VideoEmbedType = "youtube" | "loom" | "drive" | "unknown";

export function classifyVideoUrl(url: string): VideoEmbedType {
  if (/(?:youtu\.be\/|youtube\.com\/(?:watch|shorts\/))/.test(url)) return "youtube";
  if (/loom\.com\/share\//.test(url)) return "loom";
  if (/drive\.google\.com\/file\/d\//.test(url)) return "drive";
  return "unknown";
}

export function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/file\/d\/([^/]+)/);
  return match?.[1] ?? null;
}

export function isValidVideoUrl(url: string): boolean {
  return /loom\.com\/share\//.test(url)
    || /youtu\.be\//.test(url)
    || /youtube\.com\/watch/.test(url)
    || /youtube\.com\/shorts\//.test(url)
    || /drive\.google\.com\/file\/d\//.test(url);
}
```

**Loom embed pattern:**
```typescript
// Loom embed: extract share ID from loom.com/share/{id}
// Embed URL: https://www.loom.com/embed/{id}
const loomId = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)?.[1];
// <iframe src={`https://www.loom.com/embed/${loomId}`} ... />
```

### Pattern 4: Academic Email Validation (APPLY-04)

**What:** Two-layer check. Layer 1 — regex for recognized academic TLDs. Layer 2 — check against Hipo university domain snapshot. Unknown TLD returns `{ valid: false, needsManualVerification: true }` (never hard rejects).

```typescript
// Source: src/lib/ambassador/academicEmail.ts (new file)
// Hipo dataset: https://github.com/Hipo/university-domains-list
// Use the raw JSON snapshot bundled at build time (no external fetch)
// Place at: src/data/world_universities_and_domains.json

const ACADEMIC_TLD_REGEX = /\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2}$/i;

export function validateAcademicEmail(email: string): {
  syntaxValid: boolean;
  academicTldMatch: boolean;
  hipoMatch: boolean;
  needsManualVerification: boolean;
} {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { syntaxValid: false, academicTldMatch: false, hipoMatch: false, needsManualVerification: false };

  const tldMatch = ACADEMIC_TLD_REGEX.test(domain);
  // hipoMatch = universities.some(u => u.domains.includes(domain))
  // needsManualVerification = !tldMatch && !hipoMatch
  ...
}
```

### Pattern 5: GitHub Actions Cron for Storage Cleanup (REVIEW-04)

**What:** Weekly script queries `applications` where `status == "declined"` and `declinedAt` is older than 30 days, then deletes the Firebase Storage student-ID file if present. Follows the exact shape of `.github/workflows/cleanup-archived-discord-channels.yml`.

```yaml
# .github/workflows/cleanup-declined-application-media.yml
on:
  schedule:
    - cron: '0 4 * * 1'   # Mondays 04:00 UTC
  workflow_dispatch: {}
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'npm' }
      - run: npm ci
      - run: npx tsx scripts/cleanup-declined-application-media.ts
        env:
          FIREBASE_SERVICE_ACCOUNT_KEY: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
```

### Pattern 6: Discord Age Gate (APPLY-01)

**What:** Step 1 of wizard fetches user's Firestore profile and checks `createdAt`. The `discordUsername` on the profile was stored at sign-up. Discord join date is not directly available via bot API without fetching guild member — simplest approach: use `mentorship_profiles.createdAt` as a proxy (user joined Discord to create a CWA profile). If the platform-profile creation predates Discord join, it will over-accept; this is the approach to use unless the spec requires the actual guild join date.

**Clarification needed for planner:** APPLY-01 says "≥30 days since Discord-linked account creation." The CWA profile `createdAt` is the best available proxy. If the actual Discord guild member join date is required, `lookupMemberByUsername()` + `GET /guilds/{id}/members/{memberId}` returns `joined_at` field. Use platform `createdAt` as the default; add the Discord API call only if Ahsan explicitly requests exact guild join date. Surface this as a decision in the plan.

### Anti-Patterns to Avoid

- **Persistent `getDownloadURL()` for admin video assets:** REVIEW-02 requires 1-hour expiry. Always use `getSignedUrl()`.
- **Rolling back Firestore on Discord failure:** D-17 and DISC-02 explicitly prohibit this. Discord failure is surfaced as a retry banner, never a rollback.
- **Server-side URL fetch for video validation:** D-07 prohibits this. Regex only.
- **Blocking the submission API route on Discord resolution:** DISC-01 is fail-soft. Log and store null; never block.
- **Writing application docs client-side via Firestore SDK:** All writes go through API routes (Admin SDK), not direct client-side Firestore writes. Firestore rules deny client writes to `applications/`.
- **`FieldValue.increment()` without a maxSize check:** Always read cohort state before increment to avoid race conditions on the maxSize guard (COHORT-04). Use a Firestore transaction, not a batch, for the cohort counter increment when enforcing the cap.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YouTube video embed | Custom `<video>` tag or iframe lookup | `react-lite-youtube-embed` (already installed) | Handles autoplay, thumbnail, lazy loading, GDPR consent |
| Email sending + HTML wrapping | Custom SMTP client or new email provider | `sendEmail()` + `wrapEmailHtml()` in `src/lib/email.ts` | Already handles Mailgun init, DISABLE_EMAILS flag, logging |
| Discord role assignment | Custom Discord API fetch | `assignDiscordRole()` in `src/lib/discord.ts` | Already handles rate limiting, error logging, return bool |
| Discord username → member ID | Custom guild member search | `lookupMemberByUsername()` in `src/lib/discord.ts` | Already handles exact-match, case-insensitive, error null-return |
| Role array mutation + claim sync | Raw Firestore update | `syncRoleClaim()` in `src/lib/ambassador/roleMutation.ts` | Handles merged claim write, non-fatal error return |
| Admin auth guard | Session check in every admin page | `AdminAuthGate` wrapping via `src/app/admin/layout.tsx` | Admin layout already gates everything under `/admin/*` |
| Video URL regex | Ad-hoc string contains | `isValidVideoUrl()` / `classifyVideoUrl()` in new `src/lib/ambassador/videoUrl.ts` | Centralizes pattern, testable, reused in form + server-side |
| Cohort count enforcement | Client-side count check | Server-side Firestore transaction before batch commit | Race-condition-safe; client checks are advisory only |

**Key insight:** This phase adds zero new runtime dependencies. Every significant operation (email, Discord, Firebase, role mutation) has a working implementation already in `src/lib/`. The build work is entirely new route/page files and two new lib utilities (`academicEmail.ts`, `videoUrl.ts`).

---

## Common Pitfalls

### Pitfall 1: Race Condition on Cohort maxSize
**What goes wrong:** Two admins accept applicants simultaneously into a nearly-full cohort; both pass the size check before either commits, resulting in over-enrollment.
**Why it happens:** `batch.commit()` does not check-and-set atomically — a batch can read stale state.
**How to avoid:** Use `db.runTransaction()` for the acceptance flow, not `db.batch()`. Inside the transaction, read the cohort doc, check `acceptedCount >= maxSize`, then increment. Firestore transactions are serializable per-document.
**Warning signs:** Cohort accepted count exceeds `maxSize` by more than 1 in production.

### Pitfall 2: Discord `discordMemberId` Stale After Retry
**What goes wrong:** Admin retry of Discord role assignment reuses a stale `discordMemberId` (user changed their Discord username since submission). Role assignment silently fails because the PUT to the stale user ID returns 404.
**Why it happens:** `discordMemberId` is stored at submission time (DISC-01). Retry does not re-resolve the username.
**How to avoid:** The retry endpoint (`/api/ambassador/discord-resolve`) MUST re-call `lookupMemberByUsername()` with the stored Discord handle, write the new `discordMemberId` to the application doc, then attempt role assignment with the fresh ID.
**Warning signs:** `assignDiscordRole()` returns false on retry even though the user is visibly in the Discord server.

### Pitfall 3: Missing `isAmbassadorProgramEnabled()` Check on API Routes
**What goes wrong:** The UI is gated behind the feature flag via the layout, but the API routes are not — someone calls `/api/ambassador/applications` directly while the flag is off and creates data before Phase 2 is officially enabled.
**Why it happens:** Layout gates only block the browser; they do not protect API routes.
**How to avoid:** Every `/api/ambassador/*` route handler MUST check `isAmbassadorProgramEnabled()` at the top and return 404/503 if false.
**Warning signs:** Application documents appearing in Firestore before Phase 2 is announced as live.

### Pitfall 4: Firestore Rules Missing for New Collections
**What goes wrong:** `applications/` and `cohorts/` collections are not covered by `firestore.rules` — Firestore falls back to deny-all (in production security mode), and the client-side application status check (APPLY-07) fails silently.
**Why it happens:** New collections are not automatically covered by existing rules.
**How to avoid:** Add explicit rules for `applications/{appId}` (read: owner or admin; write: admin-only; create: owner with status==submitted) and `cohorts/{cohortId}` (read: any signed-in user for open cohorts; write: admin only) alongside the API route work. The admin operations go through Admin SDK (bypasses rules), but APPLY-07's applicant status read can be done via the API route to avoid client-rule complexity.
**Warning signs:** PERMISSION_DENIED errors in browser console on the applicant's profile page.

### Pitfall 5: Loom Embed Requires Specific iframe Sandbox Attributes
**What goes wrong:** Loom embeds throw a cross-origin error or show a blank iframe without the correct `allow` attributes.
**Why it happens:** Loom's embed requires `allowfullscreen` and `allow="fullscreen"` to render correctly in a sandboxed iframe context.
**How to avoid:** Use `<iframe src="https://www.loom.com/embed/{id}" frameBorder="0" allowFullScreen />`. No `sandbox` attribute on this iframe.
**Warning signs:** Blank white box where the Loom video should be in the admin detail page.

### Pitfall 6: Hipo JSON File Size
**What goes wrong:** The Hipo `world_universities_and_domains.json` file is ~4.5MB. Importing it at the top level of a server component or API route cold-starts the route on every invocation.
**Why it happens:** Node.js module caching only helps within a single server process lifetime; serverless (Vercel) restarts can reload the module.
**How to avoid:** Wrap the import in a lazy singleton (read once, cache in module scope). Alternatively, only load the domains array, not full university names. Consider a pre-processed Set of known academic domains for O(1) lookup.
**Warning signs:** `POST /api/ambassador/applications` taking >2s on first cold-start.

### Pitfall 7: Firebase Storage Null on Local Dev
**What goes wrong:** `storage` exported from `src/lib/firebaseAdmin.ts` is `null` when `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is not set in `.env`. Student-ID upload and signed URL generation crash with null-pointer errors.
**Why it happens:** The existing `firebaseAdmin.ts` explicitly exports `null as unknown as ...` when the bucket env var is missing (to allow local dev without Storage).
**How to avoid:** Wrap every `storage.file()` call with a null check. Make Storage-dependent paths gracefully degrade in development (skip upload, show warning). Surface a clear error if Storage is required but null in production.
**Warning signs:** `Cannot read properties of null (reading 'file')` errors on student-ID upload route.

---

## Code Examples

### Email: Submission Confirmation (EMAIL-01)
```typescript
// Source: mirrors existing sendAdminMentorPendingEmail pattern in src/lib/email.ts
export async function sendApplicationSubmittedEmail(
  applicantEmail: string,
  applicantName: string,
  cohortName: string,
): Promise<boolean> {
  const subject = "Your Ambassador Application Has Been Received";
  const content = `
    <h2>Application Received!</h2>
    <p>Hi ${applicantName},</p>
    <p>We've received your application for the <strong>${cohortName}</strong> cohort of the Code With Ahsan Student Ambassador Program.</p>
    <div class="highlight">
      <p>We'll review your application and get back to you within 2–3 weeks.</p>
    </div>
    <p>You can check your application status on your profile page at any time.</p>
    <a href="${getSiteUrl()}/profile" class="button">View Application Status</a>
  `;
  return sendEmail(applicantEmail, subject, wrapEmailHtml(content, subject));
}
```

### Firestore Data Model

**`applications/{applicationId}`:**
```typescript
interface ApplicationDoc {
  applicationId: string;
  applicantUid: string;
  applicantEmail: string;
  applicantName: string;
  university: string;
  yearOfStudy: string;
  country: string;
  city: string;
  discordHandle: string;
  discordMemberId: string | null;         // Resolved at submission; null = not found
  academicEmail?: string;                 // If path A
  academicEmailVerified: boolean;         // regex + Hipo result
  studentIdStoragePath?: string;          // If path B (student-ID upload)
  motivation: string;                     // Prompt 1
  experience: string;                     // Prompt 2
  pitch: string;                          // Prompt 3
  videoUrl: string;                       // External link (Loom / YouTube / Drive)
  videoEmbedType: "youtube" | "loom" | "drive";
  targetCohortId: string;
  status: "submitted" | "under_review" | "accepted" | "declined";
  reviewerNotes?: string;
  reviewedBy?: string;                    // admin uid
  submittedAt: Timestamp;
  decidedAt?: Timestamp;
  declinedAt?: Timestamp;                 // Set on decline; used by cleanup cron
  discordRoleAssigned: boolean;
  discordRetryNeeded: boolean;
}
```

**`cohorts/{cohortId}`:**
```typescript
interface CohortDoc {
  cohortId: string;
  name: string;                           // e.g., "Cohort 1 — Spring 2026"
  startDate: Timestamp;
  endDate: Timestamp;
  maxSize: number;
  acceptedCount: number;                  // Maintained via FieldValue.increment in transaction
  status: "upcoming" | "active" | "closed";
  applicationWindowOpen: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Admin API Auth Pattern (consistent with existing admin pages)
```typescript
// Source: existing pattern in src/app/admin/* pages
// Admin pages send x-admin-token header from localStorage.getItem(ADMIN_TOKEN_KEY)
// API routes validate this token via the existing verifyAuth / admin token check

// For new /api/ambassador/* routes — re-use the same admin token validation
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
// (In API route): check request.headers.get("x-admin-token") against env var
```

### Wizard Step Progress (DaisyUI)
```tsx
// Source: DaisyUI steps component — matches existing DaisyUI patterns
<ul className="steps steps-horizontal w-full mb-8">
  <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Eligibility</li>
  <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Your Info</li>
  <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Application</li>
  <li className={`step ${step >= 4 ? "step-primary" : ""}`}>Review</li>
</ul>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Firebase Storage video upload | External video link (Loom/YouTube/Drive) | D-06 locked decision | No video Storage cleanup needed; student-ID is the only Storage artifact |
| `role: string` single role field | `roles: string[]` array | Phase 1 complete | Acceptance appends `"ambassador"` via `FieldValue.arrayUnion()` |
| Acceptance triggers immediate Discord role | Two-stage: Firestore-first, Discord-async | D-17 locked decision | Admin retry path required; Firestore is authoritative |

**Deprecated/outdated in this context:**
- APPLY-03 reference to "direct Firebase Storage upload for video": superseded by D-06. Only student-ID photo uses Firebase Storage.
- Any pattern that reads `.role` instead of `.roles`: deprecated post-Phase-1; use `hasRole(profile, "ambassador")` from `src/lib/permissions.ts`.

---

## Open Questions

1. **Discord age gate: platform `createdAt` vs. actual guild join date**
   - What we know: APPLY-01 says "≥30 days since Discord-linked account creation." `mentorship_profiles.createdAt` is the creation date of the CWA platform account.
   - What's unclear: Does "Discord-linked account creation" mean CWA profile creation date (proxy) or the actual Discord guild `joined_at` date? The guild API returns `joined_at` but requires an additional bot API call per check.
   - Recommendation: Default to CWA `createdAt` as proxy. Surface as a decision in the plan: "Use CWA profile `createdAt` as Discord join proxy (simpler) or call Discord guild member API for exact join date (accurate but +1 API call on Step 1)?"

2. **`DISCORD_AMBASSADOR_ROLE_ID` env var**
   - What we know: `src/lib/discord.ts` exports `DISCORD_MENTOR_ROLE_ID` and `DISCORD_MENTEE_ROLE_ID` as hardcoded constants. There is no `DISCORD_AMBASSADOR_ROLE_ID` yet.
   - What's unclear: Should the ambassador role ID be a hardcoded constant in `discord.ts` (matching the existing pattern) or an env var?
   - Recommendation: Match existing pattern — add `export const DISCORD_AMBASSADOR_ROLE_ID = "{id}";` to `discord.ts`. The actual role ID must be created in the Discord server and the constant value set before the first acceptance. Flag this as a pre-flight step in the plan.

3. **Pagination approach for admin application list (REVIEW-01)**
   - What we know: Existing admin pages (e.g., admin/mentors) use client-side array slicing (`currentPage`, `pageSize` state) after fetching all records, not server-side cursor pagination.
   - What's unclear: CONTEXT.md says "server-side cursor pagination consistent with existing admin pages" — but existing admin pages actually do client-side pagination after full fetch (Firestore Admin SDK, small datasets). With potentially hundreds of applications, server-side cursor is better but is a new pattern.
   - Recommendation: Use Firestore cursor pagination (`startAfter(lastDoc)`, `limit(pageSize)`) in the `/api/ambassador/applications` GET route since applications could be a larger dataset. This is a Claude's Discretion area per CONTEXT.md.

4. **Admin token auth pattern for new API routes**
   - What we know: Existing admin pages send `x-admin-token` from `localStorage`. But new `/api/ambassador/*` routes also need auth for applicant-facing reads (APPLY-07: applicant checks own status).
   - Recommendation: Applicant-facing reads use Firebase ID token (`Authorization: Bearer {idToken}`) verified server-side via `admin.auth().verifyIdToken()`. Admin writes use the existing `x-admin-token` pattern. This matches how `/api/mentorship/profile` GET works (uid query param, no special auth beyond Firebase for read).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Firebase Admin SDK | All API routes | Yes | 13.6.0 | — |
| Firebase Storage bucket | Student-ID upload, signed URLs | Yes (env var needed) | — | null check in firebaseAdmin.ts; graceful degrade in local dev |
| Mailgun | EMAIL-01/02/03 | Yes (env var needed) | — | DISABLE_EMAILS=true for local dev |
| Discord Bot Token + Guild ID | DISC-01, DISC-02, DISC-03 | Yes (env var needed) | — | isDiscordConfigured() check; fail-soft |
| Hipo university domains JSON | APPLY-04 | Must be downloaded and bundled | ~4.5MB | Regex-only fallback if file missing |
| DISCORD_AMBASSADOR_ROLE_ID | DISC-02 | Not yet created in Discord server | — | Must be created before first acceptance; hardcoded constant |

**Missing dependencies with no fallback:**
- `DISCORD_AMBASSADOR_ROLE_ID`: The Discord role must be created in the CWA Discord server and its ID recorded as a constant in `src/lib/discord.ts` before any acceptance can assign it. This is a pre-flight operational step, not a code dependency.

**Missing dependencies with fallback:**
- Hipo domains JSON: The regex check alone covers the most common academic TLDs. If the Hipo file is not bundled, the validator degrades to regex-only (all unknown TLDs show "could not auto-verify" soft warning).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + @vitest/coverage-v8 4.1.5 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run src/__tests__/ambassador/` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPLY-03 | Video URL regex accepts valid Loom/YouTube/Drive URLs; rejects others | unit | `npx vitest run src/__tests__/ambassador/videoUrl.test.ts` | Wave 0 |
| APPLY-04 | Academic email regex matches `.edu`, `.edu.pk`, `.ac.uk`; rejects Gmail/Hotmail | unit | `npx vitest run src/__tests__/ambassador/academicEmail.test.ts` | Wave 0 |
| APPLY-04 | Unknown TLD returns `needsManualVerification: true`, not rejected | unit | same file | Wave 0 |
| COHORT-04 | Acceptance API returns 409 when cohort is full | integration (manual) | manual: POST accept with full cohort fixture | — |
| DISC-02 | Acceptance Firestore write succeeds even when Discord call returns false | unit (mock) | `npx vitest run src/__tests__/ambassador/acceptance.test.ts` | Wave 0 |
| DISC-03 | Second acceptance call does not double-assign role (Discord PUT is idempotent) | manual + Discord API behavior | verify Discord API docs: PUT guild member role is idempotent | — |
| REVIEW-02 | Signed URL has 1-hour expiry | unit (mock storage) | `npx vitest run src/__tests__/ambassador/signedUrl.test.ts` | Wave 0 |
| EMAIL-01 | Submission confirmation email is sent with correct subject and recipient | unit (mock sendEmail) | `npx vitest run src/__tests__/ambassador/emails.test.ts` | Wave 0 |
| EMAIL-02/03 | Accept/decline emails are sent on correct action | unit (mock sendEmail) | same file | Wave 0 |
| APPLY-07 | Applicant profile page shows correct status value | manual smoke | open `/profile` after submitting; verify status badge | — |
| REVIEW-01 | Admin list page renders; filters work; pagination advances | manual smoke | load `/admin/ambassadors`; filter by status | — |
| COHORT-01/02 | Admin can create cohort and toggle application window | manual smoke | create cohort at `/admin/ambassadors/cohorts` | — |

### Observable Outputs (Phase Completion Proof)

1. A signed-in user with a 30-day-old CWA account can navigate to `/ambassadors/apply`, complete all 4 wizard steps, and submit — resulting in a new document in `applications/` collection with `status: "submitted"` and receiving an EMAIL-01 confirmation.
2. The admin can view the application at `/admin/ambassadors/[applicationId]`, see the video embed for the submitted URL, and see the student-ID (if uploaded) via a signed URL that expires.
3. The admin clicks Accept: the `mentorship_profiles/{uid}.roles` array gains `"ambassador"`, the ambassador subdoc exists, the cohort `acceptedCount` increments, and the applicant receives EMAIL-02. The application status shows "accepted".
4. If Discord role assignment fails, the detail page shows a retry banner; clicking retry re-resolves the Discord member ID and re-attempts role assignment without creating a duplicate role.
5. Admin declines an application: `status` updates to "declined", EMAIL-03 is sent. After 30+ days, the GitHub Actions cleanup script removes the student-ID Storage file for that application.
6. Cohort panel at `/admin/ambassadors/cohorts` creates a cohort; attempting to accept a 26th applicant into a `maxSize: 25` cohort returns a 409 error in the admin UI.

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/ambassador/`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green + manual smoke of all 6 observable outputs before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/ambassador/videoUrl.test.ts` — covers APPLY-03 URL regex
- [ ] `src/__tests__/ambassador/academicEmail.test.ts` — covers APPLY-04 validation logic
- [ ] `src/__tests__/ambassador/acceptance.test.ts` — covers DISC-02 two-stage commit behavior
- [ ] `src/__tests__/ambassador/signedUrl.test.ts` — covers REVIEW-02 signed URL expiry
- [ ] `src/__tests__/ambassador/emails.test.ts` — covers EMAIL-01/02/03 send calls

*(Existing `permissions.test.ts`, `urls.test.ts`, and security-rules tests are unaffected and remain passing.)*

---

## Sources

### Primary (HIGH confidence)
- `src/lib/discord.ts` (codebase) — `assignDiscordRole()` at line 829, `lookupMemberByUsername()` at line 100; Discord API v10 patterns confirmed
- `src/lib/email.ts` (codebase) — `sendEmail()` at line 106, `wrapEmailHtml()` at line 78; Mailgun integration confirmed
- `src/lib/ambassador/roleMutation.ts` (codebase) — `syncRoleClaim()` signature, merge semantics, non-fatal error return
- `src/lib/firebaseAdmin.ts` (codebase) — Storage bucket initialization, null guard for local dev, `getSignedUrl()` SDK available
- `src/app/admin/layout.tsx` (codebase) — Admin auth pattern: `MentorshipProvider` + `AdminAuthGate` wrapping
- `src/app/ambassadors/layout.tsx`, `src/app/admin/ambassadors/layout.tsx` (codebase) — Feature flag gate: `isAmbassadorProgramEnabled()` + `notFound()`
- `firestore.rules` (codebase) — Existing collection rules, dual-claim helper, Admin SDK bypass pattern
- `.github/workflows/cleanup-archived-discord-channels.yml` (codebase) — GitHub Actions cron shape for REVIEW-04

### Secondary (MEDIUM confidence)
- `.planning/phases/02-application-subsystem/02-CONTEXT.md` — All locked decisions verified by cross-referencing against codebase patterns
- `docs/superpowers/specs/2026-04-21-student-ambassador-program-design.md` — Data model sketch §9.4, component boundaries §9.3
- Hipo university-domains-list: https://github.com/Hipo/university-domains-list (known, unverified in current session — fetch at implementation time; ~4.5MB JSON)

### Tertiary (LOW confidence)
- Loom embed iframe pattern: `https://www.loom.com/embed/{id}` — from general knowledge; verify against Loom docs at implementation time
- Discord `PUT /guilds/{id}/members/{userId}/roles/{roleId}` idempotency: documented as returning 204 whether role already exists or not — verify against Discord API v10 docs at implementation time

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md was not found at the working directory root. Constraints are drawn from `REQUIREMENTS.md` and `STATE.md`:

- Must use existing Next.js 16 / React 19 / Firebase / DaisyUI stack
- No new runtime dependencies without explicit justification
- Must follow existing admin dashboard styling and component patterns
- Must use existing `src/lib/discord.ts` functions (extend, do not replace)
- Must not regress any v1.0–v5.0 validated capability
- Cron jobs: always use GitHub Actions + `npx tsx scripts/` pattern (not Vercel cron)
- Feature flag `FEATURE_AMBASSADOR_PROGRAM=true` must be flipped at the start of this phase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against actual `package.json` and `src/lib/` files
- Architecture patterns: HIGH — derived directly from codebase reading of all referenced files
- Pitfalls: HIGH (race condition, Discord retry) / MEDIUM (Loom embed attributes, Hipo file size) — race condition is structural; embed attributes are convention knowledge
- Data model: HIGH — derived from spec §9.4 and decision set

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (Firebase Admin / DaisyUI APIs stable; Discord API v10 changes would invalidate DISC patterns)
