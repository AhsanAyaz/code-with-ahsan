---
phase: 01-foundation-roles-array-migration
plan: 02
title: Feature flag helper and ambassador route gating
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/features.ts
  - .env.example
  - src/app/ambassadors/layout.tsx
  - src/app/admin/ambassadors/layout.tsx
  - src/data/headerNavLinks.js
  - src/components/Footer.tsx
autonomous: true
requirements:
  - ROLE-08
deploy: "#1 (types + helpers + dual-read; no-op ship — routes stay 404 with flag off)"
must_haves:
  truths:
    - "`/ambassadors`, `/ambassadors/apply`, `/ambassadors/dashboard`, `/admin/ambassadors` return 404 when FEATURE_AMBASSADOR_PROGRAM is unset or not 'true'"
    - "Header nav does not render an Ambassadors link when NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM is off"
    - "Footer does not render an Ambassadors link when NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM is off"
    - "Flipping FEATURE_AMBASSADOR_PROGRAM to 'true' via Vercel env + redeploy makes the four layout gates stop returning notFound()"
  artifacts:
    - path: src/lib/features.ts
      provides: "isAmbassadorProgramEnabled() single helper owning server/client env-name split"
      exports: ["isAmbassadorProgramEnabled"]
    - path: src/app/ambassadors/layout.tsx
      provides: "Flag gate calling notFound() when disabled"
    - path: src/app/admin/ambassadors/layout.tsx
      provides: "Admin-side flag gate calling notFound() when disabled"
    - path: .env.example
      provides: "Documents FEATURE_AMBASSADOR_PROGRAM + NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM defaults"
      contains: "FEATURE_AMBASSADOR_PROGRAM=false"
  key_links:
    - from: "src/app/ambassadors/layout.tsx"
      to: "src/lib/features.ts"
      via: 'import { isAmbassadorProgramEnabled } from "@/lib/features"'
      pattern: "isAmbassadorProgramEnabled\\(\\)"
    - from: "src/data/headerNavLinks.js"
      to: "NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM"
      via: "process.env read at module load"
      pattern: "NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM"
---

<objective>
Create a single source of truth for the ambassador program feature flag via `isAmbassadorProgramEnabled()` in `src/lib/features.ts`, and gate every planned ambassador route tree plus header/footer nav items behind it. With the flag off (default) the four `/ambassadors/*` and `/admin/ambassadors` layouts must call `notFound()` and the nav items must not render.

Purpose: Implements ROLE-08 so Phase 1 can ship the foundation migration without exposing any half-built ambassador feature to real users. Honors D-09 (env-var mechanism), D-10 (404 when off), D-11 (nav filtering), D-12 (single helper).
Output: `src/lib/features.ts`, two new layout files, updated nav data + footer, `.env.example` entries documenting the flag.
Deploy: Part of Deploy #1 (types + helpers + dual-read; ships as no-op because flag stays OFF until Phase 2 opens).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@src/data/headerNavLinks.js
@src/components/Footer.tsx
</context>

<interfaces>
<!-- Existing nav data shape (src/data/headerNavLinks.js) — ES module, default export is an array of {href, title, external?} -->

```javascript
const headerNavLinks = [
  { href: "/mentorship", title: "Mentorship" },
  { href: "/projects", title: "Projects" },
  // ...
];
export default headerNavLinks;
export const MORE_LINKS = [ /* ... */ ];
```

The Next.js 16 App Router convention for per-route-tree gating is a `layout.tsx` at the route tree root that short-circuits with `notFound()`. Children 404 when the layout 404s.

Feature flag decision (from 01-CONTEXT.md D-09/D-10/D-12):
- Server env: `FEATURE_AMBASSADOR_PROGRAM` (string "true"/"false", default "false")
- Client env: `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM` (same string values)
- Single helper in src/lib/features.ts handles the split — callers never read process.env directly.
</interfaces>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create src/lib/features.ts with isAmbassadorProgramEnabled() helper and document env vars in .env.example</name>
  <files>src/lib/features.ts, .env.example</files>
  <read_first>
    - src/lib/features.ts (does not exist yet; verify parent dir src/lib/ is writable)
    - .env.example (read current contents so new lines are appended, not clobbered)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions (D-09, D-10, D-12)
  </read_first>
  <action>
    Create a new file src/lib/features.ts with EXACTLY this content (do not add additional helpers — one helper per D-12):

    ```typescript
    /**
     * Feature flag helpers.
     *
     * Single source of truth for ambassador program feature flag (per D-12 in 01-CONTEXT.md).
     * Callers MUST use this helper — do not read process.env.FEATURE_AMBASSADOR_PROGRAM
     * or process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM directly anywhere else.
     *
     * Decision (D-09): Flag is a Next.js env var, flipped via Vercel redeploy (~30s).
     * Decision (D-10): When disabled, ambassador routes return 404 via notFound().
     */

    /**
     * Returns true if the Student Ambassador Program is enabled in this deployment.
     *
     * Reads:
     *   - Server-side: process.env.FEATURE_AMBASSADOR_PROGRAM
     *   - Client-side: process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM (Next.js inlines at build time)
     *
     * Both must be the string "true" to enable. Any other value (including unset) = disabled.
     *
     * Off by default (per .env.example). Turn on via Vercel env vars at the start of Phase 2.
     */
    export function isAmbassadorProgramEnabled(): boolean {
      if (typeof window === "undefined") {
        // Server: read the server env var
        return process.env.FEATURE_AMBASSADOR_PROGRAM === "true";
      }
      // Client: Next.js inlined NEXT_PUBLIC_* at build time
      return process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true";
    }
    ```

    Then append to .env.example (at the end of the file, preserving all existing entries):

    ```
    # ─── v6.0 Student Ambassador Program feature flag ──────────────
    # Turn on at the start of Phase 2. Requires a redeploy to take effect (~30s).
    # Both server and client halves must be "true" to enable.
    # When unset or any value other than "true", /ambassadors/* and /admin/ambassadors
    # return 404 and the header/footer nav items are filtered out.
    FEATURE_AMBASSADOR_PROGRAM=false
    NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=false
    ```

    Do NOT touch any existing env var in .env.example. Do NOT define the helper as a const or a default export — the plan says `export function` so tests can spy/mock cleanly.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | grep -E "src/lib/features.ts" | head -20 ; grep -c "^FEATURE_AMBASSADOR_PROGRAM=false$" .env.example ; grep -c "^NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=false$" .env.example</automated>
  </verify>
  <acceptance_criteria>
    - `ls src/lib/features.ts` returns a path (file exists)
    - `grep -c "export function isAmbassadorProgramEnabled" src/lib/features.ts` returns `1`
    - `grep -c "typeof window === \"undefined\"" src/lib/features.ts` returns `1` (server/client split is implemented, not a single process.env read)
    - `grep -c "process.env.FEATURE_AMBASSADOR_PROGRAM" src/lib/features.ts` returns `1`
    - `grep -c "process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM" src/lib/features.ts` returns `1`
    - `grep -c "^FEATURE_AMBASSADOR_PROGRAM=false$" .env.example` returns `1`
    - `grep -c "^NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=false$" .env.example` returns `1`
    - `npx tsc --noEmit src/lib/features.ts` compiles without error introduced by this file (errors pre-existing in unrelated files are OK)
  </acceptance_criteria>
  <done>
    src/lib/features.ts exports a single `isAmbassadorProgramEnabled()` function that returns a boolean sourced from server or client env vars depending on runtime. .env.example documents both variables with "false" defaults.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add notFound() gates to /ambassadors and /admin/ambassadors route trees via new layout.tsx files</name>
  <files>src/app/ambassadors/layout.tsx, src/app/admin/ambassadors/layout.tsx</files>
  <read_first>
    - src/lib/features.ts (the helper you just created — will be imported here)
    - src/app/ambassadors/layout.tsx (does NOT exist yet; check parent dir `src/app/ambassadors/` — may not exist either; create directory if needed)
    - src/app/admin/ambassadors/layout.tsx (does NOT exist yet; check parent dir `src/app/admin/ambassadors/` — may not exist either; create directory if needed)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §specifics (flag-check placement in route layouts — "single point per route tree rather than per-page")
  </read_first>
  <action>
    Create BOTH of these files with IDENTICAL gate logic (just different route trees). These are Next.js 16 App Router layout components.

    File: `src/app/ambassadors/layout.tsx`
    ```typescript
    import { notFound } from "next/navigation";
    import { isAmbassadorProgramEnabled } from "@/lib/features";

    /**
     * Route-tree gate for all /ambassadors/* pages (per D-10, D-12 in 01-CONTEXT.md).
     * When FEATURE_AMBASSADOR_PROGRAM is off, this 404s every child page in one shot —
     * no per-page gate needed. Header/footer nav filtering lives in src/data/headerNavLinks.js
     * and src/components/Footer.tsx.
     */
    export default function AmbassadorsLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      if (!isAmbassadorProgramEnabled()) {
        notFound();
      }
      return <>{children}</>;
    }
    ```

    File: `src/app/admin/ambassadors/layout.tsx`
    ```typescript
    import { notFound } from "next/navigation";
    import { isAmbassadorProgramEnabled } from "@/lib/features";

    /**
     * Route-tree gate for all /admin/ambassadors/* pages (per D-10, D-12 in 01-CONTEXT.md).
     * Note: admin auth gating is separate — this layout only enforces the feature flag.
     * Admin session auth continues via the existing admin middleware / per-page pattern.
     */
    export default function AdminAmbassadorsLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      if (!isAmbassadorProgramEnabled()) {
        notFound();
      }
      return <>{children}</>;
    }
    ```

    Do NOT add any `page.tsx` files — this plan creates only the gates. Phase 2 will add the actual pages. With the flag off and no child pages, the /ambassadors root will 404 because Next.js can't find a page.tsx; with the flag on and no page.tsx it still 404s (expected, pages come in Phase 2). The important thing is that the gate triggers FIRST when the flag is off, before Next.js even looks for a page.

    If `src/app/ambassadors/` or `src/app/admin/ambassadors/` directories don't exist, create them. Do NOT put anything else in them besides the layout.tsx.
  </action>
  <verify>
    <automated>ls src/app/ambassadors/layout.tsx src/app/admin/ambassadors/layout.tsx &amp;&amp; npx tsc --noEmit 2>&amp;1 | grep -E "src/app/(admin/)?ambassadors/layout.tsx" | head -20</automated>
  </verify>
  <acceptance_criteria>
    - `ls src/app/ambassadors/layout.tsx` returns the path
    - `ls src/app/admin/ambassadors/layout.tsx` returns the path
    - `grep -c "isAmbassadorProgramEnabled" src/app/ambassadors/layout.tsx` returns `1`
    - `grep -c "notFound" src/app/ambassadors/layout.tsx` returns `2` (one import, one call site)
    - `grep -c "isAmbassadorProgramEnabled" src/app/admin/ambassadors/layout.tsx` returns `1`
    - `grep -c "notFound" src/app/admin/ambassadors/layout.tsx` returns `2` (one import, one call site)
    - `npx tsc --noEmit` reports no NEW errors introduced by these two files (pre-existing errors in other files are OK)
    - No page.tsx or other files created inside `src/app/ambassadors/` or `src/app/admin/ambassadors/` directories (Phase 2 adds those)
  </acceptance_criteria>
  <done>
    Both layout.tsx files exist, import `isAmbassadorProgramEnabled`, call `notFound()` when disabled, and render children otherwise. No page files or extra scaffolding.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Filter Ambassadors nav item from header and footer based on flag</name>
  <files>src/data/headerNavLinks.js, src/components/Footer.tsx</files>
  <read_first>
    - src/data/headerNavLinks.js (current state — read every line; the file is short)
    - src/components/Footer.tsx (read fully to understand how nav items render; pay attention to where any /mentorship or /projects link is rendered so the Ambassadors link can be conditionally added in the same block)
    - src/components/LayoutWrapper.tsx (to confirm where headerNavLinks is consumed — do NOT modify, just inspect)
    - src/components/MobileNav.tsx (to confirm the MobileNav also consumes headerNavLinks — do NOT modify if it just spreads the default export)
    - .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md §decisions D-11
  </read_first>
  <action>
    EDIT `src/data/headerNavLinks.js` to conditionally inject an Ambassadors entry at build time when NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true". Replace the current `const headerNavLinks = [...]` array (lines 8-16) with a build-time-computed array. Do NOT import from src/lib/features.ts here because this is a `.js` file consumed by components that may be server/client — inline the read of process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM so Next.js statically replaces it at build.

    New content for src/data/headerNavLinks.js (replace the whole file content):

    ```javascript
    export const LINKS = {
      ANGULAR_COOKBOOK: "https://ng-cookbook.com",
      DISCORD: "https://discord.gg/KSPpuxD8SG",
    };

    // Base nav items — always visible
    const baseNavLinks = [
      { href: "/mentorship", title: "Mentorship" },
      { href: "/projects", title: "Projects" },
      { href: "/roadmaps", title: "Roadmaps" },
      { href: "/courses", title: "Courses" },
      { href: "/books", title: "Books" },
      { href: "https://blog.codewithahsan.dev/", title: "Blog", external: true },
      { href: "/about", title: "About" },
    ];

    // Feature-flag-gated insertions (per D-11 in .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md).
    // NEXT_PUBLIC_* is inlined by Next.js at build time, so this evaluates at bundle time.
    const AMBASSADORS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true";

    const headerNavLinks = AMBASSADORS_ENABLED
      ? [
          ...baseNavLinks.slice(0, 3), // Mentorship, Projects, Roadmaps
          { href: "/ambassadors", title: "Ambassadors" },
          ...baseNavLinks.slice(3),    // Courses, Books, Blog, About
        ]
      : baseNavLinks;

    // Secondary items — accessible via "More" dropdown or footer
    export const MORE_LINKS = [
      { href: "/events", title: "Events" },
      { href: "/logic-buddy", title: "Logic Buddy" },
      { href: "/community", title: "Community Hub" },
      { href: LINKS.DISCORD, title: "Discord", external: true },
    ];

    export default headerNavLinks;
    ```

    For `src/components/Footer.tsx`: read the file to find where internal links (e.g., /mentorship, /projects) are rendered. In that block, conditionally render an Ambassadors link using the EXACT same pattern — read `process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true"` at module scope OR inline in JSX. Example JSX pattern (adapt to the actual Footer structure):

    ```tsx
    {process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true" &amp;&amp; (
      <Link href="/ambassadors" className="{matching-existing-class}">
        Ambassadors
      </Link>
    )}
    ```

    Place the Ambassadors link next to the Mentorship/Projects links in the footer so the placement is consistent with the header. Keep it commented-minimal — a single conditional JSX expression, not a new subsection.

    Do NOT change any other footer content. Do NOT add any new exports to the footer.

    Do NOT modify `src/components/LayoutWrapper.tsx` or `src/components/MobileNav.tsx` — they import `headerNavLinks` by default export, so the filtering applies automatically.
  </action>
  <verify>
    <automated>grep -c "NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM" src/data/headerNavLinks.js ; grep -c "NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM" src/components/Footer.tsx ; grep -c '"/ambassadors"' src/data/headerNavLinks.js ; grep -c '"/ambassadors"' src/components/Footer.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM" src/data/headerNavLinks.js` returns `1`
    - `grep -c 'href: "/ambassadors"' src/data/headerNavLinks.js` returns `1`
    - `grep -c "AMBASSADORS_ENABLED" src/data/headerNavLinks.js` returns `2` (the const definition and its one use)
    - `grep -c "NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM" src/components/Footer.tsx` returns `1`
    - `grep -c '"/ambassadors"' src/components/Footer.tsx` returns at least `1`
    - `grep -c 'const baseNavLinks' src/data/headerNavLinks.js` returns `1`
    - `grep -c 'export default headerNavLinks' src/data/headerNavLinks.js` returns `1` (the default export is preserved — consumers are unaffected)
    - `grep -c 'export const MORE_LINKS' src/data/headerNavLinks.js` returns `1` (MORE_LINKS export preserved)
    - `npx tsc --noEmit` reports no new type errors in Footer.tsx
    - Manual-ish check: `FEATURE_AMBASSADOR_PROGRAM=false NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM=false npx next build 2>&amp;1 | tail -40` completes without build errors (or, if the project has a specific build command, substitute it; errors unrelated to this change are OK)
  </acceptance_criteria>
  <done>
    Header nav array conditionally includes an Ambassadors entry only when NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM is "true". Footer conditionally renders an Ambassadors link using the same flag. LayoutWrapper and MobileNav need no changes because they spread the default export.
  </done>
</task>

</tasks>

<verification>
- With FEATURE_AMBASSADOR_PROGRAM and NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM unset (the default), visiting `/ambassadors` or `/admin/ambassadors` in dev (`npm run dev`) returns the Next.js 404 page.
- With both env vars set to "true" and a clean Next build, the Ambassadors link appears in the header nav and in the footer; /ambassadors returns a 404 for a different reason (no page.tsx yet — Phase 2 adds pages).
- `npx tsc --noEmit` surfaces no new errors in src/lib/features.ts, src/app/ambassadors/layout.tsx, src/app/admin/ambassadors/layout.tsx, src/components/Footer.tsx.
- `isAmbassadorProgramEnabled` is called from EXACTLY the two new layout files and nowhere else yet (verify with `grep -rn "isAmbassadorProgramEnabled" src/` — only two matches besides src/lib/features.ts itself).
</verification>

<success_criteria>
- [x] src/lib/features.ts exports a single isAmbassadorProgramEnabled() helper with the correct server/client env split
- [x] .env.example documents both FEATURE_AMBASSADOR_PROGRAM and NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM with "false" defaults
- [x] /ambassadors and /admin/ambassadors layouts call notFound() when flag is off
- [x] Header nav and footer conditionally include the Ambassadors link based on NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM
- [x] No other call sites of process.env.FEATURE_AMBASSADOR_PROGRAM exist in the codebase (single-helper ownership per D-12)
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-roles-array-migration/01-02-SUMMARY.md` documenting:
- The exact function signature of isAmbassadorProgramEnabled()
- The two new layout.tsx files + their exact gate logic
- The headerNavLinks.js filtering pattern
- Footer.tsx insertion point (line number of the conditional Ambassadors link)
- Confirmation that LayoutWrapper.tsx and MobileNav.tsx were NOT modified (they consume the default export automatically)
</output>
