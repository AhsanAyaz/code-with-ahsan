---
phase: quick-061
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/layout.tsx
  - public/robots.txt
  - public/sitemap.xml
  - next.config.ts
  - src/app/admin/layout.tsx
  - src/app/mentorship/dashboard/[matchId]/layout.tsx
  - src/app/profile/layout.tsx
  - src/app/mentorship/book/[mentorId]/layout.tsx
autonomous: true
requirements: [SEO-01]

must_haves:
  truths:
    - "Google can discover and index all public pages without hitting auth walls"
    - "Auth-only pages tell Google not to index them (noindex)"
    - "robots.txt blocks crawling of authenticated routes to save crawl budget"
    - "Sitemap contains only publicly accessible pages with no auth-gated URLs"
    - "All public pages have canonical URLs preventing duplicate content issues"
    - "metadataBase is set so Next.js resolves OG images and canonical URLs correctly"
  artifacts:
    - path: "src/app/layout.tsx"
      provides: "Root metadata with metadataBase and default canonical"
      contains: "metadataBase"
    - path: "public/robots.txt"
      provides: "Updated robots.txt blocking auth-only paths"
      contains: "Disallow: /admin"
    - path: "public/sitemap.xml"
      provides: "Clean sitemap with only public pages"
    - path: "src/app/admin/layout.tsx"
      provides: "noindex robots directive for admin section"
      contains: "noindex"
    - path: "src/app/profile/layout.tsx"
      provides: "noindex robots directive for profile section"
      contains: "noindex"
  key_links:
    - from: "src/app/layout.tsx"
      to: "all pages"
      via: "metadataBase propagation"
      pattern: "metadataBase.*codewithahsan\\.dev"
    - from: "public/robots.txt"
      to: "Googlebot"
      via: "crawl directives"
      pattern: "Disallow.*admin|profile|dashboard"
---

<objective>
Fix SEO indexing issues identified in Google Search Console coverage report showing 346 pages not indexed vs 30 indexed.

Purpose: The site has critical SEO problems: auth-only pages in sitemap causing redirect/404 errors for Googlebot, missing canonical tags causing duplicate content, missing metadataBase preventing proper OG/canonical URL resolution, and robots.txt not blocking auth-gated routes. Fixing these will improve crawl efficiency and indexing rate.

Output: Updated robots.txt, clean sitemap, proper metadata configuration, and noindex directives on auth-only pages.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/layout.tsx
@public/robots.txt
@public/sitemap.xml
@next.config.ts
@src/data/siteMetadata.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix root metadata, robots.txt, and add noindex to auth-only layouts</name>
  <files>
    src/app/layout.tsx
    public/robots.txt
    src/app/admin/layout.tsx
    src/app/profile/layout.tsx
    src/app/mentorship/dashboard/[matchId]/layout.tsx
    src/app/mentorship/book/[mentorId]/layout.tsx
    src/app/projects/[id]/layout.tsx
    src/app/roadmaps/layout.tsx
  </files>
  <action>
    **1. Fix root layout metadata (`src/app/layout.tsx`):**
    - Add `metadataBase: new URL('https://codewithahsan.dev')` to the exported `metadata` object. This is CRITICAL -- without it, Next.js cannot resolve relative URLs for OG images, canonical tags, or any metadata URLs.
    - Add `alternates: { canonical: '/' }` so the root page gets a canonical tag. Child pages will override this with their own canonical via Next.js metadata merging.
    - Add `openGraph` with `siteName`, `type: 'website'`, `locale: 'en_US'`, and `url: 'https://codewithahsan.dev'` to the root metadata for proper social sharing defaults.
    - Add `robots: { index: true, follow: true }` as a default that auth layouts will override.

    **2. Update robots.txt (`public/robots.txt`):**
    Replace the current minimal robots.txt with a comprehensive one that blocks Googlebot from crawling auth-only routes. The current robots.txt only blocks `/api/*` but allows crawling of `/admin/*`, `/profile`, `/mentorship/dashboard/*`, `/mentorship/requests`, `/mentorship/goals`, `/mentorship/my-matches`, `/mentorship/onboarding`, `/mentorship/book/*`, `/projects/my`, `/projects/new`, `/projects/*/edit`, `/roadmaps/my`, `/roadmaps/new`, `/roadmaps/*/edit` -- all of which require authentication and either redirect or return empty/error pages to Googlebot.

    New robots.txt content:
    ```
    sitemap: https://codewithahsan.dev/sitemap.xml

    user-agent: *
    allow: /

    # Block API routes
    disallow: /api/

    # Block admin pages (require authentication)
    disallow: /admin/

    # Block authenticated mentorship pages
    disallow: /mentorship/dashboard/
    disallow: /mentorship/requests
    disallow: /mentorship/goals
    disallow: /mentorship/my-matches
    disallow: /mentorship/onboarding
    disallow: /mentorship/book/
    disallow: /mentorship/admin

    # Block authenticated project pages
    disallow: /projects/my
    disallow: /projects/new
    disallow: /projects/*/edit

    # Block authenticated roadmap pages
    disallow: /roadmaps/my
    disallow: /roadmaps/new
    disallow: /roadmaps/*/edit

    # Block authenticated profile page
    disallow: /profile
    ```

    **3. Add noindex to auth-only layouts (belt-and-suspenders with robots.txt):**

    For each of these layout files, add `robots: { index: false, follow: false }` to the exported metadata object:

    - `src/app/admin/layout.tsx` -- already has metadata, add `robots: { index: false, follow: false }` to it
    - `src/app/profile/layout.tsx` -- already has metadata, add `robots: { index: false, follow: false }` to it
    - `src/app/mentorship/dashboard/[matchId]/layout.tsx` -- read first, add metadata with noindex if it doesn't have one, or add robots to existing metadata
    - `src/app/mentorship/book/[mentorId]/layout.tsx` -- already has metadata, add `robots: { index: false, follow: false }` to it

    Do NOT add noindex to:
    - `src/app/mentorship/layout.tsx` -- this is the public marketing page layout (covers /mentorship, /mentorship/browse, /mentorship/mentors)
    - `src/app/projects/layout.tsx` -- this covers public pages too (/projects, /projects/discover, /projects/showcase)
    - `src/app/roadmaps/layout.tsx` -- this covers public /roadmaps page
    - `src/app/events/layout.tsx` -- all events are public
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit 2>&1 | head -20</automated>
    <manual>Check that robots.txt has Disallow rules for admin, profile, dashboard paths. Check layout.tsx has metadataBase.</manual>
  </verify>
  <done>
    - Root layout has metadataBase set to https://codewithahsan.dev
    - robots.txt blocks all auth-only routes from crawling
    - Admin, profile, dashboard, and booking layouts have noindex robots metadata
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Clean up sitemap to remove auth-only pages and add missing public pages</name>
  <files>
    public/sitemap.xml
  </files>
  <action>
    Rewrite `public/sitemap.xml` to contain ONLY publicly accessible pages. The current sitemap includes many auth-gated URLs that return redirects or errors to Googlebot, wasting crawl budget and causing Search Console errors.

    **Pages to REMOVE from sitemap (auth-required, will redirect or 404 for Googlebot):**
    - `https://codewithahsan.dev/admin` and all `/admin/*` sub-pages (pending, mentors, mentees, projects, roadmaps)
    - `https://codewithahsan.dev/mentorship/admin`
    - `https://codewithahsan.dev/mentorship/dashboard`
    - `https://codewithahsan.dev/mentorship/goals`
    - `https://codewithahsan.dev/mentorship/my-matches`
    - `https://codewithahsan.dev/mentorship/requests`
    - `https://codewithahsan.dev/mentorship/onboarding`
    - `https://codewithahsan.dev/profile`
    - `https://codewithahsan.dev/projects/my`
    - `https://codewithahsan.dev/projects/new`
    - `https://codewithahsan.dev/roadmaps/my`
    - `https://codewithahsan.dev/roadmaps/new`

    **Pages to KEEP (public, no auth required):**
    - Homepage: `/`
    - Static pages: `/about`, `/books`, `/community`, `/courses`, `/gear`, `/logic-buddy`, `/mentorship`, `/privacy`, `/projects`, `/rates`, `/roadmaps`, `/terms`, `/events`
    - Books sub-pages: `/books/mastering-angular-signals`
    - Mentorship public: `/mentorship/browse`, `/mentorship/mentors`
    - Projects public: `/projects/discover`, `/projects/showcase`
    - Events: `/events/hackstack/2023`, `/events/cwa-promptathon/2026`, `/events/cwa-promptathon/2026/sponsorships`
    - All course pages (these are all public content): keep all `/courses/*` URLs

    **Pages to ADD (missing from current sitemap):**
    - `/events` (the events listing page, recently added)

    **Format improvements:**
    - Add `<lastmod>` with date `2026-02-23` to all URLs (current date, signals freshness)
    - Add `<changefreq>` values: `weekly` for homepage, courses, events; `monthly` for static pages; `yearly` for individual course lessons
    - Add `<priority>` values: `1.0` for homepage, `0.8` for main sections (courses, mentorship, projects, etc.), `0.6` for sub-pages, `0.4` for individual lessons

    Ensure the XML is well-formed with proper indentation (no split `<loc>` tags across lines like the current sitemap has).
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && xmllint --noout public/sitemap.xml 2>&1 && echo "XML valid" || echo "XML invalid"</automated>
    <manual>Grep for /admin, /profile, /my, /new, /dashboard in sitemap.xml - should find zero matches. Count URLs - should be fewer than current ~200+ but still include all course lesson pages.</manual>
  </verify>
  <done>
    - Sitemap contains only publicly accessible pages (no auth-gated URLs)
    - All auth-only pages removed (/admin/*, /profile, /mentorship/dashboard, etc.)
    - /events page added to sitemap
    - XML is well-formed and validates
    - lastmod, changefreq, and priority values set for all URLs
  </done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes (no TypeScript errors from metadata changes)
2. `xmllint --noout public/sitemap.xml` passes (valid XML)
3. `grep -c 'admin\|/profile\|/my\|/new\|/onboarding\|/goals\|/requests\|/my-matches\|/dashboard' public/sitemap.xml` returns 0 (no auth pages in sitemap)
4. `grep 'metadataBase' src/app/layout.tsx` finds the metadataBase declaration
5. `grep 'noindex' src/app/admin/layout.tsx src/app/profile/layout.tsx` finds noindex in both
6. `grep -c 'Disallow' public/robots.txt` returns 13+ (all auth paths blocked)
</verification>

<success_criteria>
- Root layout exports metadataBase pointing to https://codewithahsan.dev
- robots.txt blocks all 14+ auth-only route patterns from crawling
- Admin, profile, dashboard, and booking layouts have noindex robots metadata
- Sitemap contains only publicly accessible pages (removed ~15 auth-gated URLs)
- /events page is included in sitemap
- All course lesson pages remain in sitemap (these are public content)
- TypeScript compiles without errors
- sitemap.xml is valid XML
</success_criteria>

<output>
After completion, create `.planning/quick/61-fix-seo-indexing-issues-identified-in-go/61-SUMMARY.md`
</output>
