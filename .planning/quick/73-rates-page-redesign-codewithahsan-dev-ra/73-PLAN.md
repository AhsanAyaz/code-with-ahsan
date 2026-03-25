---
phase: quick-73
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/rates/RatesClient.tsx
  - src/content/rates.json
autonomous: true
requirements: []
must_haves:
  truths:
    - "Hero section shows headline, audience subheading, credential pills, and 4-stat grid"
    - "Featured packages section appears before a la carte items with three cards (Awareness, Growth, Authority)"
    - "Growth package has a 'Most popular' badge"
    - "All individual platform sections are renamed 'A la carte — [Platform]'"
    - "Repeated 12-year veteran credential block is removed from individual item descriptions"
    - "Facebook section is removed; a line reads 'Additional platforms available on request.'"
    - "12-month license disclaimer appears above the Usage Rights section, not at the very top"
    - "CTA section at bottom with two buttons: 'Send a brief' (mailto) and 'Book a call' (calendar link)"
    - "Floating 'Book a call' button visible on desktop while scrolling; fixed bottom bar on mobile"
    - "All existing prices are unchanged"
    - "Usage Rights and Add-Ons section content is unchanged"
  artifacts:
    - path: "src/app/rates/RatesClient.tsx"
      provides: "Full page layout with hero, stats, packages, a la carte, CTA, floating button"
    - path: "src/content/rates.json"
      provides: "Cleaned article markdown — no credential blocks, no Facebook, license disclaimer relocated"
  key_links:
    - from: "src/app/rates/RatesClient.tsx"
      to: "src/content/rates.json"
      via: "post.article prop passed from page.tsx"
      pattern: "post\\.article"
---

<objective>
Redesign the /rates page to feel like a sponsorship pitch deck rather than a price list. The page should lead with audience reach and creator credentials, feature bundled packages prominently, remove noise from individual item descriptions, and close with a strong CTA block and persistent floating call-to-action button.

Purpose: Convert brand collaboration inquiries into actual outreach — shift tone from "here are my prices" to "here is who I reach and what that is worth."
Output: Updated RatesClient.tsx with structured JSX sections + cleaned rates.json article content.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/content/rates.json
@src/app/rates/RatesClient.tsx
@src/app/rates/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clean rates.json article content</name>
  <files>src/content/rates.json</files>
  <action>
Edit the `article` field in src/content/rates.json to produce the cleaned a la carte markdown. The article should contain ONLY the a la carte platform sections and the Usage Rights section — no hero, no packages (those move to JSX). Make these specific changes:

1. REMOVE the opening paragraph about the 12-month license (it will be rendered in JSX above Usage Rights).

2. RENAME each platform section heading to "A la carte — [Platform]" format:
   - "YouTube ↗️ (34k+ Subscribers)" → "A la carte — YouTube ↗️ (34k+ Subscribers)"
   - "YouTube Packages:" → DELETE this entire subsection (Growth/Starter/Max/Scale packages move to JSX featured packages)
   - "Instagram ↗️ (64k+ Followers)" → "A la carte — Instagram ↗️ (64k+ Followers)"
   - "Instagram Packages:" → DELETE this entire subsection
   - "LinkedIn ↗️ (23k+ Followers)" → "A la carte — LinkedIn ↗️ (23k+ Followers)"
   - "LinkedIn Packages:" → DELETE this entire subsection
   - "Facebook ↗️ (53k+ Followers)" → DELETE the entire Facebook section
   - "TikTok ↗️ (9k+ Followers)" → "A la carte — TikTok ↗️ (9k+ Followers)"
   - "Newsletter & Community (2,100+ Subscribers · 4,400+ Discord Members)" → "A la carte — Newsletter & Community (2,100+ Subscribers · 4,400+ Discord Members)"

3. REMOVE the repeated "As a 12-year software industry veteran..." credential sentences from every YouTube item description. Keep only the functional deliverable descriptions. Specifically:
   - Dedicated Long-Form Video: remove the "As a 12-year software industry veteran..." sentence. Keep: "My dedicated long-form videos are typically 20-30 minutes long, involving thorough research and production time to deliver high-quality content. This package includes a detailed product review, real-world application demonstrations, prominent mentions in the description, a pinned comment, and an end-screen card."
   - YouTube Short: remove "With a 12-year software industry background..." sentence. Keep the rest.
   - YouTube Mention/Integration: remove "Leveraging my 12 years in the software industry..." sentence. Keep the rest.

4. ADD a plain-text line immediately above the "Usage Rights & Campaign Add-Ons" heading:
   "All rates include a **12-month license** for the client to use the content for organic resharing on their owned social media channels and website, with full attribution."

5. ADD a line at the very end of the a la carte sections (before the Usage Rights heading):
   "*Additional platforms available on request.*"

Do not change any prices, any Usage Rights content, or any LinkedIn/TikTok/Newsletter item descriptions.
  </action>
  <verify>
    <automated>node -e "const d = require('./src/content/rates.json'); const a = d.rateCard.article; const checks = [!a.includes('12-year software industry veteran'), !a.includes('Facebook'), a.includes('A la carte — YouTube'), a.includes('A la carte — Instagram'), a.includes('A la carte — LinkedIn'), a.includes('A la carte — TikTok'), a.includes('Additional platforms available on request'), a.includes('12-month license'), !a.startsWith('All rates below')]; console.log(checks.every(Boolean) ? 'PASS' : 'FAIL', checks);"</automated>
  </verify>
  <done>rates.json article has no Facebook section, no credential blocks, renamed a la carte sections, license note above Usage Rights, and "Additional platforms" line at the end of a la carte content.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite RatesClient.tsx with full redesigned layout</name>
  <files>src/app/rates/RatesClient.tsx</files>
  <action>
Replace the entire RatesClient.tsx with a new implementation that adds the structured hero, stats, featured packages, and CTA sections around the cleaned markdown content. Keep "use client" directive.

Structure the file as follows:

```tsx
"use client";

import LegitMarkdown from "@/components/LegitMarkdown";
import ResourcesLinks from "@/components/ResourcesLinks";

const CREDENTIAL_PILLS = [
  "Google Developer Expert — AI and Angular",
  "4 published books",
  "13M+ library installs",
  "50+ conference talks",
  "Flat fee only — no commissions",
];

const STATS = [
  { label: "YouTube", value: "34k+", sub: "Subscribers" },
  { label: "Instagram", value: "64k+", sub: "Followers" },
  { label: "Discord", value: "4,400+", sub: "Devs" },
  { label: "Newsletter", value: "2,100+", sub: "Subscribers" },
];

const FEATURED_PACKAGES = [
  {
    name: "Awareness",
    price: "$1,850",
    savings: "Save $100",
    badge: null,
    description: "Best for product launches.",
    deliverables: [
      "Instagram Reel (up to 90s)",
      "Story set x3 (with link sticker)",
      "Collaborator tag for co-branding",
      "12-month organic license included",
    ],
  },
  {
    name: "Growth",
    price: "$4,000",
    savings: "Save $400",
    badge: "Most popular",
    description: "Two dedicated YouTube videos with maximum organic reach.",
    deliverables: [
      "2x Dedicated Full-Length YouTube Videos (5-10 min)",
      "Prominent links in description and pinned comment",
      "End-screen card on each video",
      "12-month organic license included",
    ],
  },
  {
    name: "Authority",
    price: "$5,500",
    savings: "Save $1,100",
    badge: null,
    description: "Maximum reach across video, email, and community.",
    deliverables: [
      "3x Dedicated Full-Length YouTube Videos (5-10 min)",
      "Newsletter feature (dedicated slot)",
      "Discord announcement + 7-day pin",
      "12-month organic license included",
    ],
  },
];

export default function RatesClient({ post }: { post: any }) {
  return (
    <div className="page-padding relative">
      {/* === HERO === */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Reach 170,000+ developers who build for a living
        </h1>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto mb-6">
          Muhammad Ahsan Ayaz&apos;s audience includes software architects, senior engineers, and developers at companies like Klarna, Scania, and Google. Ahsan is a Google Developer Expert in AI and Angular, author of 4 published books, and creator of open-source libraries with 13M+ installs.
        </p>
        {/* Credential pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CREDENTIAL_PILLS.map((pill) => (
            <span
              key={pill}
              className="px-3 py-1 rounded-full border border-yellow-400 text-yellow-300 text-sm font-medium"
            >
              {pill}
            </span>
          ))}
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 rounded-xl p-4 text-center border border-white/10"
            >
              <div className="text-2xl font-bold text-yellow-300">{stat.value}</div>
              <div className="text-sm font-semibold">{stat.label}</div>
              <div className="text-xs text-gray-400">{stat.sub}</div>
            </div>
          ))}
        </div>
      </header>

      {/* === FEATURED PACKAGES === */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Featured packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                pkg.badge
                  ? "border-yellow-400 bg-yellow-400/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {pkg.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                  {pkg.badge}
                </span>
              )}
              <div className="mb-4">
                <h3 className="text-xl font-bold">{pkg.name}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-yellow-300">{pkg.price}</span>
                  <span className="text-sm text-green-400">({pkg.savings})</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">{pkg.description}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {pkg.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* === A LA CARTE MARKDOWN === */}
      {post.article && (
        <section>
          <LegitMarkdown
            components={{
              a: (props: any) => (
                <a
                  className="text-yellow-300"
                  target={"_blank"}
                  rel="noreferrer"
                  {...props}
                >
                  {props.children}
                </a>
              ),
            }}
          >
            {post.article}
          </LegitMarkdown>
        </section>
      )}

      {post.resources?.length > 0 && (
        <section className="mt-4">
          <ResourcesLinks
            resources={post.resources}
            heading="Resources"
            noHeading={false}
          />
        </section>
      )}

      {/* === CLOSING CTA === */}
      <section className="mt-16 mb-24 text-center rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-10">
        <h2 className="text-3xl font-bold mb-4">Ready to reach developers who ship?</h2>
        <p className="text-gray-300 max-w-xl mx-auto mb-8">
          Send a brief with your product, platform, timeline, and budget. Flat fee only — no commissions or performance-based arrangements.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:ahsan.ubitian@gmail.com?subject=Collaboration%20Inquiry%20%E2%80%94%20%5BYour%20Brand%5D"
            className="inline-block px-8 py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Send a brief
          </a>
          <a
            href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
            target="_blank"
            rel="noreferrer"
            className="inline-block px-8 py-3 border border-yellow-400 text-yellow-300 font-bold rounded-lg hover:bg-yellow-400/10 transition-colors"
          >
            Book a call
          </a>
        </div>
      </section>

      {/* === FLOATING CTA — desktop sidebar button === */}
      <a
        href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
        target="_blank"
        rel="noreferrer"
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col items-center gap-1 bg-yellow-400 text-black font-bold px-3 py-5 rounded-full shadow-lg hover:bg-yellow-300 transition-colors"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        Book a call
      </a>

      {/* === FIXED BOTTOM BAR — mobile === */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur border-t border-yellow-400/30 p-3">
        <a
          href="https://calendar.app.google/Z6g5dMyczq25hmjYA"
          target="_blank"
          rel="noreferrer"
          className="block w-full text-center py-3 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
        >
          Book a call
        </a>
      </div>
    </div>
  );
}
```

Write this file exactly. The component is self-contained — all data is declared at the top, no new imports needed beyond the existing two.
  </action>
  <verify>
    <automated>cd /Users/amu1o5/personal/code-with-ahsan && npx tsc --noEmit --project tsconfig.json 2>&1 | grep -E "rates|RatesClient" | head -20 || echo "TSC check complete"</automated>
  </verify>
  <done>RatesClient.tsx renders hero with headline + pills + stats grid, three featured package cards (Growth marked "Most popular"), cleaned markdown a la carte content, CTA block with two buttons, floating button on desktop, and fixed bottom bar on mobile. No TypeScript errors in the file.</done>
</task>

</tasks>

<verification>
After both tasks complete, verify the full page renders correctly:

1. Run `npx tsc --noEmit` — no type errors in rates files.
2. Run `npm run build` (or `next build`) — build completes without errors.
3. Spot-check rates.json: no Facebook section, no "12-year software industry veteran" text, all a la carte headings renamed.
4. Spot-check RatesClient.tsx: contains FEATURED_PACKAGES, STATS, CREDENTIAL_PILLS constants, two `<a>` CTA buttons, the floating desktop button (`lg:flex fixed`), and mobile bottom bar (`lg:hidden fixed bottom-0`).
</verification>

<success_criteria>
- /rates page hero leads with "Reach 170,000+ developers who build for a living"
- Credential pills and 4-stat grid render below subheading
- Three featured package cards appear before all a la carte content; Growth has "Most popular" badge
- All platform sections show "A la carte — [Platform]" naming
- No Facebook rates visible; "Additional platforms available on request" line present
- No repeated "12-year software industry veteran" text in any item description
- 12-month license note appears above Usage Rights section
- Bottom CTA section with "Send a brief" mailto and "Book a call" calendar link
- Floating "Book a call" button visible on desktop (right side, vertical); fixed bottom bar on mobile
- All prices unchanged; Usage Rights section unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/73-rates-page-redesign-codewithahsan-dev-ra/73-SUMMARY.md`
</output>
