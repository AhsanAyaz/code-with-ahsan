---
phase: 12-mentor-time-slots-weekly-availability-management-mentee-booking-rescheduling-google-calendar-integration
plan: 05
subsystem: mentorship-booking-ui
tags: [react, nextjs, ui, booking, time-slots, mentorship]

dependencies:
  requires:
    - 12-02-availability-api
    - 12-02-bookings-api
  provides:
    - mentee-booking-interface
    - time-slot-picker-component
    - bookings-list-component
    - booking-page-route
  affects:
    - future-mentor-dashboard-enhancements

tech-stack:
  added: []
  patterns:
    - client-side-data-fetching
    - date-range-navigation
    - conflict-error-handling
    - reschedule-aware-cancellation

key-files:
  created:
    - src/components/mentorship/TimeSlotPicker.tsx
    - src/components/mentorship/BookingsList.tsx
    - src/app/mentorship/book/[mentorId]/page.tsx
    - src/app/mentorship/book/[mentorId]/layout.tsx
  modified: []

decisions:
  - id: D12-05-01
    choice: "7-day date navigator for slot browsing"
    rationale: "Balances discoverability with performance - fetches one week at a time, allows navigation to future weeks"
    alternatives: ["calendar month view", "single day view"]
    impact: "Reduces API load, provides clear week-at-a-glance availability"

  - id: D12-05-02
    choice: "Inline confirmation panel instead of modal"
    rationale: "Simpler UX - selected slot details shown immediately below grid, no modal popup needed"
    alternatives: ["modal dialog", "separate confirmation page"]
    impact: "Faster booking flow, less cognitive load"

  - id: D12-05-03
    choice: "prompt() for cancellation reason"
    rationale: "Simple native browser prompt, supports reschedule-aware messaging without complex modal state"
    alternatives: ["modal with textarea", "predefined reason dropdown"]
    impact: "Quick implementation, mentor can include 'reschedule' keyword to trigger rebook prompts in Discord DM"

  - id: D12-05-04
    choice: "BookingsList shows all statuses (upcoming, past, cancelled)"
    rationale: "Complete booking history visible in one list for transparency and reference"
    alternatives: ["tabs for upcoming/past", "filter dropdown"]
    impact: "Simpler UI, users can see their full booking history at a glance"

metrics:
  duration: 5
  tasks: 2
  commits: 2
  files: 4

completed: 2026-02-13
---

# Phase 12 Plan 05: Mentee Booking UI Summary

**One-liner:** Interactive time slot picker with 7-day navigator, booking confirmation, and bookings list with reschedule-aware cancellation

## Objective

Build the mentee-facing booking UI: a time slot picker for selecting and booking available slots, a bookings list for viewing/cancelling upcoming sessions, and the booking page route.

## What Was Built

### 1. TimeSlotPicker Component (src/components/mentorship/TimeSlotPicker.tsx)

Client-side component for selecting and booking mentor time slots.

**Features:**
- 7-day date navigator with prev/week/next controls
- Date buttons show day abbreviation (Mon, Tue) and date number
- Disabled styling for dates with no available slots or past dates
- Available slot grid (3-5 columns responsive) populated from API
- Slot buttons show displayTime (e.g. "09:00 AM") from AvailableSlot type
- Selected slot highlights with primary button styling
- Inline confirmation panel shows full date, time, duration
- Confirm/Cancel actions for booking confirmation
- 409 conflict error handling: shows user-friendly message, refreshes slots, clears selection
- Success toast notification on successful booking
- Error alert display for API failures

**API Integration:**
- Fetches slots from GET /api/mentorship/time-slots with 7-day range (startDate, endDate)
- Posts booking to POST /api/mentorship/bookings with mentorId, startTime, endTime, timezone
- Detects user timezone automatically via Intl.DateTimeFormat().resolvedOptions().timeZone
- Calls onBookingComplete callback with booking ID after successful booking

**State Management:**
- startDate: controls the 7-day viewing window
- selectedDate: the date selected from the navigator
- selectedSlot: the time slot selected from the grid
- slots: Record<string, AvailableSlot[]> mapping date strings to available slots
- loading, booking, error states for UI feedback

**UX Patterns:**
- Navigation clears selected date and slot to prevent confusion
- Booking success triggers slot refresh to remove the now-booked slot
- Loading spinner during slot fetch and booking actions

### 2. BookingsList Component (src/components/mentorship/BookingsList.tsx)

Client-side component for viewing and cancelling bookings.

**Features:**
- Displays bookings for a user (mentor or mentee role)
- Shows partner profile photo, display name
- Formatted date (MMM d, yyyy) and time (h:mm a)
- Badge indicators: "Cancelled" (error), "Completed" (ghost) for past bookings
- Cancel button on active upcoming bookings
- Cancellation reason prompt with reschedule-aware messaging hint for mentors
- Shows cancellation reason below booking if present
- Loading state with spinner
- Empty state message

**API Integration:**
- Fetches bookings from GET /api/mentorship/bookings?userId={userId}&role={role}&status=all
- Cancels booking with PUT /api/mentorship/bookings (action: cancel, reason)

**Cancellation Flow:**
- Mentor cancellation prompt: "Tip: include 'reschedule' to prompt the mentee to rebook a new time"
- Mentee cancellation prompt: "Why are you cancelling? (optional)"
- Reason sent to API, which triggers reschedule-aware Discord DM (per 12-02 implementation)
- Booking status updated to "cancelled" in local state on success
- Toast notification confirms cancellation

### 3. Booking Page Route (src/app/mentorship/book/[mentorId])

Full booking page for a specific mentor.

**Layout (layout.tsx):**
- MentorshipProvider wrapper for auth context
- bg-base-200 background with centered max-w-4xl content
- Metadata: "Book a Session | Code with Ahsan"

**Page (page.tsx):**
- Fetches mentor profile via GET /api/mentorship/profile?uid={mentorId}
- Displays mentor info header card with:
  - Profile photo (w-16 h-16 rounded-full)
  - Display name, current role
  - Expertise badges (badge-sm badge-outline)
- Booking success alert message when onBookingComplete triggers
- TimeSlotPicker component with mentorId and mentorName props
- BookingsList component for mentee's bookings with this mentor

**Access Control:**
- Loading state while auth and mentor profile load
- "Mentor not found" state with link to /mentorship
- "Please log in to book a session" for unauthenticated users
- "You cannot book a session with yourself" with link to /profile for self-booking attempts

**Navigation Entry Points:**
- Direct URL: /mentorship/book/{mentorId}
- Can be linked from mentor profile pages (existing MentorCard has "View Profile" link)

## Implementation Details

### TimeSlotPicker Date Navigation

```typescript
const getDaysArray = () => {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
};

const prevWeek = () => {
  setStartDate((prev) => addDays(prev, -7));
  setSelectedDate(null);
  setSelectedSlot(null);
};
```

Uses date-fns for date manipulation. Fetches slots for 7-day window on mount and when startDate changes.

### 409 Conflict Handling

```typescript
if (res.status === 409) {
  setError("This slot was just booked by someone else. Please choose another.");
  fetchSlots(); // Refresh to remove booked slot
  setSelectedSlot(null);
}
```

Transaction-based double-booking prevention (implemented in 12-02) returns 409 when race condition detected. UI handles gracefully by refreshing available slots.

### Reschedule-Aware Cancellation

```typescript
const reason = prompt(
  role === "mentor"
    ? 'Why are you cancelling? (Tip: include "reschedule" to prompt the mentee to rebook a new time)'
    : "Why are you cancelling? (optional)"
);
```

Mentor cancellations with "reschedule" in reason trigger special Discord DM with direct rebook link (per 12-02 implementation).

## User Flows

### Mentee Booking Flow

1. Navigate to /mentorship/book/{mentorId} (from mentor profile, direct link, etc.)
2. See mentor info header (photo, name, role, expertise)
3. Browse available dates in 7-day navigator
4. Click a date with available slots
5. See available time slots in grid
6. Click a time slot to select it
7. Review confirmation panel (date, time, duration)
8. Click "Confirm Booking"
9. See success message and toast notification
10. Slot removed from grid (refreshed)
11. Booking appears in "My Bookings" list below

### Cancellation Flow

1. See "My Bookings" list with upcoming and past bookings
2. Click "Cancel" button on an upcoming booking
3. Enter cancellation reason in prompt (optional for mentee, encouraged for mentor)
4. Booking status updates to "Cancelled" with reason shown
5. Toast confirms cancellation
6. Discord DM sent to other party (reschedule-aware if mentor included keyword)

### Conflict Handling Flow

1. Mentee selects slot and clicks "Confirm Booking"
2. Another mentee books the same slot milliseconds earlier
3. API returns 409 Conflict
4. Error message: "This slot was just booked by someone else. Please choose another."
5. Slot grid refreshes to show current availability
6. Selected slot cleared
7. Mentee selects a different slot and tries again

## Testing Notes

### Manual Testing Checklist

- [ ] Date navigator shows 7 days with correct day/date labels
- [ ] Dates with no slots are disabled and styled with opacity-50
- [ ] Past dates are disabled
- [ ] Clicking a date fetches and displays available slots
- [ ] Slot grid is responsive (3 cols mobile, 5 cols desktop)
- [ ] Selecting a slot highlights it and shows confirmation panel
- [ ] Confirmation panel shows correct date, time, "30 minutes"
- [ ] Booking success shows toast and clears selection
- [ ] 409 conflict shows error message and refreshes slots
- [ ] BookingsList shows partner profile photo and name
- [ ] Past bookings show "Completed" badge
- [ ] Cancelled bookings show "Cancelled" badge and reason
- [ ] Upcoming bookings show "Cancel" button
- [ ] Cancellation prompt appears with appropriate message for role
- [ ] Cancelled booking updates status in UI
- [ ] Mentor not found shows error message and link
- [ ] Unauthenticated user sees login prompt
- [ ] Self-booking attempt shows error and link to /profile
- [ ] Loading states show spinners during async operations

### Edge Cases Handled

- No available slots for selected date: "No available slots for this date."
- No date selected: "Select a date to see available slots."
- No bookings yet: "No bookings yet."
- User cancels reason prompt: No action taken
- API failure during booking: "Failed to book session. Please try again."
- API failure during cancellation: "Failed to cancel booking." toast

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 12 Plan 04 (Mentor Dashboard Availability Management UI):**
- Ready to implement: Mentor-facing availability management UI can use similar patterns
- Can integrate BookingsList component for mentors to see their mentee bookings
- TimeSlotPicker pattern can be adapted for availability setting (different mode)

**Future Enhancements:**
- Add booking notes/agenda field during booking creation
- Show mentor's timezone in slot display
- Add calendar export (iCal) for booked sessions
- Bulk cancellation for mentors (cancel all for a specific day)
- Recurring availability exceptions (one-off unavailable dates)
- Booking reminders (24 hours before, 1 hour before)

## Related Artifacts

**Prior Plans:**
- 12-01: Availability API and types (TimeSlotAvailability, AvailableSlot)
- 12-02: Bookings API with transaction-based double-booking prevention, reschedule-aware Discord DMs
- 12-03: Google Calendar integration (non-blocking, automatically syncs booked sessions)

**API Dependencies:**
- GET /api/mentorship/time-slots: Returns Record<string, AvailableSlot[]> for date range
- POST /api/mentorship/bookings: Creates booking, returns 409 on conflict
- GET /api/mentorship/bookings: Lists bookings with filters (userId, role, status)
- PUT /api/mentorship/bookings: Cancels booking with reschedule-aware messaging
- GET /api/mentorship/profile?uid={uid}: Fetches mentor profile for header

**Type Definitions:**
- MentorBooking: Includes mentorProfile, menteeProfile, startTime, endTime, status, cancellationReason
- AvailableSlot: start (Date), end (Date), displayTime (string in mentor's timezone)

## Commits

1. **345460c** - feat(12-05): add TimeSlotPicker and BookingsList components
   - TimeSlotPicker: 7-day date navigator with available slot grid
   - Handles slot selection and booking confirmation
   - 409 conflict handling with automatic slot refresh
   - BookingsList: displays upcoming/past bookings with cancel action
   - Supports reschedule-aware cancellation messaging for mentors
   - Uses DaisyUI styling and authFetch for authenticated requests

2. **9fdaa61** - feat(12-05): add booking page route at /mentorship/book/[mentorId]
   - Booking page displays mentor info header with photo, role, expertise
   - Integrates TimeSlotPicker for selecting and confirming slots
   - Integrates BookingsList for viewing/cancelling bookings
   - Handles loading states, mentor not found, unauthenticated users
   - Prevents self-booking with redirect to manage availability
   - MentorshipProvider layout wraps the route for auth context
   - Success message shown after booking completion

## Success Criteria Met

- [x] Mentee can navigate to /mentorship/book/{mentorId}
- [x] Date navigator shows 7 days with slot availability indicators
- [x] Selecting a date shows available time slots as buttons
- [x] Clicking a slot shows confirmation panel
- [x] Confirming creates a booking (or shows conflict error)
- [x] BookingsList shows upcoming and past bookings
- [x] Cancel button on active bookings works
- [x] Loading, empty, and error states handled
