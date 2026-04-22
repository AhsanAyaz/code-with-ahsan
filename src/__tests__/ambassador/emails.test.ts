import { describe, it } from "vitest";

/**
 * Wave 0 stub — EMAIL-01/02/03: subject, recipient, and trigger timing.
 *
 * This file exists so Plan 05 (submit → EMAIL-01) and Plan 06 (accept → EMAIL-02,
 * decline → EMAIL-03) can replace `it.todo(...)` with real assertions without
 * creating the file. The VALIDATION.md Nyquist contract expects this path to
 * exist before Wave 2 begins.
 *
 * Wave 2 owners:
 *   - Plan 02-05 Task 2 fills EMAIL-01 tests (mock sendEmail; assert subject + recipient match applicant)
 *   - Plan 02-06 Task 2 fills EMAIL-02/03 tests (accept / decline paths)
 *
 * Strategy: mock `@/lib/email` via `vi.mock` and assert the three exported
 *           functions are invoked with the expected (email, name, cohortName[, notes])
 *           arguments AFTER the Firestore write succeeds.
 *
 * DO NOT import from `@/lib/email` here — the three sendAmbassador* functions
 * are created in Task 3 of THIS plan, but importing them would still require
 * the Task 3 work to have committed. Keep this file scaffold-only until Wave 2.
 */
describe.skip("EMAIL-01 application submitted (Wave 0 stub)", () => {
  it.todo("is invoked with applicantEmail, applicantName, cohortName after Firestore write");
  it.todo("uses subject: 'Your Ambassador Application Has Been Received'");
  it.todo("failure does NOT roll back the Firestore submission");
});

describe.skip("EMAIL-02 application accepted (Wave 0 stub)", () => {
  it.todo("is invoked only after runAcceptanceTransaction returns ok:true");
  it.todo("includes discordInviteUrl as the fourth argument");
  it.todo("is NOT re-sent on idempotent re-accept (alreadyAccepted === true)");
});

describe.skip("EMAIL-03 application declined (Wave 0 stub)", () => {
  it.todo("is invoked with reviewerNotes from PATCH body (may be undefined)");
  it.todo("uses subject: 'Your Ambassador Application — Update'");
  it.todo("fires only when status transitions submitted/under_review → declined");
});
