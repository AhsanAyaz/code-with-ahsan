---
phase: 02-application-subsystem
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - firestore.rules
  - storage.rules
  - src/lib/email.ts
autonomous: true
requirements:
  - APPLY-06
  - EMAIL-01
  - EMAIL-02
  - EMAIL-03
must_haves:
  truths:
    - "firestore.rules explicitly covers applications/{applicationId} and cohorts/{cohortId} — no accidental fall-through to deny-all during APPLY-07 reads."
    - "Applicants can read their OWN application doc; admins can read all; nobody else can read applications."
    - "Client-side writes to applications/ and cohorts/ are DENIED — all writes go through Admin SDK in API routes (Plans 04-06)."
    - "Storage rules deny-by-default on applications/{applicantUid}/* paths except for the owner writing + admin reading (D-14)."
    - "Three new email functions (sendAmbassadorApplicationSubmittedEmail, sendAmbassadorApplicationAcceptedEmail, sendAmbassadorApplicationDeclinedEmail) exist in src/lib/email.ts following the exact same pattern as sendAdminMentorPendingEmail (EMAIL-01/02/03)."
  artifacts:
    - path: "firestore.rules"
      provides: "applications/ and cohorts/ collection rules; applicant read-own pattern; admin bypass via Admin SDK"
      contains: "match /applications/{applicationId}"
    - path: "storage.rules"
      provides: "applications/{applicantUid}/{applicationId}/** storage path rules"
      contains: "match /applications/{applicantUid}"
    - path: "src/lib/email.ts"
      provides: "Three new sendAmbassador* email functions"
      exports:
        - "sendAmbassadorApplicationSubmittedEmail"
        - "sendAmbassadorApplicationAcceptedEmail"
        - "sendAmbassadorApplicationDeclinedEmail"
  key_links:
    - from: "firestore.rules"
      to: "request.auth.uid == resource.data.applicantUid"
      via: "applicant read-own semantics (APPLY-07)"
      pattern: "applicantUid"
    - from: "storage.rules"
      to: "/applications/{applicantUid}/"
      via: "student-ID path per D-14"
      pattern: "applications/\\{applicantUid\\}"
    - from: "src/lib/email.ts"
      to: "sendEmail + wrapEmailHtml"
      via: "reuse existing helpers — no new email infrastructure (D-21)"
      pattern: "sendEmail.*wrapEmailHtml"
---

<objective>
Prepare the storage + security + messaging infrastructure that API routes (Plans 04-06) will use. Runs in parallel with Plans 01 and 02 because none of them share files or exports.

Three concerns, bundled because they are all "infrastructure glue" consumed by API routes:
1. Firestore rules for new `applications/` and `cohorts/` collections (APPLY-06, prevents Pitfall 4 in RESEARCH.md).
2. Storage rules for the student-ID upload path (D-14).
3. Three new email functions added to the existing `src/lib/email.ts` using the existing `sendEmail` + `wrapEmailHtml` helpers (EMAIL-01/02/03, D-21).

Output:
- `firestore.rules` updated with new match blocks.
- `storage.rules` created (if missing) or updated with applications path.
- `src/lib/email.ts` gains three named exports.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md

<interfaces>
Existing firestore.rules helpers (do NOT duplicate):
```
function isSignedIn() { return request.auth != null; }
function isAdmin()    { return isSignedIn() && request.auth.token.admin == true; }
function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }
```

Existing src/lib/email.ts pattern (mirror exactly):
```typescript
// Internal helpers (not exported):
function wrapEmailHtml(content: string, title: string): string;
async function sendEmail(to: string, subject: string, html: string, cc?: string): Promise<boolean>;

// Exported example pattern (lines 153-173):
export async function sendAdminMentorPendingEmail(profile, adminEmail) {
  const subject = "...";
  const content = `...<a class="button">Review</a>...`;
  return sendEmail(adminEmail, subject, wrapEmailHtml(content, subject));
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update firestore.rules with applications/ and cohorts/ rules</name>
  <files>firestore.rules</files>
  <read_first>
    - firestore.rules (full file — existing helpers and patterns must be preserved)
    - .planning/phases/02-application-subsystem/02-RESEARCH.md (Pitfall 4 — missing rules cause deny-all silent failures)
  </read_first>
  <action>
Edit `firestore.rules`. The file currently ends with a trailing comment block "Existing collections (passthrough)" and the closing braces on lines ~186-189. Insert the new rules BEFORE the closing `match /databases` brace.

Find this line near the end:
```
    // For now, deny client access to mentorship collections
    // (all mentorship operations go through API routes using Admin SDK).
  }
}
```

Insert directly ABOVE the `  }` that closes `match /databases/{database}/documents {`:

```
    // ─── Ambassador Applications (Phase 2) ───────
    // APPLY-06: applicant can create + read own; admin can read + write all.
    // Writes (accept/decline) go through Admin SDK in API routes.
    match /applications/{applicationId} {
      // Applicants read only their OWN application (APPLY-07).
      allow read: if isSignedIn() && (
        resource.data.applicantUid == request.auth.uid ||
        isAdmin()
      );

      // Applicants can create their own application with status=submitted.
      // All other fields are server-controlled (discordMemberId, videoEmbedType, etc.),
      // so the API route (Plan 05, via Admin SDK) bypasses these rules anyway.
      // This rule is kept restrictive as defense-in-depth.
      allow create: if isSignedIn() &&
                       request.resource.data.applicantUid == request.auth.uid &&
                       request.resource.data.status == "submitted";

      // No client-side updates (reviewer workflow is admin-only through API).
      allow update, delete: if isAdmin();
    }

    // ─── Ambassador Cohorts (Phase 2) ────────────
    // COHORT-01: any signed-in user reads cohorts for the apply flow (Plan 07).
    // Writes go through Admin SDK in API routes (Plan 04).
    match /cohorts/{cohortId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
```

Do NOT remove or modify any existing rules. Do NOT change the `rules_version` line.
  </action>
  <verify>
    <automated>grep -q "match /applications/{applicationId}" firestore.rules && grep -q "match /cohorts/{cohortId}" firestore.rules && grep -q "resource.data.applicantUid == request.auth.uid" firestore.rules && grep -q "match /projects/{projectId}" firestore.rules && grep -q "match /roadmaps/{roadmapId}" firestore.rules</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "match /applications/{applicationId}" firestore.rules` returns 1
    - `grep -c "match /cohorts/{cohortId}" firestore.rules` returns 1
    - `grep -q "resource.data.applicantUid == request.auth.uid" firestore.rules` exits 0
    - `grep -q "request.resource.data.status == \"submitted\"" firestore.rules` exits 0
    - `grep -q "match /projects/{projectId}" firestore.rules` exits 0 (Phase 1 rules preserved)
    - `grep -q "match /roadmaps/{roadmapId}" firestore.rules` exits 0 (Phase 1 rules preserved)
    - `grep -q "function isAcceptedMentor()" firestore.rules` exits 0 (Phase 1 helper preserved)
    - File ends with exactly two closing braces after last rule block
  </acceptance_criteria>
  <done>
    Applicants cannot read each other's applications; admins can; client-side writes to applications beyond the initial create are denied; cohort reads work for any signed-in user (apply wizard fetches open cohorts).
  </done>
</task>

<task type="auto">
  <name>Task 2: Create/update storage.rules with applications path</name>
  <files>storage.rules</files>
  <read_first>
    - storage.rules (if exists — preserve existing rules)
    - .planning/phases/02-application-subsystem/02-CONTEXT.md (D-14 — student-ID at applications/{applicantUid}/{applicationId}/student_id.{ext})
  </read_first>
  <action>
Check if `storage.rules` exists at the repo root. If it does, read the full content and preserve all existing rules. If it does NOT exist, create the file from scratch.

Write the file with this content:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // ─── Ambassador Applications: student-ID uploads (Phase 2, D-14) ───
    // Path: applications/{applicantUid}/{applicationId}/student_id.{ext}
    // Writer: the applicant only (signed-in + matching uid).
    // Reader: admin only — applicants do NOT re-read their own student-ID
    //   (avoids leaking the file if their account is compromised later).
    // Admin reads go through Admin SDK with getSignedUrl() (1-hour expiry per REVIEW-02).
    match /applications/{applicantUid}/{applicationId}/{fileName} {
      allow write: if request.auth != null
                      && request.auth.uid == applicantUid
                      && request.resource.size < 10 * 1024 * 1024          // 10 MB cap
                      && request.resource.contentType.matches('image/.*'); // images only
      allow read: if request.auth != null && request.auth.token.admin == true;
    }

    // Deny everything else by default (default-deny policy).
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

If `storage.rules` already existed with other allow rules, MERGE by inserting the `match /applications/...` block BEFORE the final `match /{allPaths=**}` catch-all. Do NOT delete any existing rules.
  </action>
  <verify>
    <automated>test -f storage.rules && grep -q "rules_version = '2'" storage.rules && grep -q "match /applications/{applicantUid}/{applicationId}/{fileName}" storage.rules && grep -q "request.auth.uid == applicantUid" storage.rules && grep -q "request.auth.token.admin == true" storage.rules && grep -q "contentType.matches('image/.*')" storage.rules</automated>
  </verify>
  <acceptance_criteria>
    - File `storage.rules` exists
    - Contains `rules_version = '2';`
    - Contains `match /applications/{applicantUid}/{applicationId}/{fileName}` (exact braces)
    - Contains `request.auth.uid == applicantUid` (applicant-only write)
    - Contains `request.auth.token.admin == true` (admin-only read)
    - Contains `contentType.matches('image/.*')` (image MIME enforced)
    - Contains `request.resource.size < 10 * 1024 * 1024` (10MB cap)
    - Contains a catch-all `match /{allPaths=**}` with `allow read, write: if false;`
  </acceptance_criteria>
  <done>
    Applicants can upload their own student-ID image (not someone else's), admin can read via signed URL, default-deny covers every other path.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add three ambassador email functions to src/lib/email.ts</name>
  <files>src/lib/email.ts</files>
  <read_first>
    - src/lib/email.ts (lines 150-220 — existing exports: sendAdminMentorPendingEmail, sendRegistrationStatusEmail, sendAccountStatusEmail — use these as the template for tone + HTML structure)
    - .planning/phases/02-application-subsystem/02-RESEARCH.md ("Email: Submission Confirmation (EMAIL-01)" code example)
    - .planning/phases/02-application-subsystem/02-CONTEXT.md (D-21)
  </read_first>
  <action>
Open `src/lib/email.ts`. Append the three new exported functions AT THE END OF THE FILE (after the last `export async function ...`). Do NOT modify any existing functions.

Add this block at the end of the file:

```typescript
// ============================================
// Ambassador Application Emails (Phase 2)
// ============================================

/**
 * Get absolute site URL (internal helper — mirrors getSiteUrl used above).
 * Not exported; copy-paste of existing pattern already present at top of file.
 */
function getSiteUrlForAmbassadorEmails(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://codewithahsan.dev";
}

/**
 * EMAIL-01 — Confirmation sent on application submission.
 *
 * @param applicantEmail - recipient email (applicant)
 * @param applicantName - recipient display name
 * @param cohortName - e.g. "Cohort 1 — Spring 2026"
 * @returns true on success, false on Mailgun failure (non-blocking per RESEARCH.md)
 */
export async function sendAmbassadorApplicationSubmittedEmail(
  applicantEmail: string,
  applicantName: string,
  cohortName: string,
): Promise<boolean> {
  const subject = "Your Ambassador Application Has Been Received";
  const siteUrl = getSiteUrlForAmbassadorEmails();
  const content = `
    <h2>Application Received!</h2>
    <p>Hi ${applicantName},</p>
    <p>We've received your application for the <strong>${cohortName}</strong> cohort of the Code With Ahsan Student Ambassador Program.</p>
    <div class="highlight">
      <p>We'll review your application and get back to you within 2–3 weeks. Please keep an eye on your inbox.</p>
    </div>
    <p>You can check your application status from your profile page at any time.</p>
    <a href="${siteUrl}/profile" class="button">View Application Status</a>
    <p>Thanks for wanting to grow this community with us.<br/>— Ahsan</p>
  `;
  return sendEmail(applicantEmail, subject, wrapEmailHtml(content, subject));
}

/**
 * EMAIL-02 — Acceptance email with onboarding steps.
 *
 * @param applicantEmail - recipient email
 * @param applicantName - recipient display name
 * @param cohortName - e.g. "Cohort 1 — Spring 2026"
 * @param discordInviteUrl - #ambassadors channel deep link (falls back to server invite)
 */
export async function sendAmbassadorApplicationAcceptedEmail(
  applicantEmail: string,
  applicantName: string,
  cohortName: string,
  discordInviteUrl: string,
): Promise<boolean> {
  const subject = `Welcome to the ${cohortName} Ambassador Cohort!`;
  const siteUrl = getSiteUrlForAmbassadorEmails();
  const content = `
    <h2>You're in! 🎉</h2>
    <p>Hi ${applicantName},</p>
    <p>Congratulations — you've been accepted into the <strong>${cohortName}</strong> cohort of the Code With Ahsan Student Ambassador Program.</p>
    <div class="highlight success">
      <p><strong>Next steps:</strong></p>
      <ol>
        <li>Join the <a href="${discordInviteUrl}">#ambassadors Discord channel</a> — your new role should already be live.</li>
        <li>Visit your <a href="${siteUrl}/ambassadors/dashboard">ambassador dashboard</a> to see your onboarding checklist.</li>
        <li>Grab your referral code and start sharing.</li>
        <li>Log your first event when you host one.</li>
      </ol>
    </div>
    <p>Excited to build this with you.<br/>— Ahsan</p>
  `;
  return sendEmail(applicantEmail, subject, wrapEmailHtml(content, subject));
}

/**
 * EMAIL-03 — Decline email (kind-but-firm, encourages reapply).
 *
 * @param applicantEmail - recipient email
 * @param applicantName - recipient display name
 * @param cohortName - e.g. "Cohort 1 — Spring 2026"
 * @param reviewerNotes - optional admin notes (sanitized — displayed as-is; admin-entered text)
 */
export async function sendAmbassadorApplicationDeclinedEmail(
  applicantEmail: string,
  applicantName: string,
  cohortName: string,
  reviewerNotes?: string,
): Promise<boolean> {
  const subject = "Your Ambassador Application — Update";
  const siteUrl = getSiteUrlForAmbassadorEmails();
  const notesBlock = reviewerNotes
    ? `<div class="info-box"><p><strong>Notes from the reviewer:</strong></p><p>${reviewerNotes}</p></div>`
    : "";
  const content = `
    <h2>Thank you for applying</h2>
    <p>Hi ${applicantName},</p>
    <p>Thank you for applying to the <strong>${cohortName}</strong> cohort of the Code With Ahsan Student Ambassador Program. After careful review, we're not able to offer you a spot in this cohort.</p>
    ${notesBlock}
    <div class="highlight">
      <p>This is <strong>not</strong> a no-forever. Future cohorts open regularly — please reapply. The community side of what you submitted mattered, and we'd love to see your next application.</p>
    </div>
    <a href="${siteUrl}/ambassadors" class="button">Learn more about the program</a>
    <p>Grateful you put yourself forward.<br/>— Ahsan</p>
  `;
  return sendEmail(applicantEmail, subject, wrapEmailHtml(content, subject));
}
```

Do NOT modify any existing function in `src/lib/email.ts`. Do NOT move the existing `getSiteUrl()` or `wrapEmailHtml()` helpers — they remain where they are.
  </action>
  <verify>
    <automated>grep -q "export async function sendAmbassadorApplicationSubmittedEmail" src/lib/email.ts && grep -q "export async function sendAmbassadorApplicationAcceptedEmail" src/lib/email.ts && grep -q "export async function sendAmbassadorApplicationDeclinedEmail" src/lib/email.ts && grep -q "export async function sendAdminMentorPendingEmail" src/lib/email.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "export async function sendAmbassador" src/lib/email.ts` returns 3
    - `grep -q "sendAmbassadorApplicationSubmittedEmail" src/lib/email.ts` exits 0
    - `grep -q "sendAmbassadorApplicationAcceptedEmail" src/lib/email.ts` exits 0
    - `grep -q "sendAmbassadorApplicationDeclinedEmail" src/lib/email.ts` exits 0
    - `grep -q "Your Ambassador Application Has Been Received" src/lib/email.ts` exits 0
    - `grep -q "Welcome to the" src/lib/email.ts` exits 0
    - `grep -q "Thank you for applying" src/lib/email.ts` exits 0
    - `grep -q "export async function sendAdminMentorPendingEmail" src/lib/email.ts` exits 0 (Phase 1 exports preserved)
    - `grep -q "export async function sendRegistrationStatusEmail" src/lib/email.ts` exits 0 (preserved)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    API routes (Plans 05 + 06) can `import { sendAmbassadorApplicationSubmittedEmail, sendAmbassadorApplicationAcceptedEmail, sendAmbassadorApplicationDeclinedEmail } from "@/lib/email"` and call them from the submit/accept/decline handlers.
  </done>
</task>

</tasks>

<verification>
```
npx tsc --noEmit
grep -c "match /" firestore.rules   # should be >= 8 (existing + 2 new)
grep -c "^export async function send" src/lib/email.ts   # should be >= 16 (existing 13 + 3 new)
```
</verification>

<success_criteria>
- firestore.rules covers applications/ and cohorts/ with correct applicant-read-own / admin-write semantics
- storage.rules exists with default-deny and the applications path rule
- Three new email functions compile and are importable from `@/lib/email`
- Zero Phase 1 rules or exports altered
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-03-SUMMARY.md` documenting:
- New firestore.rules blocks (with line numbers)
- storage.rules full content if newly created
- Email function signatures with example invocations for the API routes
- Deploy note: firestore.rules and storage.rules must be deployed via `firebase deploy --only firestore:rules,storage` before Phase 2 goes live
</output>
