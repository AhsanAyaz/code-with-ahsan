---
phase: tools-event-email-blasts
plan: 05
title: Send API + audit log — POST /api/admin/email-blast
type: execute
wave: 3
depends_on: [01, 03]
autonomous: true
files_modified:
  - src/app/api/admin/email-blast/drafts/route.ts
  - src/app/api/admin/email-blast/route.ts
  - src/app/api/admin/email-blast/__tests__/route.test.ts
  - firestore.rules
---

<objective>
Two API routes powering the blast UI:

1. `GET /api/admin/email-blast/drafts` — lists Ghost drafts tagged `#email-blast` (delegates to lib from Plan 02).
2. `POST /api/admin/email-blast` — accepts `{ghostPostId, subject, recipients[]}`, fetches the draft HTML fresh, sends sequentially via Resend (250ms gap), substitutes `{{name}}` per recipient, persists audit log to Firestore `email-blasts/{id}`, returns per-recipient results.

Both admin-token gated. Firestore rules locked to admin-only.

Why: Send must be server-side — Resend API key never touches client. Fresh HTML fetch on send means admin doesn't have to re-pick after late edits. Audit log enables re-send recovery + compliance.
</objective>

<context>
- Admin auth pattern: `src/app/api/raffle/spin/route.ts` — reads `x-admin-token`, compares to `process.env.ADMIN_TOKEN`. Reuse same gate.
- Ghost client from Plan 02: `src/lib/ghost/admin.ts` — `listEmailBlastDrafts()`, `getDraftHtml(id)`.
- Email sender from Plan 01: `src/lib/email.ts` `sendEmail(to, subject, html, cc?)`.
- Firestore admin SDK: `src/lib/firebaseAdmin.ts` exports `db`. `FieldValue.serverTimestamp()` for timestamps.
- Existing firestore.rules has admin-only patterns to copy.
</context>

<tasks>

### Task 1 — Shared admin-token helper (if not already extracted)

Check `src/lib/adminAuth.ts` (or similar). If a `requireAdminToken(request): NextResponse | null` helper already exists, reuse. Otherwise inline the check — but only if no helper exists yet. Pattern: read `x-admin-token` header, compare against `process.env.ADMIN_TOKEN` (constant-time compare via `crypto.timingSafeEqual` on equal-length buffers; if unequal length, return 401 directly).

### Task 2 — `GET /api/admin/email-blast/drafts`

Create `src/app/api/admin/email-blast/drafts/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { listEmailBlastDrafts } from "@/lib/ghost/admin";

export async function GET(request: NextRequest) {
  // admin-token check → 401 if invalid
  // call listEmailBlastDrafts() → return { drafts: [...] }
  // on lib failure → 502 with { error: "Ghost upstream error" }
}
```

Cache: `Cache-Control: no-store` (admin-only, drafts change frequently).

### Task 3 — `POST /api/admin/email-blast`

Create `src/app/api/admin/email-blast/route.ts`:

**Request body validation (Zod or hand-rolled):**

```typescript
{
  ghostPostId: string;        // required, non-empty
  subject: string;             // required, non-empty, ≤ 200 chars
  recipients: Array<{ name: string; email: string }>;  // 1..500
}
```

Reject with 400 if any field invalid. Reject with 413 if `recipients.length > 500` (hard cap; Resend free is 100/day, this is a soft guard not a hard prod limit but prevents accidental 10k blasts).

**Flow:**

1. Admin-token gate → 401 if invalid.
2. Validate body → 400 if invalid.
3. Fetch fresh draft HTML via `getDraftHtml(ghostPostId)`. If null → 404 `{error: "Draft not found or no longer accessible"}`.
4. Pre-create Firestore doc in `email-blasts` collection with `status: "in_progress"`, capture `id`:
   ```typescript
   const blastRef = db.collection("email-blasts").doc();
   await blastRef.set({
     subject, ghostPostId, ghostPostTitle: draft.title,
     status: "in_progress",
     sentBy: "admin",  // ADMIN_TOKEN auth has no uid — use literal "admin"
     startedAt: FieldValue.serverTimestamp(),
     recipientCount: recipients.length,
   });
   ```
5. Loop recipients sequentially:
   - Per iteration: substitute `{{name}}` (global replace, escape regex meta from name? simple `split/join` is safer — `html.split("{{name}}").join(safeName)` where `safeName = recipient.name` HTML-encoded to prevent injection in body markup).
   - Call `sendEmail(recipient.email, subject, personalizedHtml)`.
   - Push to `results: SendResult[]`.
   - `await new Promise(r => setTimeout(r, 250))` between sends (skip after last).
6. Update Firestore doc:
   ```typescript
   await blastRef.update({
     status: "completed",
     completedAt: FieldValue.serverTimestamp(),
     recipients: results,
     sentCount: results.filter(r => r.ok).length,
     failedCount: results.filter(r => !r.ok).length,
   });
   ```
7. Return `{ blastId: blastRef.id, results, sent: ..., failed: ... }`.

**On uncaught exception mid-loop:** catch outer try/catch, persist `status: "errored"` + partial `results`, return 500 with the partial results so UI can show what did/didn't ship.

### Task 4 — HTML escape helper for `{{name}}`

Inline (don't add new file). Encodes `<>&"'` in the substituted name. Located either in this route file or in `src/lib/email-blast/escapeHtml.ts` (small standalone util — preferred for testability).

### Task 5 — Firestore rules

Add to `firestore.rules`:

```
match /email-blasts/{blastId} {
  // Admin-only read/write — server writes use admin SDK (bypass rules),
  // but lock down client reads. UI for audit log (future) will use admin SDK proxy.
  allow read, write: if false;
}
```

Deploy gate stays on user (run `firebase deploy --only firestore:rules` post-merge).

### Task 6 — Tests

Create `src/app/api/admin/email-blast/__tests__/route.test.ts`:

- Mock `@/lib/ghost/admin`, `@/lib/email`, and `@/lib/firebaseAdmin`.
- Test: invalid admin token → 401.
- Test: missing `ghostPostId` → 400.
- Test: > 500 recipients → 413.
- Test: draft 404 → 404.
- Test: happy path 2 recipients — both `sendEmail` mocks called with correct args, Firestore doc created + updated, response includes both results.
- Test: 1 recipient fails (sendEmail returns false) → result includes ok:false, audit log shows `failedCount: 1`.
- Test: `{{name}}` HTML-escapes the recipient name (e.g. `<script>` → `&lt;script&gt;`).
- Test: 250ms gap respected — assert at least N-1 setTimeout calls.

### Task 7 — Commit

Commit: `feat(admin): add email blast send API with Resend + Firestore audit log`

</tasks>

<verification>
- `npx vitest run src/app/api/admin/email-blast` passes.
- `npx tsc --noEmit` passes.
- Manual smoke: with `DISABLE_EMAILS=true`, POST via curl — Firestore doc created, status "completed", per-recipient results have `ok: true` (sendEmail returns true under DISABLE_EMAILS).
- firestore.rules updated, ready for deploy (deploy NOT part of this plan).
</verification>
