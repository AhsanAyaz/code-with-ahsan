import { describe, it } from "vitest";

/**
 * Wave 0 stub — REVIEW-02: signed URL 1-hour expiry.
 *
 * This file exists so Plan 06's GET /api/ambassador/applications/[applicationId]
 * executor can replace `it.todo(...)` with real assertions WITHOUT creating the
 * file. The VALIDATION.md Nyquist contract expects this path to exist before
 * Wave 2 begins.
 *
 * Wave 2 owner: Plan 02-06 (accept/decline API + signed URL generation).
 * Unblocking imports will be:
 *   - `ADMIN_SIGNED_URL_EXPIRY_MS` from `@/lib/ambassador/constants`
 *   - signed-URL generation helper (GET detail route)
 *   - firebaseAdmin `storage.file(path).getSignedUrl({ expires: Date.now() + ADMIN_SIGNED_URL_EXPIRY_MS })`
 *
 * DO NOT import those here until Plans 01/06 have landed — typecheck would fail.
 */
describe.skip("REVIEW-02 signed URL expiry (Wave 0 stub)", () => {
  it.todo("generates a 1-hour expiring signed read URL for student-ID photos");
  it.todo("rejects generation when storage bucket is unconfigured (Pitfall 7)");
  it.todo("does NOT include the raw storagePath in the returned URL object");
  it.todo("uses ADMIN_SIGNED_URL_EXPIRY_MS from constants (no hardcoded ms)");
});
