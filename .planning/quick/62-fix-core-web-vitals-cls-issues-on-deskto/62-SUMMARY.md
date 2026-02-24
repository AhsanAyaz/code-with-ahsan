---
phase: quick-062
plan: 01
subsystem: frontend-performance
tags: [cls, core-web-vitals, fonts, images, newsletter, seo]
dependency_graph:
  requires: []
  provides: [CLS-FIX]
  affects: [src/app/globals.css, src/components/Hero.tsx, src/components/MDXComponents.tsx, src/components/NewsletterForm.tsx, src/app/providers.tsx, src/app/layout.tsx]
tech_stack:
  added: []
  patterns: [next/font adjustFontFallback, CSS containment, Next.js Image]
key_files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/Hero.tsx
    - src/components/MDXComponents.tsx
    - src/components/NewsletterForm.tsx
    - src/app/providers.tsx
    - src/app/layout.tsx
decisions:
  - "Use var(--font-rubik) CSS variable in --font-sans to align CSS font stack with what next/font actually loads"
  - "adjustFontFallback:true generates size-adjust/ascent-override/descent-override descriptors that match fallback fonts to Rubik metrics"
  - "CSS containment (contain: layout style) on newsletter wrapper prevents external Ghost script element from escaping container"
  - "CookieConsent position:fixed + overlay:false ensures banner floats above content without shifting layout"
metrics:
  duration: 4 min
  completed: 2026-02-24
  tasks_completed: 3
  files_modified: 6
---

# Phase quick-062 Plan 01: Fix Core Web Vitals CLS Issues Summary

**One-liner:** Eliminated 4 CLS sources site-wide: phantom Inter font reference, raw img tags in Hero/MDX, Ghost newsletter script body injection, and non-fixed cookie consent banner.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix font stack mismatch and image dimension issues | c11c7c3 | globals.css, Hero.tsx, MDXComponents.tsx |
| 2 | Stabilize dynamic content injection | 636f52b | NewsletterForm.tsx, providers.tsx |
| 3 | Add font preloading optimization | a8ae0b6 | layout.tsx |

## Changes Made

### Task 1: Font Stack and Image Dimensions

**globals.css** - Fixed phantom Inter reference:
```css
/* Before */
--font-sans: "Inter", "Rubik", sans-serif;

/* After */
--font-sans: var(--font-rubik), "Rubik", ui-sans-serif, system-ui, sans-serif;
```
Inter was never loaded by next/font, causing a font swap on every page load.

**Hero.tsx** - Replaced raw `<img>` with Next.js Image:
- Removed `{/* eslint-disable-next-line @next/next/no-img-element */}` comment
- Added `import Image from "next/image"`
- Changed `<img src="static/images/..."` (missing leading slash) to `<Image src="/static/images/..." width={40} height={40}`

**MDXComponents.tsx** - Upgraded img passthrough:
- When width+height props available: uses Next.js Image component
- When dimensions missing (markdown images): adds `maxWidth: 100%`, `height: auto`, `loading: lazy`, `decoding: async` for layout containment

**AuthorLayout.js** - Verified already has `width={192} height={192}` on avatar Image. No changes needed.

### Task 2: Dynamic Content Stabilization

**NewsletterForm.tsx** - Added CSS containment to outer wrapper:
```tsx
style={{ height: "40vmin", minHeight: "360px", maxHeight: "400px", width: "100%",
         contain: "layout style", position: "relative", overflow: "hidden" }}
```
The `contain: layout style` prevents the Ghost `gh-signup-root` element (which initially renders at body level during the 100ms setTimeout) from affecting surrounding page layout.

**providers.tsx** - CookieConsent fixed positioning:
```tsx
style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999 }}
overlay={false}
```
Ensures the cookie banner floats above content and never displaces it.

### Task 3: Font Fallback Optimization

**layout.tsx** - Added `adjustFontFallback` and `fallback` to both fonts:
```tsx
const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
  adjustFontFallback: true,
});
```
`adjustFontFallback: true` makes Next.js automatically generate `size-adjust`, `ascent-override`, `descent-override`, and `line-height-override` CSS descriptors so the fallback system fonts render at identical metrics to the loaded web fonts.

Confirmed Font Awesome CSS import (`@fortawesome/fontawesome-svg-core/styles.css`) and `config.autoAddCss = false` remain unchanged (prevents FA from runtime CSS injection).

## Deviations from Plan

None - plan executed exactly as written.

The only observation: AuthorLayout.js was already correct with `width={192} height={192}` on the avatar Image component. The plan instructed to "check" and "if raw img, fix" — it was already using Next.js Image with explicit dimensions, so no changes were needed.

## Success Criteria Verification

- [x] Build succeeds (`npx next build` - all 3 tasks verified clean)
- [x] No raw `<img>` tags without dimensions in Hero (replaced with Next.js Image)
- [x] Font CSS stack matches loaded fonts (no phantom Inter reference)
- [x] Font fallbacks use size-adjust via `adjustFontFallback: true`
- [x] Newsletter container uses CSS containment to prevent layout shift
- [x] Cookie consent uses `position: fixed` + `overlay={false}`
- [ ] Lighthouse CLS < 0.1 (requires manual desktop Lighthouse run - cannot automate in build)

## Self-Check: PASSED

Files verified:
- FOUND: src/app/globals.css (--font-sans uses var(--font-rubik))
- FOUND: src/components/Hero.tsx (Image component, width=40, height=40)
- FOUND: src/components/MDXComponents.tsx (img handler with containment)
- FOUND: src/components/NewsletterForm.tsx (contain: layout style)
- FOUND: src/app/providers.tsx (position: fixed on CookieConsent)
- FOUND: src/app/layout.tsx (adjustFontFallback: true on both fonts)

Commits verified:
- FOUND: c11c7c3 (Task 1: font stack, Hero, MDXComponents)
- FOUND: 636f52b (Task 2: NewsletterForm, CookieConsent)
- FOUND: a8ae0b6 (Task 3: layout.tsx font fallback)
