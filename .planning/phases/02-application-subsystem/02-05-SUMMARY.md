---
phase: 02-application-subsystem
plan: 05
subsystem: ambassador-applications
tags:
  - api
  - firestore
  - ambassador
  - applications
  - submit
  - signed-url
dependency_graph:
  requires:
    - "02-01: types/ambassador.ts (ApplicationDoc, ApplicationSubmitSchema)"
    - "02-02: academicEmail.ts, videoUrl.ts validators"
    - "02-03: email.ts sendAmbassadorApplicationSubmittedEmail, Firestore rules"
    - "02-04: adminAuth.ts requireAdmin (created inline as blocking dependency)"
  provides:
    - "POST /api/ambassador/applications — application submission pipeline"
    - "GET /api/ambassador/applications — admin paginated list"
    - "GET /api/ambassador/applications/me — applicant own status (APPLY-07)"
    - "POST /api/ambassador/applications/student-id-upload-url — signed upload URL (APPLY-05)"
    - "src/lib/ambassador/applications.ts — shared pipeline helpers"
  affects:
    - "02-06: can import checkCohortAcceptingSubmissions, buildApplicationDoc from applications.ts"
    - "02-07: wizard UI calls these three routes in order (upload → POST → GET me)"
    - "02-08: admin list UI calls GET /applications with cursor pagination"
tech_stack:
  added: []
  patterns:
    - "Cursor pagination via Firestore startAfter(docSnapshot)"
    - "Fail-soft pattern: resolveDiscordMemberSoft never throws, always returns value"
    - "Defense-in-depth server-side re-validation (Zod + runServerSideContentChecks)"
    - "Feature flag guard (isAmbassadorProgramEnabled) as first check in every handler"
    - "Firebase Storage v4 signed write URL with content-type enforcement"
key_files:
  created:
    - path: src/lib/ambassador/adminAuth.ts
      note: "Blocking dependency from Plan 04 (created inline); isValidAdminToken, getAdminToken, requireAdmin"
    - path: src/lib/ambassador/applications.ts
      note: "Shared pipeline helpers: ensureDiscordAgeEligible, resolveDiscordMemberSoft, checkDuplicateApplication, checkCohortAcceptingSubmissions, buildApplicationDoc, runServerSideContentChecks, classifyAcademicEmailPath"
    - path: src/app/api/ambassador/applications/route.ts
      note: "POST submit (APPLY-01..06) + GET admin list with cursor pagination"
    - path: src/app/api/ambassador/applications/me/route.ts
      note: "GET own-application status (APPLY-07); strips reviewerNotes/reviewedBy"
    - path: src/app/api/ambassador/applications/student-id-upload-url/route.ts
      note: "POST signed upload URL for student-ID photo (APPLY-05, D-14)"
  modified: []
decisions:
  - "Use firebase-admin/firestore FieldValue directly (not re-exported from firebaseAdmin.ts)"
  - "Plan 07 wizard uses auto-id from Firestore for applicationId; studentIdStoragePath stores client-UUID path (not required to match Firestore doc id)"
  - "academicVerificationPath field from ApplicationSubmitInput is persisted on ApplicationDoc as required"
  - "EMAIL-01 failure is logged but never fails the submission response"
metrics:
  duration: "~17 minutes"
  completed_date: "2026-04-22"
  tasks_completed: 3
  files_created: 5
---

# Phase 02 Plan 05: Applications Submit API Summary

One-liner: Ambassador application submission pipeline with Zod+server-side re-validation, fail-soft Discord resolution, Firestore write, EMAIL-01 trigger, admin paginated list, and Firebase Storage signed upload URL for student-ID photos.

## Artifacts Created

| File | Exports / Role |
|------|----------------|
| `src/lib/ambassador/adminAuth.ts` | `isValidAdminToken`, `getAdminToken`, `requireAdmin` — shared admin session helper |
| `src/lib/ambassador/applications.ts` | `ensureDiscordAgeEligible`, `resolveDiscordMemberSoft`, `checkDuplicateApplication`, `checkCohortAcceptingSubmissions`, `buildApplicationDoc`, `runServerSideContentChecks`, `classifyAcademicEmailPath` |
| `src/app/api/ambassador/applications/route.ts` | `POST` (submit), `GET` (admin list) |
| `src/app/api/ambassador/applications/me/route.ts` | `GET` (own applications, APPLY-07) |
| `src/app/api/ambassador/applications/student-id-upload-url/route.ts` | `POST` (signed upload URL, APPLY-05) |

## Integration Guide for Downstream Plans

### Plan 06 (Accept/Decline API)

Import from `src/lib/ambassador/applications.ts`:

```typescript
import {
  checkCohortAcceptingSubmissions,  // Re-check cohort capacity at accept time (COHORT-04)
  buildApplicationDoc,              // Reference for ApplicationDoc shape
} from "@/lib/ambassador/applications";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
```

The `requireAdmin` result's `uid` field is the `reviewedBy` value to persist on accepted/declined applications.

### Plan 07 (Apply Wizard UI)

Call routes in this order:
1. **Get upload URL** — `POST /api/ambassador/applications/student-id-upload-url` with `{ applicationId, contentType, fileSizeBytes }`. The `applicationId` can be a client-generated `crypto.randomUUID()`.
2. **Upload student ID** — `PUT <uploadUrl>` with `Content-Type` matching `contentType` from step 1. Do NOT route through the API.
3. **Submit application** — `POST /api/ambassador/applications` with the full `ApplicationSubmitInput` body, including `studentIdStoragePath` = the `storagePath` value returned in step 1.
4. **Poll own status** — `GET /api/ambassador/applications/me` to show application status in the wizard confirmation step (APPLY-07).

Note: The Firestore doc id (auto-generated by `db.collection(...).doc()`) will differ from the client UUID used in the storage path. This is intentional — admin detail page reads `studentIdStoragePath` from the doc.

### Plan 08 (Admin List + Detail)

Call GET /api/ambassador/applications with cursor pagination:

```typescript
// First page
const res = await fetch("/api/ambassador/applications?status=submitted&pageSize=20", {
  headers: { "x-admin-token": token },
});
const { items, nextCursor } = await res.json();

// Next page
const next = await fetch(`/api/ambassador/applications?cursor=${nextCursor}&pageSize=20`, {
  headers: { "x-admin-token": token },
});
```

Supports `?status=`, `?cohortId=`, `?cursor=`, `?pageSize=` (max 100).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] adminAuth.ts created inline (Plan 04 dependency)**

- **Found during:** Task 1 setup — `src/lib/ambassador/adminAuth.ts` required by Task 2 but Plan 04 not yet executed in this worktree
- **Fix:** Created `adminAuth.ts` from the interface spec in the plan and from Plan 04's artifact already visible in sibling worktree agent-a26bd38c
- **Files modified:** `src/lib/ambassador/adminAuth.ts` (created)
- **Commit:** fb72dfd

**2. [Rule 1 - Bug] FieldValue import from firebase-admin/firestore (not @/lib/firebaseAdmin)**

- **Found during:** Task 1 TypeScript check — `firebaseAdmin.ts` does not export `FieldValue`
- **Fix:** Changed import to `import { FieldValue } from "firebase-admin/firestore"` matching existing codebase convention in `src/app/api/roadmaps/route.ts`
- **Files modified:** `src/lib/ambassador/applications.ts`
- **Commit:** fb72dfd

**3. [Rule 1 - Bug] ApplicationDoc.academicVerificationPath required field**

- **Found during:** Task 1 — `ApplicationDoc` interface (Plan 01) requires `academicVerificationPath: AcademicVerificationPath` as a non-optional field; the plan's `buildApplicationDoc` snippet omitted it
- **Fix:** Added `academicVerificationPath: input.academicVerificationPath` to the returned doc shape in `buildApplicationDoc`
- **Files modified:** `src/lib/ambassador/applications.ts`
- **Commit:** fb72dfd

**4. [Rule 2 - Enhancement] applicantName resolution order**

- **Found during:** Task 2 — `ApplicationSubmitSchema` includes `applicantName` field; the plan used `profile.displayName` but the schema already carries the name client-submitted
- **Fix:** Name resolution order: `input.applicantName` first (from Zod-validated body), then `profile.displayName`, then `profile.name`, then email prefix fallback
- **Files modified:** `src/app/api/ambassador/applications/route.ts`
- **Commit:** 4a75607

## Known Stubs

None — all endpoints are fully wired to Firestore and real helpers.

## Self-Check: PASSED

Files verified:
- `src/lib/ambassador/adminAuth.ts` — EXISTS
- `src/lib/ambassador/applications.ts` — EXISTS
- `src/app/api/ambassador/applications/route.ts` — EXISTS
- `src/app/api/ambassador/applications/me/route.ts` — EXISTS
- `src/app/api/ambassador/applications/student-id-upload-url/route.ts` — EXISTS

Commits verified:
- fb72dfd — feat(02-05): add shared ambassador application helpers
- 4a75607 — feat(02-05): POST submit + GET admin list for ambassador applications
- 04098b1 — feat(02-05): add GET /me and POST /student-id-upload-url endpoints

TypeScript: zero errors (excluding pre-existing social-icons SVG errors unrelated to this plan).
Tests: 53 passed, 13 todo (Wave 0 stubs from Plan 03), 2 skipped.
