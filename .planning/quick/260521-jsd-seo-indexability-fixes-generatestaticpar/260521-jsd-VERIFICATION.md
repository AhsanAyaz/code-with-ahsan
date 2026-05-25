---
quick_id: 260521-jsd
verified: 2026-05-21T13:05:00Z
status: passed
overall_verdict: PASS
mode: validate
score: 7/7 tracks verified
---

# Verification Report — Quick 260521-jsd: SEO Indexability Fixes

**Verdict:** PASS

All five SEO tracks, the ngBook convergence invariant, and the sitemap regression check are verified in the source code. No track failed; no must-have is missing. Verification done by reading the modified source files directly (build was not re-run, per task instructions).

---

## Track 1 — Static Prerender via `generateStaticParams`

**Status:** PASS

All four required route files export an `async function generateStaticParams()` that returns a non-empty array derived from real content sources (`getCourses()` / `getEvents()`):

| File | `generateStaticParams` line | Source | Returns |
| ---- | --------------------------- | ------ | ------- |
| `src/app/courses/[course]/page.tsx:22-27` | line 22 | `getCourses()` | `[{ course: slug }, …]` filtered to `!!c.slug` |
| `src/app/courses/[course]/[post]/page.tsx:46-55` | line 46 | `getCourses()` → flatMap chapters → flatMap posts | `[{ course, post }, …]` filtered to `!!p?.slug` |
| `src/app/courses/[course]/resources/page.tsx:8-13` | line 8 | `getCourses()` | `[{ course: slug }, …]` filtered to `!!c.slug` |
| `src/app/events/[event-slug]/page.tsx:13-18` | line 13 | `getEvents()` | `[{ "event-slug": slug }, …]` filtered to `!!e?.slug` |

All four are async, all read live content, all return a `.map(...)` array (not hardcoded empty). SUMMARY-reported build counts (9 + 216 + 9 + 3) are consistent with the filter logic and the upstream sitemap counts.

---

## Track 2 — Per-Page Canonicals

**Status:** PASS

All four files override the homepage canonical inherited from `src/app/layout.tsx`. Each `generateMetadata` returns `{ alternates: { canonical: ... } }` with both a found branch and a not-found branch; the canonical is built from the env-fallback `BASE_URL` constant that mirrors `sitemap.ts` verbatim.

| File | BASE_URL constant | Found-branch canonical | Not-found-branch canonical |
| ---- | ----------------- | ---------------------- | -------------------------- |
| `courses/[course]/page.tsx` | line 7-8 | `${BASE_URL}/courses/${slug}` (line 51) | `${BASE_URL}/courses` (line 42) |
| `courses/[course]/[post]/page.tsx` | line 13-14 | `${BASE_URL}/courses/${courseSlug}/${postSlug}` (line 81) | `${BASE_URL}/courses` (line 70) |
| `courses/[course]/resources/page.tsx` | line 5-6 | `${BASE_URL}/courses/${slug}/resources` (line 35) | `${BASE_URL}/courses` (line 27) |
| `events/[event-slug]/page.tsx` | line 6-7 | `${BASE_URL}/events/${slug}` (line 35) | `${BASE_URL}/events` (line 27) |

Every `BASE_URL` is the exact pattern `process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev"` — www-prefixed (matches sitemap + GSC property), no use of bare-apex `siteMetadata.siteUrl`.

---

## Track 3 — JSON-LD Structured Data

**Status:** PASS

Inline `<script type="application/ld+json">` tags are present on both course routes with the correct `@type`:

| Route file | Line | `@type` | Required fields verified |
| ---------- | ---- | ------- | ------------------------ |
| `courses/[course]/page.tsx` | 94-97 (script tag), 75-90 (object) | `"Course"` (line 77) | `name`, `description`, `url`, `provider` (Organization, sameAs), conditional `image`, conditional `author` |
| `courses/[course]/[post]/page.tsx` | 140-143 (script tag), 108-136 (object) | `"Article"` (line 110) | `headline`, `description`, `url`, `datePublished` + `dateModified`, `mainEntityOfPage`, `author` (Person), `publisher` (Organization + logo ImageObject), conditional `image` |

Both blocks render before the child detail components inside `.page-padding`, exactly as the plan specified. Object built from already-loaded data (no double MDX read). Per scope, no JSON-LD on `/events/[event-slug]` — deferred.

---

## Track 4 — GSC 404 → 301/308 Redirects

**Status:** PASS

`next.config.ts` `redirects()` returns 39 rules total (`permanent_true_count=39`), exceeding the ≥38 plan target (18 existing + 21 new). Per the plan note, the executor correctly identified the base had 18 existing (not 17), and that off-by-one is immaterial.

Spot-checks (all confirmed by reading `next.config.ts`):

| Rule | Source | Destination | Line | Status |
| ---- | ------ | ----------- | ---- | ------ |
| `/home` | exact | `/` | 148 | OK, `permanent: true` |
| `/tags/:rest*` | catch-all (covers `/tags/github` CSV row) | `/` | 145 | OK |
| `/preDid` | exact | `/` | 152 | OK |
| `/logic-` | exact | `/` | 153 | OK |
| `/ng-book` | exact | `https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99` | 159 | OK — Amazon URL |
| `/blog/:path*` | catch-all | `https://blog.codewithahsan.dev/:path*` | 165 | OK — replaces old rewrite |
| `/ahsync-bytes-weekly-digest-18th-may-2026` | one of 11 explicit per-slug rules | `/community` | 121 | OK |
| `/ahsync-bytes-weekly-digest-7th-july-2025` | one of 11 explicit per-slug rules | `/community` | 141 | OK |
| `/how-i-made-contributing-…` | exact deep-blog slug | blog subdomain at same slug | 169 | OK |

Weekly digest coverage: the script counted `weekly_digest_rule_count=23` (11 source rules × ~2 line mentions per rule for source + comment; plan target was ≥11 explicit source entries, which is satisfied — see lines 121–141 inclusive).

`async rewrites()` body returns `[]` (line 27) — the previous `/blog/:path*` rewrite is removed as required for SEO 301 migration.

The 27th CSV row (blog.codewithahsan.dev/how-to-pre-render-…) is documented as out-of-scope in the inline comment (lines 114-116) and in SUMMARY.md — acceptable, not flagged.

---

## Track 5 — ngBook Convergence Invariant (BLOCKER from plan revision)

**Status:** PASS

The BLOCKER invariant from the plan revision iter 1 is satisfied — both endpoints converge on the exact same Amazon URL:

- `src/data/siteMetadata.js:21-22` → `ngBook: "https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99"`
- `next.config.ts:159` → `{ source: "/ng-book", destination: "https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99", permanent: true }`

String comparison: byte-identical. The in-app AboutContent `PrimaryLink` (which reads `siteMetadata.ngBook`) now points directly at Amazon — no redirect chain through `/ng-book`. The external 301 from `/ng-book` (e.g., from old crawl hits) lands on the same Amazon URL. Internal and external paths converge.

---

## Track 6 — Sitemap Regression Check

**Status:** PASS

`src/app/sitemap.ts:4-5`:

```ts
const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev";
```

The env-fallback is www-prefixed exactly as required — no regression back to bare apex. The 270-URL count is asserted by SUMMARY.md curl evidence (`<url>` count = 270) and is trusted per the task instructions.

---

## Track 7 — `generateStaticParams` Coverage (Regression Enumeration)

**Status:** PASS

Enumerated all `generateStaticParams` exporters in `src/app/`:

```
src/app/events/[event-slug]/page.tsx
src/app/courses/[course]/resources/page.tsx
src/app/courses/[course]/page.tsx
src/app/courses/[course]/[post]/page.tsx
```

All 4 plan-listed routes present. No other dynamic route in `src/app/` (e.g., `/courses/[course]/submissions`, which the plan explicitly excludes as a `"use client"` component) regressed. The set matches the plan's `files_modified` list exactly.

---

## Out-of-Scope Items (Not Flagged)

- The 27th CSV row on the blog subdomain — documented in SUMMARY.md, inline-commented in next.config.ts (lines 114-116).
- Pre-existing TS errors on `src/components/social-icons/index.tsx` — logged to `deferred-items.md`, out of scope per executor scope-boundary rule.
- `schema.org Event` JSON-LD on `/events/[event-slug]` — Track 3 explicitly scoped to course routes only.

---

## Overall Verdict

**PASS** — All five SEO tracks, the ngBook convergence invariant, the sitemap regression check, and the generateStaticParams enumeration check are verified directly in the source code. No FAIL, no PARTIAL. The SUMMARY.md narrative is fully supported by file:line evidence in the codebase.

---

*Verified: 2026-05-21*
*Verifier: Claude (gsd-verifier, validate mode)*
