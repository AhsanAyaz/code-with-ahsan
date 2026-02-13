---
phase: 12-mentor-time-slots-weekly-availability-management-mentee-booking-rescheduling-google-calendar-integration
plan: 01
subsystem: api
tags: [availability, scheduling, time-slots, date-fns-tz, timezone, firestore]

# Dependency graph
requires:
  - phase: 04-project-types-and-permissions
    provides: Permission system patterns and API route structure
provides:
  - TimeSlotAvailability and MentorBooking types for scheduling system
  - calculateAvailableSlots function for 30-minute slot generation with filtering
  - GET/PUT /api/mentorship/availability endpoints for mentor schedule management
affects: [12-02-time-slots-api, 12-03-google-calendar-oauth, 12-04-mentor-availability-ui, 12-05-mentee-booking-flow]

# Tech tracking
tech-stack:
  added: [date-fns-tz]
  patterns: [timezone-aware slot calculation, weekly recurring availability, override dates, public availability endpoint]

key-files:
  created:
    - src/lib/availability.ts
    - src/app/api/mentorship/availability/route.ts
  modified:
    - src/types/mentorship.ts

key-decisions:
  - "Store availability as timeSlotAvailability field to avoid conflict with legacy availability Record<string, string[]> field"
  - "Public GET endpoint for availability (mentees need to see mentor schedules without auth)"
  - "Mentor-only PUT endpoint with validation for weekly schedule and override dates"
  - "30-minute fixed slot duration with 2-hour minimum advance booking and 60-day future window"
  - "Slot generation in mentor's timezone using date-fns-tz for accurate local-to-UTC conversion"

patterns-established:
  - "Weekly recurring availability: Partial<Record<DayOfWeek, TimeRange[]>> for flexible multi-range per day"
  - "TimeRange with HH:mm string format for storage efficiency and validation simplicity"
  - "UnavailableDate override system with YYYY-MM-DD strings for date-specific unavailability"
  - "AvailableSlot computed type with UTC dates and displayTime in mentor timezone"
  - "calculateAvailableSlots filters: unavailable dates → past slots (2hr) → far future (60d) → booking conflicts"

# Metrics
duration: 4.8min
completed: 2026-02-13
---

# Phase 12 Plan 01: Mentor Time Slots Foundation Summary

**Time slot types, timezone-aware slot calculation engine, and availability API with weekly recurring schedules and override dates**

## Performance

- **Duration:** 4.8 min
- **Started:** 2026-02-13T20:58:50Z
- **Completed:** 2026-02-13T21:03:40Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Established complete type system for mentor time slots: TimeRange, TimeSlotAvailability, UnavailableDate, MentorBooking, AvailableSlot
- Built timezone-aware slot calculation library with generateSlotsFromRange and calculateAvailableSlots
- Created public GET and mentor-only PUT /api/mentorship/availability endpoints with comprehensive validation
- Installed date-fns-tz for accurate timezone conversion between mentor local time and UTC storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Define time slot types and availability calculation library** - `48501dd` (feat)
2. **Task 2: Create availability API route for mentor schedule management** - `ee863aa` (feat)

## Files Created/Modified
- `src/types/mentorship.ts` - Added Phase 12 types: TimeRange, DayOfWeek, TimeSlotAvailability, UnavailableDate, BookingStatus, MentorBooking, AvailableSlot
- `src/lib/availability.ts` - Slot generation and filtering: generateSlotsFromRange (timezone-aware 30-min slots), calculateAvailableSlots (filters unavailable dates, past/future limits, booking conflicts), getDaysInRange (multi-day helper)
- `src/app/api/mentorship/availability/route.ts` - GET endpoint returns mentor availability/unavailableDates/googleCalendarConnected, PUT endpoint saves weekly schedule with validation (day names, HH:mm format, start < end, YYYY-MM-DD dates)
- `package.json` / `package-lock.json` - Added date-fns-tz dependency

## Decisions Made
- **Store as timeSlotAvailability field:** Avoided conflict with existing `availability: Record<string, string[]>` field on mentorship_profiles by using new field name
- **Public GET endpoint:** Mentees need to see mentor availability without authentication for booking UI
- **Comprehensive validation in PUT:** Validates day names against DayOfWeek type, HH:mm regex + range check (0-23 hours, 0-59 minutes), start < end for each range, YYYY-MM-DD regex for dates
- **Fixed 30-minute slots:** slotDurationMinutes validated as positive number, currently fixed at 30 for consistency
- **2-hour advance + 60-day window:** calculateAvailableSlots filters out slots starting before now + 2hr (minimum advance booking) or after now + 60 days (maximum future window)
- **Timezone handling via date-fns-tz:** Using fromZonedTime (local → UTC) and toZonedTime (UTC → local) for accurate conversion, avoiding hand-rolled timezone math

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Build postbuild script failure (non-blocking):**
- `npm run build` succeeded for Next.js compilation (route visible in build output: `├ ƒ /api/mentorship/availability`)
- Postbuild sitemap generation script failed (ECONNREFUSED 0.0.0.0:1337) trying to connect to local Strapi server
- This is a known limitation of the sitemap script requiring Strapi to be running
- Does not affect application functionality or deployment

## User Setup Required

None - no external service configuration required for this plan. Google Calendar OAuth will be handled in Plan 12-03.

## Next Phase Readiness

**Ready for Plan 12-02 (Time Slots API):**
- Types established for booking creation and management
- calculateAvailableSlots ready for GET /api/mentorship/time-slots endpoint
- Availability API allows mentors to configure schedules before booking system launches

**Ready for Plan 12-03 (Google Calendar OAuth):**
- googleCalendarConnected field defined and returned by GET /api/mentorship/availability
- MentorBooking.calendarEventId and calendarSyncStatus fields ready for Calendar integration

**Ready for Plan 12-04 (Mentor Availability UI):**
- PUT /api/mentorship/availability validation ensures clean data flow from UI forms
- TimeSlotAvailability.weekly structure supports multi-range per day (e.g., 9-12 AM and 2-5 PM on same day)

**No blockers:** All foundation types and APIs implemented. Subsequent plans can build booking, UI, and calendar sync on this base.

---
*Phase: 12-mentor-time-slots-weekly-availability-management-mentee-booking-rescheduling-google-calendar-integration*
*Completed: 2026-02-13*
