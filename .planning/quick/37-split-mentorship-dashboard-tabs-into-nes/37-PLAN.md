# Quick Task 37: Split Mentorship Dashboard Tabs into Nested Routes

## Description

Convert the mentorship dashboard at `/mentorship/dashboard/[matchId]` from tab-based UI (Goals, Bookings, Learning Hub) to nested lazily-loaded routes. Make Bookings the default route.

## Current State

- Single `page.tsx` with `activeTab` state switching between Goals, Bookings, and Learning Hub
- All three components rendered conditionally in the same page
- Tab buttons use `onClick` to switch state

## Target State

- `[matchId]/layout.tsx` — header card, modals, nav links, renders `{children}`
- `[matchId]/page.tsx` — redirects to `bookings`
- `[matchId]/bookings/page.tsx` — BookingsList + New Booking link
- `[matchId]/goals/page.tsx` — GoalTracker
- `[matchId]/learning-hub/page.tsx` — LearningHub

## Tasks

### Task 1: Create layout.tsx from existing page.tsx

Extract header, modals, nav links from the current page.tsx into a new layout.tsx. Replace tab buttons with Next.js Link components pointing to the nested routes. Keep all state/logic for header actions (complete, remove, end mentorship, announcement image).

### Task 2: Create the three route pages + redirect

- `page.tsx` — redirect to `./bookings`
- `bookings/page.tsx` — receives matchId from URL, renders BookingsList
- `goals/page.tsx` — receives matchId from URL, renders GoalTracker
- `learning-hub/page.tsx` — receives matchId from URL, renders LearningHub

### Task 3: Verify TypeScript compiles

Run `npx tsc --noEmit` to ensure clean build.
