---
phase: 02-application-subsystem
plan: 08
type: execute
wave: 3
depends_on:
  - "02-01"
  - "02-04"
  - "02-05"
  - "02-06"
files_modified:
  - src/app/admin/ambassadors/page.tsx
  - src/app/admin/ambassadors/ApplicationsList.tsx
  - src/app/admin/ambassadors/[applicationId]/page.tsx
  - src/app/admin/ambassadors/[applicationId]/ApplicationDetail.tsx
  - src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx
  - src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx
  - src/app/admin/ambassadors/[applicationId]/DecisionDialog.tsx
autonomous: true
requirements:
  - REVIEW-01
  - REVIEW-02
  - REVIEW-05
must_haves:
  truths:
    - "Admin can load /admin/ambassadors and see a paginated table of applications with columns: Name, University, Target Cohort, Status, Submitted (D-10)."
    - "Admin can filter by status (submitted / under_review / accepted / declined) and cohort (dropdown) — filters drive URL query params which survive page refresh (D-10)."
    - "Admin can click a row to open /admin/ambassadors/[applicationId] — the detail page (D-09 — first admin detail page in the codebase)."
    - "Detail page fetches GET /api/ambassador/applications/[applicationId] which returns the doc + a 1-hour signed URL for studentIdStoragePath (REVIEW-02)."
    - "Detail page renders video embed per videoEmbedType: react-lite-youtube-embed for YouTube, loom iframe with allowFullScreen, Google Drive /file/d/{id}/preview iframe (D-08, Pitfall 5)."
    - "Detail page shows a Discord warning banner when app.discordMemberId is null OR app.discordRetryNeeded is true, with Retry button that POSTs /api/ambassador/applications/[id]/discord-resolve (REVIEW-05)."
    - "Accept / Decline buttons live on the detail page only (not the list), with an optional reviewer-notes textarea in a dialog before confirming (D-11)."
    - "After Accept: UI updates optimistically to 'accepted', then server response flips the status; if Discord failed, the banner re-renders with the retry button (D-12)."
    - "All pages inherit admin auth from src/app/admin/layout.tsx — no custom auth logic in these files (D-09 uses existing pattern)."
  artifacts:
    - path: "src/app/admin/ambassadors/page.tsx"
      provides: "Server-component shell for the list route; renders ApplicationsList client component"
      min_lines: 20
    - path: "src/app/admin/ambassadors/ApplicationsList.tsx"
      provides: "Client component — fetches GET /api/ambassador/applications with filters + cursor pagination; DaisyUI table"
      min_lines: 160
    - path: "src/app/admin/ambassadors/[applicationId]/page.tsx"
      provides: "Server-component shell for detail route; renders ApplicationDetail client component"
      min_lines: 20
    - path: "src/app/admin/ambassadors/[applicationId]/ApplicationDetail.tsx"
      provides: "Client component — fetches GET /api/ambassador/applications/[id], renders all fields + video embed + discord banner + decision dialog"
      min_lines: 180
    - path: "src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx"
      provides: "VideoEmbed component — switches on videoEmbedType to render YouTube / Loom / Drive embeds (D-08, Pitfall 5)"
      exports:
        - "default (VideoEmbed)"
      min_lines: 60
    - path: "src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx"
      provides: "DiscordBanner — warns when discordMemberId is null or discordRetryNeeded is true; wires Retry button to POST /discord-resolve (REVIEW-05)"
      min_lines: 50
    - path: "src/app/admin/ambassadors/[applicationId]/DecisionDialog.tsx"
      provides: "DaisyUI modal — notes textarea + Accept / Decline buttons; PATCH /api/ambassador/applications/[id] on confirm (REVIEW-03)"
      min_lines: 80
  key_links:
    - from: "src/app/admin/ambassadors/ApplicationsList.tsx"
      to: "/api/ambassador/applications"
      via: "GET with x-admin-token from ADMIN_TOKEN_KEY localStorage + ?status & ?cohortId & ?cursor & ?pageSize query params"
      pattern: "api/ambassador/applications"
    - from: "src/app/admin/ambassadors/[applicationId]/ApplicationDetail.tsx"
      to: "/api/ambassador/applications/[applicationId]"
      via: "GET detail (returns doc + signed student-ID URL)"
      pattern: "api/ambassador/applications/\\$\\{applicationId\\}|api/ambassador/applications/.*applicationId"
    - from: "src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx"
      to: "/api/ambassador/applications/[applicationId]/discord-resolve"
      via: "POST retry (Pitfall 2 fresh resolution)"
      pattern: "discord-resolve"
    - from: "src/app/admin/ambassadors/[applicationId]/DecisionDialog.tsx"
      to: "/api/ambassador/applications/[applicationId]"
      via: "PATCH with body { action, notes }"
      pattern: "method.*PATCH"
    - from: "src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx"
      to: "react-lite-youtube-embed"
      via: "YouTube embed per D-08"
      pattern: "react-lite-youtube-embed"
    - from: "src/app/admin/ambassadors/ApplicationsList.tsx"
      to: "ADMIN_TOKEN_KEY"
      via: "reads admin token from localStorage for x-admin-token header"
      pattern: "ADMIN_TOKEN_KEY"
---

<objective>
Build the admin review surface: list page (REVIEW-01) + detail page (REVIEW-02) + Discord retry banner (REVIEW-05). All admin auth comes from the existing `src/app/admin/layout.tsx` + `AdminAuthGate` — no new auth logic. The detail page is the FIRST admin detail-page pattern in the codebase per D-09; treat the files here as the reference shape for future admin detail pages.

Purpose:
- REVIEW-01: Paginated list with filters (status, cohort, date). Cursor pagination (per Plan 05 GET, Firestore `startAfter`) — not client-side array slicing, because applications can grow to hundreds.
- REVIEW-02: Detail page with video embed + 1-hour signed URL for student-ID photo. The signed URL comes from the GET endpoint (Plan 06), not from client-side generation.
- REVIEW-05: Discord banner + retry wiring to the Plan 06 `/discord-resolve` endpoint.
- D-09 pattern: two files per admin page (shell page.tsx + client component) so admin-layout auth gating is intact for both list and detail.

Output:
- List page at /admin/ambassadors with filters + pagination + click-through to detail.
- Detail page at /admin/ambassadors/[applicationId] with all fields + video + Discord banner + decision dialog.
- Three supporting components (VideoEmbed, DiscordBanner, DecisionDialog).
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
@.planning/phases/02-application-subsystem/02-04-SUMMARY.md
@.planning/phases/02-application-subsystem/02-05-SUMMARY.md
@.planning/phases/02-application-subsystem/02-06-SUMMARY.md

<interfaces>
<!-- Contracts the executor needs — no codebase scavenging required. -->

From @/types/ambassador (Plan 01):
```typescript
export interface ApplicationDoc { /* see RESEARCH.md line 480 */ }
export type ApplicationStatus = "submitted" | "under_review" | "accepted" | "declined";
```

Admin list API (Plan 05 GET /api/ambassador/applications?admin=1):
```typescript
// Headers: { "x-admin-token": token }
// Query: ?status=submitted&cohortId=abc&cursor=docId&pageSize=20
// Response: { items: ApplicationDoc[]; nextCursor: string | null; pageSize: number }
```

Admin detail API (Plan 06 GET /api/ambassador/applications/[id]):
```typescript
// Response: { application: ApplicationDoc & { applicationId: string }; studentIdSignedUrl: string | null }
```

Decision API (Plan 06 PATCH /api/ambassador/applications/[id]):
```typescript
// Body: { action: "accept" | "decline"; notes?: string }
// Accept 200: { success: true; status: "accepted"; alreadyAccepted: boolean; discordAssigned: boolean; discordReason: string | null }
// Decline 200: { success: true; status: "declined" }
// Errors: 400 invalid body, 404 not found, 409 cohort_full / already_declined / etc
```

Discord retry API (Plan 06 POST /api/ambassador/applications/[id]/discord-resolve):
```typescript
// Response (all 200): { success: boolean; resolved: boolean; discordMemberId?: string; reason?: "handle_not_found" | "discord_api_failure"; message?: string }
```

Cohort list API (Plan 04 GET /api/ambassador/cohorts?scope=all):
```typescript
// Admin scope returns ALL cohorts (upcoming + active + closed) for the filter dropdown.
// Response: { items: Array<CohortDoc & { cohortId: string }> }
```

From @/components/admin/AdminAuthGate (existing):
```typescript
export const ADMIN_TOKEN_KEY = "mentorship_admin_token";   // localStorage key
```

From react-lite-youtube-embed (existing dep):
```tsx
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
<LiteYouTubeEmbed id="VIDEO_ID" title="Application video" />
```

From @/lib/ambassador/videoUrl (Plan 02):
```typescript
export function extractYouTubeId(url: string): string | null;
export function extractLoomId(url: string): string | null;
export function extractDriveFileId(url: string): string | null;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: List page with filters + cursor pagination</name>
  <files>src/app/admin/ambassadors/page.tsx, src/app/admin/ambassadors/ApplicationsList.tsx</files>
  <read_first>
    - @src/app/admin/layout.tsx (AdminAuthGate wrapping; already present)
    - @src/app/admin/mentors/page.tsx OR src/app/admin/promptathon/page.tsx (closest existing admin-table pattern — use whichever has the most recent DaisyUI structure)
    - @src/components/admin/AdminAuthGate.tsx (ADMIN_TOKEN_KEY export)
    - @src/types/ambassador.ts (ApplicationDoc, ApplicationStatus)
  </read_first>
  <action>
**File 1: `src/app/admin/ambassadors/page.tsx`** — thin server-component shell.

```typescript
import ApplicationsList from "./ApplicationsList";

// Admin auth + feature gate are inherited from src/app/admin/layout.tsx.
// This page is a server component only for routing; all interactivity is in ApplicationsList.

export const dynamic = "force-dynamic";

export default function AdminAmbassadorsPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ambassador Applications</h1>
          <p className="text-sm opacity-70">Review and decide on applications.</p>
        </div>
        <a href="/admin/ambassadors/cohorts" className="btn btn-outline btn-sm">Manage cohorts</a>
      </header>
      <ApplicationsList />
    </div>
  );
}
```

**File 2: `src/app/admin/ambassadors/ApplicationsList.tsx`** — paginated, filterable client component.

```typescript
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import type { ApplicationDoc, ApplicationStatus } from "@/types/ambassador";

type ApplicationRow = ApplicationDoc & { applicationId: string };
type CohortRow = { cohortId: string; name: string };

const STATUS_OPTIONS: ApplicationStatus[] = ["submitted", "under_review", "accepted", "declined"];
const STATUS_BADGE: Record<ApplicationStatus, string> = {
  submitted: "badge badge-info",
  under_review: "badge badge-warning",
  accepted: "badge badge-success",
  declined: "badge badge-error",
};
const PAGE_SIZE = 20;

function fmtDate(ts: unknown): string {
  if (!ts) return "";
  if (typeof ts === "object" && ts !== null && "_seconds" in (ts as Record<string, unknown>)) {
    return new Date((ts as { _seconds: number })._seconds * 1000).toLocaleDateString();
  }
  if (typeof ts === "string") return new Date(ts).toLocaleDateString();
  return "";
}

export default function ApplicationsList() {
  const router = useRouter();
  const params = useSearchParams();

  const statusFilter = params.get("status") as ApplicationStatus | null;
  const cohortFilter = params.get("cohort");

  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [rows, setRows] = useState<ApplicationRow[] | null>(null);
  const [pages, setPages] = useState<string[]>([]);             // stack of previous cursors for "back"
  const [cursor, setCursor] = useState<string | null>(null);    // current page's cursor arg
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cohort list once for the filter dropdown
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    fetch("/api/ambassador/cohorts?scope=all", { headers: token ? { "x-admin-token": token } : {} })
      .then((r) => r.json())
      .then((b) => setCohorts((b.items ?? []).map((c: CohortRow) => ({ cohortId: c.cohortId, name: c.name }))))
      .catch(() => setCohorts([]));
  }, []);

  const loadPage = useCallback(async (c: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      const url = new URL("/api/ambassador/applications", window.location.origin);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      if (cohortFilter) url.searchParams.set("cohortId", cohortFilter);
      if (c) url.searchParams.set("cursor", c);
      url.searchParams.set("pageSize", String(PAGE_SIZE));
      const res = await fetch(url.toString(), { headers: token ? { "x-admin-token": token } : {} });
      if (!res.ok) { setError(`Failed to load (HTTP ${res.status})`); return; }
      const body = await res.json();
      setRows(body.items ?? []);
      setNextCursor(body.nextCursor ?? null);
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, cohortFilter]);

  // Reload whenever filters change. Reset pagination on filter change.
  useEffect(() => {
    setPages([]);
    setCursor(null);
    loadPage(null);
  }, [loadPage]);

  const setFilter = (k: "status" | "cohort", v: string | null) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (v) next.set(k, v);
    else next.delete(k);
    router.push(`/admin/ambassadors?${next.toString()}`);
  };

  const onNext = () => {
    if (!nextCursor) return;
    setPages((p) => [...p, cursor ?? ""]);
    setCursor(nextCursor);
    loadPage(nextCursor);
  };
  const onPrev = () => {
    if (pages.length === 0) return;
    const prev = pages[pages.length - 1];
    setPages((p) => p.slice(0, -1));
    setCursor(prev || null);
    loadPage(prev || null);
  };

  return (
    <section>
      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select className="select select-bordered select-sm" value={statusFilter ?? ""}
                onChange={(e) => setFilter("status", e.target.value || null)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select select-bordered select-sm" value={cohortFilter ?? ""}
                onChange={(e) => setFilter("cohort", e.target.value || null)}>
          <option value="">All cohorts</option>
          {cohorts.map((c) => <option key={c.cohortId} value={c.cohortId}>{c.name}</option>)}
        </select>
        {(statusFilter || cohortFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => router.push("/admin/ambassadors")}>Clear filters</button>
        )}
      </div>

      {/* Table */}
      {error && <div className="alert alert-error">{error}</div>}
      {loading && <div className="loading loading-spinner" />}
      {!loading && rows && rows.length === 0 && (
        <div className="card bg-base-200 p-6 text-center">
          <p className="opacity-70">No applications match these filters.</p>
        </div>
      )}
      {!loading && rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Name</th>
                <th>University</th>
                <th>Target Cohort</th>
                <th>Status</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.applicationId}>
                  <td>{r.applicantName}</td>
                  <td>{r.university}</td>
                  <td>{cohorts.find((c) => c.cohortId === r.targetCohortId)?.name ?? r.targetCohortId}</td>
                  <td><span className={STATUS_BADGE[r.status]}>{r.status}</span></td>
                  <td>{fmtDate(r.submittedAt)}</td>
                  <td><Link href={`/admin/ambassadors/${r.applicationId}`} className="link link-primary">Review →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <button className="btn btn-sm btn-ghost" disabled={pages.length === 0 || loading} onClick={onPrev}>← Previous</button>
        <button className="btn btn-sm" disabled={!nextCursor || loading} onClick={onNext}>Next →</button>
      </div>
    </section>
  );
}
```

Notes:
- Filters drive URL query params — admin can refresh and keep context.
- Pagination uses a stack of previous cursors for the "back" button, since Firestore cursor pagination is forward-only. "Previous" reuses the remembered cursor (no server-side reverse pagination needed for v1).
- Cohort filter dropdown uses `?scope=all` (Plan 04 admin scope), not `?scope=open`, so declined applications in closed cohorts can still be filtered.
- Table columns match D-10 exactly.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>/admin/ambassadors renders a paginated, filterable table of applications. Filters update URL query params. Cursor pagination (forward) works; back uses a client-side stack.</done>
  <acceptance_criteria>
    - `grep -q "x-admin-token" src/app/admin/ambassadors/ApplicationsList.tsx`
    - `grep -q "ADMIN_TOKEN_KEY" src/app/admin/ambassadors/ApplicationsList.tsx`
    - `grep -q "api/ambassador/applications" src/app/admin/ambassadors/ApplicationsList.tsx`
    - `grep -q "nextCursor" src/app/admin/ambassadors/ApplicationsList.tsx` (cursor pagination)
    - `grep -q "pageSize" src/app/admin/ambassadors/ApplicationsList.tsx`
    - `grep -q "status.*cohort" src/app/admin/ambassadors/ApplicationsList.tsx` OR (`grep -q 'statusFilter' src/app/admin/ambassadors/ApplicationsList.tsx` AND `grep -q 'cohortFilter' src/app/admin/ambassadors/ApplicationsList.tsx`)
    - `grep -cE "<th>" src/app/admin/ambassadors/ApplicationsList.tsx` returns >= 5 (Name, University, Cohort, Status, Submitted)
    - `grep -q 'admin/ambassadors/\${r' src/app/admin/ambassadors/ApplicationsList.tsx` OR `grep -q "admin/ambassadors/.*applicationId" src/app/admin/ambassadors/ApplicationsList.tsx`
    - `grep -q '"use client"' src/app/admin/ambassadors/ApplicationsList.tsx` OR `grep -q "'use client'" src/app/admin/ambassadors/ApplicationsList.tsx`
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Detail page shell + ApplicationDetail client component</name>
  <files>src/app/admin/ambassadors/[applicationId]/page.tsx, src/app/admin/ambassadors/[applicationId]/ApplicationDetail.tsx</files>
  <read_first>
    - @src/app/admin/ambassadors/ApplicationsList.tsx (x-admin-token fetch pattern from Task 1)
    - @src/types/ambassador.ts (ApplicationDoc)
    - @src/components/admin/AdminAuthGate.tsx (ADMIN_TOKEN_KEY)
  </read_first>
  <action>
**File 1: `src/app/admin/ambassadors/[applicationId]/page.tsx`** — server-component shell.

```typescript
import ApplicationDetail from "./ApplicationDetail";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ applicationId: string }> };

export default async function AdminApplicationDetailPage({ params }: RouteParams) {
  const { applicationId } = await params;
  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <nav className="text-sm mb-4">
        <a href="/admin/ambassadors" className="link">← All applications</a>
      </nav>
      <ApplicationDetail applicationId={applicationId} />
    </div>
  );
}
```

**File 2: `src/app/admin/ambassadors/[applicationId]/ApplicationDetail.tsx`** — the detail view.

```typescript
"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import type { ApplicationDoc } from "@/types/ambassador";
import VideoEmbed from "./VideoEmbed";
import DiscordBanner from "./DiscordBanner";
import DecisionDialog from "./DecisionDialog";

type AppRow = ApplicationDoc & { applicationId: string };

function fmtDate(ts: unknown): string {
  if (!ts) return "";
  if (typeof ts === "object" && ts !== null && "_seconds" in (ts as Record<string, unknown>)) {
    return new Date((ts as { _seconds: number })._seconds * 1000).toLocaleString();
  }
  if (typeof ts === "string") return new Date(ts).toLocaleString();
  return "";
}

export default function ApplicationDetail({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [app, setApp] = useState<AppRow | null>(null);
  const [studentIdUrl, setStudentIdUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"accept" | "decline" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      const res = await fetch(`/api/ambassador/applications/${applicationId}`, {
        headers: token ? { "x-admin-token": token } : {},
      });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const body = await res.json();
      setApp(body.application);
      setStudentIdUrl(body.studentIdSignedUrl);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading loading-spinner" />;
  if (error || !app) return <div className="alert alert-error">{error ?? "Not found"}</div>;

  const showDiscordBanner = app.status === "accepted"
    && (app.discordMemberId == null || app.discordRetryNeeded === true || app.discordRoleAssigned !== true);

  return (
    <article className="space-y-6">
      {/* Header: name + status + decision buttons */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{app.applicantName}</h1>
          <p className="opacity-70 text-sm">{app.applicantEmail}</p>
          <p className="opacity-70 text-sm">Submitted {fmtDate(app.submittedAt)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`badge ${app.status === "accepted" ? "badge-success" : app.status === "declined" ? "badge-error" : "badge-info"}`}>
            {app.status}
          </span>
          {app.status !== "accepted" && app.status !== "declined" && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => setDialog("accept")}>Accept</button>
              <button className="btn btn-error btn-sm" onClick={() => setDialog("decline")}>Decline</button>
            </>
          )}
        </div>
      </header>

      {/* REVIEW-05 Discord banner */}
      {showDiscordBanner && (
        <DiscordBanner
          applicationId={app.applicationId}
          discordHandle={app.discordHandle}
          discordMemberId={app.discordMemberId}
          onResolved={load}
        />
      )}

      {/* Basic info */}
      <section className="card bg-base-200">
        <div className="card-body p-4">
          <h2 className="font-semibold">Applicant Details</h2>
          <dl className="grid grid-cols-[min-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-semibold whitespace-nowrap">University</dt><dd>{app.university}</dd>
            <dt className="font-semibold whitespace-nowrap">Year</dt><dd>{app.yearOfStudy}</dd>
            <dt className="font-semibold whitespace-nowrap">Location</dt><dd>{app.city}, {app.country}</dd>
            <dt className="font-semibold whitespace-nowrap">Discord</dt><dd>{app.discordHandle}{app.discordMemberId ? ` (${app.discordMemberId})` : " (unresolved)"}</dd>
            <dt className="font-semibold whitespace-nowrap">Academic</dt>
            <dd>
              {app.academicEmail ? (
                <>
                  {app.academicEmail}{" "}
                  <span className={`badge badge-sm ${app.academicEmailVerified ? "badge-success" : "badge-warning"}`}>
                    {app.academicEmailVerified ? "auto-verified" : "needs manual review"}
                  </span>
                </>
              ) : app.studentIdStoragePath ? (
                <>
                  Student ID uploaded{" "}
                  {studentIdUrl
                    ? <a href={studentIdUrl} target="_blank" rel="noopener noreferrer" className="link link-primary">View photo (signed, expires in 1 hour)</a>
                    : <span className="opacity-60">(signed URL unavailable)</span>}
                </>
              ) : "—"}
            </dd>
          </dl>
        </div>
      </section>

      {/* Prompts */}
      {(["motivation", "experience", "pitch"] as const).map((k, i) => (
        <section key={k} className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <h2 className="font-semibold">Prompt {i + 1}: {k}</h2>
            <p className="whitespace-pre-wrap text-sm">{app[k]}</p>
          </div>
        </section>
      ))}

      {/* Video embed */}
      <section className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <h2 className="font-semibold mb-2">Application Video</h2>
          <VideoEmbed videoUrl={app.videoUrl} videoEmbedType={app.videoEmbedType} />
          <p className="text-xs opacity-60 mt-2 break-all"><a href={app.videoUrl} target="_blank" rel="noopener noreferrer" className="link">{app.videoUrl}</a></p>
        </div>
      </section>

      {/* Reviewer notes (if decided) */}
      {app.reviewerNotes && (
        <section className="card bg-base-200">
          <div className="card-body p-4">
            <h2 className="font-semibold">Reviewer notes</h2>
            <p className="whitespace-pre-wrap text-sm">{app.reviewerNotes}</p>
          </div>
        </section>
      )}

      {/* Decision dialog */}
      {dialog && (
        <DecisionDialog
          applicationId={app.applicationId}
          action={dialog}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); load(); }}
        />
      )}
    </article>
  );
}
```

Notes:
- `showDiscordBanner` surfaces whenever the application is accepted AND Discord isn't cleanly resolved — accepted+retry-needed is exactly REVIEW-05.
- Accept / Decline buttons are ONLY visible for non-final statuses (D-11: buttons on detail page only; once accepted/declined, they disappear).
- Student-ID signed URL comes from the server GET response — never regenerated client-side, and clicking the link opens it with the 1-hour server-issued expiry.
- Reviewer notes section renders only if present; blank on undecided.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>Detail page renders all application fields, video embed, Discord banner (conditionally), student-ID signed-URL link, accept/decline buttons, decision dialog.</done>
  <acceptance_criteria>
    - `grep -q "api/ambassador/applications/\${applicationId}" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx` OR `grep -q 'api/ambassador/applications/.*applicationId' src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -q "x-admin-token" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -q "studentIdSignedUrl" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx` (REVIEW-02)
    - `grep -q "VideoEmbed" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -q "DiscordBanner" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -q "DecisionDialog" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -q "Accept" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -q "Decline" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -q "reviewerNotes" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `grep -cE "(motivation|experience|pitch)" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx` returns >= 3
    - `grep -q '"use client"' src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx` OR `grep -q "'use client'" src/app/admin/ambassadors/\[applicationId\]/ApplicationDetail.tsx`
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 3: VideoEmbed + DiscordBanner + DecisionDialog supporting components</name>
  <files>src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx, src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx, src/app/admin/ambassadors/[applicationId]/DecisionDialog.tsx</files>
  <read_first>
    - @package.json (confirm react-lite-youtube-embed is present at ~3.3.3)
    - @src/lib/ambassador/videoUrl.ts (Plan 02 extractors)
    - @src/components/admin/AdminAuthGate.tsx (ADMIN_TOKEN_KEY)
    - @.planning/phases/02-application-subsystem/02-RESEARCH.md (Pitfall 5 Loom iframe attrs)
  </read_first>
  <action>
**File 1: `src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx`**

```typescript
"use client";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import { extractYouTubeId, extractLoomId, extractDriveFileId } from "@/lib/ambassador/videoUrl";

interface Props {
  videoUrl: string;
  videoEmbedType: "youtube" | "loom" | "drive";
}

export default function VideoEmbed({ videoUrl, videoEmbedType }: Props) {
  if (videoEmbedType === "youtube") {
    const id = extractYouTubeId(videoUrl);
    if (!id) return <FallbackLink url={videoUrl} />;
    return <LiteYouTubeEmbed id={id} title="Application video" />;
  }
  if (videoEmbedType === "loom") {
    const id = extractLoomId(videoUrl);
    if (!id) return <FallbackLink url={videoUrl} />;
    // Pitfall 5: Loom requires allowFullScreen; NO sandbox attribute.
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://www.loom.com/embed/${id}`}
          frameBorder="0"
          allow="fullscreen"
          allowFullScreen
          className="w-full h-full"
          title="Application video"
        />
      </div>
    );
  }
  if (videoEmbedType === "drive") {
    const id = extractDriveFileId(videoUrl);
    if (!id) return <FallbackLink url={videoUrl} />;
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://drive.google.com/file/d/${id}/preview`}
          frameBorder="0"
          allow="autoplay"
          allowFullScreen
          className="w-full h-full"
          title="Application video"
        />
      </div>
    );
  }
  return <FallbackLink url={videoUrl} />;
}

function FallbackLink({ url }: { url: string }) {
  return <a href={url} target="_blank" rel="noopener noreferrer" className="link link-primary break-all">{url}</a>;
}
```

**File 2: `src/app/admin/ambassadors/[applicationId]/DiscordBanner.tsx`**

```typescript
"use client";
import { useState } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

interface Props {
  applicationId: string;
  discordHandle: string;
  discordMemberId: string | null;
  onResolved: () => void;
}

export default function DiscordBanner({ applicationId, discordHandle, discordMemberId, onResolved }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRetry = async () => {
    setBusy(true);
    setResult(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      const res = await fetch(`/api/ambassador/applications/${applicationId}/discord-resolve`, {
        method: "POST",
        headers: token ? { "x-admin-token": token } : {},
      });
      const body = await res.json();
      if (body.success) {
        setResult({ success: true, message: "Discord role assigned." });
      } else if (body.reason === "handle_not_found") {
        setResult({ success: false, message: body.message ?? "Discord handle not found in the server." });
      } else {
        setResult({ success: false, message: "Role assignment failed. Try again in a moment." });
      }
      onResolved();
    } catch {
      setResult({ success: false, message: "Network error." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="alert alert-warning">
      <div className="flex-1">
        <h3 className="font-bold">Discord role pending</h3>
        <p className="text-sm">
          {discordMemberId
            ? `Could not assign the Ambassador Discord role to ${discordHandle} (${discordMemberId}).`
            : `Could not find Discord member "${discordHandle}" in the server.`}
        </p>
        {result && (
          <p className={`text-sm mt-1 ${result.success ? "text-success" : "text-error"}`}>{result.message}</p>
        )}
      </div>
      <button className="btn btn-sm btn-warning" onClick={handleRetry} disabled={busy}>
        {busy ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
```

**File 3: `src/app/admin/ambassadors/[applicationId]/DecisionDialog.tsx`**

```typescript
"use client";
import { useState } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

interface Props {
  applicationId: string;
  action: "accept" | "decline";
  onClose: () => void;
  onDone: () => void;
}

export default function DecisionDialog({ applicationId, action, onClose, onDone }: Props) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = action === "accept" ? "Accept application" : "Decline application";
  const confirmLabel = action === "accept" ? "Confirm accept" : "Confirm decline";
  const confirmClass = action === "accept" ? "btn-success" : "btn-error";

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
      const res = await fetch(`/api/ambassador/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({ action, notes: notes || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = body.error ?? `HTTP ${res.status}`;
        setError(msg === "cohort_full" ? "Cohort is full — cannot accept." : msg);
        return;
      }
      onDone();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="py-2 text-sm opacity-70">
          {action === "accept"
            ? "This will add the Ambassador role, attach to the cohort, and send the acceptance email."
            : "This will decline the application and send the decline email. The student-ID photo will be auto-deleted in 30 days."}
        </p>
        <label className="label"><span className="label-text">Reviewer notes (optional)</span></label>
        <textarea
          className="textarea textarea-bordered w-full h-24"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Share any context that will help (saved with the application)..."
          disabled={busy}
        />
        {error && <div className="alert alert-error mt-2 text-sm">{error}</div>}
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`btn ${confirmClass}`} onClick={handleConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}
```

Notes:
- VideoEmbed trusts `videoEmbedType` from the doc — which was derived server-side in Plan 05. No re-classification needed client-side.
- Pitfall 5: Loom iframe uses `allowFullScreen` + `allow="fullscreen"`, NO `sandbox` attribute.
- DecisionDialog wires REVIEW-03 exactly: single reviewer, optional notes, PATCH action.
- `cohort_full` error gets a human-readable translation; other errors pass through as-is for debuggability.
- DiscordBanner posts to the Plan 06 retry endpoint (Pitfall 2 re-resolution happens server-side).
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx next build 2>&1 | grep -E "(error|Type error)" | head -5</automated>
  </verify>
  <done>VideoEmbed renders YouTube via react-lite-youtube-embed, Loom via iframe with allowFullScreen, Drive via /preview iframe. DiscordBanner retries via POST /discord-resolve. DecisionDialog PATCHes with action + notes.</done>
  <acceptance_criteria>
    - `grep -q "react-lite-youtube-embed" src/app/admin/ambassadors/\[applicationId\]/VideoEmbed.tsx`
    - `grep -q "LiteYouTubeEmbed" src/app/admin/ambassadors/\[applicationId\]/VideoEmbed.tsx`
    - `grep -q "loom.com/embed" src/app/admin/ambassadors/\[applicationId\]/VideoEmbed.tsx`
    - `grep -q "drive.google.com/file/d" src/app/admin/ambassadors/\[applicationId\]/VideoEmbed.tsx`
    - `grep -q "preview" src/app/admin/ambassadors/\[applicationId\]/VideoEmbed.tsx` (Drive iframe path)
    - `grep -q "allowFullScreen" src/app/admin/ambassadors/\[applicationId\]/VideoEmbed.tsx` (Pitfall 5)
    - `grep -q "extractYouTubeId\|extractLoomId\|extractDriveFileId" src/app/admin/ambassadors/\[applicationId\]/VideoEmbed.tsx`
    - `grep -q "discord-resolve" src/app/admin/ambassadors/\[applicationId\]/DiscordBanner.tsx`
    - `grep -q "POST" src/app/admin/ambassadors/\[applicationId\]/DiscordBanner.tsx`
    - `grep -q "x-admin-token" src/app/admin/ambassadors/\[applicationId\]/DiscordBanner.tsx`
    - `grep -q "method.*PATCH" src/app/admin/ambassadors/\[applicationId\]/DecisionDialog.tsx`
    - `grep -q "api/ambassador/applications" src/app/admin/ambassadors/\[applicationId\]/DecisionDialog.tsx`
    - `grep -q "cohort_full" src/app/admin/ambassadors/\[applicationId\]/DecisionDialog.tsx`
    - `grep -q "notes" src/app/admin/ambassadors/\[applicationId\]/DecisionDialog.tsx` (reviewer notes field)
    - All three files contain `"use client"` or `'use client'`
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

</tasks>

<verification>
```bash
npx tsc --noEmit
npx next build 2>&1 | grep -E "(error|Type error)" | head -10
```

Smoke test (requires admin token + seeded applications + feature flag on):
1. Navigate to /admin/ambassadors → see paginated table.
2. Filter by status=submitted → only submitted apps render, URL updates to `?status=submitted`.
3. Click "Review →" on a row → navigate to /admin/ambassadors/{id}.
4. On detail page, video embed renders (YouTube via LiteYouTubeEmbed, or Loom / Drive iframe).
5. Student-ID photo link opens the signed URL.
6. Click Accept → dialog opens → add notes → Confirm → status flips to "accepted". If Discord succeeded, no banner; if failed, banner with Retry appears.
7. Click Retry on banner → POST /discord-resolve → banner updates (success or still-failing message).
8. Click Decline → dialog → Confirm → status flips to "declined".
</verification>

<success_criteria>
- [ ] /admin/ambassadors table renders with 5 D-10 columns + cursor pagination + status/cohort filters.
- [ ] /admin/ambassadors/[id] renders all doc fields, video embed, and (if applicable) signed student-ID URL.
- [ ] VideoEmbed handles YouTube + Loom + Drive per D-08, with Pitfall 5 Loom attribute correctness.
- [ ] DiscordBanner appears only when status=accepted AND Discord isn't cleanly assigned (REVIEW-05).
- [ ] DecisionDialog PATCHes with { action, notes } (REVIEW-03) and surfaces cohort_full errors cleanly.
- [ ] All client components read ADMIN_TOKEN_KEY from localStorage — no hardcoded tokens.
- [ ] `npx tsc --noEmit` passes; `npx next build` succeeds.
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-08-SUMMARY.md` with:
- Component tree (list page + detail page + 3 supporting components)
- How the admin flow chains across endpoints: list fetch → detail fetch (with signed URL) → PATCH accept → (conditional) POST discord-resolve
- Note that this is the reference implementation for future admin detail pages in the codebase (D-09)
- Any deviations from the plan with rationale
</output>
