---
phase: quick-060
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/events/page.tsx
  - src/app/events/layout.tsx
autonomous: true
requirements: [QUICK-060]

must_haves:
  truths:
    - "Visiting /events shows a listing of all CWA events"
    - "CWA Prompt-a-thon 2026 appears first (descending date order)"
    - "HackStack Pakistan 2023 appears second"
    - "Each event card shows name, date, short description, and link to the event page"
    - "Page supports dark/light themes via existing DaisyUI/Tailwind conventions"
  artifacts:
    - path: "src/app/events/page.tsx"
      provides: "Events listing page component"
      contains: "events"
    - path: "src/app/events/layout.tsx"
      provides: "Metadata for events listing page"
      contains: "metadata"
  key_links:
    - from: "src/app/events/page.tsx"
      to: "/events/cwa-promptathon/2026"
      via: "Link component href"
      pattern: "events/cwa-promptathon/2026"
    - from: "src/app/events/page.tsx"
      to: "/events/hackstack/2023"
      via: "Link component href"
      pattern: "events/hackstack/2023"
---

<objective>
Create an /events listing page that shows all CWA events as cards in descending date order (newest first).

Purpose: Give visitors a single entry point to discover all community events.
Output: Server-rendered events listing page at /events with metadata.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/community/page.tsx (reference for DaisyUI card/layout patterns, server component style)
@src/app/events/cwa-promptathon/2026/layout.tsx (reference for event metadata pattern)
@src/app/events/hackstack/2023/layout.tsx (reference for event metadata pattern)
@src/data/siteMetadata.js (for metadata title pattern)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create events listing page and layout</name>
  <files>src/app/events/page.tsx, src/app/events/layout.tsx</files>
  <action>
Create two files following the community page patterns (server component, DaisyUI classes):

**src/app/events/layout.tsx** - Metadata layout:
- Import Metadata from "next" and siteMetadata from "@/data/siteMetadata"
- Export metadata with title "Events - {siteMetadata.title}", description about CWA community events
- Simple layout that renders children

**src/app/events/page.tsx** - Events listing page:
- Server component (NO "use client")
- Define an events array inline with two entries, each having: name, date (Date object), slug (href path), description, and a status label. Order the array by date descending.
  1. CWA Prompt-a-thon 2026 — date: March 28, 2026 — href: /events/cwa-promptathon/2026 — status: "Upcoming" — description: "A Generative AI & Build with AI Hackathon. Collaborate, build, and showcase innovative solutions using Generative AI."
  2. HackStack Pakistan 2023 — date: October 2023 (use Oct 1) — href: /events/hackstack/2023 — status: "Completed" — description: "Pakistan's premier 2-week hybrid hackathon focused on Full Stack Development. Organized with GDG Kolachi."

- Hero section: bg-base-200, page-padding, centered heading "Events" with subtitle about community events. Follow the community page hero pattern (max-w-3xl mx-auto text-center).

- Events grid section: bg-base-100, page-padding. Use max-w-4xl mx-auto for a clean single-column or 2-col layout.
  - Each event as a DaisyUI card (card bg-base-200 border border-base-300):
    - Status badge: use DaisyUI "badge" class. "Upcoming" gets "badge-primary", "Completed" gets "badge-ghost".
    - Event name as card-title (text-base-content)
    - Date formatted as readable string (e.g., "March 28, 2026")
    - Short description (text-base-content/70)
    - "View Event" link as a Next.js Link with "btn btn-primary btn-sm" classes

- Use Next.js Link from "next/link" for event links (NOT anchor tags).
- All styling via DaisyUI semantic classes (bg-base-100, bg-base-200, text-base-content, etc.) for automatic dark/light theme support. Do NOT use useTheme or conditional dark: classes.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
    <manual>Visit /events and confirm both events display as cards in descending order with correct links</manual>
  </verify>
  <done>
    - /events page renders with hero section and two event cards
    - CWA Prompt-a-thon 2026 (Upcoming) appears first, HackStack Pakistan 2023 (Completed) appears second
    - Each card shows event name, date, description, status badge, and "View Event" link
    - Links navigate to /events/cwa-promptathon/2026 and /events/hackstack/2023 respectively
    - Page works in both light and dark themes without conditional logic
    - Build succeeds without errors
  </done>
</task>

</tasks>

<verification>
- `npx next build` completes without errors
- /events page is accessible and renders both event cards
- Descending date order: Promptathon 2026 first, HackStack 2023 second
- Both "View Event" links navigate to correct event pages
</verification>

<success_criteria>
- Events listing page exists at /events with proper metadata
- Two event cards displayed in descending date order
- Clean, aesthetic design using DaisyUI components matching site conventions
- Dark/light theme support via semantic DaisyUI classes
- Build passes
</success_criteria>

<output>
After completion, create `.planning/quick/60-create-events-listing-page-at-events-wit/60-SUMMARY.md`
</output>
