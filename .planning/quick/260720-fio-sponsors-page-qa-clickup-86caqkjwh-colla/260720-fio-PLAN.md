---
phase: quick
plan: 260720-fio
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/socialReach.ts
  - src/components/home/CommunityHero.tsx
  - src/app/events/cwa-promptathon/2026/constants.ts
  - src/app/sponsors/page.tsx
  - src/app/rates/page.tsx
autonomous: true
requirements: [SPONSORS-QA-86caqkjwh]
must_haves:
  truths:
    - "Newsletter count reads 3,000+ everywhere it is derived from socialReach"
    - "Homepage installs manifest and sponsors CREDENTIALS both read 14M+"
    - "Promptathon 2026 page reads 5,200+ Discord Members (not 4,500)"
    - "Sponsors page: Books/Courses/OpenSource full sections gone, replaced by a compact credibility strip; form reachable in ~2 scrolls"
    - "Sponsors page shows a Kimi results case-study block and two new OFFERINGS (Course & Workshop Adoption, Sponsored Community Events)"
    - "Sponsors page has a 'View the full rate card' link to /rates near the contact form"
    - "/rates renders with featured packages, a la carte pricing, usage rights/add-ons, and CTAs"
  artifacts:
    - path: "src/app/rates/page.tsx"
      provides: "New rate-card inventory page"
      contains: "export const metadata"
    - path: "src/app/sponsors/page.tsx"
      provides: "Trimmed sponsors page with credibility strip + case study + new formats"
  key_links:
    - from: "src/app/sponsors/page.tsx"
      to: "/rates"
      via: "anchor link near contact form"
      pattern: "/rates"
    - from: "src/app/rates/page.tsx"
      to: "SocialStats"
      via: "audience grid import"
      pattern: "SocialStats"
---

<objective>
Implement the already-approved Sponsors Page QA plan (ClickUp 86caqkjwh): align stale
numbers across the site, trim the sponsors page so the contact form is reachable in ~2
scrolls, add a results case study plus two real inventory formats, and ship a brand-new
/rates page sourced from the approved rate-card data.

Purpose: Make the sponsors funnel convert faster and give brands a real, linkable rate card.
Output: 4 edited files + 1 new page (src/app/rates/page.tsx).

AUTHORITATIVE SOURCE: /Users/amu1o5/.claude/plans/pick-up-the-ticket-snug-possum.md plus
RATE-CARD-DATA.md. Do NOT redesign, re-scope, or second-guess numbers — they were already
confirmed with Ahsan. Implement exactly as specified.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260720-fio-sponsors-page-qa-clickup-86caqkjwh-colla/RATE-CARD-DATA.md
@src/app/sponsors/page.tsx
@src/components/social/SocialStats.tsx
@src/data/socialReach.ts
@src/components/home/CommunityHero.tsx
@src/app/events/cwa-promptathon/2026/constants.ts

<interfaces>
SocialStats (default export, "use client") — src/components/social/SocialStats.tsx:
  props { label?: string; caption?: string; showTotal?: boolean; className?: string }
  Renders the audience grid, self-fetches /api/stats with socialReach as static fallback.
  Reuse as-is on /rates for the audience grid.

socialReach — src/data/socialReach.ts aligned counts:
youtube 37000, instagram 64000, facebook 60000, linkedin 23000, github 1600,
x 2000, tiktok 10500, discord 5200, newsletter (edit 2100 to 3000).
Total floors to "200,000+" via formatTotal.

BOOKING_URL = "https://calendar.app.google/Z6g5dMyczq25hmjYA" (defined in sponsors/page.tsx;
redefine the same const at top of rates/page.tsx).

SectionEyebrow — local helper inside sponsors/page.tsx (centered mono uppercase eyebrow).
Re-declare an equivalent local helper in rates/page.tsx (do not export/import across pages).

Design tokens (daisyUI + Tailwind): page-padding, rounded-2xl bg-base-200 border border-base-300,
btn btn-primary / btn btn-outline, text-primary, max-w-\* mx-auto.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Align stale numbers across the site</name>
  <files>src/data/socialReach.ts, src/components/home/CommunityHero.tsx, src/app/events/cwa-promptathon/2026/constants.ts</files>
  <action>
Four number edits — no structural changes:
1. src/data/socialReach.ts (line ~50): newsletter count 2100 becomes 3000. Single source
   feeding /api/stats + SocialStats + aligned copy. Total-audience floor (nearest 10k) unaffected.
2. src/components/home/CommunityHero.tsx MANIFEST (line ~12): installs value "13M+" becomes "14M+".
3. src/app/events/cwa-promptathon/2026/constants.ts: in COMMUNITY_STATS (line ~16) and
   SPONSOR_STATS (line ~24), both "4,500+" Discord Members values become "5,200+". Leave the
   "130,000+ Social Followers" and all other values untouched.

Do NOT touch the sponsors CREDENTIALS 13M to 14M here (that is Task 2).
</action>
<verify>
<automated>cd /Users/amu1o5/personal/code-with-ahsan && grep -q "count: 3000" src/data/socialReach.ts && grep -q '"14M+"' src/components/home/CommunityHero.tsx && ! grep -q "4,500" src/app/events/cwa-promptathon/2026/constants.ts && grep -q "5,200+" src/app/events/cwa-promptathon/2026/constants.ts</automated>
</verify>
<done>socialReach newsletter=3000, CommunityHero installs=14M+, promptathon Discord=5,200+ in both stat arrays; no "4,500" remains.</done>
</task>

<task type="auto">
  <name>Task 2: Trim sponsors page — strip, aligned numbers, new formats, case study, rate-card link</name>
  <files>src/app/sponsors/page.tsx</files>
  <action>
Edit src/app/sponsors/page.tsx per the approved plan. KEEP unchanged: the hero (200,000+
badge), SocialStats audience grid, brand logos strip, PortfolioBio, contact form, and 24h
promise. Changes:

1. Remove the catalog: delete imports for BooksSection, CoursesSection, OpenSourceSection
   (lines ~8-10), the getCourses import (line ~6), the `const courses = await getCourses()`
   line (~84), and the three rendered sections BooksSection / CoursesSection / OpenSourceSection
   (~180-182). Drop the `async` on the component if no other await remains.

2. Replace the removed showcase (after PortfolioBio) with a compact credibility strip: one
   SectionEyebrow-led row of three short linked lines using existing card/type tokens
   (rounded-2xl bg-base-200 border border-base-300, small text). Keep it short so the form
   stays within ~2 scrolls. Lines:
   - "4 published books incl. the Angular Cookbook series" -> link /books
   - "8 courses · 870+ video tutorials" -> link /courses
   - "11 open-source libraries · 14M+ installs" -> link https://github.com/ahsanayaz

3. Numbers: CREDENTIALS "13M+ library installs" -> "14M+ library installs" (line ~17).
   Newsletter OFFERING copy "2,100+" -> "3,000+" (line ~44).

4. Add two OFFERINGS entries using new lucide icons GraduationCap and CalendarDays (extend the
   lucide-react import):
   - title "Course & Workshop Adoption": "If your tool fits our stack, we adopt it into the
     Ship With AI course material and corporate team workshops — durable, hands-on exposure,
     not a one-off post."
   - title "Sponsored Community Events": "Tech events, monthly challenges, and international
     speaker sessions run with our community team — your brand in front of live, engaged
     developers." Add a code comment: draft one-liner, pending Maham confirmation.

5. Results case study: add a section immediately BEFORE the #contact section — one card with a
   SectionEyebrow (e.g. "Results") referencing the Kimi (Moonshot AI) integration and listing:
   52,000+ views in the first week · 3.1% average CTR · 1,600+ clicks to product · 210
   free-trial signups. Add a code comment: figures are representative — swap for exact archived
   numbers before wide sharing.

6. Rate-card link: near the contact form, beside the existing "Book a call directly" line
   (~195-205), add a "View the full rate card ->" link to /rates (Next.js Link or plain anchor
   href="/rates", styled link link-primary).

Do NOT add a $600 budget tier — the form floor is already $1k (out of scope).
</action>
<verify>
<automated>cd /Users/amu1o5/personal/code-with-ahsan && ! grep -qE "getCourses|BooksSection|CoursesSection|OpenSourceSection" src/app/sponsors/page.tsx && grep -q "14M+ library installs" src/app/sponsors/page.tsx && grep -q "3,000+" src/app/sponsors/page.tsx && grep -q "Course & Workshop Adoption" src/app/sponsors/page.tsx && grep -q "Sponsored Community Events" src/app/sponsors/page.tsx && grep -qi "Kimi" src/app/sponsors/page.tsx && grep -q "/rates" src/app/sponsors/page.tsx</automated>
</verify>
<done>Catalog + getCourses gone; credibility strip present; CREDENTIALS 14M+ and newsletter copy 3,000+; two new offerings; Kimi case-study card before #contact; /rates link near the form.</done>
</task>

<task type="auto">
  <name>Task 3: Build the new /rates page from RATE-CARD-DATA.md</name>
  <files>src/app/rates/page.tsx</files>
  <action>
LOAD the design skill FIRST: read and apply .agent/skills/web-design-guidelines (the
frontend-design skill for this repo) before building. Match /sponsors design language exactly:
page-padding wrapper, local SectionEyebrow helper, rounded-2xl bg-base-200 border border-base-300
cards, btn btn-primary / btn btn-outline, primary purple, centered max-w sections.

Create src/app/rates/page.tsx (new server component). Redefine BOOKING_URL at top. Import
SocialStats from "@/components/social/SocialStats". Use ALIGNED numbers throughout (14M
installs, 5,200 Discord, 3,000 newsletter, 37k YouTube, 200,000+ total) — NOT the PDF's stale
figures. Source all content/prices from RATE-CARD-DATA.md.

Sections in order:

1. Hero: "Reach 200,000+ developers who build for a living" + credential pills (GDE — AI and
   Angular, 4 published books, 14M+ library installs, 50+ conference talks, "Flat fee only —
   no commissions") + note "Currently accepting 4 brand partnerships per month".
2. Audience: SocialStats with label="The audience" and showTotal (reuse component, no new fetch).
3. Featured packages — three cards, each with original price struck through + discounted price +
   save badge; mark Growth as "Most popular":
   - Instagram Launch $1,950 -> $1,850 (Save $100)
   - Growth $5,000 -> $4,750 (Save $250) — Most popular
   - Authority $8,400 -> $6,400 (Save $2,000)
     Deliverables per RATE-CARD-DATA.md.
4. A la carte — grouped lists (native details/summary collapsibles styled with card tokens are
   fine): YouTube (Long-form from $3,000; 5-10min $2,500; Short $900; Integration $1,500),
   Instagram (Reel $1,200; Post/Carousel $950; Stories $750), LinkedIn (Post $1,200; Article
   $1,500), TikTok ($700), Newsletter & Community (Newsletter $500; Discord $400; Bundle $750
   Save $150).
5. Usage rights & add-ons: 12-month organic license included; Whitelisting +40% (3mo)/+75%
   (6mo); Perpetual organic +75%; Full buyout +150%; Exclusivity +25%/mo; Raw footage +40%.
6. Closing CTA: "Send a brief" -> /sponsors#contact and "Book a call" -> BOOKING_URL.

Export metadata (Metadata type) with title/description, alternates.canonical = "/rates", and an
openGraph block mirroring sponsors/page.tsx. If a shared footer nav is trivially discoverable,
optionally add a "Rates" link — keep it OUT of scope if it touches unrelated layout files.
</action>
<verify>
<automated>cd /Users/amu1o5/personal/code-with-ahsan && test -f src/app/rates/page.tsx && grep -q "export const metadata" src/app/rates/page.tsx && grep -q 'canonical: "/rates"' src/app/rates/page.tsx && grep -q "SocialStats" src/app/rates/page.tsx && grep -q "4,750" src/app/rates/page.tsx && grep -q "/sponsors#contact" src/app/rates/page.tsx</automated>
</verify>
<done>/rates renders featured packages (with discounts), a la carte pricing, usage-rights add-ons, audience grid via SocialStats, and both CTAs; exports metadata with canonical /rates.</done>
</task>

</tasks>

<verification>
Full-project checks after all tasks (run once at plan end):
1. `npm run build` — no type/build errors (confirms getCourses removal + new /rates compile).
2. `npm run lint` on changed files.
3. Dev server + manual/Playwright load of /sponsors: Books/Courses/OpenSource sections gone,
   credibility strip present, form reachable in ~2 scrolls, "14M+" and "3,000+" shown, two new
   offering cards, Kimi case-study card, "View the full rate card" -> /rates.
4. Load /rates: packages + a la carte + add-ons correct, CTAs work, light/dark ok.
5. Submit the sponsor form (POST /api/sponsorship) — success card renders, no regression.
</verification>

<success_criteria>

- All four numbers aligned (newsletter 3,000, installs 14M+, promptathon 5,200+).
- Sponsors page trimmed with credibility strip, two new formats, Kimi case study, /rates link.
- /rates page live, on-brand, sourced from RATE-CARD-DATA.md with aligned numbers.
- `npm run build` passes.
  </success_criteria>

<flags>
- Sponsored Community Events one-liner is a DRAFT — flag for Maham to confirm in the PR.
- Case-study figures (52k views / 3.1% CTR / 1,600 clicks / 210 signups) are representative —
  flag in the PR that they should be swapped for exact archived numbers before wide sharing.
- Local review by Ahsan before pushing; after approval push branch fix/sponsors-page-qa, then
  tag Najla to test.
</flags>

<output>
Create `.planning/quick/260720-fio-sponsors-page-qa-clickup-86caqkjwh-colla/260720-fio-SUMMARY.md` when done.
</output>
