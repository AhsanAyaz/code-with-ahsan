---
phase: 01-foundation-roles-array-migration
plan: 02
subsystem: infra
tags: [feature-flag, next-app-router, vercel-env, nav-gating, notFound]

# Dependency graph
requires:
  - phase: 01
    provides: "01-CONTEXT.md decisions D-09/D-10/D-11/D-12 defining env-var flag mechanism and gate behavior"
provides:
  - "isAmbassadorProgramEnabled() single-source-of-truth helper at src/lib/features.ts"
  - "/ambassadors route tree gated via layout.tsx notFound() when flag off"
  - "/admin/ambassadors route tree gated via layout.tsx notFound() when flag off"
  - "Header nav filters Ambassadors entry when NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM is not 'true'"
  - "Footer filters Ambassadors link with same gate"
  - "Documented FEATURE_AMBASSADOR_PROGRAM + NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM env vars (defaults false)"
affects: [phase-02-application-pipeline, phase-03-public-presentation, phase-04-activity, phase-05-dashboard, deploy-1-dual-read-noop-ship]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Env-var feature flag via Next.js server/client env-name split inside a single helper (D-12)"
    - "Route-tree gate at layout.tsx — one flag check 404s the entire subtree"
    - "Nav filtering at data-module scope (bundle-time, not render-time) via process.env.NEXT_PUBLIC_* inline read"

key-files:
  created:
    - "src/lib/features.ts"
    - "src/app/ambassadors/layout.tsx"
    - "src/app/admin/ambassadors/layout.tsx"
  modified:
    - ".env.example"
    - "src/data/headerNavLinks.js"
    - "src/components/Footer.tsx"

key-decisions:
  - "Kept headerNavLinks.js and Footer.tsx reading process.env directly (not via features.ts helper) per the plan: .js module scope + Next.js inlining require literal process.env reference at build time; D-12 exception authorized in plan's Task 3 action block"
  - "Footer Ambassadors link placed first in the /rates /privacy /terms nav block — Footer has no existing Mentorship/Projects links, so plan's 'place next to Mentorship/Projects' is adapted to the only internal-link nav in the Footer"
  - "LayoutWrapper.tsx and MobileNav.tsx left unchanged — both consume headerNavLinks via default export, so filtering flows transparently"

patterns-established:
  - "Feature-flag helper: single exported function reading both server and client env halves with typeof window split"
  - "Route gating: 'import isAmbassadorProgramEnabled + call notFound()' as the 2-line layout.tsx template for any feature-flagged route tree going forward"
  - "Nav data gating: compute AMBASSADORS_ENABLED const at module scope and conditionally build the exported array"

requirements-completed: [ROLE-08]

# Metrics
duration: 3 min
completed: 2026-04-21
---

# Phase 01 Plan 02: Feature flag helper and ambassador route gating Summary

**Single-source feature-flag helper `isAmbassadorProgramEnabled()` plus layout.tsx 404 gates on `/ambassadors` + `/admin/ambassadors` + conditional nav filtering in header/footer — Deploy #1 safe no-op ship with flag defaulting OFF.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-21T21:21:53Z
- **Completed:** 2026-04-21T21:25:03Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 3

## Accomplishments
- Created `src/lib/features.ts` exporting single `isAmbassadorProgramEnabled(): boolean` helper that reads `FEATURE_AMBASSADOR_PROGRAM` on the server and `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM` on the client (split via `typeof window === "undefined"`).
- Added `src/app/ambassadors/layout.tsx` and `src/app/admin/ambassadors/layout.tsx` — each calls `notFound()` when helper returns false, which short-circuits every child page in one place (no per-page gate needed).
- Rewrote `src/data/headerNavLinks.js` to use a `baseNavLinks` array + `AMBASSADORS_ENABLED` constant that inserts the Ambassadors entry between Roadmaps and Courses only when the flag is `"true"`.
- Added conditional `<Link href="/ambassadors">Ambassadors</Link>` to `src/components/Footer.tsx` at the top of the internal-links nav block.
- Appended `FEATURE_AMBASSADOR_PROGRAM=false` + `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=false` defaults to `.env.example` with an explanatory comment block.
- Verified single-helper ownership (D-12): no other files in `src/` read `process.env.FEATURE_AMBASSADOR_PROGRAM` or `process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM` except the three sanctioned files (`features.ts`, `headerNavLinks.js`, `Footer.tsx`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create features.ts helper + document env vars** — `d69b889` (feat)
2. **Task 2: Create /ambassadors + /admin/ambassadors layout.tsx gates** — `bb80b2c` (feat)
3. **Task 3: Filter Ambassadors nav in header + footer** — `b86268f` (swept into parallel agent's 01-01 metadata commit due to parallel-executor race; see Deviations)

## Files Created/Modified

### Created
- `src/lib/features.ts` — `isAmbassadorProgramEnabled()` helper with server/client env split (31 LOC)
- `src/app/ambassadors/layout.tsx` — Public ambassadors route tree gate; 404s via `notFound()` when flag off (19 LOC)
- `src/app/admin/ambassadors/layout.tsx` — Admin-side ambassadors route tree gate; 404s via `notFound()` when flag off (18 LOC)

### Modified
- `.env.example` — Appended v6.0 feature flag section (2 env vars with defaults + comment block, 8 LOC added)
- `src/data/headerNavLinks.js` — Replaced flat `headerNavLinks` array with `baseNavLinks` + `AMBASSADORS_ENABLED` conditional spread (14 LOC changed)
- `src/components/Footer.tsx` — Added conditional `{process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true" && <Link .../>}` in the internal-link nav block (5 LOC added)

### Explicitly NOT Modified
- `src/components/LayoutWrapper.tsx` — consumes `headerNavLinks` via default export; filtering flows transparently
- `src/components/MobileNav.tsx` — same: default-export consumer

## Exact Signatures / Patterns

### `isAmbassadorProgramEnabled()` signature
```typescript
export function isAmbassadorProgramEnabled(): boolean {
  if (typeof window === "undefined") {
    return process.env.FEATURE_AMBASSADOR_PROGRAM === "true";
  }
  return process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true";
}
```

### Layout gate pattern (both files identical in shape)
```typescript
import { notFound } from "next/navigation";
import { isAmbassadorProgramEnabled } from "@/lib/features";

export default function {AmbassadorsLayout|AdminAmbassadorsLayout}({
  children,
}: { children: React.ReactNode }) {
  if (!isAmbassadorProgramEnabled()) { notFound(); }
  return <>{children}</>;
}
```

### headerNavLinks.js filtering pattern
```javascript
const AMBASSADORS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true";

const headerNavLinks = AMBASSADORS_ENABLED
  ? [
      ...baseNavLinks.slice(0, 3),           // Mentorship, Projects, Roadmaps
      { href: "/ambassadors", title: "Ambassadors" },
      ...baseNavLinks.slice(3),              // Courses, Books, Blog, About
    ]
  : baseNavLinks;
```

### Footer.tsx conditional insertion point
Line 24 of `src/components/Footer.tsx` (inside the `<nav className="grid grid-flow-col gap-4">` block that renders `/rates`, `/privacy`, `/terms`):
```tsx
{process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true" && (
  <Link href="/ambassadors" className="link link-hover text-sm">
    Ambassadors
  </Link>
)}
```

## Decisions Made

1. **Footer placement adaptation.** Plan said "place next to Mentorship/Projects links in the footer so the placement is consistent with the header" — but Footer.tsx has no Mentorship/Projects links. Adapted: placed the conditional Ambassadors link first in the only internal-link nav block (the one containing `/rates`, `/privacy`, `/terms`), which is the closest equivalent to "header parity." Alternative considered: creating a new nav section just for Ambassadors — rejected as over-scoped for a single conditional link.

2. **Kept inline `process.env` reads in headerNavLinks.js + Footer.tsx.** Plan explicitly authorized this exception to D-12 for these two files: `headerNavLinks.js` is a `.js` module and the client bundle needs Next.js's literal `process.env.NEXT_PUBLIC_*` substitution at build time. Using the helper here would break the bundle-time inlining. Invariant still holds: helper is the only server-side reader of `FEATURE_AMBASSADOR_PROGRAM`; nav filtering uses the `NEXT_PUBLIC_*` client half.

3. **Single gate per route tree, no per-page gates.** Both layout.tsx files 404 the whole subtree in one check, consistent with D-12's "single point per route tree rather than per-page."

## Deviations from Plan

### Auto-fixed / Race Conditions

**1. [Parallel-executor race — procedural, not code] Task 3 files swept into parallel agent's metadata commit**
- **Found during:** Task 3 commit step (after `git add src/data/headerNavLinks.js src/components/Footer.tsx`)
- **Issue:** Between my staging and my `git commit`, the parallel plan-01 executor agent ran its own metadata `git commit` (`b86268f docs(01-01): complete types-zod-role-schema plan`). That commit's file list included my staged `src/data/headerNavLinks.js` and `src/components/Footer.tsx` — it swept them into the 01-01 commit instead of leaving them for this plan.
- **Fix:** None required on code side — the correct content is committed and present in the working tree. Task 3 commit hash reassigned from a standalone `feat(01-02)` commit to `b86268f` (the scooping commit) in this SUMMARY and in the verification below.
- **Root cause:** Parallel-executor `--no-verify` protocol reduces hook contention but does not coordinate per-plan file scoping. Plans 01 and 02 both wrote to `src/components/Footer.tsx` and nearby — likely a staging race where the other agent's `git commit` reached the index before ours.
- **Files modified:** N/A (attribution issue only; code is correct)
- **Verification:** `git show b86268f --stat` confirms Footer.tsx and headerNavLinks.js are in that commit with the expected LOC counts. `grep -c` verification and `isAmbassadorProgramEnabled` call-site check all pass.
- **Committed in:** b86268f (effective)

---

**Total deviations:** 1 procedural (parallel-executor race during commit step)
**Impact on plan:** No code impact. Commit-hash attribution is split across 01-01 and 01-02 for Task 3, but the 01-02 SUMMARY here documents the true provenance.

## Issues Encountered

- None during implementation. See Deviations above for the parallel-executor commit-attribution race.

## User Setup Required

None — no external service configuration needed. Phase 2 start will flip `FEATURE_AMBASSADOR_PROGRAM=true` + `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=true` in Vercel envs.

## Next Phase Readiness

- Deploy #1 (dual-read types + helpers + flag infrastructure) is content-complete from this plan's side. Flag remains OFF by default; no user-visible change.
- Ready for Phase 1 Wave 2 (plans 03–05) to start building on top of the typed `Role` exports (from plan 01) and the gated routes (from this plan).
- Phase 2 will: (a) flip both Vercel env vars to `"true"`, (b) add `page.tsx` under `src/app/ambassadors/*` and `src/app/admin/ambassadors/*`, (c) introduce the accept-handler claim-sync (`roleMutation` helper).
- No blockers. No concerns.

## Self-Check: PASSED

- [x] `src/lib/features.ts` exists on disk
- [x] `src/app/ambassadors/layout.tsx` exists on disk
- [x] `src/app/admin/ambassadors/layout.tsx` exists on disk
- [x] `.env.example` contains both `FEATURE_AMBASSADOR_PROGRAM=false` and `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=false`
- [x] `src/data/headerNavLinks.js` contains `AMBASSADORS_ENABLED` (2 matches: const + use) and exports default `headerNavLinks` + `MORE_LINKS`
- [x] `src/components/Footer.tsx` contains exactly one `process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true"` conditional
- [x] Commit `d69b889` (Task 1) exists: `git log --oneline | grep d69b889` → found
- [x] Commit `bb80b2c` (Task 2) exists: `git log --oneline | grep bb80b2c` → found
- [x] Commit `b86268f` (Task 3 effective) exists: `git log --oneline | grep b86268f` → found (includes Footer.tsx and headerNavLinks.js per `git show --stat`)
- [x] `isAmbassadorProgramEnabled` is called in exactly two layout files + defined in features.ts (verified via grep)
- [x] No other `process.env.FEATURE_AMBASSADOR_PROGRAM` or `process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM` reads in `src/` beyond the three sanctioned files

---
*Phase: 01-foundation-roles-array-migration*
*Plan: 02*
*Completed: 2026-04-21*
