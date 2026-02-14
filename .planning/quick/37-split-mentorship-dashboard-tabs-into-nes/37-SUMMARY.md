# Quick Task 37: Split Mentorship Dashboard Tabs into Nested Routes

## Overview

Converted the mentorship dashboard at `/mentorship/dashboard/[matchId]` from tab-based UI (`activeTab` state) to nested lazily-loaded routes. Bookings is the default route via redirect.

## What Was Implemented

### 1. DashboardContext (`DashboardContext.tsx`)

- Created React Context to share layout state (matchId, matchDetails, currentUserId, isMentor) with child route pages
- `useDashboard()` hook for child routes to consume context
- Exported `MatchDetails` type for reuse

### 2. Layout (`layout.tsx`)

- Extracted from monolithic `page.tsx` (890 lines)
- Contains: header card (partner info, connection info, Discord link), all modals (complete, remove, end mentorship), announcement image section, social sharing
- Replaced tab buttons (`onClick` + `activeTab` state) with Next.js `<Link>` components pointing to nested routes
- Active tab detection via `usePathname()` matching against route segments
- Wraps `{children}` with `DashboardContext.Provider`
- Resolves `params` promise via `useEffect` (async params pattern for client layout)

### 3. Redirect Page (`page.tsx`)

- Server component that redirects `/mentorship/dashboard/[matchId]` to `./bookings`
- Uses `next/navigation` `redirect()` for instant server-side redirect

### 4. Child Route Pages

- **`bookings/page.tsx`** — BookingsList + "New Booking" link (mentee only), consumes context via `useDashboard()`
- **`goals/page.tsx`** — GoalTracker component, passes matchId/currentUserId/isMentor from context
- **`learning-hub/page.tsx`** — LearningHub component (no props needed)

## Files Created

| File | Purpose |
|------|---------|
| `src/app/mentorship/dashboard/[matchId]/DashboardContext.tsx` | Shared context for child routes |
| `src/app/mentorship/dashboard/[matchId]/layout.tsx` | Header, nav, modals, announcement image, context provider |
| `src/app/mentorship/dashboard/[matchId]/bookings/page.tsx` | Bookings list + new booking link |
| `src/app/mentorship/dashboard/[matchId]/goals/page.tsx` | Goal tracker |
| `src/app/mentorship/dashboard/[matchId]/learning-hub/page.tsx` | Learning hub |

## Files Modified

| File | Change |
|------|--------|
| `src/app/mentorship/dashboard/[matchId]/page.tsx` | Replaced 890-line monolith with 10-line redirect to `./bookings` |

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| React Context instead of prop drilling | Child routes can't receive props from layout in App Router |
| Server-side redirect for base path | Instant redirect, no client JS needed for default route |
| `usePathname()` for active tab detection | Works with nested routes without managing state |
| Keep modals in layout (not child routes) | Modals are header actions, not tab-specific |
| Keep announcement image in layout | Mentee-only section visible on all tabs |

## Verification

- `npx tsc --noEmit` — clean build
- Existing links to `/mentorship/dashboard/${matchId}` hit redirect → bookings (no updates needed)
