---
quick_id: 260522-b08
phase_target: 05-dashboard-leaderboard-offboarding-alumni
closes_invariant: INV-3 (leaderboard FAIL)
verified: 2026-05-22T08:19:30Z
verified_against_range: bd31ad3..97c410b
executor_commits:
  - 72618c4 test(05-b08): add failing rank + ranks-shape assertions to leaderboard tests
  - 2751159 feat(05-b08): add rank on LeaderboardEntry + rename LeaderboardCategoryRanks keys
  - 7fc616b test(05-b08): add failing route tests for snapshot-read + graceActive + ownRank shape
  - 71d4d5d feat(05-b08): leaderboard route reads daily snapshot doc + emits graceActive + renames ownRank shape
  - f9bd000 feat(05-b08): wire daily leaderboard snapshot cron at 07:00 UTC + update script header
  - 8a890ab feat(05-b08): humanize Updated N ago label + correct phase 5 SUMMARYs to daily cadence
status: passed
score: 8/8 checks passed
result: PASS
---

# Quick 260522-b08 Goal-Backward Verification — Phase 5 INV-3

**Goal:** Close Phase 5 INV-3 (leaderboard FAIL) by aligning the API↔UI contract
(graceActive, rank, ownRank shape), restoring the snapshot pipeline at DAILY
cadence (07:00 UTC), removing the wrong-for-serverless in-memory cache, and
correcting the historically inaccurate Phase 5 SUMMARYs.

---

## 1. INV-3.a — graceActive computed server-side — PASS

**Evidence — `src/app/api/ambassador/dashboard/leaderboard/route.ts:82-84`:**

```ts
const graceActive = data.graceEndDate
  ? Date.now() < Date.parse(data.graceEndDate)
  : false;
```

Field is then emitted in the response payload at `route.ts:101` (`graceActive,`).
UI does not need to compute this client-side — the contract drift documented in
`05-VERIFICATION.md` is closed.

---

## 2. INV-3.b — rank attached to top3 entries — PASS

**Type definition — `src/lib/ambassador/leaderboard.ts:24-35`:**

```ts
export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  count: number;
  rank: number; // line 34
}
```

**Population — `src/lib/ambassador/leaderboard.ts:180-190` (buildWindowCategory):**

```ts
const ranks = rankByCount(entries);
const top3: LeaderboardEntry[] = [...entries]
  .sort((a, b) => b.count - a.count)
  .filter((e) => e.count > 0)
  .slice(0, 3)
  .map((e) => ({ ...e, rank: ranks.get(e.uid) ?? 0 }));
```

**Standard competition ranking (1224) — `src/lib/ambassador/leaderboard.ts:70-88`:**
`rankByCount` implements ties share rank, next rank skips
(verified by existing test at `leaderboard.test.ts:12-23` — counts [10,8,8,5]
→ ranks [1,2,2,4]).

**Cross-check `src/lib/ambassador/leaderboard.test.ts`:**
- `:64-77` — asserts top3 entries carry rank 1, 2, 2 with tie at index 1/2
- `:79-86` — preserves zero-count filter
- `:88-100` — monotonically non-decreasing ranks on 5-entry input
- `:104-115` — `LeaderboardCategoryRanks` accepts `{ referrals, events, reportsOnTime }` shape

`buildWindowCategory` is correctly exported (`leaderboard.ts:180`) so the test
can exercise it in isolation.

---

## 3. INV-3.c — ownRank shape `{ referrals, events, reportsOnTime }` — PASS

**Route extraction — `src/app/api/ambassador/dashboard/leaderboard/route.ts:88-96`:**

```ts
const ownRanks = window.ambassadorRanks?.[ctx.uid];
const ownRank = ownRanks
  ? {
      referrals: ownRanks.referrals,
      events: ownRanks.events,
      reportsOnTime: ownRanks.reportsOnTime,
    }
  : { referrals: null, events: null, reportsOnTime: null };
```

**Library type — `src/lib/ambassador/leaderboard.ts:37-45`:**

```ts
export interface LeaderboardCategoryRanks {
  referrals: number;     // renamed from referralsRank
  events: number;        // renamed from eventsRank
  reportsOnTime: number; // renamed from reportsRank
}
```

Legacy `*Rank` key audit — `grep -rn "referralsRank|eventsRank|reportsRank" src/`
returns no hits in source. Renamed everywhere.

---

## 4. INV-3.d — Daily snapshot pipeline restored — PASS

### Workflow cron — `.github/workflows/ambassador-activity-checks.yml:6`

```yaml
- cron: '0 7 * * *'  # Daily at 07:00 UTC — leaderboard snapshot writer
```

### Workflow job — `.github/workflows/ambassador-activity-checks.yml:89-112`

```yaml
ambassador-leaderboard-snapshot:
  name: Daily leaderboard snapshot (DASH-07)
  ...
  if: |
    (github.event_name == 'schedule' && github.event.schedule == '0 7 * * *') ||
    (github.event_name == 'workflow_dispatch' && github.event.inputs.job == 'leaderboard-snapshot')
  ...
  run: |
    if [ "${{ github.event.inputs.dry_run }}" = "true" ]; then
      npx tsx scripts/ambassador-leaderboard-snapshot.ts --dry-run
    else
      npx tsx scripts/ambassador-leaderboard-snapshot.ts
    fi
```

Firebase-only env block (no Discord secrets — matches Plan 02 decision).
YAML parses cleanly via `npx js-yaml` (exit 0).

### Script header — `scripts/ambassador-leaderboard-snapshot.ts:3-6`

```
* Phase 5 (DASH-07): Daily leaderboard snapshot writer.
*
* Triggered by .github/workflows/ambassador-activity-checks.yml
* (cron '0 7 * * *' daily or workflow_dispatch).
```

"Daily" (not "Hourly"). Body unchanged. Writes to
`leaderboard_snapshots/{cohortId}` via `db.collection(LEADERBOARD_SNAPSHOTS_COLLECTION).doc(cohortId).set(...)`
at `scripts/ambassador-leaderboard-snapshot.ts:63-70` with
`FieldValue.serverTimestamp()` for `updatedAt`.

### Route reads snapshot doc with live fallback —
`src/app/api/ambassador/dashboard/leaderboard/route.ts:62-80`

```ts
const docSnap = await db
  .collection(LEADERBOARD_SNAPSHOTS_COLLECTION)
  .doc(cohortId)
  .get();

let data: LeaderboardSnapshot;
if (docSnap.exists) {
  const raw = docSnap.data() as Record<string, unknown>;
  const updatedAtIso = normalizeTimestamp(raw.updatedAt);
  const graceEndIso = normalizeTimestamp(raw.graceEndDate);
  data = { ...(raw as unknown as LeaderboardSnapshot), updatedAt: updatedAtIso, graceEndDate: graceEndIso };
} else {
  data = await buildLeaderboardSnapshot(cohortId); // first-day fallback
}
```

### Prior 5-min in-memory Map cache removed

`grep -nE "new Map\\(|CACHE_TTL_MS|5 \\* 60 \\* 1000"
src/app/api/ambassador/dashboard/leaderboard/route.ts` matches only
documentation references in the header comment (lines 18-20) acknowledging the
removal. No `Map` instance, no TTL constant, no module-scope cache state remain.

---

## 5. CONSTRAINT — INV-1/2/4 files untouched — PASS

`git diff bd31ad3..97c410b -- <each path>` returns empty (zero diff) for all
seven files:

| File | Diff |
|------|------|
| `src/app/api/ambassador/dashboard/me/route.ts` | (empty) |
| `src/app/api/ambassador/dashboard/me/route.test.ts` | (empty) |
| `src/app/api/ambassador/profile/route.ts` | (empty) |
| `src/app/api/ambassador/profile/route.test.ts` | (empty) |
| `src/types/ambassador.ts` | (empty) |
| `src/app/api/ambassador/members/[uid]/route.ts` | (empty) |
| `src/app/admin/ambassadors/members/[uid]/MemberDetailClient.tsx` | (empty) |

INV-1 (dashboard /me stats), INV-2 (onboarding PATCH), INV-4 (alumni transition
cohortEndDate gap) all remain untouched.

---

## 6. CONSTRAINT — INV-5 (2-strike offboarding) files untouched — PASS

`git diff bd31ad3..97c410b -- <each path>` returns empty for:

| File | Diff |
|------|------|
| `src/app/api/ambassador/members/[uid]/offboard/route.ts` | (empty) |
| `src/app/admin/ambassadors/members/[uid]/OffboardConfirmModal.tsx` | (empty) |

No `src/lib/ambassador/offboard*` helpers exist in the codebase
(`find src/lib/ambassador -iname '*offboard*'` returns no matches), so no
related helpers needed checking. INV-5 (already VERIFIED in 05-VERIFICATION) is
untouched.

---

## 7. Anti-pattern guard — no full `ambassadorRanks` leak — PASS

**Route response shape — `src/app/api/ambassador/dashboard/leaderboard/route.ts:98-111`:**

```ts
return NextResponse.json({
  view,
  cohortId,
  graceActive,
  graceEndDate: data.graceEndDate ?? null,
  month: view === "this_month" ? data.thisMonth.month : null,
  top3: {
    referrals: window.referrals,
    events: window.events,
    reportsOnTime: window.reportsOnTime,
  },
  ownRank,
  updatedAt: data.updatedAt,
});
```

The full `ambassadorRanks` map is NEVER spread or referenced in the response
object. The map is read only at `:89` to extract the current uid's own ranks.

**Test G (anti-pattern guard) — `src/app/api/ambassador/dashboard/leaderboard/route.test.ts:206-217`:**

```ts
it("anti-pattern guard: response JSON does NOT contain ambassadorRanks at any nesting level", async () => {
  snapshotDocState.exists = true;
  snapshotDocState.data = () => makeFixtureSnapshot({ includeOwnUid: "u1" });

  const res = await GET(makeReq());
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).not.toContain("ambassadorRanks");
});
```

Explicit test asserts `ambassadorRanks` substring is absent from the response
body — passes.

---

## 8. Tests + tsc — PASS

### Targeted leaderboard suites

```
$ npx vitest run src/lib/ambassador/leaderboard.test.ts \
                 src/app/api/ambassador/dashboard/leaderboard/route.test.ts

Test Files  2 passed (2)
Tests       20 passed (20)
Duration    354ms
```

- `src/lib/ambassador/leaderboard.test.ts`: 11/11 pass (8 pre-existing
  rankByCount/grace/month tests + 3 new buildWindowCategory rank assertions +
  1 LeaderboardCategoryRanks shape assertion)
- `src/app/api/ambassador/dashboard/leaderboard/route.test.ts`: 9/9 pass
  (3 auth gates + 3 snapshot-present cases + 1 fallback + 1 no-cohort + the
  anti-pattern guard checked above)

### Phase 5 broader suites

```
$ npx vitest run src/app/api/ambassador src/app/admin/ambassadors

Test Files  7 passed (7)
Tests       44 passed (44)
Duration    412ms
```

All ambassador API + admin ambassador UI tests pass — no regressions.

### Full vitest sweep

```
$ npx vitest run
Test Files  1 failed | 30 passed | 2 skipped (33)
Tests       359 passed | 20 skipped | 13 todo (392)
```

Single failure: `src/__tests__/security-rules/firestore.test.ts` —
`TypeError: Cannot read properties of undefined (reading 'cleanup')` from
`testEnv.cleanup()`. **Pre-existing infrastructure issue** (Firestore emulator
not running locally); `git diff bd31ad3..97c410b -- <file>` is empty — quick
260522-b08 did not modify or break this test. Out of scope.

### TypeScript

```
$ npx tsc --noEmit
(no output — exit 0)
```

Zero errors. Renamed `LeaderboardCategoryRanks` keys propagate cleanly through
the route handler; no NEW errors introduced.

### Debt-marker scan

`grep -E "\\bTBD\\b|\\bFIXME\\b|\\bXXX\\b"` on all 7 source/workflow files
modified by this quick returns no matches. Debt-marker gate clean.

---

## Summary

| # | Check | Status |
|---|-------|--------|
| 1 | INV-3.a — graceActive computed server-side | PASS |
| 2 | INV-3.b — rank attached to top3 entries (standard competition) | PASS |
| 3 | INV-3.c — ownRank shape `{ referrals, events, reportsOnTime }` | PASS |
| 4 | INV-3.d — Daily snapshot pipeline restored (cron + script + route + cache removed) | PASS |
| 5 | INV-1/2/4 files untouched (7-file constraint) | PASS |
| 6 | INV-5 files untouched (2-strike offboarding) | PASS |
| 7 | Anti-pattern guard — no `ambassadorRanks` leak (with test) | PASS |
| 8 | Tests (20 targeted + 44 phase-5 broader) + tsc clean | PASS |

Phase 5 INV-3 (leaderboard FAIL) is closed. The UI↔API contract drift is fully
resolved (graceActive emitted, rank on entries, ownRank keys renamed), the
daily 07:00 UTC GitHub Actions cron is wired to the snapshot script writing to
`leaderboard_snapshots/{cohortId}`, the route reads the doc first with a live
`buildLeaderboardSnapshot` fallback for cold-start safety, the 5-min in-memory
Map cache is removed, and no off-limits files (INV-1/2/4/5) were touched.

`05-VERIFICATION.md` can now be re-verified for INV-3; expect it to flip from
FAIL → PASS on the next `/gsd-verify-phase 05` run.

RESULT: PASS
