# Phase 9: Marketing Site Enrichment - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 8 net-new / heavily-modified surfaces
**Analogs found:** 8 / 8 (all in-repo; this is a composition + restyle phase, no greenfield roles)

> Reading order for the planner: this file assigns each NET-NEW or MODIFIED file its closest existing analog with concrete excerpts. The reused `/about` portfolio components (`BooksSection`, `CoursesSection`, `OpenSourceSection`, `TestimonialsSection`, `PortfolioBio`) are dropped in as-is per D-01 and are NOT re-authored — they appear here only where a restyle or a prop wiring is required. All excerpts cite `src/...` paths + line numbers so plan actions can copy directly.

---

## File Classification

| New/Modified File                                          | Role                     | Data Flow                                   | Closest Analog                                                                           | Match Quality            |
| ---------------------------------------------------------- | ------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------ |
| `src/components/home/CommunityHero.tsx` (rebuild)          | component (client)       | request-response (`/api/stats` fetch)       | itself + `PortfolioBio` (credential rows) + `SocialReachBar` (mono eyebrow)              | exact (in-place rebuild) |
| `src/components/home/TrustedByStrip.tsx` (new)             | component                | transform (static data `.map()`)            | `src/app/sponsors/page.tsx` brands strip (lines 115-136) + `src/app/sponsors/logos.ts`   | exact                    |
| Home "work showcase" group (compose in `src/app/page.tsx`) | composition              | transform (data-module `.map()`)            | `src/app/about/page.tsx` (lines 18-47)                                                   | exact                    |
| Home testimonials placement (`src/app/page.tsx`)           | composition              | transform                                   | `TestimonialsSection.tsx` + about page composition                                       | exact (reuse as-is)      |
| `src/components/home/SponsorBand.tsx` (new)                | component                | request-response (static CTA → `/sponsors`) | sponsors page section bands (lines 139-159) + DaisyUI `btn-accent`                       | role-match               |
| `src/components/LayoutWrapper.tsx` (modify navbar-end)     | component (client)       | request-response (nav link)                 | existing `navbar-end` block (lines 35-38)                                                | exact                    |
| `src/app/sponsors/page.tsx` (insert About + showcase)      | route (server)           | transform                                   | `src/app/about/page.tsx` composition                                                     | exact                    |
| Bracketed-mono eyebrow motif (`SectionEyebrow` helper)     | utility (presentational) | none                                        | `SectionEyebrow` in sponsors page (lines 78-84) + `SocialReachBar` eyebrow (lines 86-88) | exact                    |

---

## Pattern Assignments

### `src/components/home/CommunityHero.tsx` — REBUILD (component, request-response)

**Analog:** itself (keep the `/api/stats` fetch + fallback + `min-h-[85vh]` shell) fused with `PortfolioBio` credential styling and the `SocialReachBar` mono eyebrow.

**Keep — live count fetch + fallback** (current lines 7-18). `discordCount` state, `useEffect` fetch of `/api/stats`, silent `.catch(() => {})`, fallback `5000`. This is the D-04 locked integration — DO NOT change the fetch. UI-SPEC copywriting: headline becomes `Join {liveCount}+ developers learning together`, fallback `5,000`.

**Keep — section shell + single glow** (current lines 21-30). Retain `min-h-[85vh] flex items-center justify-center overflow-hidden border-b border-base-300` and the grid background. Per UI-SPEC Motion Contract: drop the DUAL orbs (current lines 27-28) to ONE restrained blur behind the manifest.

**Replace eyebrow → bracketed-mono tag.** Current pill (lines 32-38) uses `font-mono` + live pulse dot — keep the pulse-dot pattern, change the text to the `<community-led />` bracket tag (see Shared Pattern: Bracketed Eyebrow). Copy: `<community-led />` — open to all developers.

**NEW — proof manifest block.** No exact analog exists; nearest is `PortfolioBio`'s credential line (`PortfolioBio.tsx` lines 32-34) and the sponsors `CREDENTIALS` array (`src/app/sponsors/page.tsx` lines 8-13). Build a `key : value` mono readout. Reuse the mono/token vocabulary:

```tsx
// Data source (inline const or src/data/*): mirrors sponsors CREDENTIALS shape
const MANIFEST = [
  { k: "gde", v: "Google Developer Expert" },
  { k: "books", v: "4 published" },
  { k: "installs", v: "13M+" },
  { k: "talks", v: "50+" },
];
// Row: <span className="font-mono text-xs ...">{k}</span> : <span className="font-mono text-primary">{v}</span>
```

Values in Violet (`text-primary`) mono per UI-SPEC signature. `key` in `text-base-content/50 font-mono` (matches `PortfolioBio.tsx:32`).

**Rebuild — 3-CTA cluster** (replaces current lines 58-75). UI-SPEC Copywriting Contract locks exactly:

```tsx
// 1. Primary (Violet lane): btn btn-primary, Users icon — Discord
<a href="https://codewithahsan.dev/discord" target="_blank" rel="noopener noreferrer">
  <button className="btn btn-primary btn-lg">
    <Users className="w-5 h-5 mr-2" />
    Join the community
  </button>
</a>
// 2. Secondary (neutral): btn btn-outline — Newsletter (anchor to newsletter section or NewsletterForm)
// 3. Tertiary (Teal/Sponsor lane): btn btn-outline accent → /sponsors  — "Sponsor us"
```

Discord href pattern copied verbatim from current lines 59-63. NEW: distinct Sponsor CTA in the teal lane (`btn-outline` accent) — Sponsor is the ONLY teal element in the hero.

**Reuse vs restyle:** in-place REBUILD. Keep fetch + shell; restyle eyebrow, glow, CTAs; add manifest.

---

### `src/components/home/TrustedByStrip.tsx` — NEW (component, transform)

**Analog:** the sponsors brands strip — `src/app/sponsors/page.tsx` lines 115-136 — reading `BRAND_LOGOS` from `src/app/sponsors/logos.ts`.

**Core pattern to copy** (`src/app/sponsors/page.tsx` lines 118-135):

```tsx
<div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-base-content/70">
  {BRAND_LOGOS.map((logo) => (
    <a
      key={logo.name}
      href={logo.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={logo.name}
      title={logo.name}
      className={`opacity-70 hover:opacity-100 transition-opacity ${
        logo.name === "Cloudways" ? "h-12 sm:h-14" : "h-7 sm:h-8"
      }`}
      dangerouslySetInnerHTML={{ __html: logo.svg }}
    />
  ))}
</div>
```

- **Import the EXISTING data:** `import { BRAND_LOGOS } from "@/app/sponsors/logos";` — DO NOT duplicate the SVG data. Logos are `currentColor` mono (see `logos.ts` — every `<path fill="currentColor">`), so they are theme-aware for free (SPEC Req 4 light+dark acceptance).
- **Cloudways height exception is load-bearing** (stacked mark needs `h-12 sm:h-14` vs `h-7 sm:h-8` flat wordmarks) — copy the conditional verbatim.
- **Eyebrow:** `<trusted-by />` — brands we've worked with (bracketed-mono; see Shared Pattern).
- **Band:** UI-SPEC section-map row 3 says base-100, "fused under hero" (no `border-t` band break — visually continuous with the hero, unlike the sponsors version which sits inside the hero `<section>`).

**Reuse vs restyle:** NEW component, but pure extraction of an existing block + existing data. Consider it a lift-and-shift of sponsors lines 116-136 into a home component.

---

### Home "work showcase" group — COMPOSE in `src/app/page.tsx` (composition, transform)

**Analog:** `src/app/about/page.tsx` lines 18-47 — the canonical composition of the three portfolio sections.

**Composition pattern to copy** (`src/app/about/page.tsx` lines 19, 27-33):

```tsx
export default async function Home() {
  const courses = await getCourses();       // about/page.tsx:19 — CoursesSection NEEDS this prop
  ...
  <BooksSection />                           // reads @/data/booksData.js internally
  <CoursesSection courses={courses} />       // ONLY section that takes a prop
  <OpenSourceSection />                      // reads @/data/openSourceProjects internally
}
```

- **CRITICAL wiring note:** `CoursesSection` is the one showcase component that takes a `courses` prop (see `CoursesSection.tsx:9` `function CoursesSection({ courses })` and about page line 19 `getCourses()` from `@/lib/content/contentProvider`). Home `page.tsx` is ALREADY an `async` server component (current line 40), so `await getCourses()` drops in cleanly. `BooksSection` / `OpenSourceSection` self-fetch their data modules — no props.
- **Reuse as-is (D-01).** These render their own `<h2>` ("Published Books" etc.) and `border-t border-base-300 bg-base-200 py-16` bands (`BooksSection.tsx:7`, `OpenSourceSection.tsx:5`, `CoursesSection.tsx:11` alternates `bg-base-100`).
- **Group eyebrow (UI-SPEC restyle call-out):** add a bracketed-mono `<work />` — built and shared with the community header ABOVE the group. Per UI-SPEC restyle note (lines 149-150), if the group header owns the title, individual component `<h2>`s may drop to visual `text-xl`/h3-weight to avoid double-title stacking — executor's density call, no data change.

**Reuse vs restyle:** REUSE (compose existing). Only additive: a wrapping group eyebrow. Data augmentation happens in `src/data/openSourceProjects.ts` / `projectsData.js` (D-02) — not a component edit.

---

### Home testimonials — COMPOSE in `src/app/page.tsx` (composition, transform)

**Analog:** `TestimonialsSection.tsx` (reads `@/data/testimonials`), placed exactly as in `src/app/about/page.tsx:39`.

- **Drop in as-is:** `<TestimonialsSection />`. It renders `border-t border-base-300 bg-base-200 py-16` (matches UI-SPEC section-map row 7 base-200 band). Card + 5-star rating pattern is `TestimonialsSection.tsx` lines 22-60.
- **Empty state (SPEC Req 3 acceptance):** the component currently maps unconditionally (`testimonials.map(...)`, line 23). To satisfy "hides gracefully at 0 items" (UI-SPEC section-map row 7 + Copywriting "section is hidden"), the planner should guard render: `if (!testimonials.length) return null;` at the top of the component OR conditionally render in `page.tsx`. This is a small ADD to the reused component — flag it.
- **Eyebrow restyle:** existing heading is plain `<h2>What Mentees Say</h2>` (line 8). Home context wants the `<testimonials />` — what mentees say bracketed-mono eyebrow above it (UI-SPEC Copywriting).

**Reuse vs restyle:** REUSE + one guard (empty-state hide) + eyebrow.

---

### `src/components/home/SponsorBand.tsx` — NEW (component, request-response)

**Analog:** sponsors page section band structure (`src/app/sponsors/page.tsx` lines 139-159 offer band) for the panel shell; DaisyUI `btn-accent` (teal, the Sponsor lane) for the CTA.

**Band shell pattern** (adapt from `src/app/sponsors/page.tsx` lines 140, 149-151):

```tsx
<section className="... py-16">
  {" "}
  {/* teal-tinted band per UI-SPEC row 9 */}
  <div className="page-padding max-w-5xl mx-auto text-center">
    <h2 className="text-3xl md:text-4xl font-bold text-base-content">
      Put your product in front of 180,000+ developers
    </h2>
    <p className="text-base-content/70 ...">
      Sponsorships across YouTube, Instagram, LinkedIn, the newsletter, and Discord — content
      developers already trust.
    </p>
    <Link href="/sponsors" className="btn btn-accent">
      See sponsorship options
    </Link>
  </div>
</section>
```

- **Copy is LOCKED** — heading/body/CTA verbatim from UI-SPEC Copywriting Contract (lines 239-241).
- **Teal discipline:** `btn btn-accent` is the ONLY color treatment; teal-tinted band background. This is the Sponsor lane — no Violet here. The existing home newsletter section (`page.tsx` lines 66-83) shows the radial-tint band pattern (`bg-[radial-gradient(...)]`) that can be adapted to a teal tint.
- Interactive target ≥44px (UI-SPEC spacing exceptions) — default `btn` satisfies.

**Reuse vs restyle:** NEW, but composed entirely from existing band + DaisyUI btn vocabulary.

---

### `src/components/LayoutWrapper.tsx` — MODIFY navbar-end (component, request-response)

**Analog:** the existing `navbar-end` block, current lines 35-38.

**Current** (lines 35-38):

```tsx
<div className="navbar-end gap-2">
  <ProfileMenu />
  <SideNav />
</div>
```

**Add BEFORE `ProfileMenu`** (UI-SPEC header spec, lines 143-145):

```tsx
<Link href="/sponsors" aria-label="Sponsor" className="btn btn-sm btn-accent gap-1 min-h-11">
  <HandCoins className="w-4 h-4" aria-hidden="true" />
  <span className="hidden sm:inline">Sponsor</span> {/* icon-only < sm */}
</Link>
```

- `Link` is the local `./Link` already imported (line 3) — reuse it, not `next/link`.
- `btn btn-sm btn-accent` = teal Sponsor lane. Import `HandCoins` from `lucide-react` (new import).
- **Tap-target caveat (UI-SPEC line 171):** icon-only `< sm` must keep ≥44px height — add `min-h-11` so the `btn-sm` doesn't shrink below the touch floor.
- Header is already `sticky top-0` (line 14) → "always visible while scrolling" is satisfied for free.

**Reuse vs restyle:** MODIFY — additive nav item only; nav mechanics from #263 untouched (D-05).

---

### `src/app/sponsors/page.tsx` — INSERT About + showcase (route, transform)

**Analog:** `src/app/about/page.tsx` composition for the inserted sections; the page's own `SectionEyebrow` + band rhythm for surrounding style.

**Insertion 1 — About Ahsan** (after hero+brands strip, before "What we offer" at current line 139):

- Reuse `PortfolioBio` (`src/components/portfolio/PortfolioBio.tsx`).
- **RESTYLE REQUIRED (UI-SPEC line 149, the single genuine restyle):** `PortfolioBio` renders an `<h1>` (`PortfolioBio.tsx:39` `<h1 className="text-3xl font-bold ...">`). The sponsors page ALREADY has an `<h1>` (`sponsors/page.tsx:92` "Partner with Code with Ahsan"). Demote the bio's internal `<h1>` → `<h2>` to preserve one `<h1>` per page. Options: (a) accept a `headingLevel`/`as` prop on `PortfolioBio`, or (b) a sponsors-local heading override. Flag for planner — this is the one component edit reuse forces.

**Insertion 2 — Ahsan's work showcase** (after audience stats section `sponsors/page.tsx:161-180`, before contact `:183`):

- Same three components as home Section 5: `BooksSection` + `CoursesSection courses={...}` + `OpenSourceSection`.
- **Server-component note:** `sponsors/page.tsx` is currently a SYNC server component (`export default function SponsorsPage()`, line 86). To pass `courses` to `CoursesSection`, either make it `async` + `await getCourses()` (mirror `about/page.tsx:18-19`) OR omit courses from the sponsors showcase. Flag: adding the showcase with courses requires converting `SponsorsPage` to `async`.

**Eyebrow harmony:** the page's existing `SectionEyebrow` (lines 78-84) uses UPPERCASE tracked mono. Inserted sections should use the bracketed-mono variant (`<about-ahsan />`, `<work />`) to match the new motif — OR keep the page's existing uppercase eyebrow for consistency within `/sponsors`. Executor's call; UI-SPEC signature favors brackets sitewide.

**Reuse vs restyle:** REUSE with one forced restyle (h1→h2 demotion) + one async conversion.

---

### Bracketed-mono eyebrow — SHARED HELPER (utility, presentational)

**Analog:** two existing mono-eyebrow implementations to converge:

1. `src/app/sponsors/page.tsx` lines 78-84 — `SectionEyebrow` component:

```tsx
function SectionEyebrow({ children }) {
  return (
    <p className="text-center text-xs font-mono text-base-content/40 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}
```

2. `src/components/home/SocialReachBar.tsx` lines 86-88 — inline mono eyebrow (`text-xs font-mono text-base-content/40 uppercase tracking-widest`).

**New motif (UI-SPEC signature, lines 100-102):** self-closing lowercase tags `<work />`, `<testimonials />`, `<trusted-by />`, `<community-led />`, `<sponsor />` in JetBrains Mono. Same token vocabulary as above but **lowercase** (drop `uppercase`), `tracking-widest`, `text-xs`, `font-mono`, `text-base-content/40-50`.

**Recommendation for planner:** promote a tiny shared `SectionEyebrow`/`MonoTag` helper (e.g. `src/components/home/SectionEyebrow.tsx` or `src/components/ui/`) taking the tag text, reused across hero, trusted-by, work group, testimonials, sponsor band. It mirrors the sponsors `SectionEyebrow` signature exactly — copy that function, swap `uppercase` for lowercase-bracket rendering. Keep it presentational, no data flow.

---

## Shared Patterns

### Bracketed-mono eyebrow (the phase signature)

**Source:** `src/app/sponsors/page.tsx:78-84` + `src/components/home/SocialReachBar.tsx:86-88`
**Apply to:** hero eyebrow, trusted-by strip, work showcase group header, testimonials, sponsor band.

```tsx
// lowercase bracket variant of the existing eyebrow
<p className="text-xs font-mono text-base-content/40 tracking-widest">&lt;work /&gt;</p>
```

Token vocabulary is already house-standard (mono, `text-base-content/40`, `tracking-widest`) — the ONLY change from existing is lowercase + `< />` framing.

### Live `/api/stats` fetch + silent fallback (DO NOT BREAK — D-04)

**Source:** `src/components/home/CommunityHero.tsx:10-18` and `src/components/home/SocialReachBar.tsx:45-70`
**Apply to:** hero rebuild (keep verbatim). Pattern: `fetch("/api/stats")` → guard `r.ok` → read nested field → fallback on any failure, `if (error) return null` (SocialReachBar) or fixed fallback (Hero `5000`). No error UI, no console error (UI-SPEC error state).

### Theme-aware `currentColor` logo (light+dark for free)

**Source:** `src/app/sponsors/logos.ts` (every SVG path `fill="currentColor"`) + render at `src/app/sponsors/page.tsx:132` `dangerouslySetInnerHTML={{ __html: logo.svg }}`
**Apply to:** trusted-by strip. Import `BRAND_LOGOS`, never re-inline SVGs. Cloudways height exception (`h-12 sm:h-14`) is load-bearing.

### DaisyUI color-lane discipline (reserved-color contract)

**Source:** UI-SPEC Color section + existing `btn btn-primary` (Hero:64) / `btn btn-accent` usage.
**Apply to:** ALL new CTAs. Violet `btn-primary` = join/learn lane; Teal `btn-accent` = Sponsor lane only (header button, hero Sponsor CTA `btn-outline` accent, Sponsor band `btn-accent`); neutral `btn-outline` = tertiary (newsletter). Never apply teal/violet to "all buttons."

### Section band rhythm

**Source:** `BooksSection.tsx:7` / `OpenSourceSection.tsx:5` (`border-t border-base-300 bg-base-200 py-16`) alternating with `CoursesSection.tsx:11` / `FounderCredibility.tsx:6` (`bg-base-100 py-16`).
**Apply to:** new SponsorBand + trusted-by; follow the alternating base-100 / base-200 band cadence from UI-SPEC section map, gutters via `.page-padding`.

---

## No Analog Found

None. Every net-new surface maps to an existing in-repo pattern. The two elements with the weakest direct analog:

| Element                                   | Role             | Data Flow | Nearest partial                                                                                    | Note                                                                                                                                                                                       |
| ----------------------------------------- | ---------------- | --------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hero "proof manifest" `key : value` block | component region | transform | `PortfolioBio.tsx:32-34` credential line + sponsors `CREDENTIALS` array (`sponsors/page.tsx:8-13`) | No existing `key : value` mono readout; assemble from the mono-eyebrow + credential vocabulary. This is the deliberate signature element (UI-SPEC lines 99-105) — spend the boldness here. |
| Teal-tinted Sponsor band background       | component        | none      | home newsletter radial-tint band (`page.tsx:66-83`)                                                | Adapt the existing radial-gradient tint pattern from violet (`rgba(143,39,224,...)`) to teal.                                                                                              |

---

## Metadata

**Analog search scope:** `src/components/home/`, `src/components/portfolio/`, `src/app/about/`, `src/app/sponsors/`, `src/app/page.tsx`, `src/components/LayoutWrapper.tsx`, `public/static/images/sponsors/`
**Files scanned:** 13 (5 read in full, 4 grepped for headers, plus SPEC/CONTEXT/UI-SPEC)
**Locked constraints honored:** DaisyUI tokens only, Violet `#8f27e0` (learn lane) / Teal `#1fb2a6` (Sponsor lane), Rubik + JetBrains Mono, reduced-motion, light+dark, no backend/`/api/stats` change, data-module-driven showcase/testimonials.
**Pattern extraction date:** 2026-07-07
