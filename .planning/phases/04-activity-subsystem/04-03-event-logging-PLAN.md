---
phase: 04-activity-subsystem
plan: 03
type: execute
wave: 2
depends_on:
  - 04-01-foundations-types-schemas
files_modified:
  - src/app/api/ambassador/events/route.ts
  - src/app/api/ambassador/events/[eventId]/route.ts
  - src/app/api/ambassador/events/[eventId]/route.test.ts
  - src/app/api/ambassador/events/admin/route.ts
  - src/app/ambassadors/report/LogEventForm.tsx
  - src/app/ambassadors/report/EventList.tsx
  - src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx
  - src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx
  - firestore.rules
autonomous: true
requirements:
  - EVENT-01
  - EVENT-02
  - EVENT-03
  - EVENT-04
must_haves:
  truths:
    - "Ambassador can POST /api/ambassador/events with date+type+attendanceEstimate+optional link/notes and receive 201 with eventId"
    - "Ambassador can PATCH /api/ambassador/events/[eventId] only if they own it and it's within 30 days of event date (server-side enforced)"
    - "Ambassador can DELETE /api/ambassador/events/[eventId] only if they own it and within the 30-day window"
    - "Admin can GET all events for a cohort via /api/ambassador/events/admin?cohortId=X ordered by date desc"
    - "Admin can PATCH /api/ambassador/events/admin with {eventId, hidden} to flag/unflag an event"
    - "LogEventForm component submits a new event and shows success/error toasts"
    - "EventList component renders the ambassador's non-hidden events with edit/delete controls"
    - "EventAdminTable renders cohort events with a hide/unhide toggle for admins"
    - "Firestore rules deny all client writes to ambassador_events"
  artifacts:
    - path: "src/app/api/ambassador/events/route.ts"
      provides: "GET list own events + POST log new event"
      exports: ["GET", "POST"]
    - path: "src/app/api/ambassador/events/[eventId]/route.ts"
      provides: "PATCH edit + DELETE own event with 30-day window enforcement"
      exports: ["PATCH", "DELETE"]
    - path: "src/app/api/ambassador/events/[eventId]/route.test.ts"
      provides: "Vitest tests for 30-day edit window server-side"
      min_lines: 40
    - path: "src/app/api/ambassador/events/admin/route.ts"
      provides: "Admin GET all events for cohort + PATCH hide/unhide"
      exports: ["GET", "PATCH"]
    - path: "src/app/ambassadors/report/LogEventForm.tsx"
      provides: "Client form to log a new event"
      min_lines: 80
    - path: "src/app/ambassadors/report/EventList.tsx"
      provides: "Client list of the ambassador's own non-hidden events with edit/delete affordances"
      min_lines: 60
    - path: "src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx"
      provides: "Admin server shell for cohort events page"
    - path: "src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx"
      provides: "Client admin table with hide/unhide toggle"
      min_lines: 80
  key_links:
    - from: "src/app/ambassadors/report/LogEventForm.tsx"
      to: "POST /api/ambassador/events"
      via: "authFetch submit handler"
      pattern: "authFetch.*api/ambassador/events"
    - from: "src/app/api/ambassador/events/[eventId]/route.ts"
      to: "EVENT_EDIT_WINDOW_MS check"
      via: "server-side window enforcement (RESEARCH Pitfall 6)"
      pattern: "EVENT_EDIT_WINDOW_MS|30.*24.*60.*60.*1000"
    - from: "src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx"
      to: "PATCH /api/ambassador/events/admin"
      via: "fetch with adminHeaders to toggle hidden"
      pattern: "api/ambassador/events/admin"
---

<objective>
Build the complete event logging subsystem: three API routes (ambassador-scope list/create, ambassador-scope edit/delete with 30-day window, admin-scope list all + hide/unhide) and three client components (`LogEventForm`, `EventList`, `EventAdminTable`). Wires EVENT-01 through EVENT-04 end-to-end.

Purpose: An ambassador can log events they hosted from `/ambassadors/report`, edit/delete their own entries up to 30 days after the event date, and admin can view/flag/hide entries per cohort. Event counts reflect only non-hidden entries (EVENT-04).

Output: 3 new API route files + 1 vitest suite + 3 new client components + 1 server shell page + firestore rules update.
</objective>

<threat_model>
- Authentication: Ambassador routes use `verifyAuth()` + `hasRoleClaim(ctx, "ambassador")` gate. Admin route uses `requireAdmin()`.
- Authorization — ownership: PATCH/DELETE must verify `event.ambassadorId === ctx.uid` before any write. Blocks ambassador A from editing/deleting ambassador B's event. Covered by test "PATCH rejects 403 when uid does not own the event".
- Data integrity — edit window: 30-day window enforced SERVER-SIDE (RESEARCH Pitfall 6). Client UI hides button past window but server is the source of truth. Returns 409 past the window. Covered by test.
- Data integrity — hidden flag: Only admin can toggle `hidden` (via admin route). Ambassador PATCH schema does NOT expose `hidden`. Verified by grep.
- Firestore rules: `ambassador_events` collection denies all client-SDK reads and writes. Server-side Admin SDK bypasses. Prevents a malicious client from reading other ambassadors' events or events flagged hidden.
- Cookie safety: N/A — no cookies in this plan.
- Cron safety: N/A — no crons in this plan.
- Block-on severity: HIGH for ownership check, 30-day server-side window, admin-only hidden toggle. All have acceptance criteria.
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
@.planning/phases/04-activity-subsystem/04-UI-SPEC.md
@.planning/phases/04-activity-subsystem/04-01-foundations-types-schemas-PLAN.md
@src/app/api/ambassador/profile/route.ts
@src/app/api/ambassador/applications/[applicationId]/route.ts
@src/app/admin/ambassadors/cohorts/page.tsx
@src/app/profile/AmbassadorPublicCardSection.tsx
@firestore.rules

<interfaces>
From Plan 01 (MUST be complete first):
- `LogEventSchema`, `UpdateEventSchema`, `AmbassadorEventDoc`, `LogEventInput`, `UpdateEventInput` — in `@/types/ambassador`
- `EventTypeSchema`, `EventType`, `EVENT_TYPE_LABELS` — in `@/lib/ambassador/eventTypes`
- `AMBASSADOR_EVENTS_COLLECTION = "ambassador_events"` — in `@/lib/ambassador/constants`
- `EVENT_EDIT_WINDOW_MS = 2592000000` (30 days in ms)

Established project patterns (extracted from codebase):
- `verifyAuth(request)` returns `AuthContext | null` — from `@/lib/auth`
- `hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")` — from `@/lib/permissions`
- `requireAdmin(request)` returns `{ ok: true; uid: string } | { ok: false; error: string; status: number }` — from `@/lib/ambassador/adminAuth`
- `isAmbassadorProgramEnabled()` — from `@/lib/features`
- `FieldValue` imported directly from `firebase-admin/firestore`
- `db` imported from `@/lib/firebaseAdmin`
- `authFetch` imported from `@/lib/apiClient` (client-side auth-aware fetch)
- Admin client fetches use `adminHeaders()` helper reading `ADMIN_TOKEN_KEY` from localStorage

DaisyUI v5 + Tailwind CSS — established from prior phases. No new UI libraries.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/app/api/ambassador/events/route.ts — GET list + POST log event</name>
  <files>src/app/api/ambassador/events/route.ts</files>
  <read_first>
    - src/app/api/ambassador/profile/route.ts (canonical gate order: feature flag → verifyAuth → hasRoleClaim → Zod parse → business logic)
    - src/app/api/ambassador/applications/me/route.ts (GET shape with verifyAuth)
    - src/types/ambassador.ts (LogEventSchema, AmbassadorEventDoc, AMBASSADOR_EVENTS_COLLECTION re-export)
    - src/lib/ambassador/constants.ts (AMBASSADOR_EVENTS_COLLECTION)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §9 (events/route.ts delta)
  </read_first>
  <behavior>
    - Feature flag off → GET and POST both return 404 `{"error": "Not found"}`
    - Unauthenticated request → 401
    - Non-ambassador user → 403
    - POST with invalid body → 400
    - POST with valid body (ambassador role) → 201 with `{ eventId: string }`
    - GET (ambassador role) → 200 with `{ events: AmbassadorEventDoc[] }` where every event has `ambassadorId === ctx.uid` and `hidden === false`
    - GET events are sorted by `date` descending
  </behavior>
  <action>
    Create `src/app/api/ambassador/events/route.ts`:

    ```typescript
    /**
     * Phase 4 (EVENT-01, EVENT-04): Ambassador-scoped event endpoints.
     *   GET  /api/ambassador/events      — list own non-hidden events, sorted by date desc
     *   POST /api/ambassador/events      — log a new event
     *
     * Gate order (canonical, from Phase 2 Pitfall 3):
     *   1. isAmbassadorProgramEnabled()
     *   2. verifyAuth()
     *   3. hasRoleClaim(ctx, "ambassador")  -- "alumni-ambassador" NOT allowed to log new events
     *   4. Zod parse
     *   5. Firestore write
     */
    import { NextRequest, NextResponse } from "next/server";
    import { FieldValue } from "firebase-admin/firestore";
    import { db } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { verifyAuth } from "@/lib/auth";
    import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
    import { LogEventSchema, AMBASSADOR_EVENTS_COLLECTION } from "@/types/ambassador";

    export async function GET(request: NextRequest) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const ctx = await verifyAuth(request);
      if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const snap = await db
        .collection(AMBASSADOR_EVENTS_COLLECTION)
        .where("ambassadorId", "==", ctx.uid)
        .where("hidden", "==", false)
        .orderBy("date", "desc")
        .get();

      const events = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Normalize Firestore Timestamp → ISO string for client JSON
          date: data.date?.toDate?.()?.toISOString() ?? data.date,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
        };
      });

      return NextResponse.json({ events }, { status: 200 });
    }

    export async function POST(request: NextRequest) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const ctx = await verifyAuth(request);
      if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const parsed = LogEventSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid body", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      // Read subdoc to get the ambassador's cohortId
      const subdocSnap = await db
        .collection("mentorship_profiles")
        .doc(ctx.uid)
        .collection("ambassador")
        .doc("v1")
        .get();
      if (!subdocSnap.exists) {
        return NextResponse.json({ error: "Ambassador subdoc missing" }, { status: 409 });
      }
      const subdoc = subdocSnap.data() ?? {};
      const cohortId = subdoc.cohortId as string | undefined;
      if (!cohortId) {
        return NextResponse.json({ error: "No cohort attached" }, { status: 409 });
      }

      // Build payload with conditional spread for optional fields (Admin SDK rejects undefined)
      const payload: Record<string, unknown> = {
        ambassadorId: ctx.uid,
        cohortId,
        date: new Date(parsed.data.date),
        type: parsed.data.type,
        attendanceEstimate: parsed.data.attendanceEstimate,
        hidden: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (typeof parsed.data.link === "string" && parsed.data.link.trim().length > 0) {
        payload.link = parsed.data.link.trim();
      }
      if (typeof parsed.data.notes === "string" && parsed.data.notes.trim().length > 0) {
        payload.notes = parsed.data.notes.trim();
      }

      const ref = await db.collection(AMBASSADOR_EVENTS_COLLECTION).add(payload);

      return NextResponse.json({ eventId: ref.id }, { status: 201 });
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "LogEventSchema|AMBASSADOR_EVENTS_COLLECTION|hasRoleClaim" src/app/api/ambassador/events/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/ambassador/events/route.ts` exists and exports both `GET` and `POST`
    - GET and POST both call `isAmbassadorProgramEnabled()` first and return 404 when disabled
    - GET and POST both call `verifyAuth(request)` and return 401 when null
    - GET and POST both call `hasRoleClaim(..., "ambassador")` and return 403 when false
    - POST validates with `LogEventSchema.safeParse(body)` and returns 400 on failure
    - GET query includes `.where("hidden", "==", false)` (EVENT-04 compliance)
    - POST payload includes `hidden: false` (new events are not hidden by default)
    - POST uses `FieldValue.serverTimestamp()` for `createdAt` and `updatedAt`
    - POST conditionally spreads `link` and `notes` (Admin SDK undefined-rejection pattern)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Ambassador can GET their own non-hidden events (sorted desc) and POST new events. Cohort is read from the subdoc; new events always start `hidden: false`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create src/app/api/ambassador/events/[eventId]/route.ts + test — PATCH/DELETE with 30-day server-side window</name>
  <files>src/app/api/ambassador/events/[eventId]/route.ts, src/app/api/ambassador/events/[eventId]/route.test.ts</files>
  <read_first>
    - src/app/api/ambassador/applications/[applicationId]/route.ts (dynamic route params shape + ownership check pattern)
    - src/types/ambassador.ts (UpdateEventSchema, AmbassadorEventDoc, AMBASSADOR_EVENTS_COLLECTION)
    - src/lib/ambassador/constants.ts (EVENT_EDIT_WINDOW_MS)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §10 (events/[eventId]/route.ts delta + 30-day window)
    - .planning/phases/04-activity-subsystem/04-RESEARCH.md §Pitfall 6 (server-side window enforcement mandatory)
  </read_first>
  <behavior>
    - PATCH with auth + ownership + within-30-days → 200 with updated fields
    - PATCH where `event.ambassadorId !== ctx.uid` → 403
    - PATCH where `Date.now() - event.date > EVENT_EDIT_WINDOW_MS` → 409 with message "Edit window has closed (30 days after event date)"
    - PATCH with invalid body → 400
    - DELETE with auth + ownership + within-30-days → 200
    - DELETE where `event.ambassadorId !== ctx.uid` → 403
    - DELETE where window expired → 409
    - PATCH body MUST NOT allow changes to `hidden` — `UpdateEventSchema` derived from `LogEventSchema.partial()` excludes hidden
  </behavior>
  <action>
    Step 1: Create `src/app/api/ambassador/events/[eventId]/route.ts`:

    ```typescript
    /**
     * Phase 4 (EVENT-02): Ambassador-scoped per-event edit/delete with 30-day window.
     *
     *   PATCH  /api/ambassador/events/[eventId]
     *   DELETE /api/ambassador/events/[eventId]
     *
     * Server-side window enforcement is mandatory (RESEARCH Pitfall 6). Client hides
     * the button but the server is the source of truth.
     */
    import { NextRequest, NextResponse } from "next/server";
    import { FieldValue } from "firebase-admin/firestore";
    import { db } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { verifyAuth } from "@/lib/auth";
    import { hasRoleClaim, type DecodedRoleClaim } from "@/lib/permissions";
    import {
      UpdateEventSchema,
      AMBASSADOR_EVENTS_COLLECTION,
      EVENT_EDIT_WINDOW_MS,
    } from "@/types/ambassador";

    type RouteParams = { params: Promise<{ eventId: string }> };

    /** Returns the event date as milliseconds since epoch for window math. */
    function toDateMs(value: unknown): number {
      if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
        return (value as { toDate: () => Date }).toDate().getTime();
      }
      if (value instanceof Date) return value.getTime();
      if (typeof value === "string") return new Date(value).getTime();
      return 0;
    }

    async function loadOwnedEvent(
      eventId: string,
      uid: string,
    ): Promise<
      | { ok: true; ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.DocumentData }
      | { ok: false; status: number; error: string }
    > {
      const ref = db.collection(AMBASSADOR_EVENTS_COLLECTION).doc(eventId);
      const snap = await ref.get();
      if (!snap.exists) return { ok: false, status: 404, error: "Event not found" };
      const data = snap.data() as FirebaseFirestore.DocumentData;
      if (data.ambassadorId !== uid) {
        return { ok: false, status: 403, error: "Forbidden" };
      }
      return { ok: true, ref, data };
    }

    export async function PATCH(request: NextRequest, { params }: RouteParams) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const ctx = await verifyAuth(request);
      if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { eventId } = await params;
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
      const parsed = UpdateEventSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid body", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const loaded = await loadOwnedEvent(eventId, ctx.uid);
      if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

      // Server-side 30-day window (RESEARCH Pitfall 6)
      const eventMs = toDateMs(loaded.data.date);
      if (Date.now() - eventMs > EVENT_EDIT_WINDOW_MS) {
        return NextResponse.json(
          { error: "Edit window has closed (30 days after event date)" },
          { status: 409 },
        );
      }

      const updatePayload: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (parsed.data.date) updatePayload.date = new Date(parsed.data.date);
      if (parsed.data.type) updatePayload.type = parsed.data.type;
      if (typeof parsed.data.attendanceEstimate === "number") {
        updatePayload.attendanceEstimate = parsed.data.attendanceEstimate;
      }
      if (typeof parsed.data.link === "string") {
        // Empty string means "clear" — use FieldValue.delete()
        updatePayload.link =
          parsed.data.link.trim().length === 0 ? FieldValue.delete() : parsed.data.link.trim();
      }
      if (typeof parsed.data.notes === "string") {
        updatePayload.notes =
          parsed.data.notes.trim().length === 0 ? FieldValue.delete() : parsed.data.notes.trim();
      }

      await loaded.ref.update(updatePayload);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    export async function DELETE(request: NextRequest, { params }: RouteParams) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const ctx = await verifyAuth(request);
      if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!hasRoleClaim(ctx as unknown as DecodedRoleClaim, "ambassador")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { eventId } = await params;
      const loaded = await loadOwnedEvent(eventId, ctx.uid);
      if (!loaded.ok) return NextResponse.json({ error: loaded.error }, { status: loaded.status });

      const eventMs = toDateMs(loaded.data.date);
      if (Date.now() - eventMs > EVENT_EDIT_WINDOW_MS) {
        return NextResponse.json(
          { error: "Edit window has closed (30 days after event date)" },
          { status: 409 },
        );
      }

      await loaded.ref.delete();
      return NextResponse.json({ success: true }, { status: 200 });
    }
    ```

    Step 2: Create `src/app/api/ambassador/events/[eventId]/route.test.ts` — focused unit test of the 30-day window math logic. Mock all Firestore and auth entry points.

    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";

    // Mocks for feature flag + auth
    const isEnabledMock = vi.fn(() => true);
    const verifyAuthMock = vi.fn();
    const hasRoleClaimMock = vi.fn(() => true);

    vi.mock("@/lib/features", () => ({
      isAmbassadorProgramEnabled: () => isEnabledMock(),
    }));
    vi.mock("@/lib/auth", () => ({ verifyAuth: (req: unknown) => verifyAuthMock(req) }));
    vi.mock("@/lib/permissions", () => ({
      hasRoleClaim: (ctx: unknown, role: string) => hasRoleClaimMock(ctx, role),
    }));

    // Firestore mocks
    const eventGet = vi.fn();
    const eventUpdate = vi.fn();
    const eventDelete = vi.fn();
    vi.mock("@/lib/firebaseAdmin", () => ({
      db: {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: eventGet,
            update: eventUpdate,
            delete: eventDelete,
          })),
        })),
      },
    }));

    vi.mock("firebase-admin/firestore", () => ({
      FieldValue: {
        serverTimestamp: () => "server-ts-stub",
        delete: () => "delete-stub",
      },
    }));

    // Stub Next types
    class NextResponseMock {
      static json = (data: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        json: async () => data,
      });
    }
    vi.mock("next/server", () => ({
      NextRequest: class {},
      NextResponse: NextResponseMock,
    }));

    import { PATCH, DELETE } from "./route";

    function makeRequest(body: unknown): unknown {
      return {
        json: async () => body,
      };
    }

    function setEventAgeDays(days: number, ambassadorId = "user-1") {
      const eventDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      eventGet.mockResolvedValue({
        exists: true,
        data: () => ({ ambassadorId, date: eventDate, type: "workshop" }),
      });
    }

    describe("PATCH /api/ambassador/events/[eventId]", () => {
      beforeEach(() => {
        isEnabledMock.mockReturnValue(true);
        verifyAuthMock.mockResolvedValue({ uid: "user-1" });
        hasRoleClaimMock.mockReturnValue(true);
        eventGet.mockReset();
        eventUpdate.mockReset();
        eventDelete.mockReset();
      });

      it("returns 200 when within 30-day window and owns the event", async () => {
        setEventAgeDays(5);
        const res = await PATCH(makeRequest({ attendanceEstimate: 42 }) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(200);
        expect(eventUpdate).toHaveBeenCalled();
      });

      it("returns 409 when event is older than 30 days (server-side window)", async () => {
        setEventAgeDays(31);
        const res = await PATCH(makeRequest({ attendanceEstimate: 42 }) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(409);
        expect(eventUpdate).not.toHaveBeenCalled();
      });

      it("returns 403 when uid does not own the event", async () => {
        setEventAgeDays(5, "other-user");
        const res = await PATCH(makeRequest({ attendanceEstimate: 42 }) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(403);
        expect(eventUpdate).not.toHaveBeenCalled();
      });

      it("returns 401 when unauthenticated", async () => {
        verifyAuthMock.mockResolvedValue(null);
        const res = await PATCH(makeRequest({}) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(401);
      });

      it("returns 403 when auth but not ambassador role", async () => {
        hasRoleClaimMock.mockReturnValue(false);
        const res = await PATCH(makeRequest({}) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(403);
      });

      it("returns 404 when feature flag off", async () => {
        isEnabledMock.mockReturnValue(false);
        const res = await PATCH(makeRequest({}) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(404);
      });
    });

    describe("DELETE /api/ambassador/events/[eventId]", () => {
      beforeEach(() => {
        isEnabledMock.mockReturnValue(true);
        verifyAuthMock.mockResolvedValue({ uid: "user-1" });
        hasRoleClaimMock.mockReturnValue(true);
        eventGet.mockReset();
        eventDelete.mockReset();
      });

      it("returns 200 when within 30-day window", async () => {
        setEventAgeDays(5);
        const res = await DELETE(makeRequest({}) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(200);
        expect(eventDelete).toHaveBeenCalled();
      });

      it("returns 409 when outside 30-day window", async () => {
        setEventAgeDays(31);
        const res = await DELETE(makeRequest({}) as never, {
          params: Promise.resolve({ eventId: "evt-1" }),
        });
        expect(res.status).toBe(409);
        expect(eventDelete).not.toHaveBeenCalled();
      });
    });
    ```
  </action>
  <verify>
    <automated>npx vitest run src/app/api/ambassador/events/[eventId]/route.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/ambassador/events/[eventId]/route.ts` exists and exports `PATCH` and `DELETE`
    - PATCH and DELETE both call `isAmbassadorProgramEnabled()`, `verifyAuth()`, and `hasRoleClaim(..., "ambassador")` in that order
    - Ownership check: `data.ambassadorId !== uid` returns 403 — grep confirms `ambassadorId !== uid` literal
    - 30-day window: `Date.now() - eventMs > EVENT_EDIT_WINDOW_MS` returns 409 — grep confirms `EVENT_EDIT_WINDOW_MS`
    - PATCH body uses `UpdateEventSchema` (partial of LogEventSchema) — grep confirms import
    - `npx vitest run src/app/api/ambassador/events/[eventId]/route.test.ts` exits 0 with 8 passing tests
    - Test "returns 409 when event is older than 30 days (server-side window)" passes
    - Test "returns 403 when uid does not own the event" passes
  </acceptance_criteria>
  <done>
    PATCH/DELETE endpoints enforce ownership and 30-day edit window server-side. 8 unit tests verify edge cases. Admin cannot use these routes (they require ambassador role) — admin hide/unhide goes through the admin route (Task 3).
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create src/app/api/ambassador/events/admin/route.ts — admin GET all events for cohort + PATCH hide/unhide</name>
  <files>src/app/api/ambassador/events/admin/route.ts</files>
  <read_first>
    - src/app/api/ambassador/applications/[applicationId]/route.ts (admin gate via `requireAdmin`)
    - src/lib/ambassador/adminAuth.ts (requireAdmin signature)
    - src/types/ambassador.ts (AMBASSADOR_EVENTS_COLLECTION re-export)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §11 (admin events route)
  </read_first>
  <action>
    Create `src/app/api/ambassador/events/admin/route.ts`:

    ```typescript
    /**
     * Phase 4 (EVENT-03): Admin-scoped event management.
     *   GET   /api/ambassador/events/admin?cohortId=X  — list ALL events for cohort
     *   PATCH /api/ambassador/events/admin             — toggle hidden flag on an event
     *
     * Admin-only. Does NOT include ownership checks (admins see all).
     */
    import { NextRequest, NextResponse } from "next/server";
    import { FieldValue } from "firebase-admin/firestore";
    import { z } from "zod";
    import { db } from "@/lib/firebaseAdmin";
    import { isAmbassadorProgramEnabled } from "@/lib/features";
    import { requireAdmin } from "@/lib/ambassador/adminAuth";
    import { AMBASSADOR_EVENTS_COLLECTION } from "@/types/ambassador";

    const AdminHidePatchSchema = z.object({
      eventId: z.string().min(1),
      hidden: z.boolean(),
    });

    export async function GET(request: NextRequest) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const admin = await requireAdmin(request);
      if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

      const cohortId = request.nextUrl.searchParams.get("cohortId");
      if (!cohortId) {
        return NextResponse.json({ error: "Missing cohortId" }, { status: 400 });
      }

      const snap = await db
        .collection(AMBASSADOR_EVENTS_COLLECTION)
        .where("cohortId", "==", cohortId)
        .orderBy("date", "desc")
        .get();

      const events = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date?.toDate?.()?.toISOString() ?? data.date,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
        };
      });
      return NextResponse.json({ events }, { status: 200 });
    }

    export async function PATCH(request: NextRequest) {
      if (!isAmbassadorProgramEnabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const admin = await requireAdmin(request);
      if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
      const parsed = AdminHidePatchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
      }

      const ref = db.collection(AMBASSADOR_EVENTS_COLLECTION).doc(parsed.data.eventId);
      const snap = await ref.get();
      if (!snap.exists) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }
      await ref.update({
        hidden: parsed.data.hidden,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "requireAdmin|AdminHidePatchSchema|AMBASSADOR_EVENTS_COLLECTION" src/app/api/ambassador/events/admin/route.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/api/ambassador/events/admin/route.ts` exists and exports `GET` and `PATCH`
    - Both handlers gate on `isAmbassadorProgramEnabled()` + `requireAdmin(request)`
    - GET requires `?cohortId=X` query param (returns 400 when missing)
    - PATCH validates `{ eventId: string; hidden: boolean }` via a dedicated `AdminHidePatchSchema`
    - PATCH sets `updatedAt: FieldValue.serverTimestamp()` alongside hidden toggle
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Admin can list all cohort events and toggle the hidden flag. Ambassador-scope PATCH (Task 2) does NOT expose `hidden` in UpdateEventSchema.partial(), so ambassadors cannot bypass the admin-only flag.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Create LogEventForm + EventList client components for /ambassadors/report</name>
  <files>src/app/ambassadors/report/LogEventForm.tsx, src/app/ambassadors/report/EventList.tsx</files>
  <read_first>
    - src/app/profile/AmbassadorPublicCardSection.tsx (canonical "use client" form + authFetch + useToast pattern)
    - src/lib/apiClient.ts (authFetch signature)
    - src/lib/ambassador/eventTypes.ts (EVENT_TYPE_LABELS, EventType — Plan 01)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Copywriting Contract §Event Logger (EXACT copy strings must be used)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §17 (LogEventForm delta)
  </read_first>
  <action>
    Step 1: Create `src/app/ambassadors/report/LogEventForm.tsx`:

    ```tsx
    "use client";
    /**
     * Phase 4 (EVENT-01): LogEventForm — submit a new ambassador event.
     *
     * Copy strings come from 04-UI-SPEC.md §Event Logger (verbatim).
     * Posts to /api/ambassador/events via authFetch.
     */
    import { useState } from "react";
    import { authFetch } from "@/lib/apiClient";
    import { useToast } from "@/contexts/ToastContext";
    import { EVENT_TYPE_LABELS, type EventType } from "@/lib/ambassador/eventTypes";

    const DEFAULT_TYPE: EventType = "workshop";

    type Props = {
      onCreated?: () => void;
    };

    export default function LogEventForm({ onCreated }: Props) {
      const toast = useToast();
      const [saving, setSaving] = useState(false);
      const [date, setDate] = useState("");
      const [type, setType] = useState<EventType>(DEFAULT_TYPE);
      const [attendanceEstimate, setAttendanceEstimate] = useState<number>(0);
      const [link, setLink] = useState("");
      const [notes, setNotes] = useState("");

      async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (saving) return;
        if (!date) {
          toast.error("Event date is required");
          return;
        }
        setSaving(true);
        try {
          const isoDate = new Date(date).toISOString();
          const body: Record<string, unknown> = {
            date: isoDate,
            type,
            attendanceEstimate,
          };
          if (link.trim()) body.link = link.trim();
          if (notes.trim()) body.notes = notes.trim();
          const res = await authFetch("/api/ambassador/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const { error } = (await res.json().catch(() => ({}))) as { error?: string };
            toast.error(error ?? "Could not save your event. Check your connection and try again.");
            return;
          }
          toast.success("Event saved");
          // Reset form
          setDate("");
          setType(DEFAULT_TYPE);
          setAttendanceEstimate(0);
          setLink("");
          setNotes("");
          onCreated?.();
        } catch {
          toast.error("Could not save your event. Check your connection and try again.");
        } finally {
          setSaving(false);
        }
      }

      return (
        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl">
          <div className="card-body gap-4">
            <h2 className="card-title">Log an event</h2>

            <div className="form-control">
              <label className="label" htmlFor="event-date">
                <span className="label-text font-bold">Event date</span>
              </label>
              <input
                id="event-date"
                type="date"
                className="input input-bordered"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="event-type">
                <span className="label-text font-bold">Event type</span>
              </label>
              <select
                id="event-type"
                className="select select-bordered"
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label" htmlFor="event-attendance">
                <span className="label-text font-bold">Estimated attendance</span>
              </label>
              <input
                id="event-attendance"
                type="number"
                className="input input-bordered"
                min={0}
                max={100000}
                value={attendanceEstimate}
                onChange={(e) => setAttendanceEstimate(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="event-link">
                <span className="label-text font-bold">Event link (optional)</span>
              </label>
              <input
                id="event-link"
                type="url"
                className="input input-bordered"
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="event-notes">
                <span className="label-text font-bold">Notes (optional)</span>
              </label>
              <textarea
                id="event-notes"
                className="textarea textarea-bordered"
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="card-actions justify-end">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : "Save event"}
              </button>
            </div>
          </div>
        </form>
      );
    }
    ```

    Step 2: Create `src/app/ambassadors/report/EventList.tsx`:

    ```tsx
    "use client";
    /**
     * Phase 4 (EVENT-01, EVENT-02, EVENT-04): EventList — renders the ambassador's
     * own non-hidden events with edit/delete affordances inside the 30-day window.
     * Copy strings from 04-UI-SPEC.md §Event Logger.
     */
    import { useCallback, useEffect, useState } from "react";
    import { authFetch } from "@/lib/apiClient";
    import { useToast } from "@/contexts/ToastContext";
    import { EVENT_TYPE_LABELS, type EventType } from "@/lib/ambassador/eventTypes";
    import { EVENT_EDIT_WINDOW_MS } from "@/lib/ambassador/constants";

    type EventItem = {
      id: string;
      date: string;
      type: EventType;
      attendanceEstimate: number;
      link?: string;
      notes?: string;
    };

    type Props = {
      refreshKey?: number;
    };

    export default function EventList({ refreshKey = 0 }: Props) {
      const toast = useToast();
      const [events, setEvents] = useState<EventItem[]>([]);
      const [loading, setLoading] = useState(true);

      const load = useCallback(async () => {
        setLoading(true);
        try {
          const res = await authFetch("/api/ambassador/events");
          if (!res.ok) {
            toast.error("Could not load events");
            return;
          }
          const data = (await res.json()) as { events: EventItem[] };
          setEvents(data.events ?? []);
        } catch {
          toast.error("Network error — try again");
        } finally {
          setLoading(false);
        }
      }, [toast]);

      useEffect(() => {
        load();
      }, [load, refreshKey]);

      function canEdit(dateStr: string): boolean {
        return Date.now() - new Date(dateStr).getTime() <= EVENT_EDIT_WINDOW_MS;
      }

      async function handleDelete(id: string) {
        if (!confirm("Delete this event? This action cannot be undone.")) return;
        const res = await authFetch(`/api/ambassador/events/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const { error } = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(error ?? "Could not delete");
          return;
        }
        toast.success("Event deleted");
        load();
      }

      if (loading) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        );
      }

      if (events.length === 0) {
        return (
          <div className="alert alert-info">
            <div>
              <h3 className="font-bold">No events logged yet</h3>
              <p className="text-sm">
                Log your first event to start building your activity record. Events you host help the
                cohort see your impact.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Your Events</h2>
            <ul className="divide-y">
              {events.map((e) => {
                const editable = canEdit(e.date);
                return (
                  <li key={e.id} className="py-4 flex justify-between gap-4">
                    <div>
                      <div className="font-bold">
                        {EVENT_TYPE_LABELS[e.type] ?? e.type} —{" "}
                        {new Date(e.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm opacity-80">
                        {e.attendanceEstimate} attendees
                        {e.link ? (
                          <>
                            {" · "}
                            <a href={e.link} target="_blank" rel="noreferrer" className="link">
                              Link
                            </a>
                          </>
                        ) : null}
                      </div>
                      {e.notes ? <div className="text-sm mt-1">{e.notes}</div> : null}
                      {!editable ? (
                        <div className="text-xs opacity-60 mt-1">
                          This event can no longer be edited — the 30-day edit window has closed.
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      {editable ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleDelete(e.id)}
                        >
                          Delete event
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      );
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -c "authFetch\|EVENT_TYPE_LABELS" src/app/ambassadors/report/LogEventForm.tsx src/app/ambassadors/report/EventList.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/ambassadors/report/LogEventForm.tsx` exists, begins with `"use client";`, exports default component
    - `src/app/ambassadors/report/LogEventForm.tsx` calls `authFetch("/api/ambassador/events", { method: "POST" })`
    - `src/app/ambassadors/report/LogEventForm.tsx` uses `EVENT_TYPE_LABELS` to populate the `<select>` options
    - `src/app/ambassadors/report/LogEventForm.tsx` contains copy "Log an event" and "Save event" (verbatim from UI-SPEC)
    - `src/app/ambassadors/report/LogEventForm.tsx` contains copy "Event date", "Event type", "Estimated attendance" (verbatim)
    - `src/app/ambassadors/report/EventList.tsx` exists and begins with `"use client";`
    - `src/app/ambassadors/report/EventList.tsx` fetches `/api/ambassador/events` on mount via authFetch
    - `src/app/ambassadors/report/EventList.tsx` contains empty-state copy "No events logged yet" (verbatim)
    - `src/app/ambassadors/report/EventList.tsx` contains edit-expired copy "This event can no longer be edited — the 30-day edit window has closed." (verbatim)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Two client components exist with verbatim UI-SPEC copy, correct DaisyUI classes, authFetch wiring to the new API routes. Plan 05 will compose them on `/ambassadors/report/page.tsx`.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Create admin cohort events page and EventAdminTable</name>
  <files>src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx, src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx</files>
  <read_first>
    - src/app/admin/ambassadors/cohorts/page.tsx (canonical admin client component with `adminHeaders()` helper pattern, table with toggle, modal)
    - src/app/admin/ambassadors/[applicationId]/page.tsx (server shell + dynamic params pattern)
    - src/lib/ambassador/eventTypes.ts (EVENT_TYPE_LABELS)
    - .planning/phases/04-activity-subsystem/04-PATTERNS.md §21 (admin events page delta)
    - .planning/phases/04-activity-subsystem/04-UI-SPEC.md §Admin Member Management §Copywriting (flag labels)
  </read_first>
  <action>
    Step 1: Create `src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx`:

    ```tsx
    /**
     * Phase 4 (EVENT-03): Admin view of cohort events.
     * Server shell — delegates rendering to the client component EventAdminTable.
     */
    import EventAdminTable from "./EventAdminTable";

    export const dynamic = "force-dynamic";

    type RouteParams = { params: Promise<{ cohortId: string }> };

    export default async function AdminCohortEventsPage({ params }: RouteParams) {
      const { cohortId } = await params;
      return (
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <nav className="text-sm mb-4">
            <a href="/admin/ambassadors/cohorts" className="link">
              &larr; All cohorts
            </a>
          </nav>
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Cohort Events</h1>
            <p className="text-sm opacity-80">All events logged by ambassadors in this cohort.</p>
          </header>
          <EventAdminTable cohortId={cohortId} />
        </div>
      );
    }
    ```

    Step 2: Create `src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx`:

    ```tsx
    "use client";
    /**
     * Phase 4 (EVENT-03, EVENT-04): Admin table showing all events for a cohort,
     * with a hide/unhide toggle per row. Uses adminHeaders() for token auth.
     */
    import { useCallback, useEffect, useState } from "react";
    import { useToast } from "@/contexts/ToastContext";
    import { EVENT_TYPE_LABELS, type EventType } from "@/lib/ambassador/eventTypes";

    const ADMIN_TOKEN_KEY = "cwa_admin_token";

    type AdminEventItem = {
      id: string;
      ambassadorId: string;
      date: string;
      type: EventType;
      attendanceEstimate: number;
      link?: string;
      notes?: string;
      hidden: boolean;
    };

    function adminHeaders(): HeadersInit {
      const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      return { "Content-Type": "application/json", "x-admin-token": token ?? "" };
    }

    type Props = { cohortId: string };

    export default function EventAdminTable({ cohortId }: Props) {
      const toast = useToast();
      const [events, setEvents] = useState<AdminEventItem[]>([]);
      const [loading, setLoading] = useState(true);

      const load = useCallback(async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/ambassador/events/admin?cohortId=${encodeURIComponent(cohortId)}`, {
            headers: adminHeaders(),
          });
          if (!res.ok) {
            toast.error("Could not load events");
            return;
          }
          const data = (await res.json()) as { events: AdminEventItem[] };
          setEvents(data.events ?? []);
        } catch {
          toast.error("Network error");
        } finally {
          setLoading(false);
        }
      }, [cohortId, toast]);

      useEffect(() => {
        load();
      }, [load]);

      async function toggleHidden(eventId: string, nextHidden: boolean) {
        const res = await fetch("/api/ambassador/events/admin", {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ eventId, hidden: nextHidden }),
        });
        if (!res.ok) {
          const { error } = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(error ?? "Could not update");
          return;
        }
        toast.success(nextHidden ? "Event hidden" : "Event unflagged");
        load();
      }

      if (loading) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        );
      }

      if (events.length === 0) {
        return (
          <div className="alert alert-info">
            <span>No events logged in this cohort yet.</span>
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Ambassador</th>
                <th>Date</th>
                <th>Type</th>
                <th>Attendees</th>
                <th>Link</th>
                <th>Hidden</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="font-mono text-xs">{e.ambassadorId}</td>
                  <td>{new Date(e.date).toLocaleDateString()}</td>
                  <td>{EVENT_TYPE_LABELS[e.type] ?? e.type}</td>
                  <td>{e.attendanceEstimate}</td>
                  <td>
                    {e.link ? (
                      <a href={e.link} target="_blank" rel="noreferrer" className="link">
                        link
                      </a>
                    ) : (
                      <span className="opacity-50">—</span>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="toggle toggle-error"
                      checked={e.hidden}
                      onChange={() => toggleHidden(e.id, !e.hidden)}
                      aria-label={e.hidden ? "Unhide event" : "Hide event"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    ```
  </action>
  <verify>
    <automated>npx tsc --noEmit && grep -E "EventAdminTable|adminHeaders|PATCH" src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/app/admin/ambassadors/cohorts/[cohortId]/events/page.tsx` exists with `export const dynamic = "force-dynamic"`
    - The page file contains a back-link to `/admin/ambassadors/cohorts` with text `All cohorts`
    - `src/app/admin/ambassadors/cohorts/[cohortId]/events/EventAdminTable.tsx` exists and begins with `"use client";`
    - EventAdminTable uses `adminHeaders()` with `x-admin-token` header for both GET and PATCH
    - EventAdminTable fetches `/api/ambassador/events/admin?cohortId=...`
    - EventAdminTable PATCH body: `{ eventId, hidden: !current }`
    - Hidden toggle uses DaisyUI `toggle toggle-error` (per UI-SPEC destructive reservation)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Admin page at `/admin/ambassadors/cohorts/[cohortId]/events` renders all events for the cohort with a hide/unhide toggle. Uses established admin-token auth pattern.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Add firestore.rules deny-client-writes for ambassador_events</name>
  <files>firestore.rules</files>
  <read_first>
    - firestore.rules (entire file — follow existing pattern for server-only Phase 2/3 collections)
  </read_first>
  <action>
    Add match block to `firestore.rules` (inside the existing `service cloud.firestore { match /databases/{database}/documents { ... } }`):

    ```
    // Phase 4 (EVENT-01..EVENT-04): Event ledger
    // All writes are server-side only (Admin SDK bypasses rules). Reads are server-side
    // only — the ambassador-facing UI calls /api/ambassador/events (server-mediated),
    // not the client Firestore SDK.
    match /ambassador_events/{eventId} {
      allow read: if false;
      allow write: if false;
    }
    ```
  </action>
  <verify>
    <automated>grep -E "match /ambassador_events/" firestore.rules</automated>
  </verify>
  <acceptance_criteria>
    - `firestore.rules` contains `match /ambassador_events/{eventId} {`
    - The block contains `allow read: if false;` and `allow write: if false;`
  </acceptance_criteria>
  <done>
    Event collection is server-only from the Firestore rules perspective. Admin SDK bypasses rules for all server-side writes; API routes gate access via auth + role/admin checks.
  </done>
</task>

</tasks>

<verification>
After all 6 tasks complete:
1. `npx tsc --noEmit` exits 0
2. `npx vitest run src/app/api/ambassador/events/[eventId]/route.test.ts --reporter=verbose` exits 0
3. `grep -E 'match /ambassador_events/' firestore.rules` returns 1 match
4. `grep -c 'authFetch.*api/ambassador/events' src/app/ambassadors/report/LogEventForm.tsx` returns >= 1
5. `grep -c "api/ambassador/events/admin" src/app/admin/ambassadors/cohorts/\[cohortId\]/events/EventAdminTable.tsx` returns >= 2 (GET + PATCH)
</verification>

<success_criteria>
- Ambassador can create/list/edit/delete events (within 30-day server-enforced window)
- Admin can list all cohort events and toggle hidden
- Ambassador scope cannot modify `hidden` (UpdateEventSchema is partial of LogEventSchema which has no `hidden` field)
- UI copy matches 04-UI-SPEC.md §Event Logger and §Admin Member Management verbatim
- Firestore rules explicitly deny client access to `ambassador_events/*`
- 8 unit tests pass for 30-day window + ownership + auth gating
</success_criteria>

<output>
Create `.planning/phases/04-activity-subsystem/04-03-event-logging-SUMMARY.md` with:
- Files created
- API endpoints implemented (method + path + gate order)
- Copy strings from UI-SPEC that were used verbatim (with UI-SPEC line references)
- Test results (8 passing)
- Threat model checkboxes satisfied
</output>