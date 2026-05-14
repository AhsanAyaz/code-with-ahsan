---
phase: 260508-fvi
plan: 01
subsystem: raffle
tags: [rename, routes, firestore, redirects, admin-ui]
dependency_graph:
  requires: [260507-g81]
  provides: [generic-raffle-routes]
  affects: [firestore.rules, next.config.ts, AdminNavigation]
tech_stack:
  added: []
  patterns: [title-preserved-on-state-transition, git-mv-for-history]
key_files:
  created:
    - src/app/raffle/page.tsx
    - src/app/raffle/RaffleClient.tsx
    - src/app/admin/raffle/page.tsx
    - src/app/admin/raffle/AdminRaffleClient.tsx
    - src/app/api/raffle/entries/route.ts
    - src/app/api/raffle/entries/count/route.ts
    - src/app/api/raffle/spin/route.ts
    - src/app/api/raffle/state/route.ts
  modified:
    - firestore.rules
    - src/components/admin/AdminNavigation.tsx
    - next.config.ts
  deleted:
    - src/app/mas-raffle/MasRaffleClient.tsx (via git mv → RaffleClient.tsx)
    - src/app/mas-raffle/page.tsx (via git mv)
    - src/app/admin/mas-raffle/AdminRaffleClient.tsx (via git mv)
    - src/app/admin/mas-raffle/page.tsx (via git mv)
    - src/app/api/mas-raffle/entries/route.ts (via git mv)
    - src/app/api/mas-raffle/entries/count/route.ts (via git mv)
    - src/app/api/mas-raffle/spin/route.ts (via git mv)
    - src/app/api/mas-raffle/state/route.ts (via git mv)
decisions:
  - "Used git mv to preserve file history through rename"
  - "title preserved on confirm/reset by reading existing Firestore doc before writing"
  - "Admin title input disabled during spinning/winner states, re-enabled after reset"
  - "Legacy mas-raffle-emails and mas-raffle-state Firestore data left in place (out of scope)"
metrics:
  duration: ~10min
  completed: "2026-05-08"
  tasks: 2
  files: 12
---

# Phase 260508-fvi Plan 01: Rename mas-raffle to generic raffle + dynamic title

**One-liner:** Renamed all `mas-raffle` routes/APIs/Firestore collections to generic `raffle` via `git mv`, added admin-set dynamic `title` field visible in all four audience UI states, and wired 301 redirects from old URLs.

## What Was Built

### Title flow (new end-to-end)
1. Admin enters title in `AdminRaffleClient` title input (editable when idle only)
2. `POST /api/raffle/spin { action: "spin", title }` persists title on `raffle-state/current`
3. `confirm` and `reset` actions read the existing doc to preserve title (never clobber)
4. `GET /api/raffle/state` returns `{ state, winnerName, title }`
5. `RaffleClient` calls `setTitle(data.title ?? "Raffle")` on every poll — title chip visible in:
   - **form state**: `<h1>{title}</h1>` (was hard-coded "MAS Raffle")
   - **waiting state**: small gold chip above the pulsing ring
   - **spinning state**: small gold chip above the triple-ring wheel
   - **winner state**: footer line `Code With Ahsan · {title}`

### File renames (git mv — history preserved)
| Old | New |
|-----|-----|
| src/app/mas-raffle/MasRaffleClient.tsx | src/app/raffle/RaffleClient.tsx |
| src/app/mas-raffle/page.tsx | src/app/raffle/page.tsx |
| src/app/admin/mas-raffle/AdminRaffleClient.tsx | src/app/admin/raffle/AdminRaffleClient.tsx |
| src/app/admin/mas-raffle/page.tsx | src/app/admin/raffle/page.tsx |
| src/app/api/mas-raffle/entries/route.ts | src/app/api/raffle/entries/route.ts |
| src/app/api/mas-raffle/entries/count/route.ts | src/app/api/raffle/entries/count/route.ts |
| src/app/api/mas-raffle/spin/route.ts | src/app/api/raffle/spin/route.ts |
| src/app/api/mas-raffle/state/route.ts | src/app/api/raffle/state/route.ts |

### Firestore collection renames
| Old | New |
|-----|-----|
| `mas-raffle-emails` | `raffle-entries` |
| `mas-raffle-state` | `raffle-state` |

### Redirects added to next.config.ts
```ts
{ source: "/mas-raffle", destination: "/raffle", permanent: true },
{ source: "/admin/mas-raffle", destination: "/admin/raffle", permanent: true },
{ source: "/api/mas-raffle/:path*", destination: "/api/raffle/:path*", permanent: true },
```

### Admin navigation
`AdminNavigation.tsx` line 20: `"MAS Raffle"` → `"Raffle"`, href `/admin/mas-raffle` → `/admin/raffle`

### LocalStorage key
`mas-raffle-submitted-{date}` → `raffle-submitted-{date}`

## Deviations from Plan

None — plan executed exactly as written.

## Known Follow-ups (out of scope)

- **Legacy Firestore data**: existing `mas-raffle-emails` and `mas-raffle-state` documents remain in Firestore. They will not appear in the new admin (which queries `raffle-entries`). A one-shot migration script could copy historical entries if needed.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | f05c464 | feat(260508-fvi-01): rename mas-raffle → raffle routes/API/collections + add dynamic title |
| Task 2 | 44bf04e | feat(260508-fvi-01): rename Firestore rules + admin nav + add 301 redirects from old URLs |

## Self-Check: PASSED

- src/app/raffle/page.tsx — FOUND
- src/app/raffle/RaffleClient.tsx — FOUND
- src/app/admin/raffle/AdminRaffleClient.tsx — FOUND
- src/app/api/raffle/spin/route.ts — FOUND
- src/app/mas-raffle — CONFIRMED REMOVED
- src/app/admin/mas-raffle — CONFIRMED REMOVED
- src/app/api/mas-raffle — CONFIRMED REMOVED
- commit f05c464 — FOUND
- commit 44bf04e — FOUND
