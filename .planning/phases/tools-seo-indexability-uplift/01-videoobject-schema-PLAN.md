---
phase: tools-seo-indexability-uplift
plan: 01
title: VideoObject JSON-LD on video posts
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/lib/seo/videoSchema.ts
  - src/app/courses/[course]/[post]/page.tsx
  - src/__tests__/lib/seo/videoSchema.test.ts
---

<objective>
Make every course post with `type: video` emit a Google-compliant `VideoObject` JSON-LD block in addition to the existing `Article` block. Lifts 232 / 233 posts out of "Crawled - currently not indexed" risk + makes them eligible for video rich results (thumbnail, duration, embed in SERP).

Audit rubric currently reports `schema: WARN` for every video post (232 WARNs). This plan closes all 232 in one ship.
</objective>

<context>
Today `src/app/courses/[course]/[post]/page.tsx` builds an `articleLd` object and emits one `<script type="application/ld+json">`. The rendered JSON is `Article` schema regardless of post type.

Post frontmatter shape (verified via `src/content/courses.generated.json`):
- `type: "video" | "article"`
- `videoUrl: "https://www.youtube.com/watch?v=<ID>"` (sometimes with `&t=<seconds>s` or `&list=...`)
- `thumbnail`: rarely set; fall back to `https://img.youtube.com/vi/<ID>/maxresdefault.jpg`
- `publishedAt`: ISO string
- `description`: may be empty (plan 04 fills it)

YouTube ID parsing: handle both `youtube.com/watch?v=ID`, `youtu.be/ID`, and the `&t=` / `?si=` / `&list=` suffixes already in the dataset. `youtu.be/ID` is rare in this dataset but the parser should still cover it for future content.
</context>

<tasks>

## Task 1: Create the schema builder util

`src/lib/seo/videoSchema.ts` exports:

```ts
export function extractYouTubeId(url: string | undefined | null): string | null;

export function buildVideoObjectLd(input: {
  name: string;
  description: string;
  uploadDate: string;            // ISO
  videoUrl: string;              // raw videoUrl from frontmatter
  thumbnailOverride?: string;    // optional, overrides YouTube poster
  pageUrl: string;               // canonical post URL
}): Record<string, unknown> | null;  // null when YouTube ID can't be extracted
```

Rules:
- If `extractYouTubeId` returns null, `buildVideoObjectLd` returns null (caller skips the script tag).
- `embedUrl` = `https://www.youtube.com/embed/<id>`.
- `thumbnailUrl` array: `[thumbnailOverride ?? maxresdefault.jpg, hqdefault.jpg]` (two URLs satisfies Google's recommendation of multiple resolutions).
- `contentUrl` is intentionally OMITTED (we don't host the raw video file; the embedUrl is sufficient per schema.org).
- `@context: "https://schema.org"`, `@type: "VideoObject"`.
- `description`: trim. If empty after trim, return null (a VideoObject without a description is worse than no VideoObject — Google flags it).
- `name`: trim. If empty, return null.

## Task 2: Wire into the post page

In `src/app/courses/[course]/[post]/page.tsx`:

1. Import `buildVideoObjectLd` from `@/lib/seo/videoSchema`.
2. After the existing `articleLd` block, conditionally build `videoLd` when `post.type === "video"` and `post.videoUrl` is truthy.
3. Render a second `<script type="application/ld+json">` only when `videoLd !== null`.
4. Use the same `JSON.stringify` pattern — no `JSON.parse(JSON.stringify(...))` round-trip; build the object inline.

Do NOT touch the existing `articleLd` block. Both can coexist — Google accepts multiple JSON-LD blocks per page.

## Task 3: Tests

`src/__tests__/lib/seo/videoSchema.test.ts` (vitest):

- `extractYouTubeId` cases: `watch?v=`, `youtu.be/`, `embed/`, with `&t=`, with `&list=`, with `?si=`, with `&start=`, missing URL → null, malformed URL → null, URL on a non-YouTube host → null.
- `buildVideoObjectLd`:
  - Happy path: returns object with `@type: "VideoObject"`, `thumbnailUrl` length 2, `embedUrl` shape, `description` preserved, `uploadDate` preserved.
  - Description empty after trim → returns null.
  - Name empty after trim → returns null.
  - `thumbnailOverride` provided → appears as first entry in `thumbnailUrl`.
  - YouTube ID unrecoverable → returns null.

No integration test on the page component — JSON-LD is a string literal; if the builder util is correct and the page calls it on the right branch, the page emits the right output. The audit script will re-baseline schema check on next `npm run audit:seo`.

</tasks>

<verification>

1. `npm run lint` clean.
2. `npx tsc --noEmit` clean.
3. `npm test -- src/__tests__/lib/seo/videoSchema.test.ts` passes.
4. `npm run dev` + `curl -s http://localhost:3000/courses/web-dev-bootcamp/web-development-bootcamp-day-1-5 | grep -c 'application/ld+json'` returns `2`.
5. The second script tag contains `"@type":"VideoObject"` and `"thumbnailUrl":[`.
6. After deploy: paste a course post URL into Google Rich Results Test → `Video` detected, no errors.
7. After `npm run audit:seo`: the `schema` check switches the video post rows from WARN to PASS (rubric in audit-seo.js needs an update — see task 4 below).

## Task 4 (rubric sync)

After tasks 1-3 land, update `scripts/content/audit-seo.js` `checkSchema()` to:
- PASS for `type: video` posts (since they now emit VideoObject).
- Keep WARN as a fallback if we ever introduce a post type we can't classify.

Update `docs/SEO_CONTENT_RUBRIC.md` schema row accordingly.

</verification>
