---
quick_id: 260521-jsd
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/courses/[course]/page.tsx
  - src/app/courses/[course]/[post]/page.tsx
  - src/app/courses/[course]/resources/page.tsx
  - src/app/events/[event-slug]/page.tsx
  - src/data/siteMetadata.js
  - next.config.ts
autonomous: true
requirements:
  - SEO-INDEX-01-static-prerender-course-routes
  - SEO-CANONICAL-01-per-page-canonicals
  - SEO-SCHEMA-01-jsonld-article-course
  - SEO-404-01-301-redirects-from-gsc-404s
  - SEO-5XX-01-audit-web-dev-basics-server-errors

must_haves:
  truths:
    - "All published course detail pages are statically prerendered at build (○ in next build output, not ƒ)"
    - "All published course post pages are statically prerendered at build"
    - "All course /resources sub-pages are statically prerendered at build"
    - "Each course detail page emits a canonical link to https://www.codewithahsan.dev/courses/{slug} in the HTML head"
    - "Each course post page emits a canonical link to https://www.codewithahsan.dev/courses/{course}/{post} in the HTML head"
    - "Each event detail page emits a canonical link to https://www.codewithahsan.dev/events/{slug} in the HTML head"
    - "Each course post page renders an inline application/ld+json script with a valid schema.org Article shape (headline, datePublished, author, publisher, mainEntityOfPage)"
    - "Each course detail page renders an inline application/ld+json script with a valid schema.org Course shape (name, description, provider)"
    - "26 of 27 known 404 URLs return HTTP 301 to the documented target; the 27th (https://blog.codewithahsan.dev/how-to-pre-render-dynamic-routes-in-angular-a-practical-guide/) is on the blog subdomain — out of scope for this app's redirects, documented in SUMMARY"
    - "/ng-book apex + www both 301 to the Angular Cookbook 2E Amazon page (https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99); the in-app AboutContent CTA (siteMetadata.ngBook) points to that same Amazon URL, so no in-app link returns a redirect chain ending elsewhere"
    - "All 5 previously 5xx-listed web-dev-basics post URLs return HTTP 200 with full HTML (either statically prerendered or with documented root-cause fix)"
    - "/sitemap.xml still returns 270 URLs and every URL is www-prefixed (regression check from prior quick 260521-h86)"
    - "Running npm run dev boots without compile errors and serves the homepage"
  artifacts:
    - path: "src/app/courses/[course]/page.tsx"
      provides: "Course detail page with generateStaticParams, generateMetadata canonical, Course JSON-LD"
      contains: "generateStaticParams"
    - path: "src/app/courses/[course]/[post]/page.tsx"
      provides: "Course post page with generateStaticParams (cross product of course x post), generateMetadata canonical, Article JSON-LD"
      contains: "generateStaticParams"
    - path: "src/app/courses/[course]/resources/page.tsx"
      provides: "Course resources page with generateStaticParams"
      contains: "generateStaticParams"
    - path: "src/app/events/[event-slug]/page.tsx"
      provides: "Generic event page with generateStaticParams and per-page canonical"
      contains: "generateStaticParams"
    - path: "src/data/siteMetadata.js"
      provides: "ngBook field repointed from defunct /ng-book route to the Angular Cookbook 2E Amazon page so the in-app AboutContent CTA does not hit the new /ng-book → Amazon redirect"
      contains: "amazon.com/Angular-Cookbook"
    - path: "next.config.ts"
      provides: "26 new redirect rules covering 26 of 27 sanitized GSC 404 URLs (the 27th is on the blog subdomain — out of scope), plus existing rules preserved; /ng-book points to Angular Cookbook 2E Amazon page"
      contains: "ahsync-bytes-weekly-digest"
  key_links:
    - from: "src/app/courses/[course]/page.tsx generateStaticParams"
      to: "src/lib/content/contentProvider.ts getCourses()"
      via: "imported async fn, mapped to { course: slug } params"
      pattern: "getCourses\\(\\).*course\\.slug"
    - from: "src/app/courses/[course]/[post]/page.tsx generateStaticParams"
      to: "src/lib/content/contentProvider.ts getCourses() (with course.chapters[].posts[])"
      via: "cross-product flatMap, mapped to { course, post } params"
      pattern: "course\\.chapters.*posts.*slug"
    - from: "src/app/courses/[course]/page.tsx generateMetadata"
      to: "alternates.canonical"
      via: "absolute www-prefixed URL from NEXT_PUBLIC_SITE_URL env"
      pattern: "alternates.*canonical"
    - from: "Course detail page render"
      to: "application/ld+json script tag"
      via: "JSON.stringify of schema.org Course object inline in JSX"
      pattern: "application/ld\\+json"
    - from: "Post detail page render"
      to: "application/ld+json script tag"
      via: "JSON.stringify of schema.org Article object inline in JSX"
      pattern: "application/ld\\+json"
    - from: "next.config.ts redirects()"
      to: "Each row in secure/gsc_404_may_2026/Table.csv (27 rows; 26 mapped, 1 documented as out-of-scope)"
      via: "permanent: true (301) source-to-destination rule with CSV-row comment"
      pattern: "permanent:\\s*true"
    - from: "src/components/AboutContent.tsx Angular Cookbook PrimaryLink"
      to: "Angular Cookbook 2E Amazon page (via siteMetadata.ngBook)"
      via: "siteMetadata.ngBook string repointed to Amazon URL — internal CTA + external 301 converge on the same live destination"
      pattern: "amazon\\.com/Angular-Cookbook"
---

<objective>
Five SEO indexability tracks for codewithahsan.dev, bundled in one atomic quick task because they all read from the same content source (contentProvider) and modify a small fixed set of route files plus next.config.ts. Prior quick 260521-h86 fixed the sitemap; this task fixes what crawlers do after they read the sitemap.

Purpose:
- Track 1: convert dynamic SSR (f) course routes to static prerender (o) so Googlebot does not time out on cold-start TTFB and dequeue the 405 "Discovered - currently not indexed" pages.
- Track 2: stop every nested page from inheriting the homepage canonical (/) - the root cause of "Alternative page with proper canonical tag" failures.
- Track 3: add Article/Course JSON-LD so Google can surface rich results.
- Track 4: convert 26 of 27 known 404 URLs into 301 redirects so GSC clears the failure list (1 row is on the blog subdomain, out of scope for this app).
- Track 5: audit + fix the 6 5xx pages (5 unique paths) in web-dev-basics - hypothesis is Track 1 prerender will surface root cause OR fix them outright.

Output:
- 4 route files modified with generateStaticParams + generateMetadata canonical + JSON-LD where applicable
- src/data/siteMetadata.js: ngBook field repointed from /ng-book to the Angular Cookbook 2E Amazon page (prevents the in-app AboutContent CTA from triggering the new /ng-book 301)
- next.config.ts with new redirect rules + retained existing rules; /blog rewrite removed
- A short 5xx audit note appended to the SUMMARY at execution time
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Source-of-truth files (single read per task - extract everything in one pass):
@src/lib/content/contentProvider.ts
@src/lib/content/localContent.ts
@src/app/sitemap.ts
@src/app/layout.tsx
@src/app/courses/[course]/page.tsx
@src/app/courses/[course]/[post]/page.tsx
@src/app/courses/[course]/resources/page.tsx
@src/app/events/[event-slug]/page.tsx
@next.config.ts
@src/classes/Course.class.js
@src/classes/Post.class.js
@src/data/siteMetadata.js
@src/data/booksData.js
@src/components/AboutContent.tsx

# 404 ground truth (27 rows):
@secure/gsc_404_may_2026/Table.csv

<interfaces>
Extracted from codebase so the executor does not need to re-explore.

From src/lib/content/contentProvider.ts (re-exports the local-mode reader by default):

  export async function getCourses(): Promise<CourseContent[]>;
  export async function getCourseBySlug(slug: string): Promise<CourseContent | null>;
  export async function getPostBySlug(slug: string): Promise<PostContent | null>;
  export async function getEvents(): Promise<EventContent[]>;
  export async function getEventBySlug(slug: string): Promise<EventContent | null>;

From src/lib/content/localContent.ts (what local provider mode delegates to - filters to publishedAt && isVisible !== false):

  export function getLocalCourses(): CourseContent[]; // already filtered to visible+published

CourseContent shape (relevant fields, from src/content/courses.generated.json and Course.class.js):
- slug: string (required for routing)
- name: string
- description: string | null
- publishedAt: string (ISO)
- banner: { url: string } | null (note: Course.class normalises to .banner = course.banner?.url - a plain string when instantiated)
- authors: Array<{ name: string; bio?: string; avatar?: {...} }>
- chapters: Array<{ id, name, order, posts: PostContent[] }> (244 posts total across all courses)

PostContent shape (relevant fields):
- slug: string
- title: string
- description: string | null
- publishedAt: string
- videoUrl: string | null
- type: "video" | "article" | ...
- thumbnail: string | null
- chapter: { id, name } | null (joined from chapterId at instantiation)

EventContent (only ~3 use the generic /events/[event-slug] route; most have dedicated subdirs):
- slug: string
- title: string
- description: string
- bannerImage?: string
- dedicatedRoute?: string (if set, route 307-redirects)

From src/app/layout.tsx (current canonical pattern - wrong globally, must be overridden per-page):

  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev"),
  alternates: { canonical: "/" }, // <-- this is the bug for nested pages

BASE_URL constant pattern to reuse verbatim (already in sitemap.ts):

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev";

Existing next.config.ts shape:

  import type { NextConfig } from "next";
  const nextConfig: NextConfig = {
    ...
    async rewrites() { return [{ source: "/blog/:path*", destination: "https://blog.codewithahsan.dev/:path*" }]; },
    async redirects() { return [/* 17 existing rules - DO NOT remove */]; },
    ...
  };

From src/data/siteMetadata.js (current state — ngBook is the BLOCKER for /ng-book redirect):

  ngBook: "https://codewithahsan.dev/ng-book",  // <-- this points to a now-defunct route

From src/components/AboutContent.tsx line 8 (in-app CTA that depends on siteMetadata.ngBook):

  <PrimaryLink href={siteMetadata.ngBook}>Angular Cookbook</PrimaryLink>

From src/data/booksData.js entry id=2 (Angular Cookbook 2E, current edition — canonical destination):

  amazonLink: "https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99"

5xx-listed MDX files (all valid frontmatter, type=video, slugs confirmed):
- 006-045-wrap-up.mdx (slug: wrap-up)
- 004-038-what-is-json.mdx (slug: what-is-json)
- 004-006-javascript-variables.mdx (slug: javascript-variables)
- 004-008-javascript-arithmetic-operators.mdx (slug: javascript-arithmetic-operators)
- 004-027-javascript-for-in-loop.mdx (slug: javascript-for-in-loop)
All 5 are inside the web-dev-basics course, all type=video, all have valid publishedAt. No obvious frontmatter defect -> SSR cold-start crash is the working hypothesis, which Track 1's static prerender resolves at build time.

KNOWN CONSTRAINTS (do not violate):
- src/app/courses/[course]/submissions/page.tsx is `"use client"` - CANNOT add generateStaticParams. Excluded from Track 1.
- siteMetadata.siteUrl is bare apex `https://codewithahsan.dev` (no www). DO NOT use siteMetadata.siteUrl for canonicals - use the env-fallback `NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev"` pattern so canonicals stay www-prefixed (matches sitemap.xml and Search Console property).
- Cross-host redirects (blog/*, deep blog slugs) must NOT rely on basePath - use absolute https:// destinations.
- An existing rewrite already proxies /blog/:path* to https://blog.codewithahsan.dev/:path*. Track 4 must replace this with a redirect (rewrites mask the URL - Google still indexes it on www; we want a 301 so Google moves the index entry). Update the rewrite to a redirect, do not keep both.
- The /ng-book redirect MUST NOT silently break the in-app AboutContent CTA. siteMetadata.ngBook must be repointed to the same destination as the redirect, so internal links and external 301s converge.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add generateStaticParams + canonical metadata to course routes</name>
  <files>src/app/courses/[course]/page.tsx, src/app/courses/[course]/[post]/page.tsx, src/app/courses/[course]/resources/page.tsx</files>
  <action>
For each of the three route files, add an exported generateStaticParams() and update the existing generateMetadata() to set alternates.canonical to an absolute www-prefixed URL.

(1) src/app/courses/[course]/page.tsx
- Add at top: import { getCourses } from "@/lib/content/contentProvider";
- Add a module-level constant: const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.codewithahsan.dev"; (mirror sitemap.ts pattern verbatim).
- Export: async function generateStaticParams() returning courses.filter(c => !!c.slug).map(c => ({ course: c.slug })). The filter is defensive - getCourses already filters by publishedAt+isVisible, but a slugless course would crash the build.
- In existing generateMetadata, add alternates.canonical = `${BASE_URL}/courses/${slug}` to the returned Metadata object (keep existing title/description/openGraph fields). For the not-found branch, return alternates.canonical = `${BASE_URL}/courses` so even 404s do not inherit homepage canonical.

(2) src/app/courses/[course]/[post]/page.tsx
- Add import { getCourses } from "@/lib/content/contentProvider"; and the same BASE_URL constant.
- Export: async function generateStaticParams() returning courses.flatMap(c => (c.chapters ?? []).flatMap(ch => (ch.posts ?? []).filter(p => !!p?.slug).map(p => ({ course: c.slug, post: p.slug })))). Expected count: ~244 post params (matches sitemap.ts post count).
- In existing generateMetadata, add alternates.canonical = `${BASE_URL}/courses/${courseSlug}/${postSlug}`. Not-found branch canonical: `${BASE_URL}/courses`.

(3) src/app/courses/[course]/resources/page.tsx
- This file currently has no generateMetadata. Add the same BASE_URL constant and:
  - Export async function generateStaticParams() returning courses.filter(c => !!c.slug).map(c => ({ course: c.slug })) (same shape as course detail).
  - Export async function generateMetadata({ params }) that awaits params, calls getCourseBySlug(slug) for the title, and returns { title: `Resources - ${name}`, alternates: { canonical: `${BASE_URL}/courses/${slug}/resources` } }. Import getCourseBySlug if not already imported.

Do NOT touch src/app/courses/[course]/submissions/page.tsx - it is a client component and cannot host generateStaticParams. Leave it dynamic.

Use the same env-fallback BASE_URL constant in every file (no siteMetadata.siteUrl - that value is bare apex without www). Do not modify the children CourseDetail / PostDetail components; this task is metadata + static-params only.
  </action>
  <verify>
    <automated>cd /Users/amu1o5/personal/code-with-ahsan &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | (grep -E "src/app/courses" || echo "OK no type errors")</automated>
  </verify>
  <done>
- TypeScript compiles all three modified files with no errors
- Each modified file exports both generateStaticParams and generateMetadata
- Each generateMetadata return path sets alternates.canonical to an absolute https://www.codewithahsan.dev/... URL
- grep -n "generateStaticParams" on the 3 modified files shows 3 matches total
- grep -n "alternates:" on the 3 modified files shows at least 3 matches total
  </done>
</task>

<task type="auto">
  <name>Task 2: Add JSON-LD structured data plus event canonical + generateStaticParams</name>
  <files>src/app/courses/[course]/page.tsx, src/app/courses/[course]/[post]/page.tsx, src/app/events/[event-slug]/page.tsx</files>
  <action>
Inject inline application/ld+json script blocks in the page render output. Build the ld object from data already loaded by the page - do NOT re-read MDX. Place the script at the top of the returned JSX (before existing markup) so it appears in the HTML head/early body and is reliably parsed by Google. Use dangerouslySetInnerHTML with JSON.stringify - the canonical Next.js pattern, because writing the object as a child string causes brace-escaping issues.

(1) src/app/courses/[course]/page.tsx - Course schema
After const coursePlain = JSON.parse(...), build:

  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.name,
    description: course.description ?? siteMetadata.description,
    url: `${BASE_URL}/courses/${slug}`,
    ...(course.banner ? { image: course.banner } : {}),
    provider: { "@type": "Organization", name: "Code with Ahsan", sameAs: BASE_URL },
    ...(course.authors?.[0]?.name ? { author: { "@type": "Person", name: course.authors[0].name } } : {}),
  };

(course.banner is the normalised string from Course.class - already course.banner?.url flattened. siteMetadata is imported via `import siteMetadata from "@/data/siteMetadata";` - already imported by the file.)
Then in JSX, immediately inside the wrapping div.page-padding, render the script tag BEFORE the CourseDetail child:

  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }} />

(2) src/app/courses/[course]/[post]/page.tsx - Article schema
After resolving data, build (using the post Post instance and course Course instance from the destructure):

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description ?? siteMetadata.description,
    url: `${BASE_URL}/courses/${courseSlug}/${postSlug}`,
    ...(post.publishedAt ? { datePublished: post.publishedAt, dateModified: post.publishedAt } : {}),
    ...(post.thumbnail || course.banner ? { image: post.thumbnail || course.banner } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/courses/${courseSlug}/${postSlug}` },
    author: { "@type": "Person", name: course.authors?.[0]?.name ?? "Muhammad Ahsan Ayaz" },
    publisher: {
      "@type": "Organization",
      name: "Code with Ahsan",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/static/images/logo.png` },
    },
  };

Render the script tag BEFORE the PostDetail child, same pattern as (1).

(3) src/app/events/[event-slug]/page.tsx - add generateStaticParams + per-page canonical
- Add import { getEvents } from "@/lib/content/contentProvider";
- Add BASE_URL constant.
- Export async function generateStaticParams() returning events.filter(e => !!e.slug).map(e => ({ "event-slug": e.slug })).
- In existing generateMetadata, add alternates.canonical = `${BASE_URL}/events/${slug}`.
- Do NOT add JSON-LD on the generic event page (event data shape varies; defer schema.Event to a separate task - out of scope here).

Note on input safety: all input to JSON.stringify comes from MDX frontmatter (not user-controlled), so the standard pattern is sufficient. No need for </script> escaping in this codebase.
  </action>
  <verify>
    <automated>cd /Users/amu1o5/personal/code-with-ahsan &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | (grep -E "src/app/(courses|events)" || echo "OK no type errors")</automated>
  </verify>
  <done>
- TypeScript compiles all 3 modified files with no errors
- grep -n "application/ld" on the two course route files shows at least 2 matches
- grep -n "generateStaticParams" on src/app/events/[event-slug]/page.tsx shows 1 match
- Course detail JSON-LD includes "@type":"Course", name, description, provider
- Post JSON-LD includes "@type":"Article", headline, datePublished, author, publisher, mainEntityOfPage
  </done>
</task>

<task type="auto">
  <name>Task 3: 26-of-27 GSC-404 URLs to 301 redirects in next.config.ts, repoint siteMetadata.ngBook, drop legacy /blog rewrite</name>
  <files>next.config.ts, src/data/siteMetadata.js</files>
  <action>
This task has TWO file modifications. Do part (A) FIRST so the in-app CTA stops pointing at the soon-to-be-redirected /ng-book route, THEN add the redirect rules in part (B).

=== Part (A): src/data/siteMetadata.js — repoint ngBook ===

Currently:

  ngBook: "https://codewithahsan.dev/ng-book",

The /ng-book route is a 404 (in the GSC list), so we are redirecting it. But src/components/AboutContent.tsx line 8 renders `<PrimaryLink href={siteMetadata.ngBook}>Angular Cookbook</PrimaryLink>` — without this repoint, every visit to the About page would trigger a redirect chain when the user clicks "Angular Cookbook".

Change the value to the Angular Cookbook 2E Amazon page (the canonical destination per src/data/booksData.js id=2):

  ngBook: "https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99",

This is a single-line edit. Do not touch any other field in siteMetadata.js.

=== Part (B): next.config.ts — append redirect rules + remove /blog rewrite ===

Open next.config.ts and EXTEND the existing async redirects() array (do not replace existing 17 rules). Append the rules below in the same array. Each rule must have an inline comment naming the CSV row source.

CRITICAL - also remove the existing rewrites() entry for /blog/:path*. We are replacing the rewrite with a redirect so Google issues a 301 and migrates the index entry to the blog subdomain (rewrite masks the URL and keeps the www-indexed copy alive - actively harmful for SEO). Replace the rewrites() body with an empty array (do not delete the method, in case build tooling references it).

Sanitization rules applied:
- Strip ?utterances=... query strings (utteranc.es OAuth callback artifacts).
- Normalise trailing slashes - Next.js matches /foo/ and /foo differently. Use the no-trailing-slash form; Next.js applies trailing-slash normalisation per config (default = false in this project).
- URL-encoded artifacts (%2B, %3D, etc.) are dropped because they are downstream of the ? and not part of the path.

Group A (weekly digest) MUST use 11 explicit per-slug rules — NOT a single `:rest*` catch-all. Path-to-regexp within-segment matching across hyphens is fragile (a future slug like /ahsync-bytes-weekly-digest-archive-page would falsely match). Enumerate exactly the 11 slugs from secure/gsc_404_may_2026/Table.csv.

Rules to append (in this exact order) to the redirects() return array:

  // === Track 4 (Quick 260521-jsd): GSC 404 cleanup, 26 of 27 rows from secure/gsc_404_may_2026/Table.csv.
  // The 27th row — https://blog.codewithahsan.dev/how-to-pre-render-dynamic-routes-in-angular-a-practical-guide/ —
  // is on the blog subdomain (different deploy target), out of scope for this app's redirects. Documented in SUMMARY. ===

  // Group A — 11 explicit per-slug rules for ahsync-bytes-weekly-digest-* → /community (newsletter content lives there now).
  // Per-slug (no :rest* catch-all) to avoid path-to-regexp within-segment matching fragility.
  // CSV row: /ahsync-bytes-weekly-digest-18th-may-2026/
  { source: "/ahsync-bytes-weekly-digest-18th-may-2026", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-23rd-feb-2026/
  { source: "/ahsync-bytes-weekly-digest-23rd-feb-2026", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-16th-feb-2026/
  { source: "/ahsync-bytes-weekly-digest-16th-feb-2026", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-13th-oct-2025/
  { source: "/ahsync-bytes-weekly-digest-13th-oct-2025", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-1st-dec-2025/
  { source: "/ahsync-bytes-weekly-digest-1st-dec-2025", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-5th-jan-2026/
  { source: "/ahsync-bytes-weekly-digest-5th-jan-2026", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-8th-dec-2025/
  { source: "/ahsync-bytes-weekly-digest-8th-dec-2025", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-15th-sep-2025/
  { source: "/ahsync-bytes-weekly-digest-15th-sep-2025", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-22nd-sep-2025/
  { source: "/ahsync-bytes-weekly-digest-22nd-sep-2025", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-29th-dec-2025/
  { source: "/ahsync-bytes-weekly-digest-29th-dec-2025", destination: "/community", permanent: true },
  // CSV row: /ahsync-bytes-weekly-digest-7th-july-2025/
  { source: "/ahsync-bytes-weekly-digest-7th-july-2025", destination: "/community", permanent: true },

  // Group B - /tags/* to / (legacy tag system gone)
  // CSV row: /tags/github
  { source: "/tags/:rest*", destination: "/", permanent: true },

  // Group C - /home to / (CSV row: /home)
  { source: "/home", destination: "/", permanent: true },

  // Group D - typo / standalone paths
  // CSV rows: /preDid, /logic-
  { source: "/preDid", destination: "/", permanent: true },
  { source: "/logic-", destination: "/", permanent: true },

  // Group D-bis - /ng-book (both apex + www variants in CSV) → Angular Cookbook 2E Amazon page.
  // siteMetadata.ngBook (used by AboutContent.tsx) is repointed to the SAME URL in part (A) of this task,
  // so the internal CTA + external 301 converge on the live destination.
  // CSV rows: https://codewithahsan.dev/ng-book, https://www.codewithahsan.dev/ng-book
  { source: "/ng-book", destination: "https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99", permanent: true },

  // Group E - Legacy /blog/* to blog subdomain (REPLACES the existing rewrite)
  // CSV rows: /blog/css-box-model, /blog/angular-unit-tests-constructor-not-compatible-with-angular-dependency-injection,
  //          /blog/extend-angular-built-in-pipes, /blog/the-most-easy-way-to-add-update-and-delete-contacts-in-flutter,
  //          /blog/flutter-marketplace-app-with-stripe/part-1
  { source: "/blog/:path*", destination: "https://blog.codewithahsan.dev/:path*", permanent: true },

  // Group F - Deep blog slugs that were never under /blog/ (top-level legacy posts) to blog subdomain at the same slug
  // CSV rows: how-i-made-contributing-..., zero-to-3d-..., 10-mind-blowing-ways-..., how-to-pre-render-dynamic-routes-...
  { source: "/how-i-made-contributing-to-an-open-source-firebase-app-10x-easier-and-what-ai-got-wrong-along-the-way", destination: "https://blog.codewithahsan.dev/how-i-made-contributing-to-an-open-source-firebase-app-10x-easier-and-what-ai-got-wrong-along-the-way", permanent: true },
  { source: "/zero-to-3d-building-a-gesture-controlled-particle-system-with-one-prompt", destination: "https://blog.codewithahsan.dev/zero-to-3d-building-a-gesture-controlled-particle-system-with-one-prompt", permanent: true },
  { source: "/10-mind-blowing-ways-to-use-gemini-cli-that-arent-just-write-code", destination: "https://blog.codewithahsan.dev/10-mind-blowing-ways-to-use-gemini-cli-that-arent-just-write-code", permanent: true },
  { source: "/how-to-pre-render-dynamic-routes-in-angular-a-practical-guide", destination: "https://blog.codewithahsan.dev/how-to-pre-render-dynamic-routes-in-angular-a-practical-guide", permanent: true },

Then DELETE the /blog/:path* entry from the rewrites() block. Update rewrites() to `async rewrites() { return []; }`.

Coverage check: 11 (Group A explicit) + 1 (Group B catch-all = 1 CSV row) + 1 (Group C = 1 row) + 2 (Group D = 2 rows) + 1 (Group D-bis = 2 CSV rows, apex + www both match /ng-book) + 1 (Group E catch-all = 5 rows) + 4 (Group F = 4 rows) = 21 rules covering 26 unique CSV rows. The 27th CSV row (https://blog.codewithahsan.dev/how-to-pre-render-... — note this is on the blog subdomain, not www) is intentionally NOT mapped here because it is served by a different deploy (the blog subdomain). It will be addressed in a separate task on the blog repo and is called out as out-of-scope in the SUMMARY.

Note on apex vs www: One CSV row is on bare apex codewithahsan.dev/blog/css-box-model with utterances query. The hosting-layer apex-to-www redirect (handled by Vercel) brings it to www first, then Group E catches it. DO NOT add `has: [{ type: "host", value: "codewithahsan.dev" }]` rules here - hosting-layer apex-to-www is a separate concern outside this task. Prior quick 260521-h86 canonicalised to www at the sitemap level; if hosting-layer apex-to-www is missing, that is a separate fix.

Verification of 5xx (Track 5) is implicit in this task and Tasks 1+2: with generateStaticParams added in Task 1, the 5 web-dev-basics post URLs will either (a) prerender successfully at build (which resolves the 5xx because there is no more SSR cold-start crash), OR (b) fail the build with a hard error pinpointing the root cause in the MDX. If (b), capture the build error verbatim in the SUMMARY 5xx audit section and investigate the specific file - candidates: invalid escape in description block, MDX plugin choke on inline YouTube embed syntax. Do not block the plan on (b); produce a concrete finding in the SUMMARY either way.
  </action>
  <verify>
    <automated>cd /Users/amu1o5/personal/code-with-ahsan &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | (grep "error TS" || echo "OK no type errors") &amp;&amp; node -e "const fs=require('fs'); const s=fs.readFileSync('next.config.ts','utf8'); const m=s.match(/permanent:\s*true/g); console.log('permanent_true_count='+(m?m.length:0)); const m2=s.match(/ahsync-bytes-weekly-digest-/g); console.log('weekly_digest_rule_count='+(m2?m2.length:0)); const sm=fs.readFileSync('src/data/siteMetadata.js','utf8'); console.log('ngBook_is_amazon='+/amazon\.com\/Angular-Cookbook/.test(sm));"</automated>
  </verify>
  <done>
- next.config.ts type-checks (no error TS lines)
- src/data/siteMetadata.js: ngBook value matches /amazon\.com\/Angular-Cookbook/ (verifier output shows ngBook_is_amazon=true)
- node verifier output shows permanent_true_count >= 38 (17 existing + 21 new Track-4 rules)
- node verifier output shows weekly_digest_rule_count >= 11 (Group A explicit per-slug coverage)
- Filter source-line non-comment matches: `grep -v '^[[:space:]]*//' next.config.ts | grep -c "blog.codewithahsan.dev"` shows >= 5 (Group E destination + 4 Group F destinations)
- The rewrites() body is `return [];` (the /blog/:path* rewrite removed)
- Every appended rule has a // CSV ... comment naming the source rows
  </done>
</task>

<task type="auto">
  <name>Task 4: Build + smoke verification</name>
  <files>(no source files modified - verification only)</files>
  <action>
Run a clean production build to verify Tracks 1-4 work end-to-end and to surface any Track 5 build-time error from the previously-5xx pages.

(1) Run: npm run build

Capture the build output. Specifically look for:

(a) Route summary at the end of the build. Course routes should now show prerender markers:
- /courses/[course] - should show `○` (static) with N paths prerendered
- /courses/[course]/[post] - should show `○` (static) with ~244 paths
- /courses/[course]/resources - should show `○` (static)
- /events/[event-slug] - should show `○` (static)
None of these should be marked as `ƒ` (Dynamic / server-rendered on demand).

(b) Build errors mentioning the 5 web-dev-basics post slugs (wrap-up, what-is-json, javascript-variables, javascript-arithmetic-operators, javascript-for-in-loop). If any of these throw during prerender:
- Hypothesis A confirmed: Track 1 surfaced the root cause. Read the error message verbatim, identify the failing MDX or code path, apply a minimal fix (guard, default, or MDX-syntax correction), and re-run the build. Document the root cause and fix in the SUMMARY.
- Hypothesis B (build succeeds for all 5): Track 1's prerender resolved the 5xx outright (SSR cold-start was the cause). Document this conclusion in the SUMMARY with the build output snippet showing all 5 paths prerendered successfully.

(2) Start the prod server and smoke-test a representative URL:
- npm run start (in background or separate terminal) - then curl -sI http://localhost:3000/courses/web-dev-basics/javascript-variables should return 200 with text/html. Stop the server when done.
- curl -s http://localhost:3000/courses/web-dev-basics/javascript-variables | grep -E "application/ld\\+json|<link rel=.canonical." should show at least one canonical link AND one ld+json script.

(3) Sitemap regression check (prior quick 260521-h86 cleanup):
- curl -s http://localhost:3000/sitemap.xml | grep -c "<url>" should return 270.
- curl -s http://localhost:3000/sitemap.xml | grep -c "https://www\\.codewithahsan\\.dev" should be > 250 (every URL is www-prefixed).

(4) Redirect smoke checks (Track 4) - use curl -sI without -L to see the 301 hop:
- curl -sI http://localhost:3000/home should return 301 with Location: /
- curl -sI http://localhost:3000/tags/github should return 301 with Location: /
- curl -sI http://localhost:3000/ahsync-bytes-weekly-digest-18th-may-2026 should return 301 with Location: /community
- curl -sI http://localhost:3000/ahsync-bytes-weekly-digest-7th-july-2025 should return 301 with Location: /community (verifies explicit per-slug coverage, not catch-all)
- curl -sI http://localhost:3000/blog/css-box-model should return 301 with Location: https://blog.codewithahsan.dev/css-box-model
- curl -sI http://localhost:3000/ng-book should return 301 with Location: https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99
- curl -sI http://localhost:3000/10-mind-blowing-ways-to-use-gemini-cli-that-arent-just-write-code should return 301 with Location starting with https://blog.codewithahsan.dev/

(5) AboutContent CTA regression check (blocker from revision iter 1):
- curl -s http://localhost:3000/about | grep -E 'href="[^"]*amazon\.com/Angular-Cookbook' should show the Angular Cookbook PrimaryLink pointing directly at the Amazon URL (NOT at /ng-book, NOT a redirect chain).
- Equivalently: curl -sI -L http://localhost:3000/ng-book | grep -E "^(HTTP|Location:)" should show a single 301 hop directly to the Amazon URL, with no further hops back into the app. The chain MUST NOT end at `/` (homepage).

If any check fails, fix the corresponding rule in next.config.ts or the siteMetadata.js ngBook value, and re-run from step (1). Record final results in the SUMMARY.

DO NOT push or merge. This is verification only. Final cherry-pick + PR is handled by the user post-execution.
  </action>
  <verify>
    <automated>cd /Users/amu1o5/personal/code-with-ahsan &amp;&amp; npm run build 2>&amp;1 | tail -80 | tee /tmp/jsd-build.log &amp;&amp; (grep -E "(courses/\\[course\\]|events/\\[event-slug\\])" /tmp/jsd-build.log || echo "WARN: no course/event route lines in tail") &amp;&amp; (grep -iE "(error|failed)" /tmp/jsd-build.log | grep -v "0 errors" || echo "OK no errors in build tail")</automated>
  </verify>
  <done>
- npm run build completes without unhandled errors
- Build output shows /courses/[course], /courses/[course]/[post], /courses/[course]/resources, /events/[event-slug] with `○` (static) marker — not `ƒ`
- Total prerendered paths includes at least the 244 course post slugs
- curl smoke tests for canonical, JSON-LD, sitemap count, and at least 4 redirect rules all pass as documented in action steps
- /ng-book redirect lands on the Amazon Angular Cookbook 2E URL (not /); /about page Angular Cookbook link href is the Amazon URL directly (no in-app redirect chain)
- Either: (a) all 5 previously-5xx URLs respond 200 with full HTML, OR (b) the build surfaced a concrete root-cause error which is documented + fixed + re-verified
- SUMMARY notes the Track 5 outcome (A or B) with build-log evidence
- SUMMARY notes the 1 out-of-scope CSV row (blog subdomain, how-to-pre-render-…) and the rationale
  </done>
</task>

</tasks>

<verification>
Phase-level checks (run after all tasks complete; verifier handles post-deploy items separately):

1. Build succeeds: npm run build exits 0.
2. Static prerender confirmed: build output shows course/event dynamic routes with `○` (static) marker, not `ƒ` (dynamic).
3. Canonical tags present: curl a sample course-post URL, grep for `<link rel="canonical"` pointing to https://www.codewithahsan.dev/...
4. JSON-LD present: curl the same URL, grep for `application/ld+json` with valid Article shape.
5. Sitemap regression: sitemap.xml still has 270 URLs, all www-prefixed.
6. Redirect coverage: at least 4 representative 301s verified via curl -I, including /ng-book → Amazon, and at least 2 distinct weekly-digest slugs (verifying explicit per-slug coverage rather than fragile catch-all).
7. In-app CTA convergence: /about page Angular Cookbook link href = Amazon URL directly (no redirect chain).
8. 5xx audit recorded in SUMMARY (either fixed-by-prerender OR root-cause-found-and-fixed).
9. npm run dev still boots (smoke test for dev-mode regressions).
10. Out-of-scope row documented: SUMMARY records the 1 blog-subdomain CSV row not handled here.
</verification>

<success_criteria>
- All 4 modified route files type-check and lint clean.
- src/data/siteMetadata.js: ngBook field is the Angular Cookbook 2E Amazon URL (no longer /ng-book).
- next.config.ts: 17 existing redirect rules retained + 21 new rules added (11 explicit weekly-digest + Groups B/C/D/D-bis/E/F) + /blog rewrite removed.
- Build output marks all course routes as statically prerendered (○ marker, no ƒ).
- A randomly chosen course post URL returns HTML containing exactly one canonical link to its own www-prefixed URL and exactly one application/ld+json Article script.
- A randomly chosen course detail URL returns HTML containing one canonical link and one ld+json Course script.
- 26 of 27 GSC-404 source URLs are matched by at least one redirect rule (verified by curl smoke tests on a representative sample of 4+ rules). The 27th (blog subdomain) is documented as out-of-scope in the SUMMARY.
- /ng-book redirect lands on the Amazon Angular Cookbook 2E URL and the in-app About page CTA points there directly (no redirect chain).
- /sitemap.xml count still equals 270 (no regression from prior quick).
- 5xx audit produces a concrete finding written into the SUMMARY (either the prerender resolved it, or the root cause was identified and patched).
- No production code outside files_modified is touched.
</success_criteria>

<output>
After completion, create .planning/quick/260521-jsd-seo-indexability-fixes-generatestaticpar/260521-jsd-SUMMARY.md including:
- Final route count + build duration delta (Track 1 size impact)
- Per-track outcome (1-5)
- Concrete 5xx finding (Hypothesis A vs B, with evidence)
- Redirect rule count (before/after) — note 17 existing + 21 new = 38 total
- Note the 1 GSC-404 row intentionally not redirected here (blog.codewithahsan.dev/how-to-pre-render-…) and why (different deploy target)
- Document that siteMetadata.ngBook was repointed from /ng-book to the Amazon Cookbook 2E URL to converge the in-app AboutContent CTA with the new external 301
- Any deferred concerns surfaced during execution (e.g. apex-to-www hosting redirect, schema.Event for generic event route, blog-subdomain redirect task)
</output>
