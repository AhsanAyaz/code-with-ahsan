---
phase: 260508-fvi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/raffle/page.tsx
  - src/app/raffle/RaffleClient.tsx
  - src/app/admin/raffle/page.tsx
  - src/app/admin/raffle/AdminRaffleClient.tsx
  - src/app/api/raffle/entries/route.ts
  - src/app/api/raffle/entries/count/route.ts
  - src/app/api/raffle/spin/route.ts
  - src/app/api/raffle/state/route.ts
  - src/app/mas-raffle/page.tsx
  - src/app/mas-raffle/MasRaffleClient.tsx
  - src/app/admin/mas-raffle/page.tsx
  - src/app/admin/mas-raffle/AdminRaffleClient.tsx
  - src/app/api/mas-raffle/entries/route.ts
  - src/app/api/mas-raffle/entries/count/route.ts
  - src/app/api/mas-raffle/spin/route.ts
  - src/app/api/mas-raffle/state/route.ts
  - src/components/admin/AdminNavigation.tsx
  - firestore.rules
  - next.config.ts
autonomous: false
requirements: []

must_haves:
  truths:
    - "Visiting /raffle renders the entry form (was /mas-raffle)"
    - "Visiting /admin/raffle renders the admin spin panel (was /admin/mas-raffle)"
    - "Admin enters a title in /admin/raffle before spinning; title persists in raffle-state/current"
    - "Audience page at /raffle displays the dynamic title prominently in all four UI states (form, waiting, spinning, winner)"
    - "All entry POSTs land in raffle-entries collection (was mas-raffle-emails)"
    - "Spin/state writes target raffle-state collection (was mas-raffle-state)"
    - "Old /mas-raffle and /admin/mas-raffle URLs 301-redirect to the new routes (no broken links)"
    - "Old /api/mas-raffle/* endpoints are gone (no orphan routes)"
    - "Firestore rules permit writes to raffle-entries (matching new schema) and reads to raffle-state/current"
    - "Admin navigation link reads 'Raffle' and points to /admin/raffle"
    - "LocalStorage key uses raffle-submitted-{date} prefix"
  artifacts:
    - path: "src/app/raffle/page.tsx"
      provides: "Public raffle route entry"
      contains: "RaffleClient"
    - path: "src/app/raffle/RaffleClient.tsx"
      provides: "Public raffle UI with dynamic title"
      contains: "title"
    - path: "src/app/admin/raffle/page.tsx"
      provides: "Admin raffle route entry"
      contains: "AdminRaffleClient"
    - path: "src/app/admin/raffle/AdminRaffleClient.tsx"
      provides: "Admin spin UI with title input"
      contains: "title"
    - path: "src/app/api/raffle/entries/route.ts"
      provides: "POST entries to raffle-entries"
      contains: "raffle-entries"
    - path: "src/app/api/raffle/entries/count/route.ts"
      provides: "Admin GET count from raffle-entries"
      contains: "raffle-entries"
    - path: "src/app/api/raffle/spin/route.ts"
      provides: "Admin spin/confirm/reset against raffle-state + raffle-entries"
      contains: "raffle-state"
    - path: "src/app/api/raffle/state/route.ts"
      provides: "Public state poll endpoint returning title"
      contains: "title"
    - path: "next.config.ts"
      provides: "301 redirects for old /mas-raffle URLs"
      contains: "/mas-raffle"
    - path: "firestore.rules"
      provides: "Rules for raffle-entries and raffle-state"
      contains: "raffle-entries"
    - path: "src/components/admin/AdminNavigation.tsx"
      provides: "Admin nav link to /admin/raffle"
      contains: "/admin/raffle"
  key_links:
    - from: "src/app/raffle/RaffleClient.tsx"
      to: "/api/raffle/state"
      via: "fetch in setInterval"
      pattern: "/api/raffle/state"
    - from: "src/app/raffle/RaffleClient.tsx"
      to: "/api/raffle/entries"
      via: "fetch POST in handleSubmit"
      pattern: "/api/raffle/entries"
    - from: "src/app/admin/raffle/AdminRaffleClient.tsx"
      to: "/api/raffle/spin"
      via: "fetch POST with action + title"
      pattern: "/api/raffle/spin"
    - from: "src/app/admin/raffle/AdminRaffleClient.tsx"
      to: "/api/raffle/entries/count"
      via: "fetch GET with admin token"
      pattern: "/api/raffle/entries/count"
    - from: "src/app/api/raffle/entries/route.ts"
      to: "raffle-entries collection"
      via: "db.collection('raffle-entries').add"
      pattern: "raffle-entries"
    - from: "src/app/api/raffle/spin/route.ts"
      to: "raffle-state/current"
      via: "db.collection('raffle-state').doc('current')"
      pattern: "raffle-state"
    - from: "next.config.ts"
      to: "/raffle and /admin/raffle"
      via: "redirects() permanent: true"
      pattern: "permanent.*true"
---

<objective>
Rename `mas-raffle` → generic `raffle` everywhere: routes, API paths, Firestore collections, and admin nav. Add a dynamic `title` field that the admin sets before each spin and the audience sees on their page. Old URLs continue to work via 301 redirects so any external links/posters survive.

**Purpose:** The raffle is no longer MAS-specific; future events need their own branding without code changes.
**Output:** New `/raffle` + `/admin/raffle` route trees, `raffle-entries` + `raffle-state` collections, dynamic title rendered in all UI states, redirects from old paths.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260507-g81-mas-raffle-page-with-entry-form-real-tim/260507-g81-SUMMARY.md

<interfaces>
<!-- Existing shapes the executor inherits. Renames only — no contract changes
     except `title` is added end-to-end. -->

Existing raffle-state doc shape (becomes raffle-state/current):
```ts
{
  state: "idle" | "spinning" | "winner";
  winnerName: string | null;
  date: string;          // YYYY-MM-DD UTC
  updatedAt: Timestamp;
  // NEW:
  title: string;         // e.g., "MAS Raffle", "Code With Ahsan Conf 2026"
}
```

Existing raffle-entries doc shape (becomes raffle-entries/{auto-id}):
```ts
{
  name: string;
  email: string;        // lowercased
  newsletter: boolean;
  date: string;         // YYYY-MM-DD UTC
  submittedAt: Timestamp;
  won?: boolean;
  wonAt?: Timestamp;
}
```

Public GET /api/raffle/state response (NEW shape — title added):
```ts
{ state: "idle" | "spinning" | "winner"; winnerName: string | null; title: string }
```

Admin POST /api/raffle/spin body shapes:
```ts
// NEW: title required on spin
{ action: "spin"; title: string }
{ action: "confirm"; winnerName: string; docId: string }
{ action: "reset" }   // unchanged — title is preserved on raffle-state/current
```

Admin auth header (unchanged): `x-admin-token: <token>` via `requireAdmin(request)` from `@/lib/ambassador/adminAuth`.

LocalStorage key (renamed): `raffle-submitted-${YYYY-MM-DD}`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create new /raffle and /admin/raffle route trees with title support, then delete mas-raffle originals</name>
  <files>
    src/app/raffle/page.tsx,
    src/app/raffle/RaffleClient.tsx,
    src/app/admin/raffle/page.tsx,
    src/app/admin/raffle/AdminRaffleClient.tsx,
    src/app/api/raffle/entries/route.ts,
    src/app/api/raffle/entries/count/route.ts,
    src/app/api/raffle/spin/route.ts,
    src/app/api/raffle/state/route.ts,
    src/app/mas-raffle/page.tsx (DELETE),
    src/app/mas-raffle/MasRaffleClient.tsx (DELETE),
    src/app/admin/mas-raffle/page.tsx (DELETE),
    src/app/admin/mas-raffle/AdminRaffleClient.tsx (DELETE),
    src/app/api/mas-raffle/entries/route.ts (DELETE),
    src/app/api/mas-raffle/entries/count/route.ts (DELETE),
    src/app/api/mas-raffle/spin/route.ts (DELETE),
    src/app/api/mas-raffle/state/route.ts (DELETE)
  </files>
  <action>
**Approach:** Use `git mv` so history follows files. Then edit content in-place. Finally delete the now-empty `mas-raffle` directories.

**Step A — Move files:**
```bash
git mv src/app/mas-raffle src/app/raffle
git mv src/app/admin/mas-raffle src/app/admin/raffle
git mv src/app/api/mas-raffle src/app/api/raffle
git mv src/app/raffle/MasRaffleClient.tsx src/app/raffle/RaffleClient.tsx
```
(Component file under `src/app/admin/raffle/AdminRaffleClient.tsx` keeps its name.)

**Step B — Edit each file. Apply ALL of these:**

1. **src/app/raffle/page.tsx**
   - Update import: `import { RaffleClient } from "./RaffleClient";`
   - Update component name: `MasRafflePage` → `RafflePage`
   - JSX: `<MasRaffleClient />` → `<RaffleClient />`

2. **src/app/raffle/RaffleClient.tsx**
   - Rename exported function `MasRaffleClient` → `RaffleClient`
   - Add `title` to `RaffleState` interface: `title: string`
   - Add state: `const [title, setTitle] = useState<string>("Raffle");`
   - In `applyRaffleState`, accept `data.title` and call `setTitle(data.title ?? "Raffle")` (always — even on idle, so the page reflects whatever is saved)
   - In `pollState`, change URL: `/api/mas-raffle/state` → `/api/raffle/state`
   - In `handleSubmit`, change URL: `/api/mas-raffle/entries` → `/api/raffle/entries`
   - Replace `getTodayKey()` body: `mas-raffle-submitted-` → `raffle-submitted-`
   - **Title rendering — appears in ALL FOUR ui states:**
     - **form state:** Replace the hard-coded `<h1>MAS Raffle</h1>` (line 178-ish) with `<h1 ...>{title}</h1>`. The subtitle `"Code With Ahsan · Conference Draw"` becomes `"Code With Ahsan"` (drop conference-specific text — title carries the event name now).
     - **winner state footer:** Replace `"Code With Ahsan · MAS Raffle"` (line 453-ish) with `{`Code With Ahsan · ${title}`}`.
     - **waiting state:** Above the existing ring/copy, add a small chip showing the title:
       ```tsx
       <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(251,191,36,0.6)" }}>
         {title}
       </p>
       ```
       Place it as the first child inside the inner flex column (before the pulsing ring).
     - **spinning state:** Add the same title chip as the first child of the inner flex column (before the triple-ring wheel), using the same styling as in the waiting state.
   - Document title is already DOM-only; do NOT touch `<head>` here (Next.js `metadata` lives in `page.tsx` if needed — leave alone, dynamic.).

3. **src/app/admin/raffle/page.tsx**
   - Component name: `AdminRafflePage` (already fine — keep).
   - Import path stays `./AdminRaffleClient` (no change).

4. **src/app/admin/raffle/AdminRaffleClient.tsx**
   - Add to `RaffleState` interface: `title: string`.
   - Add state: `const [title, setTitle] = useState<string>("Raffle");` near the other useState calls.
   - In `pollRaffleState`, set title from response: `setTitle(data.title ?? "Raffle")`. (Keeps admin in sync if title was set elsewhere.)
   - In `fetchEntryCount`, change URL: `/api/mas-raffle/entries/count` → `/api/raffle/entries/count`.
   - In `handleSpin`, change URL: `/api/mas-raffle/spin` → `/api/raffle/spin` (both fetch calls).
   - In the **first** spin fetch (action: "spin"), include `title` in the body: `body: JSON.stringify({ action: "spin", title: title.trim() || "Raffle" })`.
   - In `handleReset`, change URL: `/api/mas-raffle/spin` → `/api/raffle/spin`.
   - **UI:** Replace the header text `"MAS Raffle — Admin"` with `"Raffle — Admin"`.
   - **Title input:** Add a labeled input control above the entry-count stat. The input is editable when state is `idle` and disabled while `spinning` or showing `winner` (re-enabled after Reset). Sketch:
     ```tsx
     <div className="form-control">
       <label className="label" htmlFor="raffle-title">
         <span className="label-text font-semibold">Raffle Title</span>
       </label>
       <input
         id="raffle-title"
         type="text"
         className="input input-bordered"
         placeholder="e.g., MAS Raffle, AI Summit Draw"
         value={title}
         onChange={(e) => setTitle(e.target.value)}
         disabled={spinning || currentState !== "idle"}
         maxLength={80}
       />
       <label className="label">
         <span className="label-text-alt opacity-60">
           Shown to the audience. Defaults to “Raffle” if left empty.
         </span>
       </label>
     </div>
     ```
   - **Spin button gating:** Replace `canSpin` with `!spinning && currentState === "idle" && (entryCount ?? 0) > 0`. (Strict idle gate — prevents double-spinning during winner reveal.)

5. **src/app/api/raffle/entries/route.ts**
   - Replace `db.collection("mas-raffle-emails")` → `db.collection("raffle-entries")`.
   - Update both log prefixes: `[mas-raffle/entries]` → `[raffle/entries]`.

6. **src/app/api/raffle/entries/count/route.ts**
   - Replace `db.collection("mas-raffle-emails")` → `db.collection("raffle-entries")`.
   - Update log prefix: `[mas-raffle/entries/count]` → `[raffle/entries/count]`.

7. **src/app/api/raffle/spin/route.ts**
   - Replace ALL three of:
     - `db.collection("mas-raffle-state").doc("current")` → `db.collection("raffle-state").doc("current")`
     - `db.collection("mas-raffle-emails")` (occurs in spin + confirm branches) → `db.collection("raffle-entries")`
   - Update log prefix: `[mas-raffle/spin]` → `[raffle/spin]`.
   - **SPIN branch:** Read `title` from body. Validate: if missing/empty, default to `"Raffle"`. Persist `title` on the `stateRef.set(...)` payload alongside `state: "spinning"`.
   - **CONFIRM branch:** When writing the winner state, **read existing doc to preserve title**:
     ```ts
     const existing = await stateRef.get();
     const existingTitle = (existing.exists && (existing.data()?.title as string | undefined)) ?? "Raffle";
     await stateRef.set({
       state: "winner",
       winnerName,
       date: today,
       updatedAt: FieldValue.serverTimestamp(),
       title: existingTitle,
     });
     ```
   - **RESET branch:** Same preservation pattern — read existing title, write `state: "idle"` with the existing title preserved (never clobber to default — admin may want to spin again with the same event title).

8. **src/app/api/raffle/state/route.ts**
   - Replace `db.collection("mas-raffle-state").doc("current")` → `db.collection("raffle-state").doc("current")`.
   - Update both log prefix and the no-doc fallback to include `title: "Raffle"` and pass through `data.title ?? "Raffle"` in the populated response.
   - Final response shape: `{ state, winnerName, title }`.

**Step C — Final cleanup:**
After edits, confirm `src/app/mas-raffle/`, `src/app/admin/mas-raffle/`, and `src/app/api/mas-raffle/` no longer exist (the `git mv` did this). If any stragglers remain, `git rm -r` them.

**Step D — Sanity grep:**
```bash
rg "mas-raffle|MasRaffle|MasRaffleClient" src/ --type ts --type tsx
```
Must return zero matches in `src/`. If anything appears, fix it before stopping.
  </action>
  <verify>
    <automated>npm run lint && npx tsc --noEmit && npm run build 2>&1 | tail -40</automated>
  </verify>
  <done>
    - All 8 production files exist under src/app/raffle/, src/app/admin/raffle/, src/app/api/raffle/.
    - All 6 mas-raffle directories removed from src/.
    - `rg "mas-raffle|MasRaffleClient" src/` returns zero hits.
    - Lint + tsc + build pass.
    - Title input present in admin UI; title rendered in all four audience UI states.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Firestore rules, admin nav, and add 301 redirects from old paths</name>
  <files>firestore.rules, src/components/admin/AdminNavigation.tsx, next.config.ts</files>
  <action>
**1. firestore.rules** — rename two collection matchers.

Replace this block (around lines 271-280):
```
match /mas-raffle-emails/{entryId} {
  allow create: if request.resource.data.keys().hasAll(["name","email","newsletter","date","submittedAt"])
                && request.resource.data.name is string
                && request.resource.data.email is string
                && request.resource.data.newsletter is bool
                && request.resource.data.date is string;
  allow read, update, delete: if false;
}
```
with:
```
match /raffle-entries/{entryId} {
  allow create: if request.resource.data.keys().hasAll(["name","email","newsletter","date","submittedAt"])
                && request.resource.data.name is string
                && request.resource.data.email is string
                && request.resource.data.newsletter is bool
                && request.resource.data.date is string;
  allow read, update, delete: if false;
}
```

Replace this block (around lines 282-288):
```
match /mas-raffle-state/{docId} {
  allow read: if docId == "current";
  allow write: if false;
}
```
with:
```
match /raffle-state/{docId} {
  allow read: if docId == "current";
  allow write: if false;
}
```

Update the comment headers on those two blocks: change `MAS Raffle Entries` → `Raffle Entries` and `MAS Raffle State` → `Raffle State`.

**2. src/components/admin/AdminNavigation.tsx** — line 20:
Change:
```ts
{ label: "MAS Raffle", href: "/admin/mas-raffle", exact: false },
```
to:
```ts
{ label: "Raffle", href: "/admin/raffle", exact: false },
```

**3. next.config.ts** — add 301 redirects.

Read the existing `next.config.ts`. It already has a `redirects()` array (per recent commit `e405711` adding the `/how-to-gde-urdu` redirect). Append the following entries to that array (do NOT replace existing ones):
```ts
{ source: "/mas-raffle", destination: "/raffle", permanent: true },
{ source: "/admin/mas-raffle", destination: "/admin/raffle", permanent: true },
{ source: "/api/mas-raffle/:path*", destination: "/api/raffle/:path*", permanent: true },
```

If `next.config.ts` does not yet have a `redirects` function, add one in the standard Next.js shape:
```ts
async redirects() {
  return [
    // ...any existing entries...
    { source: "/mas-raffle", destination: "/raffle", permanent: true },
    { source: "/admin/mas-raffle", destination: "/admin/raffle", permanent: true },
    { source: "/api/mas-raffle/:path*", destination: "/api/raffle/:path*", permanent: true },
  ];
}
```

(Note: 308 is Next.js's default for `permanent: true` and is the modern HTTP-spec equivalent of 301 — both signal “permanent move” and are SEO-equivalent. The user's request for "301" is satisfied by `permanent: true`.)
  </action>
  <verify>
    <automated>npx firebase emulators:exec --only firestore "echo rules-ok" 2>&1 | tail -20 || npm run lint</automated>
  </verify>
  <done>
    - firestore.rules has `match /raffle-entries/...` and `match /raffle-state/...` and zero `mas-raffle-` matchers.
    - AdminNavigation shows "Raffle" → /admin/raffle.
    - next.config.ts contains all three redirect entries.
    - `rg "mas-raffle" firestore.rules src/components next.config.ts` returns zero hits.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Renamed all `mas-raffle` routes/APIs/collections to generic `raffle`, added a dynamic title (admin sets, audience sees), wired 301 redirects from the old URLs, and rewrote Firestore rules + admin nav.
  </what-built>
  <how-to-verify>
    1. **Dev server up:** `npm run dev` (or already running). No console errors at boot.
    2. **Public page (new URL):** Visit http://localhost:3000/raffle.
       - Form state: title shows "Raffle" by default (or whatever was last set).
       - Submit a test entry — should land in `raffle-entries` collection in Firestore (verify in Firebase console / emulator UI).
       - LocalStorage now has key `raffle-submitted-YYYY-MM-DD`. Old `mas-raffle-submitted-*` key is harmless if it lingers.
    3. **Old public URL redirects:** Visit http://localhost:3000/mas-raffle. Browser ends up at `/raffle`. (Network tab shows 308 from Next.js — equivalent to 301.)
    4. **Admin page (new URL):** Visit http://localhost:3000/admin/raffle.
       - Auth gate works (admin token).
       - Header reads "Raffle — Admin".
       - **Title input visible.** Enter "AI Summit 2026" and click Spin.
       - Spinning state on the public `/raffle` tab now shows "AI Summit 2026" chip above the wheel.
       - Winner state shows the same title in the footer.
       - Reset → title is preserved on admin form (input still shows "AI Summit 2026"), public page form state shows "AI Summit 2026" too.
    5. **Old admin URL redirects:** http://localhost:3000/admin/mas-raffle → ends at `/admin/raffle`.
    6. **Old API redirects:** `curl -i http://localhost:3000/api/mas-raffle/state` → 308 with `Location: /api/raffle/state`.
    7. **AdminNavigation:** The top-level nav link reads "Raffle" (not "MAS Raffle") and is highlighted when on `/admin/raffle`.
    8. **Firestore rules deploy (optional but recommended before shipping):** `firebase deploy --only firestore:rules`.
    9. **Sanity grep one more time:** `rg "mas-raffle|MasRaffle" src/ next.config.ts firestore.rules` returns zero hits.
  </how-to-verify>
  <resume-signal>Type "approved" if all 9 checks pass. Report any failures (URL, observed vs expected) and I'll fix.</resume-signal>
</task>

</tasks>

<verification>
- `rg "mas-raffle|MasRaffle|MasRaffleClient" src/ next.config.ts firestore.rules` → 0 hits
- `npm run lint && npx tsc --noEmit && npm run build` passes
- Public page at /raffle works: submit entry, see waiting state, see title in all four states
- Admin page at /admin/raffle works: title input editable when idle, disabled during spin/winner, persisted across reset
- Old URLs (/mas-raffle, /admin/mas-raffle, /api/mas-raffle/*) all redirect (308) to new paths
- Firestore writes land in `raffle-entries` and `raffle-state` collections; old collections receive zero new writes from the app (legacy docs, if any, are left in place — out of scope for this rename)
</verification>

<success_criteria>
1. Zero references to `mas-raffle` or `MasRaffleClient` in `src/`, `firestore.rules`, or `next.config.ts`.
2. Build + lint + tsc all clean.
3. Manual checkpoint passes: title visible in all 4 audience states, admin input gates spin correctly, redirects work.
4. Firestore rules permit raffle-entries creation and raffle-state/current reads; deny everything else.
</success_criteria>

<output>
After completion, create `.planning/quick/260508-fvi-rename-mas-raffle-to-generic-raffle/260508-fvi-SUMMARY.md` capturing:
- Files moved (git mv preserved history)
- New title flow (admin input → POST /api/raffle/spin → raffle-state/current.title → GET /api/raffle/state → all 4 audience UI states)
- Redirect entries added to next.config.ts
- Firestore rules collections renamed
- Any deviations or follow-ups (e.g., legacy `mas-raffle-emails`/`mas-raffle-state` Firestore data left in place — requires a one-shot migration script if historical entries need to surface in the new admin)
</output>
