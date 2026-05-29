---
phase: tools-seo-indexability-uplift
plan: 02
title: Course + BreadcrumbList JSON-LD
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/lib/seo/courseSchema.ts
  - src/lib/seo/breadcrumbSchema.ts
  - src/app/courses/[course]/page.tsx
  - src/app/courses/[course]/[post]/page.tsx
  - src/__tests__/lib/seo/courseSchema.test.ts
  - src/__tests__/lib/seo/breadcrumbSchema.test.ts
---

<objective>
Add `Course` JSON-LD on `/courses/[slug]` (11 pages) and `BreadcrumbList` JSON-LD on both `/courses/[slug]` and `/courses/[slug]/[post]` (244 pages total). Helps Google understand the site hierarchy + makes courses eligible for course rich-result carousels.

Independent of plan 01 — both can ship in parallel; they touch overlapping files but different concerns, so coordinate via single PR.
</objective>

<context>
- `/courses/[slug]/page.tsx` already exists (used `Read` earlier in the planning). Currently it does NOT emit any JSON-LD.
- `/courses/[slug]/[post]/page.tsx` emits `Article` JSON-LD; plan 01 adds `VideoObject`; this plan adds `BreadcrumbList` (a third script tag).
- Course schema required fields (Google): `name`, `description`, `provider`.
- Recommended: `hasCourseInstance` (we can use `CourseInstance` with `courseMode: "online"` since these are self-paced YouTube series).
- BreadcrumbList: position 1 = "Home" → `/`, position 2 = "Courses" → `/courses`, position 3 = course name → `/courses/<slug>`, (post page) position 4 = post title → `/courses/<slug>/<post>`.
</context>

<tasks>

## Task 1: Course schema util

`src/lib/seo/courseSchema.ts` exports:

```ts
export function buildCourseLd(input: {
  name: string;
  description: string;
  url: string;
  imageUrl?: string;        // course.banner.url
  publishedAt?: string;     // ISO; used for dateCreated
}): Record<string, unknown> | null;
```

Rules:
- Return null if `name.trim()` or `description.trim()` is empty (don't ship a broken Course schema — Google will flag).
- `provider`: hardcoded `{ "@type": "Organization", "name": "Code with Ahsan", "url": "https://www.codewithahsan.dev" }`.
- `hasCourseInstance`: `{ "@type": "CourseInstance", "courseMode": "online", "courseWorkload": "PT1H" }` (placeholder workload; refine later if we capture duration).
- Image: if `imageUrl` truthy, include `image: imageUrl`.

## Task 2: Breadcrumb schema util

`src/lib/seo/breadcrumbSchema.ts` exports:

```ts
export function buildBreadcrumbLd(items: Array<{ name: string; url: string }>): Record<string, unknown>;
```

Returns `BreadcrumbList` with positions 1..N. No null fallback — always returns a valid object (caller controls input).

## Task 3: Wire into `/courses/[slug]/page.tsx`

1. Build `courseLd` (Task 1) — render `<script type="application/ld+json">` if non-null.
2. Build `breadcrumbLd` with 3 items: Home, Courses, course.name.
3. Render the breadcrumb script tag unconditionally.

`generateMetadata` should already exist for this route — verify it sets canonical to `/courses/<slug>` and the OG image to course banner. If not, add it.

## Task 4: Wire into `/courses/[slug]/[post]/page.tsx`

Add breadcrumb with 4 items: Home, Courses, course.name, post.title. Render a third `<script type="application/ld+json">`.

## Task 5: Tests

`src/__tests__/lib/seo/courseSchema.test.ts`:
- Happy path returns full Course object.
- Empty name or description → null.
- imageUrl optional.

`src/__tests__/lib/seo/breadcrumbSchema.test.ts`:
- 3 items → 3-position list.
- 4 items → 4-position list with correct positions.

</tasks>

<verification>

1. `npm run lint` + `npx tsc --noEmit` clean.
2. Unit tests pass.
3. `curl -s http://localhost:3000/courses/web-dev-bootcamp | grep -c 'application/ld+json'` returns ≥ 2 (Course + Breadcrumb).
4. `curl -s http://localhost:3000/courses/web-dev-bootcamp/web-development-bootcamp-day-1-5 | grep -c 'application/ld+json'` returns ≥ 3 (Article + VideoObject from plan 01 + Breadcrumb from this plan).
5. Google Rich Results Test on both URLs detects `Course` + `BreadcrumbList` (+ `Article` + `VideoObject` on post).

</verification>
