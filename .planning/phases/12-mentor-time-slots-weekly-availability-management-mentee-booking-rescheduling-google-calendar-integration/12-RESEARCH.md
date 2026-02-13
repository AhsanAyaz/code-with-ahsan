# Phase 12: Mentor Time Slots - Research

**Researched:** 2026-02-13
**Domain:** Time slot booking system with Google Calendar integration
**Confidence:** MEDIUM

## Summary

Phase 12 implements a comprehensive time slot management system allowing mentors to define weekly availability, mentees to book sessions, and bidirectional Google Calendar integration with automatic event creation/deletion. The system must handle timezone conversions, prevent double-booking, support rescheduling/cancellation workflows, and deliver Discord DM notifications.

The existing codebase already has session scheduling (`mentorship_scheduled_sessions` collection) and Google Calendar URL generation, but currently relies on manual calendar management. This phase adds:
1. Weekly recurring availability patterns for mentors
2. Mentee self-service booking from available slots
3. Programmatic Google Calendar API integration (create/delete events)
4. Override dates for mentor unavailability
5. Rescheduling and cancellation workflows with Discord notifications

**Primary recommendation:** Use Google Calendar API with OAuth 2.0 user authentication (not service accounts), store weekly availability patterns in Firestore with composite indexes for efficient querying, implement optimistic UI updates with server-side double-booking prevention via Firestore transactions, and use existing Discord DM infrastructure for notifications.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | ^144.0.0 | Google Calendar API client | Official Google Node.js client, comprehensive API coverage, active maintenance |
| Next.js API Routes | 15.x | Backend endpoints for booking logic | Already in use, server-side auth verification pattern established |
| Firestore | Admin SDK | Time slots and bookings storage | Already in use, supports transactions for atomicity, composite indexes for complex queries |
| React Hook Form | Latest | Client-side form management | Already used in MentorRegistrationForm, consistent pattern |
| date-fns or Day.js | Latest | Timezone-aware date manipulation | Lightweight, better timezone support than moment.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-time-picker | Latest | UI for selecting weekly availability | Clean interface for multi-day time selection, matches requirement for "time slots during the week" |
| Firestore Batch Writes | Native | Atomic updates for booking + calendar sync | When creating/canceling bookings to ensure data consistency |
| Google OAuth 2.0 | Via googleapis | User authentication for Calendar API | Required for creating/deleting events on user's calendar |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OAuth 2.0 User Auth | Service Account | Service accounts can't create events on user calendars, only on calendars they own. User auth required for mentor's personal calendar. |
| Firestore Transactions | Optimistic Locking | Transactions provide stronger consistency guarantees, better for preventing double-booking |
| date-fns | Luxon | Luxon has better timezone support but larger bundle size. date-fns sufficient for this use case with user's local timezone. |

**Installation:**
```bash
npm install googleapis date-fns
npm install --save-dev @types/google.calendar
```

## Architecture Patterns

### Recommended Data Structure

```
src/
├── app/
│   ├── api/
│   │   └── mentorship/
│   │       ├── availability/         # Mentor availability CRUD
│   │       │   └── route.ts
│   │       ├── time-slots/           # Available slots for booking
│   │       │   └── route.ts
│   │       ├── bookings/             # Create/cancel bookings
│   │       │   └── route.ts
│   │       └── calendar/             # Google Calendar OAuth & sync
│   │           ├── auth/
│   │           │   └── route.ts
│   │           └── events/
│   │               └── route.ts
│   └── profile/
│       └── availability/             # UI for mentor availability management
│           └── page.tsx
├── components/
│   └── mentorship/
│       ├── AvailabilityManager.tsx   # Mentor: weekly availability editor
│       ├── TimeSlotPicker.tsx        # Mentee: book available slots
│       └── BookingsList.tsx          # Both: view upcoming bookings
└── lib/
    ├── google-calendar.ts            # Google Calendar API wrapper
    └── availability.ts               # Availability calculation logic
```

### Pattern 1: Weekly Availability Storage

**What:** Store mentor's recurring weekly availability as time ranges per day of week.

**When to use:** For mentors defining their general availability schedule.

**Firestore Schema:**
```typescript
// Collection: mentorship_profiles/{mentorId}
{
  availability: {
    monday: [
      { start: "09:00", end: "12:00", timezone: "America/New_York" },
      { start: "14:00", end: "17:00", timezone: "America/New_York" }
    ],
    tuesday: [...],
    // ... other days
  },
  unavailableDates: [
    { date: "2026-02-20", reason: "Conference" },
    { date: "2026-03-15", reason: "Vacation" }
  ],
  googleCalendarConnected: true,
  googleCalendarRefreshToken: "encrypted_token" // Store securely
}
```

**Source:** Based on [GeeksforGeeks booking database design](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-booking-and-reservation-systems/) and [Quora discussion on availability slots](https://www.quora.com/How-would-you-model-a-database-for-a-booking-platform-with-users-with-many-weekly-availability-slots-and-bookings)

### Pattern 2: Double-Booking Prevention with Firestore Transactions

**What:** Use Firestore transactions to atomically check availability and create booking.

**When to use:** Every time a mentee attempts to book a time slot.

**Example:**
```typescript
// Source: Firestore transaction pattern + booking system best practices
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

async function createBooking(mentorId: string, startTime: Date, duration: number) {
  return db.runTransaction(async (transaction) => {
    // 1. Check for existing bookings in this time window
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const existingBookings = await transaction.get(
      db.collection("mentorship_bookings")
        .where("mentorId", "==", mentorId)
        .where("startTime", ">=", startTime)
        .where("startTime", "<", endTime)
    );

    if (!existingBookings.empty) {
      throw new Error("Time slot already booked");
    }

    // 2. Create booking
    const bookingRef = db.collection("mentorship_bookings").doc();
    transaction.set(bookingRef, {
      mentorId,
      menteeId: currentUserId,
      startTime: FieldValue.serverTimestamp(),
      duration,
      status: "confirmed",
      createdAt: FieldValue.serverTimestamp()
    });

    return bookingRef.id;
  });
}
```

**Source:** [Solving Double Booking at Scale](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea) and [Firebase Firestore transaction docs](https://firebase.google.com/docs/firestore/manage-data/transactions)

### Pattern 3: Google Calendar OAuth 2.0 Flow

**What:** Implement OAuth 2.0 to get user consent for calendar access, store refresh token.

**When to use:** First time mentor connects their Google Calendar.

**Example:**
```typescript
// Source: https://developers.google.com/calendar/api/guides/auth
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Get refresh token
  scope: ['https://www.googleapis.com/auth/calendar.events']
});

// After user authorizes, exchange code for tokens
const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);

// Store refresh_token securely in Firestore (encrypted)
await db.collection("mentorship_profiles").doc(mentorId).update({
  googleCalendarRefreshToken: encrypt(tokens.refresh_token),
  googleCalendarConnected: true
});
```

**Source:** [Google Calendar API Authorization](https://developers.google.com/calendar/api/guides/auth) and [OAuth 2.0 Server to Server](https://developers.google.com/identity/protocols/oauth2/service-account)

### Pattern 4: Create Calendar Event with Google Meet

**What:** Programmatically create Google Calendar event with automatic Google Meet link.

**When to use:** When mentee books a time slot.

**Example:**
```typescript
// Source: https://gist.github.com/tanaikech/94791d48823e9659aa376cf7f0161d9b
import { google } from 'googleapis';

async function createCalendarEvent(mentorId: string, booking: Booking) {
  // Load mentor's refresh token and create auth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const profile = await db.collection("mentorship_profiles").doc(mentorId).get();
  const refreshToken = decrypt(profile.data()?.googleCalendarRefreshToken);

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: `Mentorship Session with ${booking.menteeName}`,
    description: booking.agenda || "Mentorship session",
    start: {
      dateTime: booking.startTime.toISOString(),
      timeZone: booking.timezone
    },
    end: {
      dateTime: new Date(booking.startTime.getTime() + booking.duration * 60000).toISOString(),
      timeZone: booking.timezone
    },
    attendees: [
      { email: booking.menteeEmail }
    ],
    conferenceData: {
      createRequest: {
        requestId: `booking-${booking.id}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1, // Required for Google Meet
    resource: event
  });

  return response.data.id; // Store this eventId in booking document
}
```

**Source:** [Sample Scripts for Creating Events with Google Meet](https://gist.github.com/tanaikech/94791d48823e9659aa376cf7f0161d9b) and [Create Events Guide](https://developers.google.com/workspace/calendar/api/guides/create-events)

### Pattern 5: Delete Calendar Event

**What:** Delete Google Calendar event when booking is cancelled.

**When to use:** When mentor or mentee cancels a booking.

**Example:**
```typescript
// Source: http://rest-examples.chilkat.io/google_calendar/nodejs/chilkat_46.cshtml
async function deleteCalendarEvent(mentorId: string, eventId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const profile = await db.collection("mentorship_profiles").doc(mentorId).get();
  const refreshToken = decrypt(profile.data()?.googleCalendarRefreshToken);

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
    sendUpdates: 'all' // Send cancellation emails to attendees
  });
}
```

**Source:** [Node.js Google Calendar Delete Event](http://rest-examples.chilkat.io/google_calendar/nodejs/chilkat_46.cshtml) and [googleapis delete examples](https://www.tabnine.com/code/javascript/functions/googleapis/Resource$Events/delete)

### Pattern 6: Timezone Handling

**What:** Store all times in UTC in Firestore, convert to user's timezone in UI.

**When to use:** Always. Critical for multi-timezone mentor/mentee matching.

**Implementation:**
```typescript
// Store in Firestore as UTC timestamp
const bookingData = {
  startTime: new Date(localDateTime), // Firestore converts to UTC
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // "America/New_York"
};

// Display in UI with user's timezone
import { formatInTimeZone } from 'date-fns-tz';

const displayTime = formatInTimeZone(
  booking.startTime.toDate(),
  booking.timezone,
  'PPpp' // Feb 13, 2026, 2:00 PM
);
```

**Source:** [Understanding Date/Timestamp in Firestore](https://code.luasoftware.com/tutorials/google-cloud-firestore/understanding-date-in-firestore/) and [Firestore Timestamp Guide](https://www.rowy.io/blog/firestore-timestamp)

### Anti-Patterns to Avoid

- **Storing availability as individual slots instead of recurring patterns:** Results in massive data duplication. Store weekly patterns + overrides instead.
- **Checking availability client-side only:** Race conditions cause double-booking. Always verify server-side with transactions.
- **Using service accounts for calendar access:** Service accounts can't access user's personal calendars. Must use OAuth 2.0 user auth.
- **Assuming browser timezone is correct:** Always let user explicitly select timezone or validate against their profile timezone.
- **Not handling OAuth token refresh:** Access tokens expire in 1 hour. Store refresh_token and implement automatic refresh logic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth 2.0 flow | Custom OAuth implementation | googleapis library with OAuth2Client | Handles token refresh, scope management, security vulnerabilities. Complex protocol with many edge cases. |
| Timezone conversions | Manual UTC offset calculations | date-fns-tz or Luxon | Daylight saving time, timezone database updates, edge cases like Pacific/Kiritimati. |
| Double-booking prevention | Application-level locks | Firestore transactions | Race conditions, distributed systems require atomic operations. Transactions provide ACID guarantees. |
| Weekly availability calculation | Custom date math | Existing patterns + date library | Recurring patterns, exception handling, date arithmetic bugs are common and hard to test. |
| Calendar event CRUD | Direct REST API calls | googleapis calendar client | Type safety, automatic retries, error handling, API versioning. |

**Key insight:** Calendar and booking systems have many edge cases (timezones, recurring patterns, race conditions, OAuth flows). Use battle-tested libraries instead of reinventing solutions to problems that already have robust implementations.

## Common Pitfalls

### Pitfall 1: Race Conditions in Booking

**What goes wrong:** Two mentees book the same time slot simultaneously, both bookings succeed.

**Why it happens:** Non-atomic read-then-write operations. Client checks availability, then creates booking in separate transaction.

**How to avoid:** Use Firestore transactions to atomically check availability and create booking in single operation. Never trust client-side availability checks alone.

**Warning signs:** Multiple bookings in database with overlapping times for same mentor.

**Prevention code:**
```typescript
// BAD: Race condition
const available = await checkAvailability(mentorId, time);
if (available) {
  await createBooking(mentorId, time); // Another request could squeeze in here
}

// GOOD: Atomic transaction
await db.runTransaction(async (transaction) => {
  const conflicts = await transaction.get(
    db.collection("bookings")
      .where("mentorId", "==", mentorId)
      .where("startTime", ">=", startWindow)
      .where("startTime", "<", endWindow)
  );

  if (!conflicts.empty) throw new Error("Conflict");

  transaction.set(bookingRef, bookingData);
});
```

**Source:** [Solving Double Booking at Scale](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea)

### Pitfall 2: OAuth Token Expiration

**What goes wrong:** Calendar event creation fails with 401 Unauthorized after initial setup works.

**Why it happens:** Access tokens expire in 1 hour. refresh_token not stored or not used to get new access token.

**How to avoid:**
1. Always request `access_type: 'offline'` to get refresh_token
2. Store refresh_token securely (encrypted)
3. Implement automatic token refresh before API calls

**Warning signs:** Calendar integration works initially, then fails after ~1 hour. Error logs show 401 responses from Google Calendar API.

**Prevention code:**
```typescript
// Before any Calendar API call
async function getAuthClient(mentorId: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const profile = await db.collection("mentorship_profiles").doc(mentorId).get();
  const refreshToken = decrypt(profile.data()?.googleCalendarRefreshToken);

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Auto-refresh happens automatically when access_token expires
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      // Update stored refresh token if new one provided
      await db.collection("mentorship_profiles").doc(mentorId).update({
        googleCalendarRefreshToken: encrypt(tokens.refresh_token)
      });
    }
  });

  return oauth2Client;
}
```

**Source:** [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2) and [googleapis OAuth examples](https://github.com/googleapis/google-api-nodejs-client)

### Pitfall 3: Timezone Confusion

**What goes wrong:** Sessions booked for wrong time due to timezone mismatches between mentor/mentee.

**Why it happens:** Mixing UTC, local timezone, and database timestamps without clear conversion strategy.

**How to avoid:**
1. Store all times as UTC in Firestore (automatic with Timestamp type)
2. Store timezone separately as string (IANA timezone identifier)
3. Always convert to user's timezone in UI using date library
4. Display timezone abbreviation in UI (EST, PST, etc.)

**Warning signs:** Users report sessions scheduled at unexpected times, especially across timezone boundaries.

**Prevention pattern:**
```typescript
// In Firestore document
{
  startTime: Timestamp (automatically UTC),
  mentorTimezone: "America/New_York",
  menteeTimezone: "Europe/London"
}

// In UI - show in viewer's timezone
const viewerTime = formatInTimeZone(
  booking.startTime.toDate(),
  viewerTimezone,
  'PPpp' // "Feb 13, 2026, 2:00 PM"
);

// Always show timezone abbreviation
const tzAbbr = new Date().toLocaleTimeString("en-US", {
  timeZone: viewerTimezone,
  timeZoneName: "short"
}).split(" ").pop(); // "EST"
```

**Source:** [Handling Time Zone Conversions with Firestore](https://community.flutterflow.io/custom-code/post/handling-time-zone-conversions-with-firestore-timestamps-in-cloud-functions-gAIqEwEvtAMDcls)

### Pitfall 4: Composite Index Not Created

**What goes wrong:** Queries for available slots fail with "index required" error.

**Why it happens:** Firestore requires composite indexes for queries with multiple filters or ordering.

**How to avoid:** Create composite indexes for common query patterns. Firestore will suggest the exact index needed in error message.

**Warning signs:** Error message: "The query requires an index. You can create it here: [URL]"

**Required indexes:**
```typescript
// Query: Find bookings for mentor in time range
// Requires composite index on: mentorId (ASC), startTime (ASC)
db.collection("mentorship_bookings")
  .where("mentorId", "==", mentorId)
  .where("startTime", ">=", rangeStart)
  .where("startTime", "<", rangeEnd)
  .orderBy("startTime", "asc")

// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "mentorship_bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "mentorId", "order": "ASCENDING" },
        { "fieldPath": "startTime", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Source:** [Firestore Index Overview](https://firebase.google.com/docs/firestore/query-data/index-overview) and [Manage Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

### Pitfall 5: Not Handling Calendar API Failures Gracefully

**What goes wrong:** Booking succeeds in database but calendar event creation fails, leaving inconsistent state.

**Why it happens:** Network failures, API rate limits, or user revokes calendar access mid-operation.

**How to avoid:** Implement non-blocking calendar operations with retry mechanism and status tracking.

**Warning signs:** Bookings exist in database without corresponding Google Calendar events.

**Prevention pattern:**
```typescript
// Don't block booking on calendar success
async function createBooking(data: BookingData) {
  // 1. Create booking in Firestore (critical path)
  const bookingRef = await db.collection("mentorship_bookings").add({
    ...data,
    calendarEventId: null,
    calendarSyncStatus: "pending"
  });

  // 2. Attempt calendar creation (non-blocking)
  try {
    const eventId = await createCalendarEvent(data);
    await bookingRef.update({
      calendarEventId: eventId,
      calendarSyncStatus: "synced"
    });
  } catch (error) {
    console.error("Calendar sync failed:", error);
    await bookingRef.update({
      calendarSyncStatus: "failed",
      calendarSyncError: error.message
    });

    // Send notification to mentor to manually add to calendar
    await sendDirectMessage(
      mentorDiscordUsername,
      `⚠️ Calendar sync failed for booking on ${data.startTime}. Please add manually.`
    );
  }

  return bookingRef.id;
}
```

**Source:** Existing codebase pattern from `src/app/api/mentorship/scheduled-sessions/route.ts` (non-blocking Discord notifications)

## Code Examples

Verified patterns from official sources:

### Availability Calculation Algorithm

```typescript
// Calculate available time slots for a specific date
// Accounts for: weekly availability, override dates, existing bookings
function calculateAvailableSlots(
  mentorProfile: MentorProfile,
  date: Date,
  slotDuration: number = 30 // minutes
): TimeSlot[] {
  const dayOfWeek = format(date, 'EEEE').toLowerCase(); // "monday"

  // 1. Get weekly availability for this day
  const weeklySlots = mentorProfile.availability?.[dayOfWeek] || [];

  // 2. Check if date is in unavailable overrides
  const isUnavailable = mentorProfile.unavailableDates?.some(
    override => isSameDay(parseISO(override.date), date)
  );

  if (isUnavailable || weeklySlots.length === 0) {
    return [];
  }

  // 3. Generate all possible slots from availability ranges
  const possibleSlots: TimeSlot[] = [];
  for (const range of weeklySlots) {
    const startTime = parse(range.start, 'HH:mm', date);
    const endTime = parse(range.end, 'HH:mm', date);

    let current = startTime;
    while (current < endTime) {
      const slotEnd = addMinutes(current, slotDuration);
      if (slotEnd <= endTime) {
        possibleSlots.push({
          start: current,
          end: slotEnd,
          timezone: range.timezone
        });
      }
      current = slotEnd;
    }
  }

  // 4. Filter out already booked slots (done server-side with DB query)
  return possibleSlots;
}
```

**Source:** Derived from [Vertabelo appointment scheduling model](https://vertabelo.com/blog/a-database-model-to-manage-appointments-and-organize-schedules/) and [Next.js booking system guide](https://medium.com/@abdulrehmanikram9710/building-a-real-time-booking-system-with-next-js-14-a-practical-guide-d67d7f944d76)

### Discord Notification for Cancellation

```typescript
// Send DM to mentee when mentor cancels a session
async function notifySessionCancellation(
  booking: Booking,
  cancelledBy: "mentor" | "mentee",
  reason?: string
) {
  const recipientUsername = cancelledBy === "mentor"
    ? booking.menteeDiscordUsername
    : booking.mentorDiscordUsername;

  const recipientName = cancelledBy === "mentor"
    ? booking.menteeName
    : booking.mentorName;

  if (!recipientUsername) {
    console.log("No Discord username, skipping notification");
    return;
  }

  const sessionDate = formatInTimeZone(
    booking.startTime,
    booking.timezone,
    'PPPp' // "February 13, 2026 at 2:00 PM"
  );

  const message = cancelledBy === "mentor"
    ? `❌ **Session Cancelled**\n\n` +
      `Your mentor ${booking.mentorName} has cancelled your session on ${sessionDate}.\n` +
      (reason ? `Reason: ${reason}\n\n` : '\n') +
      `Please reschedule at your convenience: https://codewithahsan.dev/mentorship/dashboard`
    : `ℹ️ **Session Cancelled**\n\n` +
      `${booking.menteeName} has cancelled your session on ${sessionDate}.\n` +
      (reason ? `Reason: ${reason}` : '');

  await sendDirectMessage(recipientUsername, message);
}
```

**Source:** Existing Discord DM pattern from `/home/ahsan/projects/code-with-ahsan/src/lib/discord.ts`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Google Calendar URL generation | Programmatic Calendar API with OAuth | 2020+ | Events automatically created with Meet links, calendar stays in sync, attendees auto-invited |
| moment.js for timezones | date-fns-tz or Luxon | 2020+ | Smaller bundle size, tree-shakeable, better TypeScript support |
| Separate booking tables per service | Polymorphic booking collections | Modern DB design | Single source of truth, easier queries across booking types |
| Server-side rendered forms | Client-side with React Hook Form + useActionState | React 19 (2024) | Better UX, optimistic updates, form state management |
| Service accounts for Calendar | OAuth 2.0 user consent | Always required | Can't access user's personal calendar with service account |

**Deprecated/outdated:**
- **moment.js:** Now in maintenance mode, project recommends using alternatives. Use date-fns or Luxon instead.
- **Google Calendar URL parameters (add parameter):** Still works but `crm=AVAILABLE` is preferred for conferencing. Both are documented.
- **Calendly/external booking tools:** Adding native booking reduces external dependencies and keeps users in-platform.

## Open Questions

1. **Calendar event ownership and deletion**
   - What we know: Google Calendar API can delete events created by the application
   - What's unclear: If mentor disconnects Google Calendar integration, should we attempt to delete existing events? What if API fails?
   - Recommendation: Track calendar sync status per booking. If disconnect happens, mark all future bookings as "calendar_disconnected" and notify mentor to manually remove events. Don't silently fail.

2. **Rescheduling vs Cancel + Rebook**
   - What we know: GitHub issue mentions "mentor should be able to ask for rescheduling"
   - What's unclear: Should this be a dedicated reschedule flow (update existing booking + calendar event) or cancel + mentee books again?
   - Recommendation: Start with cancel flow (simpler, no complex state management). Can add dedicated reschedule in future iteration if needed. Cancel sends notification asking mentee to rebook.

3. **Booking window restrictions**
   - What we know: Best practice is to prevent last-minute bookings
   - What's unclear: Minimum advance booking time? Maximum future booking window?
   - Recommendation: Start with 2-hour minimum advance booking (prevents "booking in 10 minutes" scenarios) and 60-day maximum future window (keeps calendar manageable). Make configurable per mentor in future.

4. **Time slot duration flexibility**
   - What we know: Issue mentions "30 minutes per slot"
   - What's unclear: Fixed 30 minutes or should mentors configure? Should mentees be able to book multiple consecutive slots?
   - Recommendation: Start with fixed 30-minute slots for simplicity. Can add duration configuration in mentor settings later if needed.

5. **Conflict with existing scheduled_sessions**
   - What we know: Existing `mentorship_scheduled_sessions` collection tracks mentor-initiated sessions
   - What's unclear: Should time slot bookings go in same collection or new `mentorship_bookings` collection?
   - Recommendation: Use same collection with `bookingType: "mentor_scheduled" | "slot_booking"` field. Prevents two sources of truth for session scheduling.

## Sources

### Primary (HIGH confidence)
- [Google Calendar API - Create Events](https://developers.google.com/workspace/calendar/api/guides/create-events) - Official documentation for event creation
- [Google Calendar API - Authorization](https://developers.google.com/calendar/api/guides/auth) - Official OAuth 2.0 setup guide
- [Firestore Indexing Overview](https://firebase.google.com/docs/firestore/query-data/index-overview) - Composite index requirements
- [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) - Atomic operations for double-booking prevention
- Existing codebase patterns:
  - `/home/ahsan/projects/code-with-ahsan/src/lib/discord.ts` - Discord DM notifications
  - `/home/ahsan/projects/code-with-ahsan/src/app/api/mentorship/scheduled-sessions/route.ts` - Session scheduling
  - `/home/ahsan/projects/code-with-ahsan/src/lib/mentorship-templates.ts` - Google Calendar URL generation

### Secondary (MEDIUM confidence)
- [Sample Scripts for Google Meet Links](https://gist.github.com/tanaikech/94791d48823e9659aa376cf7f0161d9b) - conferenceData implementation
- [Building Real-Time Booking System with Next.js](https://medium.com/@abdulrehmanikram9710/building-a-real-time-booking-system-with-next-js-14-a-practical-guide-d67d7f944d76) - Architecture patterns
- [GeeksforGeeks Booking Database Design](https://www.geeksforgeeks.org/dbms/how-to-design-a-database-for-booking-and-reservation-systems/) - Schema design
- [Solving Double Booking at Scale](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea) - Prevention strategies
- [Vertabelo Appointment Scheduling Model](https://vertabelo.com/blog/a-database-model-to-manage-appointments-and-organize-schedules/) - Data modeling
- [Understanding Firestore Timestamps](https://code.luasoftware.com/tutorials/google-cloud-firestore/understanding-date-in-firestore/) - Timezone handling

### Tertiary (LOW confidence - requires validation)
- [React Day Time Picker](https://react-day-time-picker.netlify.app/) - UI component option (needs evaluation for weekly pattern support)
- [react-timeslot-calendar npm](https://www.npmjs.com/package/react-timeslot-calendar) - Alternative UI component (check if actively maintained)
- Various Medium articles on Google Calendar integration - Useful for patterns but need verification against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - googleapis is official library, Firestore/Next.js already in use, date-fns well-established
- Architecture: MEDIUM - Patterns verified from multiple sources but specific implementation needs validation in this codebase's context
- Pitfalls: MEDIUM - Based on documented issues and best practices, but some are general guidance rather than this-codebase-specific

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (30 days - Google Calendar API is stable, booking patterns are well-established)

**Key dependencies on existing codebase:**
- Discord DM infrastructure: `sendDirectMessage()` function already implemented
- Firestore collections: `mentorship_profiles`, `mentorship_sessions` exist
- Auth verification pattern: Route-level auth checks established
- UI patterns: Card-based layout for profile/settings pages
- Non-blocking external operations: Pattern established for Discord notifications

**Required environment setup:**
- Google Cloud Console: Enable Calendar API
- OAuth 2.0 credentials: Client ID, Client Secret, Redirect URI
- Firestore composite indexes: Will be created automatically on first query attempt
- Encryption key: For storing OAuth refresh tokens securely
