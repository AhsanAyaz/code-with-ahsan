---
phase: quick-059
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/community/page.tsx
  - src/components/HomeFAQ.tsx
  - src/app/page.tsx
  - src/data/headerNavLinks.js
  - src/components/LayoutWrapper.tsx
  - src/components/MobileNav.tsx
  - src/components/Features.tsx
autonomous: true
requirements: [COMMUNITY-HUB]
must_haves:
  truths:
    - "Visiting /community shows a hero, organized Discord channel categories, and an FAQ accordion"
    - "The homepage has an FAQ section between Features and Newsletter"
    - "The Community dropdown nav includes a 'Community Hub' link pointing to /community"
    - "The Features card for Community links to /community instead of discord.gg"
    - "Both desktop and mobile nav render the community icon correctly"
  artifacts:
    - path: "src/app/community/page.tsx"
      provides: "Full community hub page (hero + channels + FAQ)"
    - path: "src/components/HomeFAQ.tsx"
      provides: "Homepage FAQ accordion component"
    - path: "src/app/page.tsx"
      provides: "Homepage with HomeFAQ inserted between Features and Newsletter"
    - path: "src/data/headerNavLinks.js"
      provides: "COMMUNITY_LINKS with new community entry"
    - path: "src/components/LayoutWrapper.tsx"
      provides: "Desktop nav renders community icon"
    - path: "src/components/MobileNav.tsx"
      provides: "Mobile nav renders community icon"
    - path: "src/components/Features.tsx"
      provides: "Community feature card links to /community"
  key_links:
    - from: "src/components/Features.tsx"
      to: "/community"
      via: "href property in features array"
      pattern: "href.*community"
    - from: "src/data/headerNavLinks.js"
      to: "COMMUNITY_LINKS"
      via: "array entry with icon: community"
      pattern: "icon.*community"
---

<objective>
Build the community hub page (issue #142): revamp /community into a rich Discord channels overview + FAQ, add a homepage FAQ section, and wire up the nav/Features card to point at the new page.

Purpose: Give visitors a clear overview of the CodeWithAhsan Discord community structure and FAQ before they join, and update existing nav/features to route through the community page instead of a bare Discord invite link.
Output: Revamped /community page, new HomeFAQ component on homepage, updated nav link + Features card href.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@src/app/community/page.tsx
@src/data/headerNavLinks.js
@src/app/page.tsx
@src/components/Features.tsx
@src/components/LayoutWrapper.tsx
@src/components/MobileNav.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Revamp /community page into a community hub</name>
  <files>src/app/community/page.tsx</files>
  <action>
Replace the entire file. Remove the getAllPeople import and people listing. Write a server component (no "use client" needed) with three main sections:

**Section 1 — Hero**
Full-width hero using `bg-base-200` with centered text:
- Heading: "Join the CodeWithAhsan Community"
- Sub-copy: "3,000+ developers learning, building, and growing together. Jump into our Discord to connect, get help, and collaborate on real projects."
- Two CTA buttons: primary "Join Discord" (href `https://discord.gg/KSPpuxD8SG`, target `_blank`) and secondary outline "Browse Channels" (anchor scroll `#channels`).
- Use `page-padding py-16` on the section wrapper.

**Section 2 — Discord Channels** (id="channels")
Section heading: "Explore Our Channels" with a `bg-base-100 page-padding py-16` wrapper.

Render 8 channel category cards in a responsive grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`). Each card: `card bg-base-200 border border-base-300` with `card-body`. Show the emoji, category name as `card-title`, a brief description, a list of representative channels (channel names prefixed with #), and a "Join Channel" link (`btn btn-sm btn-outline mt-3`) pointing to `https://discord.gg/KSPpuxD8SG`.

Categories (hardcoded data array in the file, NOT fetched):
1. "Important" — emoji: "📢" — description: "Official announcements, rules, and onboarding" — channels: announcements, welcome, rules, roles, introduction
2. "General" — emoji: "💬" — description: "Casual conversation, memes, and community ideas" — channels: chit-chat, memes, community-ideas, tech-news, giveaways
3. "Help & Support" — emoji: "🆘" — description: "Ask questions and get help from the community" — channels: help-me, faqs
4. "Collaboration" — emoji: "🤝" — description: "Find projects, jobs, workshops, and learning resources" — channels: projects-collaboration, job-opportunities, learning-resources, workshops, promote-yourself
5. "Mentorship" — emoji: "🎓" — description: "Public mentorship discussions and program updates" — channels: mentorship-public, mentors-chat, mentees-chat
6. "Zero to Website" — emoji: "🌐" — description: "Community for the Zero to Website program" — channels: z2w-announcements, z2w-support, z2w-legends-lounge. Add a secondary "Visit Z2W" link pointing to `https://z2website.com`.
7. "Tech Topics" — emoji: "⚙️" — description: "Deep-dives into specific technologies" — channels: web-dev-bootcamp, angular, ai-ml, mern, google-gemini
8. "Hackathons & Events" — emoji: "🏆" — description: "Past and upcoming hackathons and coding challenges" — channels: hacktoberfest, cwa-prompt-a-thon-2026, hackstack-pakistan-2023

**Section 3 — FAQ Accordion**
Section heading: "Frequently Asked Questions" with `bg-base-200 page-padding py-16` wrapper.

Use DaisyUI `collapse collapse-arrow join-item border border-base-300` pattern inside a `join join-vertical w-full max-w-3xl mx-auto` wrapper. Render 8 FAQ items using `details`/`summary` or the DaisyUI collapse component with `<input type="radio" name="community-faq" />`.

FAQs (hardcoded array):
1. Q: "What is the CodeWithAhsan community?" A: "CodeWithAhsan is a developer community built by Ahsan Tariq focused on web development, Angular, and modern engineering practices. We connect learners and professionals through Discord, mentorship, projects, and learning roadmaps."
2. Q: "Is it free to join?" A: "Yes! Joining the Discord server and accessing all community channels is completely free. Some programs like mentorship have a structured application process, but there is no membership fee."
3. Q: "What kind of channels are there?" A: "Our server has channels for announcements, general chat, help and support, project collaboration, job opportunities, mentorship, Zero to Website, tech topics (Angular, AI/ML, MERN), and hackathons."
4. Q: "How does the mentorship program work?" A: "Mentors apply and are vetted by the community. Once accepted, mentees can browse mentor profiles and request a match. Active mentorships get a private Discord channel for focused collaboration."
5. Q: "How can I collaborate on projects?" A: "Browse active projects on the Projects page, apply to join an existing team, or propose your own project. Approved projects get a dedicated Discord channel for team communication."
6. Q: "What is the Zero to Website community?" A: "Zero to Website (Z2W) is a structured learning program for beginners building their first website. Members get their own channels for announcements, support, and showcasing progress."
7. Q: "Are there any events or hackathons?" A: "Yes! We run hackathons like Hacktoberfest participation, HackStack Pakistan, and the CWA Prompt-a-thon. Watch #announcements for upcoming events."
8. Q: "What is Logic Buddy?" A: "Logic Buddy is an AI-powered coding assistant built for the CodeWithAhsan community. It helps you work through logic problems and coding challenges step by step."

Style the page to match the existing site aesthetic: `bg-base-100`/`bg-base-200` alternating sections, `text-base-content`, `text-base-content/70` for muted text, `btn btn-primary` for primary CTAs. Keep metadata (title/description) at the top of the file.
  </action>
  <verify>Run `npx tsc --noEmit` — no TypeScript errors. Visit `/community` in the browser — hero, 8 channel cards, and 8 FAQ items all render.</verify>
  <done>The /community page renders a hero section, 8 Discord channel category cards with channel lists and join links, and an 8-item FAQ accordion. The old people listing (getAllPeople) is gone.</done>
</task>

<task type="auto">
  <name>Task 2: Add HomeFAQ section to homepage</name>
  <files>src/components/HomeFAQ.tsx, src/app/page.tsx</files>
  <action>
**Create `src/components/HomeFAQ.tsx`** as a client component (`"use client"`):
- Section wrapper: `py-16 page-padding bg-base-200 border-t border-base-300`
- Heading: "Got Questions?" with a "See all FAQs" link to `/community#faq` using DaisyUI `btn btn-ghost btn-sm` style inline with the heading row
- Use the same DaisyUI `join join-vertical w-full max-w-3xl mx-auto` + `collapse collapse-arrow join-item border border-base-300` pattern as the community page
- Include 5 of the 8 FAQs (the most broadly applicable ones): questions 1, 2, 3, 4, and 8 from the list above (What is the community, Is it free, What channels, How does mentorship work, What is Logic Buddy)
- Below the accordion, add a centered CTA: `<Link href="/community" className="btn btn-primary mt-8">Explore the Community</Link>`

**Update `src/app/page.tsx`:**
- Import `HomeFAQ` from `@/components/HomeFAQ`
- Insert `<HomeFAQ />` between the `<Features />` line and the `{/* Newsletter Section */}` comment. No other changes to the file.
  </action>
  <verify>`npx tsc --noEmit` passes. Visit homepage — HomeFAQ section appears between Features and Newsletter with accordion items functioning.</verify>
  <done>Homepage shows a "Got Questions?" FAQ section with 5 accordion items and a "Explore the Community" CTA button, positioned between Features and the Newsletter section.</done>
</task>

<task type="auto">
  <name>Task 3: Update nav links and Features card</name>
  <files>src/data/headerNavLinks.js, src/components/LayoutWrapper.tsx, src/components/MobileNav.tsx, src/components/Features.tsx</files>
  <action>
**`src/data/headerNavLinks.js`:**
Insert a new entry into `COMMUNITY_LINKS` before the Discord entry (position index 3, between Roadmaps and Discord):
```js
{ href: "/community", title: "Community Hub", icon: "community" },
```
The array after change: Mentorship, Projects, Roadmaps, Community Hub, Discord, Logic Buddy.

**`src/components/LayoutWrapper.tsx`:**
In the icon rendering block inside the COMMUNITY_LINKS `.map()` (around line 152), add after the `brain` case:
```tsx
{item.icon === "community" && <span>🏘️</span>}
```
Place it after `{item.icon === "brain" && <span>🧠</span>}`.

**`src/components/MobileNav.tsx`:**
In the icon rendering block inside the COMMUNITY_LINKS `.map()` (around line 169), add after the `brain` case:
```tsx
{item.icon === "community" && <span className="text-xl">🏘️</span>}
```
Place it after `{item.icon === "brain" && <span className="text-xl">🧠</span>}`.

**`src/components/Features.tsx`:**
In the `features` array, find the Community entry (currently `href: "https://discord.gg/KSPpuxD8SG"`). Change its `href` to `"/community"`. Do not change the title, description, icon, or color. No other changes.
  </action>
  <verify>`npx tsc --noEmit` passes. Open the Community nav dropdown — "Community Hub" appears with the 🏘️ icon and links to /community. Open Features section on homepage — the Community card navigates to /community (not Discord directly).</verify>
  <done>COMMUNITY_LINKS has a "Community Hub" entry at position 4 (before Discord). Both desktop and mobile nav render 🏘️ for the community icon. The Features Community card href is "/community".</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` — zero TypeScript errors
2. `npx next build` — build succeeds with no errors
3. Visit `/community` — hero, 8 channel category cards, 8-item FAQ accordion all visible
4. Visit `/` — HomeFAQ section appears between Features and Newsletter; accordion opens/closes
5. Open Community dropdown (desktop and mobile) — "Community Hub" entry visible with icon, clicking navigates to /community
6. Click "Community" Features card on homepage — navigates to /community, not discord.gg
7. Discord entry still present in nav dropdown and still links externally to discord.gg
</verification>

<success_criteria>
- /community page is a comprehensive community hub (no people listing)
- Homepage has a working FAQ accordion between Features and Newsletter
- "Community Hub" link in nav dropdown points to /community
- Features card "Community" href changed from discord.gg to /community
- No TypeScript errors, build passes
</success_criteria>

<output>
After completion, create `.planning/quick/59-add-community-page-with-discord-channels/059-SUMMARY.md`
</output>
