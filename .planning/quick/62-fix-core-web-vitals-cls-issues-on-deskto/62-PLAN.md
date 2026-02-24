---
phase: quick-062
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/components/Hero.tsx
  - src/components/MDXComponents.tsx
  - src/components/NewsletterForm.tsx
  - src/app/layout.tsx
  - src/layouts/AuthorLayout.tsx
autonomous: true
requirements: [CLS-FIX]

must_haves:
  truths:
    - "All pages score CLS < 0.1 on desktop (Google Lighthouse)"
    - "No raw <img> tags without explicit width/height attributes in critical rendering paths"
    - "Fonts loaded via next/font match CSS font stack declarations"
    - "Dynamically injected content (newsletter, ads) has reserved space"
  artifacts:
    - path: "src/app/globals.css"
      provides: "Fixed font-sans stack to match loaded fonts (Rubik only, not Inter)"
    - path: "src/components/Hero.tsx"
      provides: "GDE badge image uses Next.js Image with explicit dimensions"
    - path: "src/components/MDXComponents.tsx"
      provides: "MDX img component enforces layout stability"
    - path: "src/components/NewsletterForm.tsx"
      provides: "Newsletter container with stable dimensions preventing CLS"
  key_links:
    - from: "src/app/layout.tsx"
      to: "src/app/globals.css"
      via: "font variables applied to body"
      pattern: "font-rubik.*font-mono"
    - from: "src/app/globals.css"
      to: "tailwind.config.js"
      via: "CSS custom properties matching Tailwind font family config"
      pattern: "--font-sans.*Rubik"
---

<objective>
Fix Core Web Vitals CLS (Cumulative Layout Shift) issues across all desktop pages to bring CLS below 0.1 threshold.

Purpose: Google Search Console reports 11 URLs with CLS > 0.1 on desktop, 0 URLs in "good" category. Fixing CLS improves search ranking and user experience.
Output: Modified components and CSS that eliminate layout shift sources site-wide.
</objective>

<execution_context>
@/home/ahsan/.claude/get-shit-done/workflows/execute-plan.md
@/home/ahsan/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/layout.tsx (root layout - font loading)
@src/app/globals.css (CSS font declarations)
@tailwind.config.js (Tailwind font family config)
@src/components/Hero.tsx (raw img tag without dimensions)
@src/components/MDXComponents.tsx (img passthrough)
@src/components/NewsletterForm.tsx (dynamic script injection)
@src/app/providers.tsx (CookieConsent banner)
@src/components/LayoutWrapper.tsx (header/nav structure)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix font stack mismatch and image dimension issues</name>
  <files>
    src/app/globals.css
    src/components/Hero.tsx
    src/components/MDXComponents.tsx
    src/layouts/AuthorLayout.tsx
  </files>
  <action>
  This task fixes the three most impactful CLS sources across the site.

  **1. Fix font-sans mismatch in globals.css (HIGH IMPACT - affects ALL pages):**
  In `src/app/globals.css` line 8, the `--font-sans` is declared as `"Inter", "Rubik", sans-serif` but the app only loads Rubik via `next/font/google` in layout.tsx. Inter is never loaded. The browser attempts to use Inter, fails, falls back to Rubik -- causing a font swap layout shift on every single page.

  Change line 8 from:
  ```
  --font-sans: "Inter", "Rubik", sans-serif;
  ```
  to:
  ```
  --font-sans: var(--font-rubik), "Rubik", ui-sans-serif, system-ui, sans-serif;
  ```

  This ensures the CSS font stack matches what next/font actually loads. Using `var(--font-rubik)` references the exact font file loaded by Next.js (with automatic size-adjust and font-display:swap), followed by the named fallback for any edge cases.

  **2. Fix raw `<img>` in Hero.tsx (affects homepage + any page showing Hero):**
  In `src/components/Hero.tsx` lines 139-144, the GDE badge uses a raw `<img>` without width/height attributes:
  ```
  <img src="static/images/gde_logo_brackets.png" alt="GDE" className="w-10 h-10 object-contain" />
  ```

  Replace with Next.js Image component with explicit dimensions:
  - Add `import Image from "next/image"` at the top (alongside existing imports)
  - Replace the raw `<img>` with:
  ```tsx
  <Image
    src="/static/images/gde_logo_brackets.png"
    alt="GDE"
    width={40}
    height={40}
    className="object-contain"
  />
  ```
  Note the leading `/` in the src path (the original is missing it -- fix this too).
  Also remove the `{/* eslint-disable-next-line @next/next/no-img-element */}` comment on line 139 since we are now using Next.js Image.

  **3. Fix MDXComponents img passthrough (affects /about and any MDX content):**
  In `src/components/MDXComponents.tsx` line 46, the img component is a raw passthrough:
  ```
  img: (props: any) => <img {...props} />,
  ```

  Replace with a version that uses Next.js Image when width/height are available, or adds CSS containment when they are not:
  ```tsx
  img: (props: any) => {
    if (props.width && props.height) {
      return <Image src={props.src} alt={props.alt || ""} width={Number(props.width)} height={Number(props.height)} className={props.className} />;
    }
    // For images without explicit dimensions (e.g., from markdown), contain layout shift
    return <img {...props} style={{ ...props.style, maxWidth: "100%", height: "auto" }} loading="lazy" decoding="async" />;
  },
  ```
  The Image import already exists at the top of MDXComponents.tsx (line 4), but it imports the custom `./Image` wrapper which wraps `next/image`. Use that existing import.

  **4. Check AuthorLayout.tsx for avatar image dimensions:**
  Read `src/layouts/AuthorLayout.tsx` and verify the author avatar image uses Next.js Image with explicit width/height. If it uses a raw `<img>` or Image without dimensions, add explicit width={192} height={192} (or whatever the rendered size is). This is the /about page layout.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
    <manual>Build succeeds without errors. Verify no raw img tags remain in critical components.</manual>
  </verify>
  <done>
  - globals.css font-sans stack matches the fonts actually loaded by next/font (Rubik, not Inter)
  - Hero.tsx GDE badge uses Next.js Image with width={40} height={40}
  - MDXComponents.tsx img handler either uses Next.js Image (when dimensions available) or adds height:auto + max-width:100% containment
  - AuthorLayout avatar has explicit dimensions
  - Build passes without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Stabilize dynamic content injection (newsletter + cookie consent)</name>
  <files>
    src/components/NewsletterForm.tsx
    src/app/providers.tsx
  </files>
  <action>
  Fix CLS from dynamically injected content that shifts page layout after initial render.

  **1. Stabilize NewsletterForm.tsx (appears on homepage, books page, course detail pages):**
  The Ghost newsletter signup form script creates a `div.gh-signup-root` at body level, then a setTimeout(100ms) moves it into the container. During those 100ms, the element appears at the bottom of the page then jumps into the container -- causing layout shift.

  Current container has `style={{ height: "40vmin", minHeight: "360px" }}` which is good for reserving space, but the issue is the script's element renders at body level first.

  Fix approach:
  a. Add `contain: layout style` CSS to the outer container div to create a containment context that prevents external elements from affecting layout.
  b. Ensure the newsletter container div has `position: relative` and `overflow: hidden` to clip any content that might overflow during the transition.
  c. Change the inner div to also have a min-height that matches the expected form height:

  Update the component:
  ```tsx
  <div style={{ height: "40vmin", minHeight: "360px", maxHeight: "400px", width: "100%", contain: "layout style", position: "relative", overflow: "hidden" }}>
    <div
      id="newsletter-container"
      style={{ maxHeight: "400px", overflow: "hidden", height: "100%", position: "relative" }}
    ></div>
  ```

  **2. Fix CookieConsent CLS in providers.tsx:**
  The `react-cookie-consent` component renders a fixed banner at the bottom of the viewport. While fixed-position elements typically don't cause CLS (they don't push content), the CookieConsent library might use a non-fixed position initially or during animation.

  Add explicit styling to ensure it never causes CLS:
  ```tsx
  <CookieConsent
    buttonStyle={{
      backgroundColor: "rgb(99 102 241)",
      color: "white",
      borderRadius: "4px",
    }}
    style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
    }}
    overlay={false}
  >
  ```

  The `position: fixed` + `overlay={false}` ensures the cookie banner never shifts any page content. It floats above the content.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
    <manual>Load homepage in Chrome DevTools > Performance panel > check CLS metric. Newsletter section should not cause layout shift. Cookie consent banner should appear without shifting page content.</manual>
  </verify>
  <done>
  - NewsletterForm container uses CSS containment to prevent layout shift from external script injection
  - CookieConsent explicitly uses position:fixed to ensure no content displacement
  - Build passes without errors
  - Homepage newsletter section has stable dimensions throughout loading lifecycle
  </done>
</task>

<task type="auto">
  <name>Task 3: Add font preloading optimization and verify site-wide CLS fixes</name>
  <files>
    src/app/layout.tsx
  </files>
  <action>
  Optimize the font loading strategy to further reduce CLS from font rendering.

  **1. Verify font loading configuration in layout.tsx:**
  The current font configuration is mostly correct:
  - `display: "swap"` is set on both Rubik and JetBrains Mono (good)
  - Fonts are applied as CSS variables (good)
  - `config.autoAddCss = false` prevents FontAwesome CSS from being auto-injected (good)

  However, add `fallback` and `adjustFontFallback` to minimize the shift when swapping from system font to loaded font:

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

  The `adjustFontFallback: true` makes Next.js automatically generate `size-adjust`, `ascent-override`, `descent-override`, and `line-height-override` CSS descriptors for fallback fonts. This means when the browser initially renders with the system fallback font, it will be sized identically to Rubik/JetBrains Mono, eliminating the layout shift when the actual font loads.

  The `fallback` array tells Next.js which system fonts to apply the size adjustments to, ensuring the closest possible match before the web font loads.

  **2. Do NOT change anything about the body className** -- the current `${rubik.variable} ${jetbrainsMono.variable} antialiased` is correct and should remain.

  **3. Verify the Font Awesome CSS import on line 8 is still present** -- `import "@fortawesome/fontawesome-svg-core/styles.css"` combined with `config.autoAddCss = false` on line 12 is the correct pattern to prevent FA from injecting CSS at runtime (which causes CLS). Just confirm these lines are unchanged.
  </action>
  <verify>
    <automated>cd /home/ahsan/projects/code-with-ahsan && npx next build 2>&1 | tail -20</automated>
    <manual>Run Lighthouse on desktop for homepage URL. CLS should be below 0.1. Check that fonts render without visible FOUT by watching page load in slow 3G throttling mode in Chrome DevTools.</manual>
  </verify>
  <done>
  - Rubik font uses adjustFontFallback with explicit fallback array for zero-CLS font swap
  - JetBrains Mono font uses adjustFontFallback with explicit fallback array
  - Font Awesome CSS import confirmed present and autoAddCss confirmed disabled
  - Build passes without errors
  - All font-related CLS sources eliminated via automatic size-adjust descriptors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. Run `npx next start` and use Chrome Lighthouse (desktop mode) on homepage -- CLS should be < 0.1
3. Check /about, /courses, /books pages in Lighthouse -- all should show CLS < 0.1
4. Visual inspection: page load should show no visible content jumping or shifting
</verification>

<success_criteria>
- Build succeeds
- No raw `<img>` tags without dimensions in critical rendering path components (Hero, MDX)
- Font CSS stack matches loaded fonts (no phantom "Inter" reference)
- Font fallbacks use size-adjust via adjustFontFallback
- Newsletter form container prevents CLS from external script injection
- Cookie consent uses fixed positioning
- Lighthouse CLS score < 0.1 on desktop for homepage
</success_criteria>

<output>
After completion, create `.planning/quick/62-fix-core-web-vitals-cls-issues-on-deskto/62-SUMMARY.md`
</output>
