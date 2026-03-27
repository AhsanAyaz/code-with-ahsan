# Phase 1: Promptathon Live Host Panel — Context

**Gathered:** 2026-03-27
**Status:** Ready for planning
**Source:** Conversation — PRD-style context

<domain>
## Phase Boundary

Build a live-stream presenter panel for the CWA Prompt-A-Thon 2026 hackathon host. The admin opens it on the day, logs in with the existing admin password, then shares the browser tab while streaming. Section-by-section navigation (buttons + keyboard) lets the host smoothly move through the event flow. Winners are set live from an admin form and immediately appear both on the presenter panel and permanently on the public event page.

</domain>

<decisions>
## Implementation Decisions

### Route & Auth
- Presenter panel at `/events/cwa-promptathon/2026/host` — inside the event route, NOT under `/admin`
- Protected by `AdminAuthGate` component (same x-admin-token pattern, same localStorage key)
- Entire page is one fullscreen view shared as a browser tab during stream
- No Firebase user requirement needed for the host panel — admin token only

### Presenter Panel Sections (in order)
1. **Keynote / Welcome** — CWA branding, date, host name
2. **About the Community** — community stats (from `COMMUNITY_STATS` constant)
3. **Sponsors** — sponsor logos with names, tiers, and UTM links; animated reveal
4. **Judges** — judge cards with photo, name, title, experience, LinkedIn
5. **Mentors & Organizers** — generic "thanks to our mentors & team" slide unless event has named list; capability to add names
6. **Team Roll Call** — one-by-one animated reveal (Spacebar / button), then spotlight on click; team names from event data
7. **Themes** — the 3 hackathon themes displayed as cards
8. **Twist Reveal** — dramatic animated countdown then twist text reveal (matches inspiration/promptathon-screens/twist-reveal.html style)
9. **Send-Off / Hack!** — final slide "Let's go" with timer countdown to 5 PM deadline
10. **Winners Announcement** (Part 2, same panel) — podium reveal: 3rd → 2nd → 1st → full podium, reads from Firestore in real-time

### Navigation
- Top/bottom control bar with section buttons, hidden during fullscreen share with keyboard shortcut (H)
- Keyboard: Space/→ advance within section (e.g. next team), N/P for next/prev section, H hide controls, F fullscreen
- Section indicator always visible (e.g. "4 / 10")

### Data Sources
- **Sponsors**: `CONFIRMED_SPONSORS` from `constants.ts` — update UTM links: CommandCode → `https://commandcode.ai?utm_source=codewithahsan`, Google → `https://ai.dev?utm_source=codewithahsan`
- **Judges**: `JUDGES` from `constants.ts` (already correct)
- **Themes**: `HACKATHON_THEMES` from `constants.ts`
- **Teams**: Add `HACKATHON_TEAMS` to `constants.ts` — 10 names: Zenith, Cipher, Quasar, Vortex, Axiom, Aether, Omnia, Meridian, Horizon, Nexus
- **Twist**: Add `HACKATHON_TWIST` to `constants.ts` — "The Human in the Loop" with description and per-theme examples
- **Mentors/Organizers**: Add `MENTORS` array to `constants.ts` (empty for now — generic slide if empty)
- **Winners**: Stored in Firestore `events/cwa-promptathon-2026/winners` — { first, second, third } each with { teamName, projectDescription, judgeQuote }

### Firestore Winners Schema
```
events/{eventId}/winners:
  first:   { teamName, projectDescription, judgeQuote }
  second:  { teamName, projectDescription, judgeQuote }
  third:   { teamName, projectDescription, judgeQuote }
  announcedAt: timestamp
```

### API Routes
- `GET /api/admin/events/[eventId]/winners` — read winners (public, for event page)
- `PUT /api/admin/events/[eventId]/winners` — set winners (requires x-admin-token)

### Admin Winner Setter
- At `/admin/events/cwa-promptathon-2026` (or `/admin/events/[eventId]` generically)
- Simple form: 3 dropdowns (one per placement) to pick team name + free-text fields for projectDescription and judgeQuote
- Save button → PUT API → Firestore
- Confirmation toast on success

### Public Event Page
- Winners section added to `/events/cwa-promptathon/2026/page.tsx`
- Hidden until `announcedAt` is set in Firestore
- Fetches via `GET /api/admin/events/cwa-promptathon-2026/winners`
- Shows podium: 1st (center, larger), 2nd (left), 3rd (right) — styled in hackathon dark theme

### Visual Style
- Use the existing hackathon page aesthetic: dark bg (`#07020F`), purple (`#6C2BD9`), cyan (`#00F5FF`), gold (`#FFD600`)
- Bebas Neue for headings, Space Mono for labels, Inter for body — same as inspiration HTML files
- Framer Motion for section transitions and reveals
- Feels native to the CWA Prompt-A-Thon 2026 page, not like a separate admin tool
- Grid background + vignette (as in team-rollcall.html) for the fullscreen slides

### Reusability
- Event data structure designed so future hackathons just need a new `constants.ts`-style config or Firestore doc
- `eventId` param in API routes makes it generic
- Presenter panel reads from a typed event config object

### Claude's Discretion
- Exact animation timing and easing for section transitions
- Whether to use CSS animations or Framer Motion variants for slide reveals
- Exact layout of control bar
- Whether winners podium uses confetti (yes — tasteful)

</decisions>

<specifics>
## Specific References

- Inspiration files: `inspiration/promptathon-screens/` — host-scripts.html, team-rollcall.html, twist-reveal.html, winners-screen.html
- Existing constants: `src/app/events/cwa-promptathon/2026/constants.ts`
- Auth component: `src/components/admin/AdminAuthGate.tsx` (ADMIN_TOKEN_KEY = "mentorship_admin_token")
- Admin API pattern: `x-admin-token` header, validated server-side
- Sponsor logos: `/static/images/events/cwa-promptathon-2026/sponsors/commandcode-logo.jpg` and `google-transparent.png`
- Judge photos: `/static/images/events/cwa-promptathon-2026/judges/`
- Twist text: "Every AI output must display a confidence score or uncertainty indicator. The user must be able to override or correct the AI — with the AI acknowledging or adapting to that correction in the same session."

</specifics>

<deferred>
## Deferred Ideas

- Team member linking to Discord user profiles (capability noted in data model but not built in this phase)
- Moving event config from constants.ts to Firestore fully (just winners go to Firestore now)
- Mentors named list (generic slide for now)
- Live chat/audience Q&A integration
- Stream overlay assets

</deferred>

---

*Phase: 01-promptathon-live-host-panel*
*Context gathered: 2026-03-27 via conversation*
