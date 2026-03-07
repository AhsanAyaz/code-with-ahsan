---
phase: quick-69
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx
autonomous: true
requirements: [QUICK-69]
must_haves:
  truths:
    - "Each confirmed sponsor card displays the sponsor name in white text"
    - "The tier label on each sponsor card uses the tier's designated color (success for Tool Partner, warning for Gold, yellow-300 for Platinum, primary for Community Partner)"
  artifacts:
    - path: "src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx"
      provides: "Updated sponsor card rendering with name and tier color"
  key_links:
    - from: "CurrentSponsorsSection.tsx"
      to: "constants.ts CONFIRMED_SPONSORS"
      via: "sponsor.name and sponsor.tier fields (already present in ConfirmedSponsor type)"
      pattern: "sponsor\\.name|sponsor\\.tier"
---

<objective>
Update the CurrentSponsorsSection component to show the sponsor name on each confirmed sponsor card in white text, and apply the appropriate tier color to the tier label instead of the current flat `text-primary/80`.

Purpose: Make sponsor cards more informative and visually consistent with the tier color scheme used throughout the sponsorship pages.
Output: Updated CurrentSponsorsSection.tsx with sponsor name and tier-colored labels.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key file: src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx
Data source: src/app/events/cwa-promptathon/2026/constants.ts

Current card renders:
- Image with squircle mask
- Tier label: `<span className="text-[11px] font-semibold text-primary/80">{sponsor.tier}</span>`

Tier color mapping (from sponsorship/page.tsx and SponsorshipPackagesSection.tsx):
- "Tool Partner"        → text-success
- "Gold"                → text-warning  (also used for "Gold Sponsor", etc.)
- "Platinum"            → text-yellow-300
- "Community Partner"   → text-primary

Sponsor name must be white: `text-white`
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add sponsor name and tier-color label to confirmed sponsor cards</name>
  <files>src/app/events/cwa-promptathon/2026/components/CurrentSponsorsSection.tsx</files>
  <action>
In the `CONFIRMED_SPONSORS.map(...)` block, update the card content:

1. Add a `getTierColor` helper (inline const map or function) before the return statement:

```ts
const TIER_COLORS: Record<string, string> = {
  "Tool Partner": "text-success",
  "Gold Sponsor": "text-warning",
  "Gold": "text-warning",
  "Platinum Sponsor": "text-yellow-300",
  "Platinum": "text-yellow-300",
  "Community Partner": "text-primary",
};
const getTierColor = (tier: string) => TIER_COLORS[tier] ?? "text-primary";
```

2. Inside the card (the `motion.a` element), change the rendered content from:
```tsx
<Image ... className="object-contain mb-2 mask mask-squircle" />
<span className="text-[11px] font-semibold text-primary/80">{sponsor.tier}</span>
```

To:
```tsx
<Image ... className="object-contain mask mask-squircle" />
<span className="text-[11px] font-bold text-white mt-1 leading-tight">{sponsor.name}</span>
<span className={`text-[10px] font-semibold ${getTierColor(sponsor.tier)}`}>{sponsor.tier}</span>
```

Note: Remove `mb-2` from Image className since we now have name + tier below. The card height is fixed at `h-28` so keep content compact — 3 items (logo, name, tier) stacked vertically, centered.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx tsc --noEmit 2>&1 | grep -E "CurrentSponsorsSection|error" | head -20</automated>
  </verify>
  <done>Sponsor cards show: logo + sponsor name in white + tier label in tier color. TypeScript compiles without errors in the changed file.</done>
</task>

</tasks>

<verification>
Visit /events/cwa-promptathon/2026 and scroll to "Our Sponsors" section. The CommandCode card should show:
- CommandCode logo (squircle mask)
- "CommandCode" in white text
- "Tool Partner" in green (text-success)
</verification>

<success_criteria>
- Sponsor name visible in white on each confirmed sponsor card
- Tier label color matches the tier: Tool Partner = green, Gold = yellow/warning, Platinum = yellow-300, Community Partner = primary
- No TypeScript errors
- Placeholder cards are unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/69-update-promptathon-page-to-show-sponsor-/69-SUMMARY.md`
</output>
