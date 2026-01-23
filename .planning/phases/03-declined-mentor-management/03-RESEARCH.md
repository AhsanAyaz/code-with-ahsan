# Phase 3: Declined Mentor Management - Research

**Researched:** 2026-01-23
**Domain:** Client-side filtering with toggle controls, profile status restoration
**Confidence:** HIGH

## Summary

Phase 3 adds two capabilities to the All Mentors tab: (1) a toggle filter to show/hide declined mentors, and (2) a restore button to change declined mentors back to accepted status. This is purely a client-side filtering enhancement paired with an existing API endpoint extension.

The existing implementation already filters mentors by status (Pending Mentors tab uses `status=pending`, All Mentors tab shows all mentors). The API route at `src/app/api/mentorship/admin/profiles/route.ts` already supports status filtering via query params and status updates via PUT method. Phase 3 extends this by adding client-side filtering UI and reusing the existing status update API.

The standard approach uses React local state for the toggle (filter state is transient UI, not shareable), DaisyUI toggle component for the checkbox control, client-side array filtering to show/hide declined profiles, and the existing `handleStatusChange(uid, "accepted")` function to restore declined mentors. No new API endpoints are needed.

**Primary recommendation:** Use local state (useState) for the declined filter toggle rather than URL params since this is a transient UI preference not meant to be bookmarked. Reuse the existing status update API endpoint and handler function. Follow existing button styling patterns (success button with "✓ Restore" label).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.1 | Local state (useState) | Already in use, manages toggle state |
| DaisyUI | 5.5.1-beta.2 | Toggle component | Already in use, provides `.toggle` checkbox style |
| Next.js | 16.0.10 | Existing API routes | Already implemented profile status updates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | N/A | No new libraries needed | All functionality uses existing patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local state | URL query params | URL params better for shareable filters (search, pagination), but toggle visibility is transient UI preference |
| Client filtering | API filtering | API filtering would require new endpoint; client-side sufficient for admin dashboard with limited data |
| New API endpoint | Reuse profiles PUT | New endpoint unnecessary; existing status update API handles restore operation |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/mentorship/admin/
└── page.tsx                  # Add toggle control and restore button to All Mentors tab
src/app/api/mentorship/admin/
└── profiles/route.ts         # Already supports status updates (no changes needed)
```

### Pattern 1: Local State for Transient UI Toggle

**What:** Use useState for the "show declined" toggle rather than URL search params
**When to use:** When filter state is a transient UI preference, not meant to be bookmarked or shared

**Example:**
```typescript
// Source: React best practices for show/hide toggles
// https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks/React_interactivity_filtering_conditional_rendering

'use client';

import { useState } from 'react';

export default function AllMentorsTab() {
  const [showDeclined, setShowDeclined] = useState(false);
  const [profiles, setProfiles] = useState<ProfileWithDetails[]>([]);

  // Filter profiles based on toggle state
  const filteredProfiles = showDeclined
    ? profiles // Show all profiles including declined
    : profiles.filter(p => p.status !== 'declined'); // Hide declined

  return (
    <div>
      {/* Toggle control */}
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Show declined mentors</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={showDeclined}
            onChange={(e) => setShowDeclined(e.target.checked)}
          />
        </label>
      </div>

      {/* Filtered list */}
      {filteredProfiles.map(profile => (
        <ProfileCard key={profile.uid} profile={profile} />
      ))}
    </div>
  );
}
```

### Pattern 2: Conditional Button Rendering for Restore

**What:** Show restore button only for declined mentors when toggle is enabled
**When to use:** Status-specific actions that should only appear for certain profile states

**Example:**
```typescript
// Source: Existing pattern from src/app/mentorship/admin/page.tsx lines 1040-1101
// Adapted for declined mentor restoration

{p.status === "declined" && (
  <button
    className="btn btn-success btn-sm"
    disabled={actionLoading === p.uid}
    onClick={() => handleStatusChange(p.uid, "accepted")}
  >
    {actionLoading === p.uid ? (
      <span className="loading loading-spinner loading-xs"></span>
    ) : (
      "✓ Restore"
    )}
  </button>
)}
```

### Pattern 3: DaisyUI Toggle Component

**What:** Use DaisyUI's toggle component with label for accessible checkbox styling
**When to use:** Binary on/off controls that affect view state

**Example:**
```typescript
// Source: https://daisyui.com/components/toggle/

<div className="form-control">
  <label className="label cursor-pointer gap-2">
    <span className="label-text">Show declined mentors</span>
    <input
      type="checkbox"
      className="toggle toggle-primary"
      checked={showDeclined}
      onChange={(e) => setShowDeclined(e.target.checked)}
      aria-label="Toggle visibility of declined mentors"
    />
  </label>
</div>
```

### Anti-Patterns to Avoid

- **Using URL params for toggle state:** URL params are for shareable/bookmarkable state (search queries, pagination), not transient UI preferences like show/hide toggles
- **Creating new API endpoint for restore:** The existing PUT endpoint at `/api/mentorship/admin/profiles` already handles status updates; reuse it
- **Filtering declined mentors server-side:** Client-side filtering is simpler and avoids additional API calls when toggling visibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle checkbox styling | Custom CSS toggle | DaisyUI `.toggle` class | Accessible, consistent with existing UI, handles focus states |
| Status update API | New restore endpoint | Existing profiles PUT route | Already validates status transitions and sends emails |
| Filter state management | Custom reducer | Simple useState | Complexity not needed for single boolean toggle |

**Key insight:** This phase requires zero new API logic and minimal new UI logic. The power is in reusing existing patterns.

## Common Pitfalls

### Pitfall 1: Using URL Params for Toggle State
**What goes wrong:** Toggle state appears in URL query string, creates unnecessary history entries, makes URL look messy
**Why it happens:** Over-applying the "filters in URL" pattern without distinguishing shareable vs. transient state
**How to avoid:** Use URL params for search queries and pagination (shareable state), local state for show/hide toggles (transient UI preference)
**Warning signs:** User complains about browser back button not working as expected, URL gets littered with UI state params

### Pitfall 2: Breaking Existing Filter Logic
**What goes wrong:** Adding declined filter accidentally hides accepted/pending mentors or conflicts with existing status filtering
**Why it happens:** Not understanding that All Mentors tab already shows all roles, filtering by declined must be additive
**How to avoid:** Filter logic should be: `profiles.filter(p => p.status !== 'declined')` when toggle is OFF, no filter when toggle is ON
**Warning signs:** Admin reports mentors disappearing when toggling the filter

### Pitfall 3: Inconsistent Button Styling
**What goes wrong:** Restore button uses different styling than existing Accept/Re-enable buttons for similar actions
**Why it happens:** Not following established UI patterns in existing code
**How to avoid:** Use `btn btn-success btn-sm` with "✓ Restore" label to match existing pattern for status restoration
**Warning signs:** UI looks inconsistent, restore button stands out for wrong reasons

### Pitfall 4: Missing Accessibility Attributes
**What goes wrong:** Screen readers don't announce what the toggle does or its current state
**Why it happens:** DaisyUI toggle is just a styled checkbox; ARIA attributes must be added manually
**How to avoid:** Add `aria-label` to toggle input explaining what it controls, ensure label text is clear
**Warning signs:** Accessibility audit failures, screen reader users confused by toggle purpose

## Code Examples

Verified patterns from official sources:

### Client-Side Filtering with Toggle
```typescript
// Source: MDN React Interactivity Guide
// https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks/React_interactivity_filtering_conditional_rendering

const [showDeclined, setShowDeclined] = useState(false);

// Apply filter based on toggle state
const displayedProfiles = showDeclined
  ? profiles // Show all including declined
  : profiles.filter(profile => profile.status !== 'declined'); // Hide declined
```

### DaisyUI Toggle with Label
```typescript
// Source: DaisyUI Toggle Component Documentation
// https://daisyui.com/components/toggle/

<div className="form-control mb-4">
  <label className="label cursor-pointer justify-start gap-3">
    <span className="label-text font-medium">Show declined mentors</span>
    <input
      type="checkbox"
      className="toggle toggle-primary"
      checked={showDeclined}
      onChange={(e) => setShowDeclined(e.target.checked)}
      aria-label="Toggle visibility of declined mentors in the list"
    />
  </label>
</div>
```

### Restore Button Following Existing Pattern
```typescript
// Source: Existing pattern from src/app/mentorship/admin/page.tsx (lines 1086-1100)
// Re-enable button for disabled profiles - same pattern for declined profiles

{p.status === "declined" && (
  <button
    className="btn btn-success btn-sm"
    disabled={actionLoading === p.uid}
    onClick={() => handleStatusChange(p.uid, "accepted")}
  >
    {actionLoading === p.uid ? (
      <span className="loading loading-spinner loading-xs"></span>
    ) : (
      "✓ Restore"
    )}
  </button>
)}
```

### Conditional Rendering Based on Toggle
```typescript
// Source: React conditional rendering best practices
// Only show declined mentors when toggle is enabled, otherwise filter them out

{filteredProfiles.length === 0 && (
  <div className="text-center text-base-content/60 py-8">
    {showDeclined
      ? "No mentors found"
      : "No mentors found (toggle 'Show declined' to see declined mentors)"}
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side filtering only | Client-side + server-side | 2023+ | Faster UI interactions, less API load |
| URL params for all filters | URL params for shareable, local state for transient | 2024+ | Cleaner URLs, better UX |
| Inline `onClick` handlers | addEventListener (vanilla JS) | 2025+ | Separation of concerns, but React onClick still standard |
| Custom toggle CSS | DaisyUI/Shadcn components | 2026 | Accessibility built-in, consistent styling |

**Deprecated/outdated:**
- Using inline `onclick=""` attributes in HTML: Modern React uses `onClick={}` props
- Building custom toggle switches from scratch: Use component libraries like DaisyUI or Shadcn
- Storing all filter state in URL: Distinguish between shareable (URL params) and transient (local state)

## Open Questions

Things that couldn't be fully resolved:

1. **Should declined count appear in badge?**
   - What we know: All Mentors tab shows total count, Pending Mentors shows pending count in badge
   - What's unclear: Should we show "(X declined)" next to All Mentors when toggle is off?
   - Recommendation: Skip badge for now; declined mentors are secondary information, avoid clutter

2. **Should filter state persist across sessions?**
   - What we know: localStorage could persist toggle state between page reloads
   - What's unclear: Is this a preference users want remembered, or should it always default to OFF?
   - Recommendation: Default to OFF (hide declined), no persistence. Users can toggle if needed.

3. **Should we show decline reason when restoring?**
   - What we know: Profiles may have `adminNotes` field with decline reason
   - What's unclear: Should admin see why mentor was declined before restoring?
   - Recommendation: Show adminNotes in expandable details section if present (already exists in UI pattern)

## Sources

### Primary (HIGH confidence)
- DaisyUI Toggle Component: https://daisyui.com/components/toggle/
- MDN React Interactivity Guide: https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing/Client-side_JavaScript_frameworks/React_interactivity_filtering_conditional_rendering
- Existing codebase: `src/app/mentorship/admin/page.tsx` (status buttons pattern)
- Existing codebase: `src/app/api/mentorship/admin/profiles/route.ts` (status update API)

### Secondary (MEDIUM confidence)
- LogRocket URL State Guide: https://blog.logrocket.com/url-state-usesearchparams/ (when to use URL params vs local state)
- NN/g Confirmation Dialogs: https://www.nngroup.com/articles/confirmation-dialog/ (restore action doesn't need confirmation)
- ARIA Hidden Guide: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-hidden (accessibility for toggles)

### Tertiary (LOW confidence)
- None (all findings verified with official docs or existing codebase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All patterns already exist in codebase, no new libraries needed
- Architecture: HIGH - Simple client-side filtering with existing API reuse
- Pitfalls: HIGH - Based on existing code review and UI consistency requirements

**Research date:** 2026-01-23
**Valid until:** 60 days (stable patterns, no fast-moving dependencies)
