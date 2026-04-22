---
phase: 02-application-subsystem
plan: 04
type: execute
wave: 2
depends_on:
  - "02-01"
  - "02-03"
files_modified:
  - src/app/api/ambassador/cohorts/route.ts
  - src/app/api/ambassador/cohorts/[cohortId]/route.ts
  - src/app/admin/ambassadors/cohorts/page.tsx
  - src/lib/ambassador/adminAuth.ts
autonomous: true
requirements:
  - COHORT-01
  - COHORT-02
  - COHORT-03
must_haves:
  truths:
    - "Admin can create a cohort (name, startDate, endDate, maxSize, status) and see it appear in the list."
    - "Admin can toggle applicationWindowOpen on a cohort (COHORT-02) — the change is visible in the UI immediately and returned by the GET endpoint."
    - "Admin can view the list of ambassadors attached to a cohort (COHORT-03) — a count + link to the application-list page filtered by cohort."
    - "POST /api/ambassador/cohorts returns 401 for non-admin callers (x-admin-token missing or expired) and 400 for invalid CohortCreateSchema body."
    - "requireAdmin() returns { ok: true, uid: string } on success (uid is synthesised from the admin_sessions token because the legacy admin password flow has no Firebase uid); Plans 05 and 06 consume this shape for the reviewedBy audit field."
    - "Every /api/ambassador/cohorts/* handler returns 404 when FEATURE_AMBASSADOR_PROGRAM is off (RESEARCH.md Pitfall 3)."
  artifacts:
    - path: "src/app/api/ambassador/cohorts/route.ts"
      provides: "GET list (signed-in users get open cohorts; admin gets all); POST create (admin only)"
      exports:
        - "GET"
        - "POST"
    - path: "src/app/api/ambassador/cohorts/[cohortId]/route.ts"
      provides: "GET detail (admin); PATCH update (admin) — open/close window, rename, change status"
      exports:
        - "GET"
        - "PATCH"
    - path: "src/app/admin/ambassadors/cohorts/page.tsx"
      provides: "Admin cohort panel: create form + list + toggle window + click-through to application-list by cohort"
      min_lines: 120
    - path: "src/lib/ambassador/adminAuth.ts"
      provides: "Shared admin-session helpers consumed by Plans 04/05/06/08. requireAdmin returns { ok: true; uid: string } | { ok: false; status; error }."
      exports:
        - "isValidAdminToken"
        - "getAdminToken"
        - "requireAdmin"
  key_links:
    - from: "src/app/api/ambassador/cohorts/route.ts"
      to: "isAmbassadorProgramEnabled"
      via: "feature-flag guard at top of every handler (prevents Pitfall 3)"
      pattern: "isAmbassadorProgramEnabled"
    - from: "src/app/api/ambassador/cohorts/route.ts"
      to: "CohortCreateSchema"
      via: "Zod .safeParse on POST body"
      pattern: "CohortCreateSchema.*safeParse"
    - from: "src/app/admin/ambassadors/cohorts/page.tsx"
      to: "/api/ambassador/cohorts"
      via: "fetch() with x-admin-token header from ADMIN_TOKEN_KEY localStorage"
      pattern: "x-admin-token"
    - from: "src/lib/ambassador/adminAuth.ts"
      to: "admin_sessions/{token}"
      via: "requireAdmin resolves the session doc and surfaces a synthesised uid (admin_sessions is legacy password-keyed; no Firebase uid is stored) for Plan 06's reviewedBy audit field."
      pattern: "admin_sessions"
---

<objective>
Build the cohort management subsystem (COHORT-01/02/03). Admin creates cohorts, opens/closes their application windows, and sees how many ambassadors are attached to each. This plan is wave 2 because it depends on Plan 01 (types + schemas) and Plan 03 (Firestore rules). COHORT-04 (maxSize enforcement) is owned by Plan 06 (the accept endpoint).

Purpose:
- Without a cohort, the apply wizard (Plan 07) has nothing to target. This plan unblocks 07 and 05.
- Firestore-level gating (applicationWindowOpen + status=upcoming) runs in the submit-route (Plan 05); admin panel just toggles the flag.
- This plan also owns the shared `src/lib/ambassador/adminAuth.ts` helper. It returns `{ ok: true; uid: string }` on success so Plan 06 can audit acceptance decisions with a stable identifier (`reviewedBy`) without each plan inventing its own admin-id scheme.

Output:
- `src/lib/ambassador/adminAuth.ts` — the first artifact created in Task 1; consumed by every subsequent ambassador admin route.
- Cohort API routes (GET/POST list, GET/PATCH detail).
- Admin cohort management page at `/admin/ambassadors/cohorts`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md
@.planning/phases/02-application-subsystem/02-01-SUMMARY.md

<interfaces>
Available from Plan 01:
```typescript
// From @/types/ambassador
export const CohortCreateSchema;     // Zod
export const CohortPatchSchema;      // Zod
export interface CohortDoc { cohortId; name; startDate: Date; endDate: Date; maxSize; acceptedCount; status; applicationWindowOpen; ... }
export type CohortStatus = "upcoming" | "active" | "closed";

// From @/lib/ambassador/constants
export const AMBASSADOR_COHORTS_COLLECTION = "cohorts";
```

Available from Phase 1 (DO NOT modify):
```typescript
// @/lib/features
export function isAmbassadorProgramEnabled(): boolean;

// @/lib/firebaseAdmin
export const db;  // firestore-admin Firestore

// @/components/admin/AdminAuthGate — ADMIN_TOKEN_KEY = "mentorship_admin_token"
// Admin session validation pattern (existing):
//   Client sends: headers: { "x-admin-token": localStorage.getItem(ADMIN_TOKEN_KEY) }
//   Server validates by looking up doc in admin_sessions/{token} and checking expiresAt > now.
//   Session docs are created by src/app/api/mentorship/admin/auth/route.ts; they store
//   { createdAt, expiresAt } — there is NO Firebase uid associated with an admin session
//   (the legacy flow is password-based, not user-based). requireAdmin therefore synthesises
//   a stable identifier from the session token so downstream audit fields have something to
//   persist; future work can replace this with a real uid once admin users are migrated.
```

Existing admin-session validation pattern (from src/app/api/mentorship/admin/auth/route.ts):
```typescript
// Token validation:
const sessionDoc = await db.collection("admin_sessions").doc(token).get();
if (!sessionDoc.exists) return false;
const session = sessionDoc.data();
if (session.expiresAt.toDate() < new Date()) return false;
return true;
```

DaisyUI component patterns (from existing /admin/mentors/page.tsx):
- Table: `<table className="table table-zebra">`
- Modal: `<dialog className="modal">` with form
- Button: `<button className="btn btn-primary">`
- Toggle switch: `<input type="checkbox" className="toggle toggle-primary">`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create shared admin-auth helper + cohort collection API (GET list + POST create)</name>
  <files>src/app/api/ambassador/cohorts/route.ts, src/lib/ambassador/adminAuth.ts</files>
  <read_first>
    - src/app/api/mentorship/profile/route.ts (existing API route pattern — NextResponse, Admin SDK, error shape)
    - src/app/api/mentorship/admin/auth/route.ts (x-admin-token session validation pattern; confirms admin_sessions stores { createdAt, expiresAt } only)
    - src/lib/features.ts (isAmbassadorProgramEnabled)
    - src/types/ambassador.ts (CohortCreateSchema — from Plan 01)
    - src/lib/ambassador/constants.ts (AMBASSADOR_COHORTS_COLLECTION)
  </read_first>
  <action>
STEP A — Create the shared admin-auth helper `src/lib/ambassador/adminAuth.ts`.

Design note: the legacy admin auth in this codebase is password-based; the `admin_sessions/{token}` doc stores only `{ createdAt, expiresAt }`. There is no Firebase `uid` linked to an admin session. However, Plan 06 (accept/decline) needs a stable identifier for the `reviewedBy` audit field on application docs. Rather than requiring every Plan 06 caller to reinvent this, `requireAdmin` SHALL return a synthesised uid derived from the session token so every admin action has a consistent per-session audit identifier.

```typescript
/**
 * src/lib/ambassador/adminAuth.ts
 *
 * Shared admin-session validator for all /api/ambassador/* routes.
 * Mirrors the existing pattern in src/app/api/mentorship/admin/auth/route.ts.
 *
 * Return shape rationale: requireAdmin returns { ok: true; uid: string } so
 * Plan 06 (accept/decline) can persist `reviewedBy = uid` on application docs
 * without every caller synthesising its own identifier. The uid is derived from
 * the admin_sessions token (first 12 chars, prefixed `admin:`) because the
 * legacy admin flow is password-based — there is no real Firebase user behind
 * an admin session. This can be replaced with a true uid if admin auth is ever
 * migrated to Firebase Auth.
 */

import { db } from "@/lib/firebaseAdmin";

/** Synthesise a stable per-session admin identifier from the raw token. */
function deriveAdminUid(token: string): string {
  // Keep it short enough to fit comfortably in audit fields, long enough to be unique per session.
  return `admin:${token.slice(0, 12)}`;
}

/**
 * Validate an admin session token against the admin_sessions/{token} doc.
 * Returns true if token exists and expiresAt > now.
 */
export async function isValidAdminToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const sessionDoc = await db.collection("admin_sessions").doc(token).get();
    if (!sessionDoc.exists) return false;
    const session = sessionDoc.data();
    if (!session?.expiresAt) return false;
    const expiresAt = session.expiresAt.toDate
      ? session.expiresAt.toDate()
      : new Date(session.expiresAt);
    return expiresAt > new Date();
  } catch {
    return false;
  }
}

/**
 * Read the admin token from x-admin-token header on an incoming Request.
 */
export function getAdminToken(request: Request): string | null {
  return request.headers.get("x-admin-token");
}

/**
 * Validate and return a discriminated-union result.
 *
 * On success: `{ ok: true, uid }` where uid is synthesised from the admin_sessions
 *             token (deriveAdminUid above). Plan 06 uses this for `reviewedBy`.
 * On failure: `{ ok: false, status, error }` suitable for direct return to NextResponse.
 */
export async function requireAdmin(
  request: Request,
): Promise<
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string }
> {
  const token = getAdminToken(request);
  if (!token) return { ok: false, status: 401, error: "Admin token required" };
  const valid = await isValidAdminToken(token);
  if (!valid) return { ok: false, status: 401, error: "Invalid or expired admin session" };
  return { ok: true, uid: deriveAdminUid(token) };
}
```

STEP B — Create `src/app/api/ambassador/cohorts/route.ts`. Consume the new `requireAdmin` discriminated-union shape (not a boolean).

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { CohortCreateSchema, type CohortDoc } from "@/types/ambassador";
import { AMBASSADOR_COHORTS_COLLECTION } from "@/lib/ambassador/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("ambassador-cohorts-api");

function featureGate(): NextResponse | null {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/**
 * GET /api/ambassador/cohorts
 * Query: ?scope=open | ?scope=all
 *   - open (default, any signed-in user): returns cohorts with status=upcoming AND applicationWindowOpen=true
 *   - all (admin only): returns every cohort
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") ?? "open";

    let query = db.collection(AMBASSADOR_COHORTS_COLLECTION).orderBy("startDate", "desc");
    if (scope === "open") {
      query = query.where("status", "==", "upcoming").where("applicationWindowOpen", "==", true);
    } else if (scope === "all") {
      const admin = await requireAdmin(request);
      if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const snapshot = await query.get();
    const cohorts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        cohortId: doc.id,
        startDate: data.startDate?.toDate?.() ?? null,
        endDate: data.endDate?.toDate?.() ?? null,
        createdAt: data.createdAt?.toDate?.() ?? null,
        updatedAt: data.updatedAt?.toDate?.() ?? null,
      };
    });
    return NextResponse.json({ cohorts }, { status: 200 });
  } catch (error) {
    log.error("GET /cohorts failed", { error });
    return NextResponse.json({ error: "Failed to fetch cohorts" }, { status: 500 });
  }
}

/**
 * POST /api/ambassador/cohorts — admin only. Creates a new cohort (COHORT-01).
 * Body: CohortCreateSchema.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;

  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const body = await request.json();
    const parsed = CohortCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid cohort payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const now = new Date();
    const newDoc: Omit<CohortDoc, "cohortId"> = {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      maxSize: parsed.data.maxSize,
      acceptedCount: 0,
      status: parsed.data.status,
      applicationWindowOpen: false,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await db.collection(AMBASSADOR_COHORTS_COLLECTION).add(newDoc);
    log.info("Cohort created", { cohortId: ref.id, name: parsed.data.name, by: admin.uid });
    return NextResponse.json({ cohortId: ref.id, ...newDoc }, { status: 201 });
  } catch (error) {
    log.error("POST /cohorts failed", { error });
    return NextResponse.json({ error: "Failed to create cohort" }, { status: 500 });
  }
}
```
  </action>
  <verify>
    <automated>test -f src/app/api/ambassador/cohorts/route.ts && test -f src/lib/ambassador/adminAuth.ts && grep -q "export async function GET" src/app/api/ambassador/cohorts/route.ts && grep -q "export async function POST" src/app/api/ambassador/cohorts/route.ts && grep -q "isAmbassadorProgramEnabled" src/app/api/ambassador/cohorts/route.ts && grep -q "CohortCreateSchema.safeParse" src/app/api/ambassador/cohorts/route.ts && grep -q "requireAdmin" src/app/api/ambassador/cohorts/route.ts && grep -q "ok: true; uid: string" src/lib/ambassador/adminAuth.ts && grep -q "deriveAdminUid" src/lib/ambassador/adminAuth.ts && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/ambassador/cohorts/route.ts` exists
    - File `src/lib/ambassador/adminAuth.ts` exists with exports `isValidAdminToken`, `getAdminToken`, `requireAdmin`
    - `grep -q "ok: true; uid: string" src/lib/ambassador/adminAuth.ts` (return type includes uid — satisfies Plan 06's reviewedBy need)
    - `grep -q "deriveAdminUid" src/lib/ambassador/adminAuth.ts` (uid synthesised from token)
    - `grep -c "^export async function" src/app/api/ambassador/cohorts/route.ts` returns 2 (GET, POST)
    - `grep -q "if (!isAmbassadorProgramEnabled())" src/app/api/ambassador/cohorts/route.ts` (feature gate present — Pitfall 3)
    - `grep -q "!admin.ok" src/app/api/ambassador/cohorts/route.ts` (consumes discriminated-union shape, not a boolean)
    - `grep -q "status: admin.status" src/app/api/ambassador/cohorts/route.ts` (propagates 401)
    - `grep -q "status: 400" src/app/api/ambassador/cohorts/route.ts` (Zod failure path)
    - `grep -q "status: 201" src/app/api/ambassador/cohorts/route.ts` (create success)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    `curl -X GET http://localhost:3000/api/ambassador/cohorts` returns `{cohorts:[]}` when flag is on; returns 404 when flag is off. `curl -X POST -H "x-admin-token: ${valid}" -d '{...}'` creates a cohort. `requireAdmin(request)` in Plans 05, 06, 08 returns `{ ok: true; uid }` on success — Plan 06 uses `admin.uid` as `reviewedBy`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create cohort detail API (GET single + PATCH update)</name>
  <files>src/app/api/ambassador/cohorts/[cohortId]/route.ts</files>
  <read_first>
    - src/app/api/ambassador/cohorts/route.ts (just created — reuse the featureGate pattern and logger)
    - src/types/ambassador.ts (CohortPatchSchema from Plan 01)
    - src/app/api/mentorship/profile/route.ts (existing pattern for dynamic `[id]` params in App Router)
  </read_first>
  <action>
Create `src/app/api/ambassador/cohorts/[cohortId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { isAmbassadorProgramEnabled } from "@/lib/features";
import { requireAdmin } from "@/lib/ambassador/adminAuth";
import { CohortPatchSchema } from "@/types/ambassador";
import { AMBASSADOR_COHORTS_COLLECTION, AMBASSADOR_APPLICATIONS_COLLECTION } from "@/lib/ambassador/constants";
import { createLogger } from "@/lib/logger";

const log = createLogger("ambassador-cohort-detail-api");

function featureGate(): NextResponse | null {
  if (!isAmbassadorProgramEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

interface RouteContext {
  params: Promise<{ cohortId: string }>;
}

/** GET single cohort — admin sees full details + accepted ambassador count (COHORT-03). */
export async function GET(request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;
  try {
    const { cohortId } = await ctx.params;
    const admin = await requireAdmin(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const doc = await db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(cohortId).get();
    if (!doc.exists) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    const data = doc.data()!;

    // COHORT-03: count accepted ambassadors attached to this cohort.
    const acceptedSnap = await db
      .collection(AMBASSADOR_APPLICATIONS_COLLECTION)
      .where("targetCohortId", "==", cohortId)
      .where("status", "==", "accepted")
      .get();

    return NextResponse.json(
      {
        cohort: {
          ...data,
          cohortId: doc.id,
          startDate: data.startDate?.toDate?.() ?? null,
          endDate: data.endDate?.toDate?.() ?? null,
          createdAt: data.createdAt?.toDate?.() ?? null,
          updatedAt: data.updatedAt?.toDate?.() ?? null,
        },
        acceptedAmbassadorCount: acceptedSnap.size,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error("GET /cohorts/[id] failed", { error });
    return NextResponse.json({ error: "Failed to fetch cohort" }, { status: 500 });
  }
}

/** PATCH — admin only. Toggles applicationWindowOpen (COHORT-02) or updates name/status/maxSize. */
export async function PATCH(request: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const gate = featureGate();
  if (gate) return gate;
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { cohortId } = await ctx.params;
    const body = await request.json();
    const parsed = CohortPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid patch payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ref = db.collection(AMBASSADOR_COHORTS_COLLECTION).doc(cohortId);
    const doc = await ref.get();
    if (!doc.exists) return NextResponse.json({ error: "Cohort not found" }, { status: 404 });

    const patch: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    await ref.update(patch);
    log.info("Cohort updated", { cohortId, fields: Object.keys(parsed.data), by: admin.uid });
    return NextResponse.json({ cohortId, ...patch }, { status: 200 });
  } catch (error) {
    log.error("PATCH /cohorts/[id] failed", { error });
    return NextResponse.json({ error: "Failed to update cohort" }, { status: 500 });
  }
}
```
  </action>
  <verify>
    <automated>test -f "src/app/api/ambassador/cohorts/[cohortId]/route.ts" && grep -q "export async function GET" "src/app/api/ambassador/cohorts/[cohortId]/route.ts" && grep -q "export async function PATCH" "src/app/api/ambassador/cohorts/[cohortId]/route.ts" && grep -q "acceptedAmbassadorCount" "src/app/api/ambassador/cohorts/[cohortId]/route.ts" && grep -q "CohortPatchSchema.safeParse" "src/app/api/ambassador/cohorts/[cohortId]/route.ts" && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/api/ambassador/cohorts/[cohortId]/route.ts` exists
    - Exports GET and PATCH (grep returns 2 for `^export async function`)
    - GET returns `acceptedAmbassadorCount` from applications query (COHORT-03 proof)
    - PATCH validates with `CohortPatchSchema.safeParse`
    - Feature gate guards BOTH handlers (grep returns 2 for `if (!isAmbassadorProgramEnabled())`)
    - Admin auth enforced on both handlers (2 occurrences of `requireAdmin(request)`)
    - Both handlers consume the discriminated-union shape (`!admin.ok` / `admin.uid`)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    `curl -X GET /api/ambassador/cohorts/{id}` with admin header returns cohort + acceptedAmbassadorCount. `curl -X PATCH -d '{"applicationWindowOpen":true}'` toggles the window.
  </done>
</task>

<task type="auto">
  <name>Task 3: Build admin cohort panel UI at /admin/ambassadors/cohorts</name>
  <files>src/app/admin/ambassadors/cohorts/page.tsx</files>
  <read_first>
    - src/app/admin/mentors/page.tsx (existing admin list pattern — useState + useEffect + fetch with x-admin-token, DaisyUI table + modal; mirror layout)
    - src/app/admin/ambassadors/layout.tsx (Phase 1 — provides feature-flag gate, AdminAuthGate wrapping is inherited from /admin/layout.tsx)
    - src/contexts/ToastContext.tsx (useToast for success/error)
    - src/components/admin/AdminAuthGate.tsx (ADMIN_TOKEN_KEY constant)
  </read_first>
  <action>
Create `src/app/admin/ambassadors/cohorts/page.tsx` as a client component:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/contexts/ToastContext";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { format } from "date-fns";
import type { CohortDoc, CohortStatus } from "@/types/ambassador";

interface CohortListItem extends CohortDoc {
  cohortId: string;
}

export default function AdminAmbassadorCohortsPage() {
  const toast = useToast();
  const [cohorts, setCohorts] = useState<CohortListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    maxSize: 25,
    status: "upcoming" as CohortStatus,
  });

  const adminHeaders = (): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    return { "Content-Type": "application/json", "x-admin-token": token ?? "" };
  };

  const loadCohorts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ambassador/cohorts?scope=all", { headers: adminHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load cohorts");
      setCohorts(data.cohorts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load cohorts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCohorts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Convert date inputs ("YYYY-MM-DD") to ISO strings for Zod .datetime({ offset: true }).
      const body = {
        name: form.name.trim(),
        startDate: new Date(`${form.startDate}T00:00:00Z`).toISOString(),
        endDate: new Date(`${form.endDate}T00:00:00Z`).toISOString(),
        maxSize: Number(form.maxSize),
        status: form.status,
      };
      const res = await fetch("/api/ambassador/cohorts", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      toast.success("Cohort created");
      setShowCreate(false);
      setForm({ name: "", startDate: "", endDate: "", maxSize: 25, status: "upcoming" });
      loadCohorts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleWindow = async (cohort: CohortListItem) => {
    try {
      const res = await fetch(`/api/ambassador/cohorts/${cohort.cohortId}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ applicationWindowOpen: !cohort.applicationWindowOpen }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Toggle failed");
      toast.success(cohort.applicationWindowOpen ? "Window closed" : "Window opened");
      loadCohorts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Toggle failed");
    }
  };

  const changeStatus = async (cohort: CohortListItem, status: CohortStatus) => {
    try {
      const res = await fetch(`/api/ambassador/cohorts/${cohort.cohortId}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Status change failed");
      toast.success(`Status set to ${status}`);
      loadCohorts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status change failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Ambassador Cohorts</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Cohort
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10"><span className="loading loading-spinner loading-lg" /></div>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No cohorts yet. Create the first one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start</th>
                <th>End</th>
                <th>Size</th>
                <th>Status</th>
                <th>Window</th>
                <th>Ambassadors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohortId}>
                  <td className="font-semibold">{c.name}</td>
                  <td>{c.startDate ? format(new Date(c.startDate), "MMM d, yyyy") : "—"}</td>
                  <td>{c.endDate ? format(new Date(c.endDate), "MMM d, yyyy") : "—"}</td>
                  <td>{c.acceptedCount}/{c.maxSize}</td>
                  <td>
                    <select
                      className="select select-sm select-bordered"
                      value={c.status}
                      onChange={(e) => changeStatus(c, e.target.value as CohortStatus)}
                    >
                      <option value="upcoming">upcoming</option>
                      <option value="active">active</option>
                      <option value="closed">closed</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={c.applicationWindowOpen}
                      onChange={() => toggleWindow(c)}
                    />
                  </td>
                  <td>
                    <Link
                      href={`/admin/ambassadors?cohort=${c.cohortId}&status=accepted`}
                      className="link link-primary"
                    >
                      View ({c.acceptedCount})
                    </Link>
                  </td>
                  <td>
                    <Link href={`/admin/ambassadors?cohort=${c.cohortId}`} className="btn btn-ghost btn-sm">
                      Applications
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Cohort</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Cohort name (e.g., Spring 2026)"
                className="input input-bordered w-full"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={3}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-sm">Start date</label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label text-sm">End date</label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label text-sm">Max size</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="input input-bordered w-full"
                  value={form.maxSize}
                  onChange={(e) => setForm({ ...form, maxSize: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="label text-sm">Status</label>
                <select
                  className="select select-bordered w-full"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as CohortStatus })}
                >
                  <option value="upcoming">upcoming</option>
                  <option value="active">active</option>
                  <option value="closed">closed</option>
                </select>
              </div>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setShowCreate(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => !submitting && setShowCreate(false)} />
        </dialog>
      )}
    </div>
  );
}
```
  </action>
  <verify>
    <automated>test -f src/app/admin/ambassadors/cohorts/page.tsx && grep -q "\"use client\"" src/app/admin/ambassadors/cohorts/page.tsx && grep -q "/api/ambassador/cohorts?scope=all" src/app/admin/ambassadors/cohorts/page.tsx && grep -q "ADMIN_TOKEN_KEY" src/app/admin/ambassadors/cohorts/page.tsx && grep -q "applicationWindowOpen" src/app/admin/ambassadors/cohorts/page.tsx && grep -q "toggle toggle-primary" src/app/admin/ambassadors/cohorts/page.tsx && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - File `src/app/admin/ambassadors/cohorts/page.tsx` exists
    - Starts with `"use client";` directive
    - Contains `fetch("/api/ambassador/cohorts?scope=all"` for listing
    - Contains `fetch(\`/api/ambassador/cohorts/${'${'}c.cohortId${'}'}\`` for PATCH
    - Uses `ADMIN_TOKEN_KEY` for auth header
    - Renders a DaisyUI table with columns: Name, Start, End, Size, Status, Window, Ambassadors, Actions
    - Has a toggle checkbox (`toggle toggle-primary` class) wired to PATCH `applicationWindowOpen`
    - Has a modal (`className="modal modal-open"`) for the create form
    - Links to `/admin/ambassadors?cohort={id}` for viewing applications (forward-compat with Plan 08)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>
    Admin can visit `/admin/ambassadors/cohorts`, create a cohort, toggle its application window, change its status, and click through to see accepted ambassadors. First admin page in the new ambassador admin tree.
  </done>
</task>

</tasks>

<verification>
Manual smoke (done in wave 4 as part of checkpoint):
1. Visit `/admin/ambassadors/cohorts` with admin session — page loads.
2. Click "+ New Cohort", fill form, submit → toast success + row appears.
3. Toggle the window switch → toast success.
4. Change status dropdown → toast success.
5. Verify Firestore: cohort doc exists with acceptedCount=0 and applicationWindowOpen reflecting toggle.
</verification>

<success_criteria>
- `requireAdmin` returns `{ ok: true; uid: string } | { ok: false; status; error }` — Plans 05/06/08 consume this shape
- Cohorts API: GET/POST/GET-detail/PATCH all compile and feature-gated
- Admin cohort panel UI renders, creates cohorts, toggles windows, changes status
- COHORT-03 count flows from applications query to detail endpoint
- No Phase 1 files modified
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-04-SUMMARY.md` documenting:
- API endpoints with request/response shapes
- Admin panel URL + route hierarchy
- Shared admin-auth helper (`src/lib/ambassador/adminAuth.ts`) — used by Plans 05, 06, 08
- Exact `requireAdmin` return type: `{ ok: true; uid: string } | { ok: false; status; error }` — note the uid is synthesised (`admin:` + token prefix), NOT a real Firebase uid
- Note: Plan 06 reads `admin.uid` for the `reviewedBy` audit field on application docs
</output>
</output>
