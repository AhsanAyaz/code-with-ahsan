# Phase 1: Promptathon Live Host Panel — Research

**Researched:** 2026-03-27
**Domain:** Next.js 16 / React 19, Framer Motion, Firestore real-time, fullscreen presenter UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Route & Auth
- Presenter panel at `/events/cwa-promptathon/2026/host` — inside the event route, NOT under `/admin`
- Protected by `AdminAuthGate` component (same x-admin-token pattern, same localStorage key)
- Entire page is one fullscreen view shared as a browser tab during stream
- No Firebase user requirement needed for the host panel — admin token only

#### Presenter Panel Sections (in order)
1. Keynote / Welcome — CWA branding, date, host name
2. About the Community — community stats (from `COMMUNITY_STATS` constant)
3. Sponsors — sponsor logos with names, tiers, and UTM links; animated reveal
4. Judges — judge cards with photo, name, title, experience, LinkedIn
5. Mentors & Organizers — generic "thanks to our mentors & team" slide unless event has named list; capability to add names
6. Team Roll Call — one-by-one animated reveal (Spacebar / button), then spotlight on click; team names from event data
7. Themes — the 3 hackathon themes displayed as cards
8. Twist Reveal — dramatic animated countdown then twist text reveal (matches inspiration/promptathon-screens/twist-reveal.html style)
9. Send-Off / Hack! — final slide "Let's go" with timer countdown to 5 PM deadline
10. Winners Announcement (Part 2, same panel) — podium reveal: 3rd → 2nd → 1st → full podium, reads from Firestore in real-time

#### Navigation
- Top/bottom control bar with section buttons, hidden during fullscreen share with keyboard shortcut (H)
- Keyboard: Space/→ advance within section (e.g. next team), N/P for next/prev section, H hide controls, F fullscreen
- Section indicator always visible (e.g. "4 / 10")

#### Data Sources
- **Sponsors**: `CONFIRMED_SPONSORS` from `constants.ts` — update UTM links: CommandCode → `https://commandcode.ai?utm_source=codewithahsan`, Google → `https://ai.dev?utm_source=codewithahsan`
- **Judges**: `JUDGES` from `constants.ts` (already correct)
- **Themes**: `HACKATHON_THEMES` from `constants.ts`
- **Teams**: Add `HACKATHON_TEAMS` to `constants.ts` — 10 names: Zenith, Cipher, Quasar, Vortex, Axiom, Aether, Omnia, Meridian, Horizon, Nexus
- **Twist**: Add `HACKATHON_TWIST` to `constants.ts` — "The Human in the Loop" with description and per-theme examples
- **Mentors/Organizers**: Add `MENTORS` array to `constants.ts` (empty for now — generic slide if empty)
- **Winners**: Stored in Firestore `events/cwa-promptathon-2026/winners` — `{ first, second, third }` each with `{ teamName, projectDescription, judgeQuote }`

#### Firestore Winners Schema
```
events/{eventId}/winners:
  first:   { teamName, projectDescription, judgeQuote }
  second:  { teamName, projectDescription, judgeQuote }
  third:   { teamName, projectDescription, judgeQuote }
  announcedAt: timestamp
```

#### API Routes
- `GET /api/admin/events/[eventId]/winners` — read winners (public, for event page)
- `PUT /api/admin/events/[eventId]/winners` — set winners (requires x-admin-token)

#### Admin Winner Setter
- At `/admin/events/cwa-promptathon-2026` (or `/admin/events/[eventId]` generically)
- Simple form: 3 dropdowns (one per placement) to pick team name + free-text fields for projectDescription and judgeQuote
- Save button → PUT API → Firestore
- Confirmation toast on success

#### Public Event Page
- Winners section added to `/events/cwa-promptathon/2026/page.tsx`
- Hidden until `announcedAt` is set in Firestore
- Fetches via `GET /api/admin/events/cwa-promptathon-2026/winners`
- Shows podium: 1st (center, larger), 2nd (left), 3rd (right) — styled in hackathon dark theme

#### Visual Style
- Dark bg (`#07020F`), purple (`#6C2BD9`), cyan (`#00F5FF`), gold (`#FFD600`)
- Bebas Neue for headings, Space Mono for labels, Inter for body — same as inspiration HTML files
- Framer Motion for section transitions and reveals
- Grid background + vignette (as in team-rollcall.html) for the fullscreen slides

#### Reusability
- Event data structure designed so future hackathons just need a new `constants.ts`-style config or Firestore doc
- `eventId` param in API routes makes it generic
- Presenter panel reads from a typed event config object

#### Specific References
- Inspiration files: `inspiration/promptathon-screens/` — host-scripts.html, team-rollcall.html, twist-reveal.html, winners-screen.html, judges-reveal.html
- Existing constants: `src/app/events/cwa-promptathon/2026/constants.ts`
- Auth component: `src/components/admin/AdminAuthGate.tsx` (ADMIN_TOKEN_KEY = "mentorship_admin_token")
- Admin API pattern: `x-admin-token` header, validated server-side against Firestore `admin_sessions` collection
- Sponsor logos: `/static/images/events/cwa-promptathon-2026/sponsors/commandcode-logo.jpg` and `google-transparent.png`
- Judge photos: `/static/images/events/cwa-promptathon-2026/judges/`
- Twist text: "Every AI output must display a confidence score or uncertainty indicator. The user must be able to override or correct the AI — with the AI acknowledging or adapting to that correction in the same session."

### Claude's Discretion
- Exact animation timing and easing for section transitions
- Whether to use CSS animations or Framer Motion variants for slide reveals
- Exact layout of control bar
- Whether winners podium uses confetti (yes — tasteful)

### Deferred Ideas (OUT OF SCOPE)
- Team member linking to Discord user profiles (capability noted in data model but not built in this phase)
- Moving event config from constants.ts to Firestore fully (just winners go to Firestore now)
- Mentors named list (generic slide for now)
- Live chat/audience Q&A integration
- Stream overlay assets
</user_constraints>

---

## Summary

This phase builds a fullscreen live-stream presenter panel for the CWA Prompt-A-Thon 2026 hackathon, an admin winner management form, and a permanent winners display on the public event page. The work is 90% frontend (React + Framer Motion) with a thin API/Firestore backend for winners persistence.

The project already has every dependency needed: Framer Motion 12, Firebase 12 (client SDK + admin SDK), `canvas-confetti`, Tailwind 4 / DaisyUI 5, and the exact admin auth pattern. No new packages are required. The presenter panel is a single-page "slideshow" component with 10 sections; navigation state lives in React state, not the URL.

The biggest implementation consideration is the **AdminAuthGate incompatibility** for the host panel: the existing `AdminAuthGate` requires a Firebase user (via `MentorshipContext`) in addition to the admin token. The host panel must use a **slimmer, standalone auth gate** — same token/localStorage key, same `/api/mentorship/admin/auth` endpoint, but without requiring Firebase Auth login.

**Primary recommendation:** Build a `HostAuthGate` (thin wrapper, no Firebase user requirement) for the `/host` route. Everything else follows existing project patterns exactly.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.0.10 | Routing, API routes, SSR | Project standard |
| React | 19.2.1 | UI | Project standard |
| Framer Motion | 12.34.3 | Section transitions, card reveals, countdown animation | Already used in HeroSection.tsx; expressly chosen in CONTEXT.md |
| Firebase client SDK | 12.6.0 | `onSnapshot` real-time listener for winners | Already initialized in providers.tsx |
| firebase-admin | 13.6.0 | Firestore writes in API routes | Already used for all admin APIs |
| canvas-confetti | 1.9.4 | Winners confetti burst | Already installed; `@types/canvas-confetti` present |
| Tailwind CSS | 4 | Utility classes | Project standard |
| DaisyUI | 5.5.1 | Form components, toast, btn | Used in all admin pages |
| lucide-react | 0.562.0 | Icons | Used in HeroSection and admin pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | 4.1.0 | Countdown timer arithmetic for Send-Off slide | Already used; cleaner than raw Date math |
| `useToast` (internal) | — | Success/error toasts in winner admin form | `ToastContext` already provides `success()` and `error()` helpers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Framer Motion | CSS keyframe animations (as in inspiration HTML) | CSS is lighter but Framer Motion is already in the project and provides better React integration for conditional reveals |
| canvas-confetti | Custom DOM confetti (as in winners-screen.html) | canvas-confetti is already installed and handles edge cases; no reason to hand-roll |
| `onSnapshot` real-time listener | Polling via `setInterval` + fetch | `onSnapshot` is zero-latency and already used in PostDetail.tsx — use it |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/events/cwa-promptathon/2026/
├── host/
│   └── page.tsx                  # Host panel entry — HostAuthGate + HostPanel
├── components/
│   ├── host/                     # All host-panel section components
│   │   ├── HostPanel.tsx         # Section state machine + keyboard handler
│   │   ├── ControlBar.tsx        # Navigation buttons + section indicator
│   │   ├── SlideBackground.tsx   # Grid + vignette (reused across all sections)
│   │   ├── sections/
│   │   │   ├── KeynoteSection.tsx
│   │   │   ├── CommunitySection.tsx
│   │   │   ├── SponsorsSection.tsx
│   │   │   ├── JudgesSection.tsx
│   │   │   ├── MentorsSection.tsx
│   │   │   ├── TeamRollCallSection.tsx
│   │   │   ├── ThemesSection.tsx
│   │   │   ├── TwistRevealSection.tsx
│   │   │   ├── SendOffSection.tsx
│   │   │   └── WinnersSection.tsx
│   └── WinnersDisplay.tsx        # Public-facing winners podium (added to page.tsx)
src/app/admin/events/
└── [eventId]/
    └── page.tsx                  # Admin winner setter form
src/app/api/admin/events/
└── [eventId]/
    └── winners/
        └── route.ts              # GET (public) + PUT (admin-protected)
src/components/admin/
└── HostAuthGate.tsx              # Thin auth gate — token only, no Firebase user
```

### Pattern 1: Section State Machine in HostPanel
**What:** A `currentSection` index + per-section sub-state (e.g., `revealedCount` for team roll call) managed in React state. Each section component receives its state as props.
**When to use:** Single-page fullscreen panel; URL routing would add unnecessary complexity and break fullscreen flow.
**Example:**
```typescript
// src/app/events/cwa-promptathon/2026/components/host/HostPanel.tsx
"use client";
import { useState, useEffect, useCallback } from "react";

const SECTIONS = [
  "keynote", "community", "sponsors", "judges",
  "mentors", "rollcall", "themes", "twist", "sendoff", "winners"
] as const;
type Section = typeof SECTIONS[number];

export default function HostPanel() {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0); // for roll call & judges
  const [twistPhase, setTwistPhase] = useState<"suspense" | "countdown" | "reveal">("suspense");
  const [winnersPhase, setWinnersPhase] = useState<"waiting" | "third" | "second" | "first" | "podium">("waiting");
  const [controlsVisible, setControlsVisible] = useState(true);

  const advanceSection = useCallback(() => {
    setSectionIndex(i => Math.min(i + 1, SECTIONS.length - 1));
    setRevealedCount(0); // reset sub-state on section change
  }, []);

  const retreatSection = useCallback(() => {
    setSectionIndex(i => Math.max(i - 1, 0));
    setRevealedCount(0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") advanceSection();
      if (e.key === "p" || e.key === "P") retreatSection();
      if (e.key === "h" || e.key === "H") setControlsVisible(v => !v);
      if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.();
      // Space / ArrowRight: advance within section (passed to active section component)
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advanceSection, retreatSection]);

  // ...render active section based on sectionIndex
}
```

### Pattern 2: Framer Motion `AnimatePresence` for Section Transitions
**What:** Wrap section components in `AnimatePresence mode="wait"` so the outgoing section exits before the incoming one enters.
**When to use:** All section transitions in HostPanel.
**Example:**
```typescript
// Source: Framer Motion docs — AnimatePresence
import { AnimatePresence, motion } from "framer-motion";

// In HostPanel render:
<AnimatePresence mode="wait">
  <motion.div
    key={sectionIndex}
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -30 }}
    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    className="absolute inset-0"
  >
    {renderSection()}
  </motion.div>
</AnimatePresence>
```

### Pattern 3: Firestore `onSnapshot` for Real-Time Winners
**What:** Client-side `onSnapshot` listener on `events/cwa-promptathon-2026/winners` doc. WinnersSection mounts the listener; unmount cleans it up.
**When to use:** WinnersSection component only — mounted when sectionIndex === 9.
**Example:**
```typescript
// Source: Pattern from PostDetail.tsx in this project
"use client";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getApp } from "firebase/app";
import { useEffect, useState } from "react";

function useWinnersRealtime(eventId: string) {
  const [winners, setWinners] = useState<WinnersData | null>(null);
  useEffect(() => {
    const db = getFirestore(getApp());
    const unsub = onSnapshot(doc(db, "events", eventId, "winners", "data"), (snap) => {
      if (snap.exists()) setWinners(snap.data() as WinnersData);
    });
    return unsub;
  }, [eventId]);
  return winners;
}
```
**Note:** The CONTEXT.md schema shows `events/{eventId}/winners` as a single document (not a subcollection). Adjust path to: `doc(db, "events", eventId)` and read the `winners` field, OR store winners as a sub-document `events/{eventId}/winners/data`. Sub-document is cleaner — use that.

### Pattern 4: HostAuthGate (no Firebase user requirement)
**What:** Stripped-down version of `AdminAuthGate` that skips the Firebase Auth check (`user` requirement). Uses the same `ADMIN_TOKEN_KEY` localStorage key and `/api/mentorship/admin/auth` endpoint.
**When to use:** `/events/cwa-promptathon/2026/host/page.tsx` only.
**Example:**
```typescript
// src/components/admin/HostAuthGate.tsx
"use client";
import { useState, useEffect } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

export default function HostAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  // Same token-check logic as AdminAuthGate, but NO user/MentorshipProvider dependency
  // ...
}
```
**Key insight:** The existing `AdminAuthGate` requires `MentorshipContext` which in turn has complex dependencies. A standalone `HostAuthGate` avoids wrapping the host panel in `MentorshipProvider`.

### Pattern 5: Admin API Route (winners PUT/GET)
**What:** Follow the exact pattern in `src/app/api/admin/courses/route.ts` — `checkAdminAuth()` helper validates `x-admin-token` against `admin_sessions` Firestore collection.
**Example:**
```typescript
// src/app/api/admin/events/[eventId]/winners/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

async function checkAdminAuth(request: NextRequest) {
  const token = request.headers.get("x-admin-token");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionDoc = await db.collection("admin_sessions").doc(token).get();
  if (!sessionDoc.exists) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = sessionDoc.data();
  if ((session?.expiresAt?.toDate?.() ?? new Date(0)) < new Date()) {
    await db.collection("admin_sessions").doc(token).delete();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  // No auth required — public read
  const snap = await db.doc(`events/${params.eventId}/winners/data`).get();
  return NextResponse.json(snap.exists() ? snap.data() : null);
}

export async function PUT(request: NextRequest, { params }: { params: { eventId: string } }) {
  const authErr = await checkAdminAuth(request);
  if (authErr) return authErr;
  const body = await request.json();
  await db.doc(`events/${params.eventId}/winners/data`).set({
    ...body,
    announcedAt: new Date(),
  });
  return NextResponse.json({ success: true });
}
```

### Pattern 6: canvas-confetti (already in project)
**What:** Import `confetti` from `canvas-confetti` and fire a burst on first-place reveal and full podium show.
**Example:**
```typescript
// Source: LogicBuddyClient.tsx in this project already uses this
import confetti from "canvas-confetti";

function launchWinnersConfetti() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#FFD600", "#6C2BD9", "#00F5FF", "#ffffff"],
  });
}
```

### Anti-Patterns to Avoid
- **Mounting all 10 sections at once:** Only render the active section. Avoids layout conflicts and unnecessary re-renders.
- **Firestore listener outside section component:** Mount `onSnapshot` inside WinnersSection, not at the HostPanel root. Prevents unneeded connection when presenter is on section 1.
- **Using Next.js router for section navigation:** `router.push()` causes page re-renders and breaks fullscreen mode. Use React state only.
- **Using `document.fullscreenElement` checks without SSR guard:** All fullscreen APIs must be behind `typeof window !== "undefined"` or `useEffect`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti burst | Custom DOM confetti (as in winners-screen.html) | `canvas-confetti` | Already installed; handles canvas lifecycle, retina scaling, cleanup |
| Countdown timer | Manual Date arithmetic | `useEffect` + `setInterval` + existing pattern from HeroSection.tsx | Pattern already exists in project |
| Toast notifications | Custom toast component | `useToast()` from `ToastContext` | Already in providers; `success()` and `error()` methods ready |
| Admin auth check | New token validation | `checkAdminAuth()` pattern from `src/app/api/admin/courses/route.ts` | Consistent with all existing admin APIs |
| Framer Motion spring animation | CSS `cubic-bezier` | `transition={{ ease: [0.16, 1, 0.3, 1] }}` | Already used in project; the inspiration files use the same `cubic-bezier(0.16, 1, 0.3, 1)` value |

---

## Common Pitfalls

### Pitfall 1: AdminAuthGate Firebase User Dependency
**What goes wrong:** Wrapping the host panel in `AdminAuthGate` requires `MentorshipContext` → triggers Firebase Auth check → redirects to login popup even for admin-only use.
**Why it happens:** `AdminAuthGate` has two guards: Firebase user AND admin token. Host panel only needs admin token.
**How to avoid:** Build `HostAuthGate` — same token logic, no `useMentorship()` call.
**Warning signs:** Panel shows "Please sign in" before the admin password form.

### Pitfall 2: `onSnapshot` with Uninitialized Firebase App
**What goes wrong:** `getApp()` throws if called before Firebase is initialized (SSR or if providers.tsx hasn't run).
**Why it happens:** Firebase is initialized in `providers.tsx` client-side only.
**How to avoid:** Always call `getApp()` inside `useEffect` (guaranteed client-side). The PostDetail.tsx pattern in the project already does this correctly.
**Warning signs:** `"No Firebase App '[DEFAULT]' has been created"` error on first render.

### Pitfall 3: Fullscreen API in Next.js App Router
**What goes wrong:** `document.documentElement.requestFullscreen()` throws during SSR or in server components.
**Why it happens:** `document` is undefined on the server.
**How to avoid:** Wrap fullscreen calls in `useEffect` or `typeof window !== "undefined"` guards. The `F` key handler must be inside the `useEffect` keyboard listener.

### Pitfall 4: `AnimatePresence` Key Must Change on Section Switch
**What goes wrong:** Section transition animation doesn't fire on advance/retreat.
**Why it happens:** Framer Motion only animates `exit`/`enter` when the `key` prop changes.
**How to avoid:** Use `key={sectionIndex}` (or `key={SECTIONS[sectionIndex]}`) on the motion wrapper inside `AnimatePresence`.

### Pitfall 5: Twist Reveal Countdown Leak
**What goes wrong:** `setInterval` for the 5-4-3-2-1 countdown keeps firing after section changes or component unmounts.
**Why it happens:** `clearInterval` not called on cleanup.
**How to avoid:** Store interval ref in `useRef` inside TwistRevealSection; return cleanup from `useEffect`. Pattern: same as HeroSection.tsx countdown.

### Pitfall 6: Public Event Page Hydration Mismatch for Winners
**What goes wrong:** `page.tsx` is `"use client"` — if winners are fetched server-side via `fetch` it may differ from client render.
**Why it happens:** Winners state depends on network fetch timing.
**How to avoid:** Fetch winners client-side in a `useEffect` inside the new `WinnersDisplay` component. Show nothing (hidden) until fetch completes and `announcedAt` is present.

### Pitfall 7: `[eventId]` Dynamic Route in API — `params` Must Be Awaited
**What goes wrong:** `params.eventId` is `undefined` in Next.js 15+.
**Why it happens:** In Next.js 15, dynamic route params are now a Promise.
**How to avoid:** Use `const { eventId } = await params;` in the route handler, or use `{ params }: { params: Promise<{ eventId: string }> }` type. Check existing pattern — `src/app/api/admin/courses/route.ts` uses non-dynamic routes; look at any `[id]` route in the project for the current convention.

---

## Code Examples

### Slide Background (Grid + Vignette)
```typescript
// Converted from team-rollcall.html and twist-reveal.html inspiration
// src/app/events/cwa-promptathon/2026/components/host/SlideBackground.tsx
"use client";
export default function SlideBackground({ pulse = false }: { pulse?: boolean }) {
  return (
    <>
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(108,43,217,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(108,43,217,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
          opacity: 0.6,
          animation: pulse ? "gridPulse 4s ease-in-out infinite" : undefined,
        }}
      />
      <div
        className="fixed inset-0 z-[1]"
        style={{
          background: "radial-gradient(ellipse at center, transparent 20%, rgba(7,2,15,0.9) 100%)",
        }}
      />
    </>
  );
}
```

### Section Indicator
```typescript
// Always-visible position indicator
<div
  className="fixed top-4 left-1/2 -translate-x-1/2 z-50 font-mono text-xs tracking-widest"
  style={{ color: "rgba(240,238,255,0.35)" }}
>
  {sectionIndex + 1} / {SECTIONS.length}
</div>
```

### Team Roll Call — Staggered Reveal
```typescript
// TeamRollCallSection.tsx
// revealedCount is passed from parent; Spacebar increments it
<div className="grid grid-cols-5 gap-3">
  {teams.map((name, i) => (
    <motion.div
      key={name}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={i < revealedCount ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-5 text-center cursor-pointer"
      style={{
        background: "rgba(108,43,217,0.1)",
        border: "1px solid rgba(108,43,217,0.3)",
      }}
    >
      <div className="font-['Bebas_Neue'] text-2xl">{name}</div>
    </motion.div>
  ))}
</div>
```

### Admin Winner Form Pattern
```typescript
// src/app/admin/events/[eventId]/page.tsx
// Uses same pattern as admin/courses/page.tsx
"use client";
import { useToast } from "@/contexts/ToastContext";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

export default function AdminEventWinnersPage({ params }) {
  const { success, error } = useToast();
  const token = typeof window !== "undefined"
    ? localStorage.getItem(ADMIN_TOKEN_KEY)
    : null;

  const handleSave = async (formData: WinnersFormData) => {
    const res = await fetch(`/api/admin/events/${params.eventId}/winners`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token ?? "",
      },
      body: JSON.stringify(formData),
    });
    if (res.ok) success("Winners saved successfully!");
    else error("Failed to save winners");
  };
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.fullscreenElement` polling | `document.fullscreenchange` event | Always been the right way | Use event listener, not polling |
| Separate HTML files per slide (inspiration approach) | Single React component with section state | This phase | Unified keyboard handling, shared Firestore listener, no tab switching |
| Manual confetti DOM manipulation (winners-screen.html) | `canvas-confetti` npm package | Package already in project | Retina-safe, frame-rate optimized |

**Deprecated/outdated:**
- The standalone HTML files in `inspiration/promptathon-screens/` are reference material only — do NOT serve them. They are design specs.

---

## Key Findings from Existing Codebase

### AdminAuthGate Has Two Gates — Host Panel Needs One
`AdminAuthGate` requires: (1) Firebase Auth user via `useMentorship()`, AND (2) admin token. The host panel context spec says "No Firebase user requirement" — a separate `HostAuthGate` is the correct approach.

### Firebase Client SDK Already Initialized
`providers.tsx` initializes Firebase with `initializeApp(firebaseConfig)` on client mount. All components can safely call `getApp()` inside `useEffect`. The `onSnapshot` pattern from `PostDetail.tsx` is the template.

### canvas-confetti Already Installed + Typed
`canvas-confetti@1.9.4` and `@types/canvas-confetti` are in `package.json`. No install needed. The `LogicBuddyClient.tsx` file shows usage. Import as `import confetti from "canvas-confetti"`.

### Font Loading Strategy
The inspiration HTML files load Bebas Neue, Space Mono, and Inter from Google Fonts via `@import`. For the React implementation, these should be loaded via Next.js `next/font/google` in the host layout or as CSS custom properties — do NOT use `@import` in component CSS.

### Framer Motion Version
Project has Framer Motion 12.34.3. The `motion` and `AnimatePresence` APIs are the same as v10/v11. The `transition.ease` array syntax `[0.16, 1, 0.3, 1]` (from inspiration files) maps directly to Framer Motion's `ease` prop.

### No Existing `/admin/events/` Route
The admin panel does not yet have an events subdirectory. The new `/admin/events/[eventId]/page.tsx` is a net-new route inside the existing admin layout — it will automatically inherit `AdminAuthGate` + `AdminNavigation` from `admin/layout.tsx`.

### CONFIRMED_SPONSORS UTM Links Need Update
Current `constants.ts` has plain websiteUrl values (`https://commandcode.ai`, `https://google.com`). CONTEXT.md requires updating to UTM links for the host panel display. Update these in `constants.ts` directly.

---

## Open Questions

1. **Firestore document path for winners**
   - What we know: CONTEXT.md schema shows `events/{eventId}/winners` as the path
   - What's unclear: Is `winners` a document or a sub-collection? Schema shows scalar fields directly on it — so it's a document, but the collection `events` needs a document `cwa-promptathon-2026` which then has a `winners` sub-document.
   - Recommendation: Use `events/cwa-promptathon-2026/winners/data` (sub-document under winners sub-collection) for cleaner structure. The API route and `onSnapshot` use this path consistently.

2. **Dynamic params in Next.js 16**
   - What we know: Next.js 15 changed dynamic route params to be async Promises
   - What's unclear: Whether this project has already adopted the async params pattern
   - Recommendation: Check any existing `[id]` or `[slug]` route in the project for the current convention before writing the `[eventId]` route. The `src/app/api/admin/courses/route.ts` is non-dynamic, so check `/app/courses/[course]/` routes.

3. **Host panel Google Fonts loading**
   - What we know: The host panel needs Bebas Neue (not used elsewhere in the app)
   - What's unclear: Whether to add it to the root layout or create a `layout.tsx` for the host route
   - Recommendation: Create `src/app/events/cwa-promptathon/2026/host/layout.tsx` that loads Bebas Neue + Space Mono via `next/font/google` and passes the CSS variables to the page. This avoids polluting the global layout.

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOST-01 | `HostAuthGate` renders login form when no token in localStorage | unit | `npx vitest run src/__tests__/host/HostAuthGate.test.tsx -x` | Wave 0 |
| HOST-02 | `HostAuthGate` renders children when valid token present | unit | `npx vitest run src/__tests__/host/HostAuthGate.test.tsx -x` | Wave 0 |
| API-01 | `GET /api/admin/events/[eventId]/winners` returns null when no winners set | unit | `npx vitest run src/__tests__/api/winners.test.ts -x` | Wave 0 |
| API-02 | `PUT /api/admin/events/[eventId]/winners` rejects without x-admin-token | unit | `npx vitest run src/__tests__/api/winners.test.ts -x` | Wave 0 |
| API-03 | `PUT /api/admin/events/[eventId]/winners` saves all three placements | unit | `npx vitest run src/__tests__/api/winners.test.ts -x` | Wave 0 |
| UI-01 | WinnersDisplay hides when `announcedAt` is null | unit | `npx vitest run src/__tests__/host/WinnersDisplay.test.tsx -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/host/HostAuthGate.test.tsx` — covers HOST-01, HOST-02
- [ ] `src/__tests__/api/winners.test.ts` — covers API-01, API-02, API-03
- [ ] `src/__tests__/host/WinnersDisplay.test.tsx` — covers UI-01

*(Existing test infrastructure in `src/__tests__/` covers other areas; the above are new gaps for this phase.)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/app/api/admin/courses/route.ts` — admin auth pattern
- Direct codebase inspection: `src/components/admin/AdminAuthGate.tsx` — auth gate implementation
- Direct codebase inspection: `src/app/providers.tsx` — Firebase client initialization
- Direct codebase inspection: `src/app/courses/[course]/[post]/PostDetail.tsx` — `onSnapshot` pattern
- Direct codebase inspection: `src/contexts/ToastContext.tsx` — toast API
- Direct codebase inspection: `package.json` — confirmed installed versions
- Direct codebase inspection: `inspiration/promptathon-screens/*.html` — visual/animation specs

### Secondary (MEDIUM confidence)
- Framer Motion 12 docs (from prior research + codebase usage in HeroSection.tsx) — `AnimatePresence`, `motion`, `transition` API unchanged from v10+
- canvas-confetti npm README — `confetti()` API with `particleCount`, `spread`, `origin`, `colors`

### Tertiary (LOW confidence)
- Next.js 16 dynamic route params async change — assumed consistent with Next.js 15 change; verify by checking an existing `[slug]` route in the project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in package.json
- Architecture: HIGH — patterns directly derived from existing project code
- Pitfalls: HIGH — HostAuthGate issue derived from direct code analysis; others from Next.js/React known patterns
- Animation specs: HIGH — directly from inspiration HTML files, translated to Framer Motion equivalents

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable stack; Framer Motion + Firebase APIs don't change rapidly)
