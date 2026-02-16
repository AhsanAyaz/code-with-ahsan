---
phase: quick-050
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/app/page.tsx]
autonomous: true

must_haves:
  truths:
    - "Homepage loads without hard-coded New Year Sale banner"
    - "Only Strapi-sourced banners are displayed"
  artifacts:
    - path: "src/app/page.tsx"
      provides: "Homepage component"
      min_lines: 60
  key_links:
    - from: "src/app/page.tsx"
      to: "getBanners()"
      via: "function call"
      pattern: "await getBanners\\(\\)"
---

<objective>
Remove the hard-coded New Year Sale banner for Mastering Angular Signals from the homepage.

Purpose: Clean up outdated promotional content that was manually injected into the homepage
Output: Homepage with only Strapi-managed banners (no hard-coded promotional content)
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/app/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Remove hard-coded New Year Sale banner injection</name>
  <files>src/app/page.tsx</files>
  <action>
    Remove lines 66-72 from src/app/page.tsx which manually inject the New Year Sale banner:

    ```typescript
    // Inject New Year Sale Banner
    banners.unshift({
      content:
        "🎉 **New Year Sale!** Get [Mastering Angular Signals](https://leanpub.com/mastering-angular-signals/c/GO2026) at **75% OFF** until Jan 5th! (Includes future Signal Forms update). Happy New Year!",
      isActive: true,
      dismissable: true,
    });
    ```

    The `banners` variable should directly return the result from `getBanners()` without modification.

    After removal:
    - Line 64: `const banners = await getBanners();`
    - Line 65: (blank line)
    - Line 66: `return (`

    This removes the promotional banner that was added for a time-limited New Year sale that has expired.
  </action>
  <verify>
    1. `npm run build` completes successfully
    2. No TypeScript errors related to banner handling
    3. Homepage component still renders HomeBanners with Strapi-sourced banners
  </verify>
  <done>
    - Hard-coded banner injection code removed (lines 66-72)
    - Homepage renders only Strapi-managed banners
    - Build passes without errors
  </done>
</task>

</tasks>

<verification>
1. Build completes: `npm run build`
2. Homepage loads without hard-coded New Year Sale banner
3. HomeBanners component still receives banners from Strapi (if NEXT_PUBLIC_SHOW_BANNERS=true)
</verification>

<success_criteria>
- [ ] Lines 66-72 removed from src/app/page.tsx
- [ ] No hard-coded banner content remains
- [ ] Build passes
- [ ] Homepage functionality unchanged (still displays Strapi banners when enabled)
</success_criteria>

<output>
After completion, create `.planning/quick/50-remove-the-hard-coded-banner-of-masterin/050-SUMMARY.md`
</output>
