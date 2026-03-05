---
phase: quick-66
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/events/cwa-promptathon/2026/page.tsx
  - src/app/events/cwa-promptathon/2026/components/HeroSection.tsx
  - src/app/events/cwa-promptathon/2026/components/CommunityStatsSection.tsx
  - src/app/events/cwa-promptathon/2026/components/AboutSection.tsx
  - src/app/events/cwa-promptathon/2026/components/EventStructureSection.tsx
  - src/app/events/cwa-promptathon/2026/components/JudgesMentorsSection.tsx
  - src/app/events/cwa-promptathon/2026/components/SponsorshipPackagesSection.tsx
  - src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx
  - src/app/events/cwa-promptathon/2026/components/ForceDarkTheme.tsx
autonomous: false
must_haves:
  truths:
    - "All sections are visible without relying on whileInView triggering correctly"
    - "No massive empty gaps between visible sections at any viewport width"
    - "CommunityStats does not overlap hero CTA buttons at any zoom level"
    - "Section cards use dark-compatible colors that match the dark purple background"
    - "Mobile layout at 375px shows readable, non-cramped content"
  artifacts:
    - path: "src/app/events/cwa-promptathon/2026/components/HeroSection.tsx"
      provides: "Hero section without min-h-screen, proper mobile title wrapping"
    - path: "src/app/events/cwa-promptathon/2026/components/CommunityStatsSection.tsx"
      provides: "Stats section without negative margin overlap"
    - path: "src/app/events/cwa-promptathon/2026/components/ForceDarkTheme.tsx"
      provides: "Dark theme forced via data-theme attribute to prevent FOUC"
  key_links:
    - from: "page.tsx"
      to: "All section components"
      via: "Sequential rendering without animation-gated visibility"
---

<objective>
Fix spacing, overlapping, and visibility issues on the CWA Prompt-a-thon 2026 page across all viewport sizes (375px, 1280px, 1920px).

Purpose: Sections are invisible due to framer-motion whileInView not triggering (opacity stays 0), CommunityStats overlaps hero buttons via negative margins, and theme-dependent bg colors flash light on first paint.

Output: A fully visible, properly spaced page at all zoom levels with no overlapping sections.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/events/cwa-promptathon/2026/page.tsx
@src/app/events/cwa-promptathon/2026/layout.tsx
@src/app/events/cwa-promptathon/2026/components/HeroSection.tsx
@src/app/events/cwa-promptathon/2026/components/CommunityStatsSection.tsx
@src/app/events/cwa-promptathon/2026/components/AboutSection.tsx
@src/app/events/cwa-promptathon/2026/components/EventStructureSection.tsx
@src/app/events/cwa-promptathon/2026/components/JudgesMentorsSection.tsx
@src/app/events/cwa-promptathon/2026/components/SponsorshipPackagesSection.tsx
@src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx
@src/app/events/cwa-promptathon/2026/components/ForceDarkTheme.tsx
@src/app/events/cwa-promptathon/2026/components/AnimatedBackground.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix section visibility (whileInView opacity issue) and dark theme FOUC</name>
  <files>
    src/app/events/cwa-promptathon/2026/components/AboutSection.tsx
    src/app/events/cwa-promptathon/2026/components/EventStructureSection.tsx
    src/app/events/cwa-promptathon/2026/components/JudgesMentorsSection.tsx
    src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx
    src/app/events/cwa-promptathon/2026/components/SponsorshipPackagesSection.tsx
    src/app/events/cwa-promptathon/2026/components/CommunityStatsSection.tsx
    src/app/events/cwa-promptathon/2026/components/ForceDarkTheme.tsx
    src/app/events/cwa-promptathon/2026/page.tsx
  </files>
  <action>
    The CRITICAL issue: Multiple sections use `initial={{ opacity: 0 }}` with `whileInView` animation. If IntersectionObserver doesn't trigger (e.g., sections already in viewport on load, or scrolling too fast), sections stay invisible at opacity:0, creating massive empty gaps.

    **Fix whileInView reliability across ALL section components:**

    For each of the following components — AboutSection, EventStructureSection, JudgesMentorsSection, CurrentSponsorsSection, SponsorshipPackagesSection, CommunityStatsSection:

    1. Change ALL `whileInView` animations to use `viewport={{ once: true, amount: 0.1 }}` (reduce from 0.3 to 0.1 so it triggers earlier/more reliably).
    2. Additionally, add `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}` as FALLBACK on the outermost motion container of each section. This way if whileInView never fires, the animate prop ensures content becomes visible. Use a pattern like:
       ```
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         whileInView={{ opacity: 1, y: 0 }}
         viewport={{ once: true, amount: 0.1 }}
         transition={{ duration: 0.5 }}
       >
       ```
       Since `whileInView` overrides `animate` when in view, this is safe. But to truly guarantee visibility, the SIMPLEST fix is: change `initial={{ opacity: 0 }}` to `initial={{ opacity: 0 }}` and add a CSS fallback. Actually, the most robust approach: wrap each section's motion elements with a regular div that has no opacity manipulation, and only use motion for CHILD elements (decorative animations). This ensures the section container is always visible.

    **Recommended approach (simplest, most robust):**
    - For each section component, change the SECTION-LEVEL motion.div (the one that controls whether the entire section is visible) from `motion.div` with `initial={{ opacity: 0 }}` to a regular `div`. Keep motion animations only on individual CHILD cards/items for entrance effects — these are small and will be in viewport when their parent section scrolls into view, so whileInView works reliably on them.
    - Specifically for AboutSection: The outer `motion.div` with `initial="hidden"` and `whileInView="visible"` wraps the ENTIRE card. Change this to a regular `div` and apply motion variants only to the inner children (heading, paragraphs, terminal block).
    - For EventStructureSection: The section heading `motion.div` with `initial={{ opacity: 0, y: 20 }}` should become a regular `div`. Individual milestone cards can keep their motion animations.
    - For JudgesMentorsSection: Same — heading wrapper becomes regular div, individual judge cards keep motion.
    - For CurrentSponsorsSection: Heading wrapper becomes regular div, individual sponsor placeholders keep motion.
    - For SponsorshipPackagesSection: Heading wrapper becomes regular div. The three sponsorship article cards do NOT currently use motion (they are plain `article` elements) — leave them as-is.
    - For CommunityStatsSection: Individual stat cards can keep their `whileInView` animation since the grid container is a plain div. But reduce `amount: 0.3` to `amount: 0.1`.

    **Fix dark theme FOUC in ForceDarkTheme.tsx:**
    The current ForceDarkTheme uses `useEffect` + `setTheme("dark")` from next-themes, which runs AFTER first paint. This means `bg-base-200` and `bg-base-content` classes render with light theme colors for one frame.

    Fix: In addition to the existing useEffect approach, add an inline script or use `data-theme="dark"` directly on the page wrapper. The simplest fix: In `page.tsx`, add `data-theme="dark"` to the `<main>` element:
    ```tsx
    <main className="min-h-screen relative bg-[#0c0a14]" data-theme="dark">
    ```
    This forces DaisyUI to use dark theme tokens immediately, without waiting for JS hydration. The ForceDarkTheme component still handles next-themes state for consistency with the rest of the app, but the visual is correct from first paint.

    **Replace theme-dependent bg colors with hardcoded dark equivalents:**
    In all section components, replace `bg-base-200` with explicit dark colors that match the page's dark purple theme. Use `bg-[#1a1625]` (a dark purple-tinted gray that matches `bg-base-200` in DaisyUI dark theme). Similarly, `bg-base-300` becomes `bg-[#231e30]`. This eliminates any dependency on DaisyUI theme resolution for background colors.

    ALTERNATIVELY (simpler): Since we are adding `data-theme="dark"` to the main element, the DaisyUI utility classes WILL resolve correctly from first paint. So we do NOT need to hardcode hex colors. The `data-theme="dark"` fix is sufficient. Keep `bg-base-200` and `bg-base-300` as-is.

    **Go with the `data-theme="dark"` approach — it's simpler and maintains design system consistency.**
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - No section-level elements use `initial={{ opacity: 0 }}` that could hide entire sections
    - Section headings and containers are always visible (no motion gating)
    - Individual cards/items retain entrance animations via whileInView
    - page.tsx main element has `data-theme="dark"` for immediate dark theme
    - All whileInView uses `amount: 0.1` for earlier triggering
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix CommunityStats overlap, hero spacing, and mobile layout</name>
  <files>
    src/app/events/cwa-promptathon/2026/components/CommunityStatsSection.tsx
    src/app/events/cwa-promptathon/2026/components/HeroSection.tsx
  </files>
  <action>
    **Fix CommunityStatsSection negative margin overlap:**
    The section uses `-mt-10 sm:-mt-16 z-20` which pulls it into the hero section, overlapping CTA buttons at certain zoom levels.

    Remove the negative margins entirely. Change:
    ```
    className="relative pb-8 sm:pb-12 -mt-10 sm:-mt-16 z-20"
    ```
    to:
    ```
    className="relative py-8 sm:py-12"
    ```
    Remove `z-20` as well — no z-index needed without overlap. This creates clean separation between hero and stats.

    **Fix HeroSection excessive vertical space:**
    The hero uses `min-h-screen` which at larger viewports creates huge empty space below the CTA buttons before the next section.

    Change `min-h-screen` to a more controlled height:
    ```
    className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden pt-16 pb-8"
    ```
    Add `pt-16` to account for navbar, and `pb-8` for bottom breathing room. The `min-h-[85vh]` on mobile and `min-h-[90vh]` on desktop prevents the massive gap while still giving the hero prominence.

    **Fix mobile title wrapping:**
    The h1 uses `md:whitespace-nowrap` which is fine for desktop, but on mobile "CWA Prompt-a-thon 2026" wraps awkwardly mid-word as "Prompt-a-\nthon".

    Fix: Change the title structure so it wraps at a natural word boundary. Replace:
    ```tsx
    <span className="text-primary">CWA Prompt-a-thon</span>{" "}
    <span className="text-primary">2026</span>
    ```
    with:
    ```tsx
    <span className="text-primary">CWA</span>{" "}
    <span className="text-primary whitespace-nowrap">Prompt-a-thon</span>{" "}
    <span className="text-primary">2026</span>
    ```
    The `whitespace-nowrap` on "Prompt-a-thon" prevents mid-hyphen wrapping. On mobile it will wrap as "CWA\nPrompt-a-thon\n2026" which is cleaner.

    Also reduce the mobile font size slightly: change `text-4xl` to `text-3xl` for the h1 to give more room on 375px screens:
    ```
    className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight md:whitespace-nowrap"
    ```

    **Fix mobile event info box:**
    The event info box `whileHover={{ scale: 1.05 }}` with `whileTap={{ scale: 0.95 }}` on the wrapper motion.div is problematic — it makes the entire info card scale on hover/tap which is jarring and causes layout shifts. Remove these hover/tap animations from the info box wrapper. Change:
    ```tsx
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
    ```
    to just:
    ```tsx
    <motion.div variants={itemVariants}>
    ```
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - CommunityStatsSection has no negative margins, sits below hero with clean spacing
    - Hero uses min-h-[85vh]/min-h-[90vh] instead of min-h-screen
    - Title wraps cleanly on mobile (no mid-word break on "Prompt-a-thon")
    - Mobile title uses text-3xl for better fit on 375px
    - Event info box has no hover/tap scale animation
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Fixed section visibility (removed whileInView opacity gating on section containers), fixed CommunityStats overlap (removed negative margins), fixed hero spacing (reduced from min-h-screen), fixed mobile title wrapping, added data-theme="dark" for immediate dark theme rendering.</what-built>
  <how-to-verify>
    1. Run `npm run dev` and visit http://localhost:3000/events/cwa-promptathon/2026
    2. At 1920px width: Verify ALL sections are visible (CommunityStats, About, Event Structure, Judges, Sponsorship, Current Sponsors). No massive empty gaps between sections. Smooth scroll from hero to footer.
    3. At 1280px width: Same check — all sections visible, no overlapping content.
    4. At 375px width (mobile): Title "CWA Prompt-a-thon 2026" wraps cleanly (no mid-hyphen break). Event info box is readable. All sections visible and properly spaced.
    5. Zoom levels (90%, 100%, 110%, 125%): CommunityStats section does NOT overlap hero CTA buttons at any zoom.
    6. Verify no flash of light-colored backgrounds on page load (all cards should immediately appear dark-themed).
  </how-to-verify>
  <resume-signal>Type "approved" or describe remaining issues</resume-signal>
</task>

</tasks>

<verification>
- `npx next build` succeeds without errors
- All sections visible at 375px, 1280px, 1920px viewports
- No empty gaps caused by invisible sections
- No overlap between CommunityStats and hero
- Dark theme applied from first paint (no FOUC)
</verification>

<success_criteria>
All sections on the CWA Prompt-a-thon 2026 page are visible and properly spaced at all viewport widths and zoom levels, with no overlapping elements and no flash of light theme colors.
</success_criteria>

<output>
After completion, create `.planning/quick/66-fix-spacing-and-overlapping-issues-on-cw/66-SUMMARY.md`
</output>
