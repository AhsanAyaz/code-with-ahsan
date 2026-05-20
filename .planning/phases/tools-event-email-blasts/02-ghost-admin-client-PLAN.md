---
phase: tools-event-email-blasts
plan: 02
title: Ghost Admin API client for fetching email-blast drafts
type: execute
wave: 2
depends_on: []
autonomous: true
files_modified:
  - package.json
  - package-lock.json
  - src/lib/ghost/admin.ts
  - src/lib/ghost/__tests__/admin.test.ts
  - .env.example
---

<objective>
Build a lib helper that lists Ghost draft posts tagged with internal tag `#email-blast` and fetches their rendered HTML. Used by the admin blast page (Plan 04) to pick a draft, and by the send API (Plan 05) to pull body HTML at send time.

Why: Non-tech assistant authors blast copy in Ghost (familiar tool, WYSIWYG, image hosting). Drafts stay private (Ghost internal tags hide from blog, draft status means unpublished). Admin API is required — Content API skips drafts.
</objective>

<context>
- Existing Ghost Content API usage: `src/app/api/content/blog/search/route.ts` (env `GHOST_CONTENT_API_KEY`, host `https://blog.codewithahsan.dev`).
- Ghost Admin API docs: https://ghost.org/docs/admin-api/
- SDK: `@tryghost/admin-api` (official, handles JWT signing).
- Env `GHOST_ADMIN_API_KEY` is already in `.env.local` — format is `<id>:<secret>` (colon-separated, signed JWT internally).
- Ghost internal tags use the `#` prefix and are excluded from public-facing tag indexes/pages.
</context>

<tasks>

### Task 1 — Install Ghost Admin SDK

```bash
npm install @tryghost/admin-api
```

Note: `@tryghost/admin-api` ships only CJS as of latest version. Import as default: `import GhostAdminAPI from "@tryghost/admin-api"`. May need types shim — see Task 3.

### Task 2 — Create `src/lib/ghost/admin.ts`

Export:

```typescript
export interface EmailBlastDraft {
  id: string;
  title: string;
  html: string;        // rendered HTML body (Ghost handles styling + images)
  status: "draft" | "published" | "scheduled";
  updatedAt: string;   // ISO
  url: string | null;  // null for drafts
}

export function getGhostAdmin(): GhostAdminAPI | null;
export async function listEmailBlastDrafts(): Promise<EmailBlastDraft[]>;
export async function getDraftHtml(postId: string): Promise<EmailBlastDraft | null>;
```

Implementation:

- `getGhostAdmin()`: lazy-init pattern (mirror `getResendClient()` from Plan 01). Reads `GHOST_ADMIN_API_KEY`. If unset, return null + log warn.
- Host: `process.env.GHOST_ADMIN_URL ?? "https://blog.codewithahsan.dev"`. SDK requires `url` + `key` + `version: "v5.0"`.
- `listEmailBlastDrafts()`: call `admin.posts.browse({ filter: "tag:hash-email-blast+status:draft", limit: 50, formats: ["html"] })`. Ghost internal-tag query syntax uses `hash-` prefix (the `#` in `#email-blast` becomes `hash-` in filters). Map to `EmailBlastDraft[]`.
- `getDraftHtml(postId)`: call `admin.posts.read({ id: postId }, { formats: ["html"] })`. Return mapped object or null on 404.
- All functions log + return null/empty array on API errors (non-throwing for UI consumption).

### Task 3 — Type shim if needed

If `@tryghost/admin-api` has no @types package or is incomplete, add a minimal type stub at `src/types/tryghost-admin-api.d.ts`:

```typescript
declare module "@tryghost/admin-api" {
  interface GhostAdminAPIOptions {
    url: string;
    key: string;
    version: string;
  }
  interface GhostPost {
    id: string;
    title: string;
    html: string;
    status: "draft" | "published" | "scheduled";
    updated_at: string;
    url: string | null;
  }
  class GhostAdminAPI {
    constructor(options: GhostAdminAPIOptions);
    posts: {
      browse(query: Record<string, unknown>): Promise<GhostPost[]>;
      read(query: { id: string }, options?: { formats?: string[] }): Promise<GhostPost>;
    };
  }
  export default GhostAdminAPI;
}
```

Skip this task if the package ships its own types (check `node_modules/@tryghost/admin-api/package.json` for `types` or `typings` field).

### Task 4 — Tests

Create `src/lib/ghost/__tests__/admin.test.ts`:

- Mock `@tryghost/admin-api` constructor — return a fake `admin` object with `posts.browse` + `posts.read`.
- Test: `listEmailBlastDrafts()` returns mapped array; passes correct filter string `tag:hash-email-blast+status:draft`.
- Test: `getDraftHtml("abc")` returns mapped object.
- Test: missing `GHOST_ADMIN_API_KEY` → empty array + warn log; no SDK call.
- Test: SDK rejection → empty array, no throw.

Run: `npx vitest run src/lib/ghost`

### Task 5 — Update `.env.example`

Add under the Ghost Content section (or create new section):

```
# Ghost Admin API key — used to fetch draft posts for email blasts
# Get from: https://blog.codewithahsan.dev/ghost/#/settings/integrations → custom integration
# Format: <id>:<secret>
GHOST_ADMIN_API_KEY=
# Optional override (defaults to https://blog.codewithahsan.dev)
GHOST_ADMIN_URL=
```

### Task 6 — Commit

Commit: `feat(ghost): add Admin API client for email-blast draft fetching`

</tasks>

<verification>
- `npm ls @tryghost/admin-api` returns the package.
- `npx tsc --noEmit` passes.
- `npx vitest run src/lib/ghost` passes all 4 tests.
- `.env.example` documents `GHOST_ADMIN_API_KEY`.
- Smoke (manual, optional): in dev console, `import('@/lib/ghost/admin').then(m => m.listEmailBlastDrafts()).then(console.log)` returns draft array (empty until you create a draft tagged `#email-blast` in Ghost).
</verification>
