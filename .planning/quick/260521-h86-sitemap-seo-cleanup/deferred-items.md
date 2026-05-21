# Deferred items — 260521-h86-sitemap-seo-cleanup

Items observed during execution but out of scope for this plan.

## 1. `src/content/{courses,events}.generated.json` drift from MDX source

**Observed:** Running `npm run build` (prebuild → `content:build` + `build:events`)
regenerates `src/content/courses.generated.json` and `src/content/events.generated.json`
with non-trivial content deltas compared to what is committed.

**Cause:** The committed JSON snapshots have drifted from the underlying MDX
source files in `src/data/events/*.mdx` and `src/content/courses/**/*.mdx`. The
MDX was updated by recent commits (`595023d` "improve SEO for all event slugs,
titles, descriptions" and earlier event-content fixes) but the regenerated JSON
indexes were not committed alongside.

**Why deferred:** Out of scope for the sitemap cleanup task. Committing the
regenerated JSON would mix unrelated content updates into this PR. Fixing this
should be a separate `chore` commit that regenerates and commits the index
files (or alternatively, the project should add `*.generated.json` to
`.gitignore` if these files are meant to be build artifacts only).

**Files affected:**
- `src/content/courses.generated.json` — `generatedAt` timestamp drift only.
- `src/content/events.generated.json` — slug, title, description, and body
  updates for all 3 events to match the latest MDX source.

**Impact on this plan:** None. The sitemap correctly reads the freshly
regenerated values at build time, so the runtime sitemap.xml uses the up-to-date
event slugs (`build-ai-travel-agent-adk-gemini-cli-may-2026` etc.) — the same
slugs end users will see in production.

## 2. `npm run build` requires `node_modules` inside the worktree

**Observed:** The Claude Code worktree at
`.claude/worktrees/agent-a4aeae0a/` did not have `node_modules`. The project's
`next.config.ts` sets `turbopack.root: ".."`, which from the worktree resolves
to `.claude/worktrees/` (no `node_modules`). Symlinking from the main repo's
`node_modules` fails because Turbopack rejects symlinks that point outside the
workspace root. A full `npm install` in the worktree is required for builds.

**Why deferred:** Not a project bug — this is a Claude Code worktree
environmental issue. Action taken in this worktree: ran `npm install`
(non-tracked side effect, `node_modules` is gitignored).

## 3. Pre-existing TypeScript errors in `src/components/social-icons/index.tsx`

**Observed:** `npx tsc --noEmit` reports 7 errors about missing SVG module
declarations (e.g., "Cannot find module './mail.svg' or its corresponding type
declarations"). Files: `src/components/social-icons/index.tsx`.

**Why deferred:** Pre-existing, unrelated to sitemap. `next build` still
succeeds (Next handles SVG via `@svgr/webpack` per `next.config.ts`).
