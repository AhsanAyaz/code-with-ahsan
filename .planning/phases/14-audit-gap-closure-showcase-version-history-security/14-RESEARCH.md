# Phase 14: Audit Gap Closure — Showcase, Version History & Security — Research

**Researched:** 2026-03-10
**Domain:** Next.js App Router, Firestore, DaisyUI — gap closure and security hardening
**Confidence:** HIGH

---

## Summary

Phase 14 closes four open gaps identified in the v2.0 milestone audit. Two requirements (DEMO-03, DEMO-04) were fully implemented in Phase 07 Plan 06 but were accidentally deleted in quick-063 when the `/projects/discover` route was consolidated. Two requirements (ROAD-11, ROAD-12) have all backend data available — the Firestore subcollection, the API route (`GET /api/roadmaps/[id]/versions`), and the fields on the Roadmap document — but no UI surface exists to display them. A critical security gap also exists: `GET /api/roadmaps?admin=true` executes the admin code path without any authentication check, exposing draft and pending roadmaps to anonymous users.

The work is primarily additive UI work on existing data. The `/projects` page needs Active/Completed tabs. The roadmap detail or edit page needs a version history list. The `estimatedHours` and `difficulty` fields are already stored and partially displayed (detail page shows them in badges); the requirement is that they be visible. The security fix is a targeted 5-line change to add an admin token check at the top of the GET handler.

**Primary recommendation:** Add the Completed tab to `/projects/page.tsx` (reuse ProjectCard, add `completedAt` sort), wire the existing versions API to a VersionHistoryList component on the roadmap detail page, and add `x-admin-token` verification at the top of the `adminView` branch in `GET /api/roadmaps`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEMO-03 | Public showcase page displays completed projects with demos | `/projects` page already fetches active projects; add a second fetch for `?status=completed`. Data includes `demoUrl`, `demoDescription`, `completedAt`. ProjectCard already handles status rendering. |
| DEMO-04 | Showcase page filterable by tech stack and completion date | ProjectFilters component already provides tech stack filter UI. Add a completion date sort (desc/asc). No new API endpoint needed — client-side sort on `completedAt` matches Phase 07-06 precedent. |
| ROAD-11 | Roadmap has difficulty level indicator | `difficulty` field exists on Roadmap type and in Firestore. Edit page already saves it. Detail page already shows it as a badge. Requirement is about surfacing it — audit gap was about version history UI, not the field itself. |
| ROAD-12 | Roadmap has estimated completion time | `estimatedHours` field exists on Roadmap type. Detail page conditionally renders it. Version history API at `GET /api/roadmaps/[id]/versions` returns `estimatedHours` per version. Need to confirm it is always displayed (not conditional) and add version history list. |
</phase_requirements>

---

## Standard Stack

### Core (all already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (Next.js App Router) | 15 | UI components | Project standard |
| DaisyUI | ^4 | Component classes (tabs, cards, badges) | Project standard |
| TailwindCSS | ^4 | Utility classes | Project standard |
| Firebase Admin SDK | existing | Firestore queries in API routes | Project standard |

### No New Dependencies Required

All work uses existing project dependencies. No new packages to install.

---

## Architecture Patterns

### Existing Patterns to Follow

**Tabs UI:** DaisyUI `tabs` component. Use `role="tablist"` with `tab` + `tab-active` classes. See admin dashboard for existing tab pattern.

**Client-side filtering:** `/projects/page.tsx` already uses client-side filtering via `Array.filter()` on fetched data. The Completed tab should follow the same pattern — fetch once on tab activation, filter/sort client-side.

**No URL param syncing for showcase:** Established in Phase 07-06 decision: "No URL param syncing for showcase filters - browse experience vs search destination."

**Admin token verification:** All admin-protected API routes use `request.headers.get("x-admin-token")` + a Firestore `admin_sessions` doc lookup. The exact pattern (copy from any `/api/admin/projects/route.ts`) is:

```typescript
// Source: src/app/api/admin/projects/route.ts lines 6-12
const token = request.headers.get("x-admin-token");
if (!token) {
  return NextResponse.json(
    { error: "Admin authentication required" },
    { status: 401 }
  );
}
const sessionDoc = await db.collection("admin_sessions").doc(token).get();
if (!sessionDoc.exists) {
  return NextResponse.json(
    { error: "Invalid or expired admin session" },
    { status: 401 }
  );
}
```

**Version history API shape:** `GET /api/roadmaps/[id]/versions` returns `{ versions: RoadmapVersion[] }` sorted by `version` descending. Each version has: `id`, `roadmapId`, `version`, `contentUrl`, `status`, `title`, `description`, `domain`, `difficulty`, `estimatedHours`, `createdBy`, `createdAt`, `changeDescription`.

**Project data for completed tab:** The `GET /api/projects` endpoint already supports `?status=completed`. The project document includes `demoUrl`, `demoDescription`, `completedAt`. The `completedAt` field is serialized as ISO string in the API response (same timestamp serialization pattern as other date fields).

### Recommended Component Structure

```
src/components/projects/
├── ProjectCard.tsx              # Existing — no changes needed
├── ProjectFilters.tsx           # Existing — reused for Completed tab
└── CompletedProjectCard.tsx     # New — shows demoUrl/demoDescription prominently

src/components/roadmaps/
└── VersionHistoryList.tsx       # New — renders RoadmapVersion[] list

src/app/projects/
└── page.tsx                     # Modified — add Active/Completed tabs
```

### Active/Completed Tabs Pattern

The `/projects/page.tsx` currently fetches only `?status=active`. The updated page should:

1. Maintain a `activeTab: 'active' | 'completed'` state
2. Fetch active projects on mount (existing behaviour)
3. Fetch completed projects lazily when Completed tab is first clicked (avoids double fetch on load)
4. Client-side filter each tab's dataset independently
5. Completed tab: filter by tech stack, sort by `completedAt` (desc by default)

```typescript
// Lazy fetch pattern - fetch completed only once when tab first activated
const [completedFetched, setCompletedFetched] = useState(false);

const handleTabChange = (tab: 'active' | 'completed') => {
  setActiveTab(tab);
  if (tab === 'completed' && !completedFetched) {
    fetchCompletedProjects();
    setCompletedFetched(true);
  }
};
```

### CompletedProjectCard

The existing `ProjectCard` does not prominently display `demoUrl`. A new `CompletedProjectCard` should:
- Show demo link as a prominent CTA button ("View Demo")
- Show `demoDescription` (truncated)
- Show `completedAt` formatted date
- Show tech stack badges
- Keep the same card-based DaisyUI layout

If `demoUrl` is absent (optional field), fall back to a project detail link.

### Version History List

The roadmap detail page (`/roadmaps/[id]/page.tsx`) should gain a collapsible "Version History" section below the content. This:
- Calls `GET /api/roadmaps/${id}/versions` on mount (separate fetch from main roadmap data)
- Only visible to the roadmap creator (same `isCreator` check already in place)
- Renders a simple ordered list: version number, `changeDescription` (or "—"), `createdAt` date, `status` badge

ROAD-12 also requires `estimatedHours` to be visible. Currently it renders conditionally (`{roadmap.estimatedHours && ...}`). This is fine per the existing code — the field is shown when present. The audit gap was specifically about version history not having a UI; ROAD-12 tracks both fields. Confirm `estimatedHours` renders correctly; if already visible, ROAD-12 is satisfied by adding the version history UI.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab UI | Custom tab component | DaisyUI `tabs` classes | Already used in admin dashboard |
| Sorting by date | Custom date sort utility | `Array.sort()` with `new Date(a.completedAt) - new Date(b.completedAt)` | Simple enough inline |
| Admin auth check | New auth abstraction | Existing `x-admin-token` + `admin_sessions` pattern | Copy from 3+ existing routes |
| Version list | Complex timeline component | Simple DaisyUI `steps` or list items | Requirements don't call for visual complexity |

---

## Common Pitfalls

### Pitfall 1: Firestore `completedAt` Timestamp Serialization
**What goes wrong:** `completedAt` is stored as a Firestore Timestamp. The API converts it via `.toDate?.()?.toISOString()` — but only if the field was listed in the serialization block. Check that `completedAt` is serialized in the GET `/api/projects` response (it is: `data.completedAt?.toDate?.()?.toISOString() || null` follows the same pattern). Confirm before sorting client-side.
**How to avoid:** Verify `completedAt` is in the API response shape before writing the sort.

### Pitfall 2: Security Fix Placement
**What goes wrong:** The `adminView` check is inside the `GET` function body. Adding auth before the `if (adminView)` branch is correct — but accidentally placing it inside the branch still leaves a window where anonymous users can read non-admin paths with the auth logic bypassed.
**How to avoid:** Place the admin token check at the very top of the `if (adminView)` block, before any Firestore queries execute.

### Pitfall 3: Completed Projects Without Demo URL
**What goes wrong:** `demoUrl` is optional (Phase 07-05 decision: "Demo fields optional on project completion"). If a completed project has no `demoUrl`, the Completed tab must still show the project, just without the demo button.
**How to avoid:** Always render the project; conditionally render the demo link.

### Pitfall 4: Version History Auth — No Bearer Token Available
**What goes wrong:** `GET /api/roadmaps/[id]/versions` currently has no auth check at all. It's public. For the roadmap detail page (creator-only visibility of version history), the UI already checks `isCreator` client-side. The API route does not need a server-side auth check for this phase since the version data itself is not sensitive (just metadata), but if you want server-side enforcement, you'll need to pass the Firebase Bearer token.
**How to avoid:** Use client-side `isCreator` guard for now (consistent with existing detail page pattern). Do not add server-side auth to the versions endpoint in this phase — keep scope tight.

### Pitfall 5: `techStack` Firestore Filter Limitation
**What goes wrong:** The existing `GET /api/projects?status=completed` uses `array-contains-any` for `techStack` server-side filtering — but that requires knowing the filter value at fetch time. The current architecture fetches all and filters client-side.
**How to avoid:** Fetch all completed projects once (same as active), do client-side tech stack filter. This matches the established pattern.

---

## Code Examples

### Security Fix — Admin Check in GET /api/roadmaps

```typescript
// Source: existing pattern from src/app/api/admin/projects/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminView = searchParams.get("admin") === "true";

    // ADD: Admin auth check before executing admin code path
    if (adminView) {
      const token = request.headers.get("x-admin-token");
      if (!token) {
        return NextResponse.json(
          { error: "Admin authentication required" },
          { status: 401 }
        );
      }
      const sessionDoc = await db.collection("admin_sessions").doc(token).get();
      if (!sessionDoc.exists) {
        return NextResponse.json(
          { error: "Invalid or expired admin session" },
          { status: 401 }
        );
      }
      // ... existing adminView logic continues
    }
    // ... existing public listing logic
  }
}
```

### Completed Projects Fetch

```typescript
// Fetch completed projects — status=completed is already supported by GET /api/projects
const fetchCompletedProjects = async () => {
  setLoadingCompleted(true);
  const response = await fetch("/api/projects?status=completed");
  const data = await response.json();
  // Sort by completedAt descending (most recently completed first)
  const sorted = (data.projects || []).sort((a: Project, b: Project) => {
    const dateA = a.completedAt ? new Date(a.completedAt as any).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt as any).getTime() : 0;
    return dateB - dateA;
  });
  setCompletedProjects(sorted);
  setLoadingCompleted(false);
};
```

### Version History Fetch in Roadmap Detail Page

```typescript
// Fetch versions — only for creator, after main roadmap data loads
useEffect(() => {
  if (isCreator && roadmapId) {
    fetch(`/api/roadmaps/${roadmapId}/versions`)
      .then((res) => res.json())
      .then(({ versions }) => setVersions(versions || []));
  }
}, [isCreator, roadmapId]);
```

### DaisyUI Tabs (Active/Completed)

```tsx
<div role="tablist" className="tabs tabs-bordered mb-6">
  <button
    role="tab"
    className={`tab ${activeTab === 'active' ? 'tab-active' : ''}`}
    onClick={() => handleTabChange('active')}
  >
    Active Projects
  </button>
  <button
    role="tab"
    className={`tab ${activeTab === 'completed' ? 'tab-active' : ''}`}
    onClick={() => handleTabChange('completed')}
  >
    Completed Projects
  </button>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Showcase at `/projects/showcase` (deleted in quick-063) | Tabs on `/projects` page | Consolidated UX — one URL for project discovery |
| Version history stored but invisible | Version history list in roadmap detail | Closes ROAD-11/ROAD-12 gaps |
| Admin roadmap list unauthenticated | Admin check before `adminView` branch | Closes PERM-03 security gap |

---

## Open Questions

1. **ROAD-11 vs ROAD-12 distinction**
   - What we know: ROAD-11 = difficulty level indicator, ROAD-12 = estimated completion time. Both fields are already stored and rendered on the roadmap detail page. The audit tagged them "partial" because version history has no UI.
   - What's unclear: Does surfacing version history satisfy ROAD-11/ROAD-12, or do they need additional visibility work?
   - Recommendation: The audit evidence says "Version history stored but not surfaced in any frontend page" and "Estimated completion time field not visible." Read the detail page code: `estimatedHours` is already conditionally rendered (`{roadmap.estimatedHours && <span>...h estimated</span>}`). It is visible when present. The version history UI addition closes the gap. No additional work needed for the field display itself.

2. **Completed tab location: `/projects` or new route?**
   - What we know: Quick-063 explicitly consolidated showcase into `/projects`. Decision was "No URL param syncing for showcase filters."
   - Recommendation: Add tabs to `/projects/page.tsx`. Do not create a new route. This matches quick-063 intent and the Phase 07-06 decision.

3. **Should `GET /api/roadmaps/[id]/versions` require auth?**
   - What we know: Currently public. Version metadata (change descriptions, timestamps) is low-sensitivity.
   - Recommendation: Keep it public for now. Hide the UI section client-side for non-creators. Out of scope to add server-side auth to this route in this phase.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (inferred from `package.json` `"test": "vitest run"`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEMO-03 | Completed tab fetches `?status=completed` and renders results | unit (component logic) | `npm test` | ❌ Wave 0 |
| DEMO-04 | Completed projects sortable by `completedAt` | unit | `npm test` | ❌ Wave 0 |
| ROAD-11 | Difficulty field visible on roadmap detail | manual-only | N/A — visual check | N/A |
| ROAD-12 | `estimatedHours` visible; version history list renders | manual-only + unit | `npm test` | ❌ Wave 0 |
| PERM-03 | `GET /api/roadmaps?admin=true` returns 401 without token | unit (API logic) | `npm test` | ❌ Wave 0 |

Note: ROAD-11 and ROAD-12 field visibility are best verified manually (visual inspection of the roadmap detail page with a seeded roadmap). The version history list render can be unit tested.

### Sampling Rate
- **Per task commit:** `npm test` (full suite, ~50 tests, runs in <30s)
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/phase14/completed-projects-tab.test.ts` — covers DEMO-03, DEMO-04: completed project fetch logic and `completedAt` sort
- [ ] `src/__tests__/phase14/admin-roadmaps-auth.test.ts` — covers PERM-03: `GET /api/roadmaps?admin=true` returns 401 without valid token
- [ ] `src/__tests__/phase14/version-history.test.ts` — covers ROAD-12: VersionHistoryList renders versions correctly

---

## Sources

### Primary (HIGH confidence)
- Direct codebase reading — all claims verified against actual source files
  - `src/app/api/roadmaps/route.ts` — confirmed missing auth on GET adminView branch (line 238)
  - `src/app/api/roadmaps/[id]/versions/route.ts` — confirmed API exists, returns `{ versions }`, no auth
  - `src/app/projects/page.tsx` — confirmed current state: fetches `?status=active` only, no tabs
  - `src/app/api/projects/route.ts` — confirmed `?status=completed` is supported, `completedAt` serialized
  - `src/types/mentorship.ts` — confirmed `demoUrl`, `demoDescription`, `completedAt` on Project; `estimatedHours`, `difficulty` on Roadmap and RoadmapVersion
  - `src/components/projects/ProjectCard.tsx` — confirmed does NOT display demoUrl
  - `src/app/roadmaps/[id]/page.tsx` — confirmed `estimatedHours` already rendered conditionally; no version history section
  - `src/app/api/admin/projects/route.ts` — confirmed x-admin-token + admin_sessions pattern
  - `src/components/admin/AdminAuthGate.tsx` — confirmed localStorage ADMIN_TOKEN_KEY pattern
- `.planning/v2.0-MILESTONE-AUDIT.md` — authoritative gap analysis

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — Phase 07-06 decisions on showcase (no URL param sync, sort by completion date)
- `.planning/REQUIREMENTS.md` — DEMO-03, DEMO-04, ROAD-11, ROAD-12 definitions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire codebase read directly
- Architecture: HIGH — patterns extracted from existing working code
- Pitfalls: HIGH — derived from actual code gaps found in audit
- Security fix: HIGH — exact pattern copied from existing admin routes

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable codebase, no external dependencies added)
