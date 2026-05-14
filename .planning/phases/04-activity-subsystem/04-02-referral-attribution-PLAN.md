---
phase: 04-activity-subsystem
plan: 02
type: execute
wave: 2
depends_on:
  - 04-01-foundations-types-schemas
files_modified:
  - src/middleware.ts
  - src/lib/ambassador/referral.ts
  - src/lib/ambassador/referral.test.ts
  - src/middleware.test.ts
  - src/lib/ambassador/acceptance.ts
  - src/app/api/mentorship/profile/route.ts
  - firestore.rules
autonomous: true
requirements:
  - REF-01
  - REF-02
  - REF-03
  - REF-04
  - REF-05
must_haves:
  truths:
    - "Visiting any /ambassadors or root page with ?ref=CODE sets the cwa_ref cookie once, HttpOnly SameSite=Lax 30d"
    - "Existing cwa_ref cookies are never overwritten by later ?ref=OTHER visits within the 30-day window"
    - "Acceptance transaction generates a unique referralCode and writes referral_codes/{code} lookup doc in the same transaction"
    - "First profile POST with a cwa_ref cookie creates a referrals/{id} doc and clears the cookie on the response"
    - "Self-attribution (ambassador refers themselves) and double-attribution (referredUserId already attributed) are blocked"
    - "Firestore rules deny all client writes to referrals/* and referral_codes/*"
  artifacts:
    - path: "src/middleware.ts"
      provides: "Next.js Edge middleware that reads ?ref=, sets cwa_ref cookie"
      exports: ["middleware", "config"]
    - path: "src/lib/ambassador/referral.ts"
      provides: "consumeReferral(referredUserId, refCode) server-side attribution helper"
      exports: ["consumeReferral"]
    - path: "src/lib/ambassador/referral.test.ts"
      provides: "Vitest tests for self/double-attribution guards"
      min_lines: 60
    - path: "src/middleware.test.ts"
      provides: "Vitest tests for cookie set / skip-existing logic"
      min_lines: 40
    - path: "src/lib/ambassador/acceptance.ts"
      provides: "Modified runAcceptanceTransaction: pre-tx referral-code generation + in-tx lookup doc write + subdoc referralCode field"
      contains: "generateUniqueReferralCode"
    - path: "src/app/api/mentorship/profile/route.ts"
      provides: "POST handler extended with cwa_ref cookie consumption + cookie clear on response"
      contains: "REFERRAL_COOKIE_NAME"
    - path: "firestore.rules"
      provides: "Deny-all client rules for referrals and referral_codes collections"
      contains: "match /referrals/{"
  key_links:
    - from: "src/middleware.ts"
      to: "NextResponse.cookies.set('cwa_ref', ...)"
      via: "cookie write path; only when no existing cwa_ref cookie"
      pattern: "cookies\\.set\\(.*cwa_ref"
    - from: "src/lib/ambassador/acceptance.ts"
      to: "db.collection('referral_codes').doc(code)"
      via: "txn.set writes lookup doc atomically with subdoc"
      pattern: "REFERRAL_CODES_COLLECTION|referral_codes"
    - from: "src/app/api/mentorship/profile/route.ts"
      to: "consumeReferral + response.cookies.delete('cwa_ref')"
      via: "synchronous await + cookie-clear on outgoing response"
      pattern: "consumeReferral|cookies\\.delete"
    - from: "src/lib/ambassador/referral.ts"
      to: "db.collection('referrals').add() + double-attribution guard query"
      via: "server-side attribution write with pre-read guards"
      pattern: "referredUserId.*==|REFERRALS_COLLECTION"
---

<objective>
Build the complete referral attribution pipeline: cookie setter in Next.js middleware, server-side cookie consumption in profile POST, referral code generation at acceptance time, and server-side guards against self-attribution and double-attribution.

Purpose: Enables REF-01..REF-05 end-to-end — an accepted ambassador gets a unique referral code at acceptance, share a `?ref=CODE` link, a new visitor's referral is attributed to them when they first sign up. Self-attribution and double-attribution are both blocked server-side. Cookie is HttpOnly and cannot be tampered by client JS.

Output: New `src/middleware.ts` Edge middleware; new `src/lib/ambassador/referral.ts` attribution helper; modified `runAcceptanceTransaction` that generates the code pre-tx and writes `referral_codes/{code}` in-tx; modified `POST /api/mentorship/profile` that consumes the cookie; firestore.rules updates. Two vitest suites.
</objective>

<threat_model>
- Authentication: Middleware runs on unauthenticated requests (by design — cookie is set before sign-in). Profile POST is authenticated via Firebase session/token (existing gate unchanged).
- Authorization: Referral write is server-side only. Firestore rules deny client writes to `referrals/*` and `referral_codes/*` — verified in Task 6.
- Data integrity — self-attribution: Blocked by `ambassadorId !== referredUserId` check in `consumeReferral`. Covered by unit test.
- Data integrity — double-attribution: Blocked by `where("referredUserId", "==", uid).limit(1)` pre-write query in `consumeReferral`. Covered by unit test.
- Cookie security: HttpOnly (client JS cannot read/tamper per D-03), SameSite=Lax (survives OAuth redirects), 30-day max-age, path=/. Matcher excludes `/api/` and `/_next/` to avoid double-execution and needless latency. `Secure` flag is set automatically by Next.js in production (NextResponse.cookies.set infers from `NODE_ENV`); add `secure: process.env.NODE_ENV === "production"` defensively.
- Race: Two simultaneous first-signup attempts with the same cookie could each pass the "does `referredUserId` already exist" check before either has written. Acceptable risk for v1 — double-attribution in this micro-window would produce two referral docs; a Phase 5 dedupe pass can fix if ever observed. Not high severity.
- Cron safety: N/A — no crons in this plan.
- Block-on severity: HIGH for (a) Firestore rules denial of client writes, (b) self-attribution guard, (c) double-attribution guard, (d) HttpOnly flag on cookie. All have dedicated acceptance criteria.
</threat_model>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/04-activity-subsystem/04-CONTEXT.md
@.planning/phases/04-activity-subsystem/04-RESEARCH.md
@.planning/phases/04-activity-subsystem/04-PATTERNS.md
@.planning/phases/04-activity-subsystem/04-01-foundations-types-schemas-PLAN.md
@src/lib/ambassador/acceptance.ts
@src/app/api/mentorship/profile/route.ts
@src/lib/ambassador/username.ts
@firestore.rules

<interfaces>
From Plan 01 (MUST be complete before this plan runs):
- `generateUniqueReferralCode(username: string): Promise<string>` — in `src/lib/ambassador/referralCode.ts`
- `REFERRAL_CODES_COLLECTION = "referral_codes"` — in `src/lib/ambassador/constants.ts`
- `REFERRALS_COLLECTION = "referrals"`
- `REFERRAL_COOKIE_NAME = "cwa_ref"`
- `REFERRAL_COOKIE_MAX_AGE_SECONDS = 2592000`
- `AmbassadorSubdoc.referralCode?: string` — on the extended interface
- `interface ReferralDoc { ambassadorId, referredUserId, convertedAt, sourceCode }`
- `interface ReferralCodeLookup { ambassadorId, uid }`

Existing acceptance.ts (confirmed from file read):
- `runAcceptanceTransaction(applicationId, adminUid, notes)` runs db.runTransaction
- Pre-transaction block resolves `resolvedUsername` via `ensureUniqueUsername` (lines 85–104) — mirror this pattern for referral code
- Inside transaction, the `if (!alreadyAccepted)` branch writes `subdocPayload` to `ambassadorRef` (lines 180–196) — append `referralCode` to the payload
- `AcceptanceResult.ok === true` branch (lines 39–51) can include `referralCode` in its return shape

Existing profile/route.ts shape (POST handler):
- Writes `db.collection("mentorship_profiles").doc(uid).set(profile)` around line 113
- Fires `assignDiscordRole(...).catch(err)` fire-and-forget around line 127
- Uses `NextResponse.json({ ... }, { status: 201 })` to return
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/middleware.ts + src/middleware.test.ts — Next.js Edge cookie setter</name>
  <files>src/middleware.ts, src/middleware.test.ts</files>
  <read_first>
    - src/middleware.ts (confirmed absent — new file)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §1 (middleware shape + matcher)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pattern 1, §Pitfall 1, §Pitfall 2 (HttpOnly + matcher exclusions)
    - src/lib/ambassador/constants.ts (REFERRAL_COOKIE_NAME, REFERRAL_COOKIE_MAX_AGE_SECONDS — from Plan 01)
  </read_first>
  <behavior>
    - Given a request to `/ambassadors?ref=AHSAN-A7F2`, the response `Set-Cookie` header contains `cwa_ref=AHSAN-A7F2` with `HttpOnly; SameSite=Lax; Max-Age=2592000; Path=/`
    - Given a request to `/?ref=AHSAN-A7F2` with an existing `cwa_ref=OLDCODE-1111` cookie, the response does NOT set a new cookie (preserves original attribution)
    - Given a request to `/?ref=` (empty value), the response does NOT set a cookie
    - Given a request to `/?ref=   ` (whitespace only), the response does NOT set a cookie
    - Given a request to `/` (no ref param), the response does NOT set a cookie
    - Given a request to `/api/anything?ref=CODE`, the middleware does NOT run (matcher excludes /api/)
  </behavior>
  <action>
    Step 1: Create `src/middleware.ts`:

    ```typescript
    /**
     * Phase 4 (REF-02): Next.js Edge middleware — sets the `cwa_ref` referral cookie.
     *
     * Runs on page navigations (not /api, not /_next static). When `?ref=CODE` is present
     * AND no `cwa_ref` cookie already exists, sets an HttpOnly SameSite=Lax cookie for
     * 30 days. Never overwrites an existing cookie (preserves original attribution per D-03).
     *
     * CRITICAL: HttpOnly is required — client JS MUST NOT be able to read or tamper.
     * Server-side consumption happens in POST /api/mentorship/profile (Task 5).
     */
    import { NextRequest, NextResponse } from "next/server";
    import {
      REFERRAL_COOKIE_NAME,
      REFERRAL_COOKIE_MAX_AGE_SECONDS,
    } from "@/lib/ambassador/constants";

    export function middleware(request: NextRequest) {
      const ref = request.nextUrl.searchParams.get("ref");
      if (!ref || ref.trim().length === 0) {
        return NextResponse.next();
      }

      // Never overwrite existing attribution — preserves first-click within 30-day window.
      const existing = request.cookies.get(REFERRAL_COOKIE_NAME);
      if (existing) {
        return NextResponse.next();
      }

      const response = NextResponse.next();
      response.cookies.set(REFERRAL_COOKIE_NAME, ref.trim(), {
        maxAge: REFERRAL_COOKIE_MAX_AGE_SECONDS,
        sameSite: "lax",
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    /**
     * Matcher excludes:
     *   - Next.js internals (`_next/static`, `_next/image`)
     *   - Favicon
     *   - /api/ routes — the cookie is relevant to page navigations only,
     *     and excluding /api/ prevents double-execution when the profile POST runs.
     */
    export const config = {
      matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
    };
    ```

    Step 2: Create `src/middleware.test.ts` (mock NextRequest via `new URL` + a shim for `cookies.get`):

    ```typescript
    import { describe, it, expect, vi } from "vitest";

    // Mock constants — importing real file is fine, but keep test independent of any env
    vi.mock("@/lib/ambassador/constants", () => ({
      REFERRAL_COOKIE_NAME: "cwa_ref",
      REFERRAL_COOKIE_MAX_AGE_SECONDS: 2592000,
    }));

    // Mock NextResponse.next() and NextResponse type
    const cookieSetMock = vi.fn();
    vi.mock("next/server", () => {
      class NextRequestMock {
        nextUrl: URL;
        cookies: { get: (name: string) => { value: string } | undefined };
        constructor(url: string, cookieValues: Record<string, string> = {}) {
          this.nextUrl = new URL(url);
          this.cookies = {
            get: (name: string) =>
              name in cookieValues ? { value: cookieValues[name] } : undefined,
          };
        }
      }
      return {
        NextRequest: NextRequestMock,
        NextResponse: {
          next: vi.fn(() => ({ cookies: { set: cookieSetMock } })),
        },
      };
    });

    import { middleware } from "./middleware";
    import { NextRequest } from "next/server";

    describe("middleware (REF-02)", () => {
      beforeEach?.(() => cookieSetMock.mockReset());

      it("sets cwa_ref cookie when ?ref= is present and no cookie exists", () => {
        cookieSetMock.mockReset();
        const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
          "https://example.com/ambassadors?ref=AHSAN-A7F2",
        );
        middleware(req);
        expect(cookieSetMock).toHaveBeenCalledWith(
          "cwa_ref",
          "AHSAN-A7F2",
          expect.objectContaining({
            maxAge: 2592000,
            sameSite: "lax",
            path: "/",
            httpOnly: true,
          }),
        );
      });

      it("does NOT set cookie when existing cwa_ref is present (preserves attribution)", () => {
        cookieSetMock.mockReset();
        const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
          "https://example.com/?ref=NEW-0000",
          { cwa_ref: "ORIGINAL-1111" },
        );
        middleware(req);
        expect(cookieSetMock).not.toHaveBeenCalled();
      });

      it("does NOT set cookie when ?ref= is empty", () => {
        cookieSetMock.mockReset();
        const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
          "https://example.com/?ref=",
        );
        middleware(req);
        expect(cookieSetMock).not.toHaveBeenCalled();
      });

      it("does NOT set cookie when ?ref= is whitespace only", () => {
        cookieSetMock.mockReset();
        const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
          "https://example.com/?ref=%20%20%20",
        );
        middleware(req);
        expect(cookieSetMock).not.toHaveBeenCalled();
      });

      it("does NOT set cookie when no ref param", () => {
        cookieSetMock.mockReset();
        const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
          "https://example.com/ambassadors",
        );
        middleware(req);
        expect(cookieSetMock).not.toHaveBeenCalled();
      });

      it("trims whitespace from the ref value before storing", () => {
        cookieSetMock.mockReset();
        const req = new (NextRequest as unknown as new (u: string, c?: Record<string, string>) => NextRequest)(
          "https://example.com/?ref=%20AHSAN-A7F2%20",
        );
        middleware(req);
        expect(cookieSetMock).toHaveBeenCalledWith("cwa_ref", "AHSAN-A7F2", expect.any(Object));
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/middleware.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `src/middleware.ts` exists and exports `middleware` and `config`
    - `src/middleware.ts` contains `httpOnly: true` in the cookie options (HIGH-severity threat model requirement)
    - `src/middleware.ts` contains `sameSite: "lax"` in the cookie options
    - `src/middleware.ts` contains `path: "/"` in the cookie options
    - `src/middleware.ts` contains `secure: process.env.NODE_ENV === "production"` (or equivalent production gate)
    - `src/middleware.ts` contains matcher `api/` exclusion: `grep -q 'api/' src/middleware.ts` succeeds AND the pattern is a NEGATIVE-lookahead (not a positive include)
    - `src/middleware.ts` does NOT set the cookie when an existing `cwa_ref` cookie is present (Task test "does NOT set cookie when existing cwa_ref is present" passes)
    - `npx vitest run src/middleware.test.ts` exits 0 with 6 passing tests
  </acceptance_criteria>
  <done>
    Middleware file exists, 6 unit tests pass covering: set-on-first-visit, skip-on-existing, empty-param-skip, whitespace-skip, no-param-skip, trim-on-set. Matcher correctly excludes `/api/` and `_next/` paths.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create src/lib/ambassador/referral.ts + referral.test.ts — consume helper with self/double attribution guards</name>
  <files>src/lib/ambassador/referral.ts, src/lib/ambassador/referral.test.ts</files>
  <read_first>
    - src/lib/firebaseAdmin.ts (db import pattern; emulator named-app guard)
    - src/lib/ambassador/constants.ts (REFERRAL_CODES_COLLECTION, REFERRALS_COLLECTION — Plan 01)
    - src/types/ambassador.ts (ReferralDoc, ReferralCodeLookup — Plan 01)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §8 (referral.ts delta — exact shape)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pitfall 1, §Pattern 3 (cookie consumption contract)
  </read_first>
  <behavior>
    - `consumeReferral(uid, "UNKNOWN-0000")` returns `{ ok: false, reason: "unknown_code" }` when the lookup doc doesn't exist
    - `consumeReferral(uid, code)` where the lookup doc has `ambassadorId === uid` returns `{ ok: false, reason: "self_attribution" }`
    - `consumeReferral(uid, code)` where a referral doc for `referredUserId === uid` already exists returns `{ ok: false, reason: "already_attributed" }`
    - `consumeReferral(uid, code)` on a clean case writes a referrals doc and returns `{ ok: true, referralId: <id> }`
    - On any thrown exception from Firestore, returns `{ ok: false, reason: "error" }` — never throws
    - Written doc contains: `ambassadorId`, `referredUserId` (the uid param), `sourceCode` (the code param), `convertedAt` (serverTimestamp)
  </behavior>
  <action>
    Step 1: Create `src/lib/ambassador/referral.ts`:

    ```typescript
    /**
     * Phase 4 (REF-03, REF-04): Server-side referral attribution helper.
     *
     * Called from POST /api/mentorship/profile after the first-time profile write.
     * Looks up the ambassador by code, enforces REF-04 guards (self-attribution,
     * double-attribution), and writes a `referrals/{autoId}` doc.
     *
     * Never throws — returns a result object so the caller can log and continue
     * (signup MUST NOT fail because of attribution issues).
     */
    import { db } from "@/lib/firebaseAdmin";
    import { FieldValue } from "firebase-admin/firestore";
    import {
      REFERRAL_CODES_COLLECTION,
      REFERRALS_COLLECTION,
    } from "@/lib/ambassador/constants";
    import type { ReferralCodeLookup } from "@/types/ambassador";

    export type ConsumeReferralResult =
      | { ok: true; referralId: string; ambassadorId: string }
      | {
          ok: false;
          reason: "unknown_code" | "self_attribution" | "already_attributed" | "error";
        };

    /**
     * @param referredUserId uid of the newly-signed-up user
     * @param refCode the `cwa_ref` cookie value
     */
    export async function consumeReferral(
      referredUserId: string,
      refCode: string,
    ): Promise<ConsumeReferralResult> {
      try {
        // 1. Resolve code → ambassadorId via top-level lookup (O(1), no index needed)
        const lookupSnap = await db.collection(REFERRAL_CODES_COLLECTION).doc(refCode).get();
        if (!lookupSnap.exists) {
          return { ok: false, reason: "unknown_code" };
        }
        const lookup = lookupSnap.data() as ReferralCodeLookup;
        const ambassadorId = lookup.ambassadorId;

        // 2. REF-04 self-attribution guard
        if (ambassadorId === referredUserId) {
          return { ok: false, reason: "self_attribution" };
        }

        // 3. REF-04 double-attribution guard
        const existing = await db
          .collection(REFERRALS_COLLECTION)
          .where("referredUserId", "==", referredUserId)
          .limit(1)
          .get();
        if (!existing.empty) {
          return { ok: false, reason: "already_attributed" };
        }

        // 4. Write the referral doc
        const writeResult = await db.collection(REFERRALS_COLLECTION).add({
          ambassadorId,
          referredUserId,
          convertedAt: FieldValue.serverTimestamp(),
          sourceCode: refCode,
        });

        return { ok: true, referralId: writeResult.id, ambassadorId };
      } catch (err) {
        console.error(`[consumeReferral] failed for referredUserId=${referredUserId} refCode=${refCode}:`, err);
        return { ok: false, reason: "error" };
      }
    }
    ```

    Step 2: Create `src/lib/ambassador/referral.test.ts` (mock Firestore):

    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";

    const lookupGet = vi.fn();
    const referralsQueryGet = vi.fn();
    const referralsAdd = vi.fn();

    // Firestore mock
    const whereFn = vi.fn(() => ({ limit: vi.fn(() => ({ get: referralsQueryGet })) }));

    const collectionFn = vi.fn((name: string) => {
      if (name === "referral_codes") {
        return { doc: vi.fn(() => ({ get: lookupGet })) };
      }
      if (name === "referrals") {
        return {
          where: whereFn,
          add: referralsAdd,
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    });

    vi.mock("@/lib/firebaseAdmin", () => ({
      db: { collection: collectionFn },
    }));

    vi.mock("firebase-admin/firestore", () => ({
      FieldValue: { serverTimestamp: () => "server-ts-stub" },
    }));

    import { consumeReferral } from "./referral";

    describe("consumeReferral", () => {
      beforeEach(() => {
        lookupGet.mockReset();
        referralsQueryGet.mockReset();
        referralsAdd.mockReset();
      });

      it("returns unknown_code when lookup doc missing", async () => {
        lookupGet.mockResolvedValue({ exists: false });
        const r = await consumeReferral("user-2", "MISS-0000");
        expect(r).toEqual({ ok: false, reason: "unknown_code" });
      });

      it("returns self_attribution when ambassadorId equals referredUserId", async () => {
        lookupGet.mockResolvedValue({
          exists: true,
          data: () => ({ ambassadorId: "user-1", uid: "user-1" }),
        });
        const r = await consumeReferral("user-1", "SELF-0000");
        expect(r).toEqual({ ok: false, reason: "self_attribution" });
      });

      it("returns already_attributed when existing referral doc found", async () => {
        lookupGet.mockResolvedValue({
          exists: true,
          data: () => ({ ambassadorId: "user-A", uid: "user-A" }),
        });
        referralsQueryGet.mockResolvedValue({ empty: false });
        const r = await consumeReferral("user-2", "AAA-0000");
        expect(r).toEqual({ ok: false, reason: "already_attributed" });
      });

      it("returns ok with referralId on clean attribution", async () => {
        lookupGet.mockResolvedValue({
          exists: true,
          data: () => ({ ambassadorId: "user-A", uid: "user-A" }),
        });
        referralsQueryGet.mockResolvedValue({ empty: true });
        referralsAdd.mockResolvedValue({ id: "ref-123" });
        const r = await consumeReferral("user-2", "CODE-0000");
        expect(r).toEqual({ ok: true, referralId: "ref-123", ambassadorId: "user-A" });
        expect(referralsAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            ambassadorId: "user-A",
            referredUserId: "user-2",
            sourceCode: "CODE-0000",
            convertedAt: "server-ts-stub",
          }),
        );
      });

      it("returns error reason on Firestore exception (never throws)", async () => {
        lookupGet.mockRejectedValue(new Error("Firestore down"));
        const r = await consumeReferral("user-2", "ANY-0000");
        expect(r).toEqual({ ok: false, reason: "error" });
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/lib/ambassador/referral.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/ambassador/referral.ts` exists and exports `consumeReferral`
    - `src/lib/ambassador/referral.ts` imports `db` from `@/lib/firebaseAdmin` and `FieldValue` from `firebase-admin/firestore`
    - `src/lib/ambassador/referral.ts` imports `REFERRAL_CODES_COLLECTION` and `REFERRALS_COLLECTION` from constants
    - `src/lib/ambassador/referral.ts` returns `{ ok: false, reason: "self_attribution" }` branch (grep for the literal string)
    - `src/lib/ambassador/referral.ts` returns `{ ok: false, reason: "already_attributed" }` branch
    - `src/lib/ambassador/referral.ts` wraps the whole body in try/catch — never throws
    - `npx vitest run src/lib/ambassador/referral.test.ts` exits 0 with 5 passing tests
    - Tests "returns self_attribution when ambassadorId equals referredUserId" AND "returns already_attributed when existing referral doc found" both pass (REF-04 block compliance)
  </acceptance_criteria>
  <done>
    Server-side attribution helper is implemented, guards REF-04, and unit-tested with 5 passing tests. Ready for the profile POST handler (Task 5) to import and use synchronously.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Extend runAcceptanceTransaction to generate referral code and write referral_codes lookup doc</name>
  <files>src/lib/ambassador/acceptance.ts</files>
  <read_first>
    - src/lib/ambassador/acceptance.ts (entire file — focus on pre-transaction block lines 85–104 for the ensureUniqueUsername pattern, and the `if (!alreadyAccepted)` block lines 180–196 where subdocPayload is written)
    - src/lib/ambassador/referralCode.ts (Plan 01 — `generateUniqueReferralCode`)
    - src/lib/ambassador/constants.ts (REFERRAL_CODES_COLLECTION — Plan 01)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §6 (acceptance.ts delta — 5 specific modifications)
  </read_first>
  <action>
    Step 1: Open `src/lib/ambassador/acceptance.ts` and add to the existing import block:

    ```typescript
    import { generateUniqueReferralCode } from "@/lib/ambassador/referralCode";
    import { REFERRAL_CODES_COLLECTION } from "@/lib/ambassador/constants";
    ```

    Step 2: In the pre-transaction block (near where `ensureUniqueUsername` is called, around lines 98–104 of the existing file), ADD AFTER the username resolution:

    ```typescript
    // Phase 4 (REF-01): Generate unique referral code before entering the transaction.
    // Collection lookup (.doc().get()) is illegal inside db.runTransaction via txn.get for
    // a non-document query; we read outside and pass resolvedReferralCode into the txn body.
    // The txn itself writes the referral_codes/{code} lookup doc, making the generation+write atomic.
    const resolvedReferralCode = await generateUniqueReferralCode(resolvedUsername);
    ```

    Step 3: Inside the transaction body, in the `if (!alreadyAccepted)` branch where `subdocPayload` is built (around lines 181–196), ADD the referralCode field AFTER the existing mandatory fields:

    ```typescript
    const subdocPayload: Record<string, unknown> = {
      cohortId: app.targetCohortId,
      joinedAt: now,
      active: true,
      strikes: 0,
      discordMemberId: app.discordMemberId ?? null,
      referralCode: resolvedReferralCode, // REF-01: Phase 4 — set at first-accept only
    };
    // (existing conditional-spread block for university, city, etc. stays unchanged)
    ```

    Step 4: Inside the SAME `if (!alreadyAccepted)` branch, AFTER the `txn.set(ambassadorRef, subdocPayload)` call, ADD the referral_codes lookup write. This is INSIDE the transaction so the code+subdoc pair commits atomically (if the txn aborts, neither exists):

    ```typescript
    // Phase 4 (REF-01): Write the top-level lookup doc atomically with the subdoc.
    // RESEARCH Pitfall 3 — avoids a collection-group index on ambassador.referralCode.
    const refCodeRef = db.collection(REFERRAL_CODES_COLLECTION).doc(resolvedReferralCode);
    txn.set(refCodeRef, {
      ambassadorId: app.applicantUid,
      uid: app.applicantUid,
    });
    ```

    Step 5: Extend the `AcceptanceResult` `ok: true` branch to include `referralCode` so callers can log it. Update the type union at the top of the file (around lines 39–51):

    ```typescript
    export type AcceptanceResult =
      | {
          ok: true;
          alreadyAccepted?: boolean;
          applicationId: string;
          applicantUid: string;
          applicantEmail: string;
          applicantName: string;
          cohortId: string;
          cohortName: string;
          discordHandle: string;
          discordMemberId: string | null;
          referralCode?: string; // Phase 4 (REF-01) — present on first-accept path
        }
      | {
          ok: false;
          error: "application_not_found" | "cohort_not_found" | "cohort_full" | "already_declined";
        };
    ```

    Step 6: Update the `ok: true` return at the end of the transaction to include `referralCode` when not already accepted. Find the existing return after commit (the function's final `return { ok: true, ... }` line) and add:

    ```typescript
    return {
      ok: true,
      // ... existing fields
      ...(alreadyAccepted ? {} : { referralCode: resolvedReferralCode }),
    };
    ```

    Step 7: If `alreadyAccepted === true`, the existing `referralCode` on the subdoc should be returned (so the admin UI can display it on re-accept). Read it from `profileSnap.data()?.ambassador?.v1?.referralCode` — actually, looking at the code, the subdoc is a separate doc `profileRef.collection("ambassador").doc("v1")`. The simplest safe pattern: on re-accept, skip `referralCode` in the result (callers on idempotent re-accept don't need it because the code is already stored on the subdoc and visible on the profile page).
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -n "generateUniqueReferralCode\|REFERRAL_CODES_COLLECTION" src/lib/ambassador/acceptance.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/lib/ambassador/acceptance.ts` imports `generateUniqueReferralCode` from `@/lib/ambassador/referralCode`
    - `src/lib/ambassador/acceptance.ts` imports `REFERRAL_CODES_COLLECTION` from `@/lib/ambassador/constants`
    - `src/lib/ambassador/acceptance.ts` calls `generateUniqueReferralCode(resolvedUsername)` BEFORE `db.runTransaction`
    - `src/lib/ambassador/acceptance.ts` writes `txn.set(refCodeRef, ...)` where `refCodeRef = db.collection(REFERRAL_CODES_COLLECTION).doc(resolvedReferralCode)` INSIDE the transaction
    - `src/lib/ambassador/acceptance.ts` `subdocPayload` contains `referralCode: resolvedReferralCode`
    - `AcceptanceResult` `ok: true` branch includes `referralCode?: string`
    - The referral code write happens inside the `if (!alreadyAccepted)` branch (first-accept only — re-accept is no-op for lookup and subdoc)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    On first-accept, `runAcceptanceTransaction` now generates a unique referral code and atomically commits both the ambassador subdoc (with `referralCode` field) and the top-level `referral_codes/{code}` lookup doc. Re-accept is still an idempotent no-op.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Extend POST /api/mentorship/profile to consume cwa_ref cookie and clear on response</name>
  <files>src/app/api/mentorship/profile/route.ts</files>
  <read_first>
    - src/app/api/mentorship/profile/route.ts (entire file — locate the POST handler, the line that calls `db.collection("mentorship_profiles").doc(uid).set(profile)` around line 113, and the `NextResponse.json(...)` return statement)
    - src/lib/ambassador/referral.ts (Task 2 — `consumeReferral` signature)
    - src/lib/ambassador/constants.ts (REFERRAL_COOKIE_NAME = "cwa_ref")
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §7 (profile route delta — 5 specific modifications)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pattern 3 + §Pitfall 1 (synchronous consume + cookie clear on response)
  </read_first>
  <action>
    Step 1: Add imports near the top of `src/app/api/mentorship/profile/route.ts`:

    ```typescript
    import { consumeReferral } from "@/lib/ambassador/referral";
    import { REFERRAL_COOKIE_NAME } from "@/lib/ambassador/constants";
    ```

    Step 2: In the POST handler, AFTER the line `await db.collection("mentorship_profiles").doc(uid).set(profile)` (and AFTER any existing fire-and-forget Discord role assignment), ADD the referral-consumption block. This MUST come BEFORE the `NextResponse.json(...)` return because the response object is what carries the cookie clear:

    ```typescript
    // Phase 4 (REF-03): If a cwa_ref cookie is present, consume it now.
    // HttpOnly cookie — only readable server-side. Must be synchronous so the
    // Set-Cookie clear header lands on the outgoing response (RESEARCH Pitfall 1).
    const refCode = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
    let referralConsumed = false;
    if (refCode) {
      const result = await consumeReferral(uid, refCode);
      if (result.ok) {
        console.log(
          `[profile.POST] Referral attribution success: ambassador=${result.ambassadorId} user=${uid} code=${refCode} referralId=${result.referralId}`,
        );
      } else {
        console.log(
          `[profile.POST] Referral attribution skipped: user=${uid} code=${refCode} reason=${result.reason}`,
        );
      }
      referralConsumed = true; // clear the cookie regardless of outcome — prevents endless retry on the same user
    }
    ```

    Step 3: MODIFY the final return to use a `NextResponse.json` variable so the cookie can be cleared on it:

    Find the existing return at the end of the POST handler (likely `return NextResponse.json({ ... }, { status: 201 })` or similar). Change to:

    ```typescript
    const response = NextResponse.json({ /* existing body */ }, { status: 201 /* or existing */ });
    if (referralConsumed) {
      // Phase 4 (REF-03): clear cookie on the outgoing response — one-time consumption
      response.cookies.delete(REFERRAL_COOKIE_NAME);
    }
    return response;
    ```

    Note: if there are multiple return statements (error paths that also carry the cookie), only the success path needs the cookie clear — error paths leave the cookie intact so a retried signup can still attribute. But verify no error path incorrectly treats the cookie as "consumed".

    Step 4: Ensure no `throw` bubbles up from `consumeReferral` — Task 2 already wraps everything in try/catch so this is guaranteed, but add a defensive log line noting the guarantee.
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -n "consumeReferral\|REFERRAL_COOKIE_NAME\|cookies\\.delete" src/app/api/mentorship/profile/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/mentorship/profile/route.ts` imports `consumeReferral` from `@/lib/ambassador/referral`
    - `src/app/api/mentorship/profile/route.ts` imports `REFERRAL_COOKIE_NAME` from `@/lib/ambassador/constants`
    - `src/app/api/mentorship/profile/route.ts` reads the cookie with `request.cookies.get(REFERRAL_COOKIE_NAME)?.value`
    - `src/app/api/mentorship/profile/route.ts` calls `await consumeReferral(...)` SYNCHRONOUSLY (the `await` keyword present) — NOT fire-and-forget
    - `src/app/api/mentorship/profile/route.ts` calls `response.cookies.delete(REFERRAL_COOKIE_NAME)` on the outgoing response (cookie clear on response, not fire-and-forget)
    - The consume call happens AFTER `db.collection("mentorship_profiles").doc(uid).set(profile)` (profile write first, attribution after)
    - The POST handler does NOT throw when attribution fails — errors are logged and signup continues
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    First-time profile POST now consumes the `cwa_ref` cookie server-side, writes a `referrals/{id}` doc via `consumeReferral`, and clears the cookie on the outgoing response. Signup still succeeds even if attribution fails.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Update firestore.rules to deny client writes to referrals and referral_codes</name>
  <files>firestore.rules</files>
  <read_first>
    - firestore.rules (entire file — note the existing deny-by-default patterns used for other Phase 2+3 collections like `applications`, `public_ambassadors`)
    - .planning/REQUIREMENTS.md §REF-03/REF-04 (security expectations — referral writes are server-only)
  </read_first>
  <action>
    Add the following match blocks inside the existing `rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { ... } }` envelope. Place them near other ambassador collection rules (e.g. below `match /public_ambassadors/{uid}` or below `match /applications/{applicationId}`).

    ```
    // Phase 4 (REF-01, REF-02, REF-03, REF-04): Referral attribution
    //
    // Both collections are server-only. `referral_codes/{code}` is written during
    // acceptance (src/lib/ambassador/acceptance.ts) and read by consumeReferral;
    // `referrals/{id}` is written by consumeReferral (src/lib/ambassador/referral.ts).
    // No client path — not even admins — should write directly.

    match /referral_codes/{code} {
      allow read: if false;      // server-only (Admin SDK bypasses rules)
      allow write: if false;
    }

    match /referrals/{referralId} {
      allow read: if false;      // server-only
      allow write: if false;
    }
    ```

    Note: Admin SDK (used by the Next.js API routes and cron scripts) bypasses security rules, so server-side writes continue to function. The `if false` rule only blocks direct client-SDK access — exactly what we want.
  </action>
  <verify>
    <automated>grep -E "match /referral_codes|match /referrals/\\{" firestore.rules</automated>
  </verify>
  <acceptance_criteria>
    - `firestore.rules` contains `match /referral_codes/{code} {`
    - `firestore.rules` contains `match /referrals/{referralId} {`
    - Both match blocks contain `allow read: if false;` and `allow write: if false;`
    - The file still has `rules_version = '2';` at the top (not accidentally removed)
  </acceptance_criteria>
  <done>
    Firestore security rules explicitly deny all client-SDK reads and writes to `referrals/*` and `referral_codes/*`. Server-side Admin SDK writes continue to work because Admin SDK bypasses rules.
  </done>
</task>

</tasks>

<verification>
After all 5 tasks complete:
1. `npx tsc --noEmit` exits 0
2. `npx vitest run src/middleware.test.ts src/lib/ambassador/referral.test.ts src/lib/ambassador/referralCode.test.ts src/lib/ambassador/reportDeadline.test.ts --reporter=verbose` exits 0
3. End-to-end smoke (manual — emulator): visit `http://localhost:3000/?ref=TEST-0000`, inspect DevTools Application tab → Cookies → localhost shows `cwa_ref=TEST-0000`, `HttpOnly: ✓`, `SameSite: Lax`.
4. `grep -E 'match /referral_codes|match /referrals/' firestore.rules` returns 2 matches.
5. `grep -n "generateUniqueReferralCode" src/lib/ambassador/acceptance.ts` returns at least 1 hit.
6. `grep -n "consumeReferral" src/app/api/mentorship/profile/route.ts` returns at least 1 hit.
</verification>

<success_criteria>
- Cookie is set on first `?ref=CODE` visit, skipped when already present
- Cookie is HttpOnly, SameSite=Lax, 30-day max-age
- Referral code generated once per first-accept and stored atomically with subdoc + lookup doc
- Profile POST consumes cookie, writes referrals doc, clears cookie
- Self-attribution and double-attribution both return `{ ok: false }` without writing
- Firestore rules deny all client writes to both collections
- All 4 unit-test files still pass after this plan's modifications
</success_criteria>

<output>
Create `.planning/phases/04-activity-subsystem/04-02-referral-attribution-SUMMARY.md` with:
- Files created / modified
- Test suites added and pass counts
- Threat model checkboxes (HttpOnly, self-attribution, double-attribution, rules denial)
- Any deviations from PATTERNS.md with rationale
</output>