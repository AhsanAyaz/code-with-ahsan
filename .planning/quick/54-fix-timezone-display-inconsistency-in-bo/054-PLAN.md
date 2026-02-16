---
phase: quick-054
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/mentorship/BookingsList.tsx
  - src/app/api/mentorship/bookings/route.ts
  - .planning/STATE.md
autonomous: true

must_haves:
  truths:
    - "Booking times displayed on platform always show in viewer's timezone with clear timezone label"
    - "Discord notifications show time in recipient's timezone (mentor sees mentor's timezone, mentee sees mentee's timezone)"
    - "Timezone handling pattern is documented in STATE.md to prevent future regressions"
  artifacts:
    - path: "src/components/mentorship/BookingsList.tsx"
      provides: "Booking display with viewer's timezone label"
      min_lines: 280
    - path: "src/app/api/mentorship/bookings/route.ts"
      provides: "Discord notifications with recipient-aware timezone display"
      min_lines: 730
    - path: ".planning/STATE.md"
      provides: "Timezone handling architecture decision"
      contains: "Timezone Display Pattern"
  key_links:
    - from: "src/components/mentorship/BookingsList.tsx"
      to: "Intl.DateTimeFormat"
      via: "Browser API for timezone detection"
      pattern: "Intl\\.DateTimeFormat.*resolvedOptions.*timeZone"
    - from: "src/app/api/mentorship/bookings/route.ts"
      to: "mentorProfile/menteeProfile timezone"
      via: "Fetch timezone from user profiles in Firestore"
      pattern: "mentorData\\..*timezone|menteeData\\..*timezone"
---

<objective>
Fix timezone display inconsistency in booking system and document the pattern to prevent recurrence.

Purpose: Users are seeing different times for the same booking on the platform vs Discord notifications, and neither display shows timezone labels, causing confusion.

Output:
- Platform booking display shows time in viewer's browser timezone with timezone label
- Discord notifications show time in recipient's timezone (using their profile timezone)
- Architecture decision documented in STATE.md for future reference
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

Current behavior:
- Platform shows: "Feb 18, 2026 at 2:30 PM" (no timezone)
- Discord shows: "Time: 1:30 PM (Asia/Karachi)"
- These differ by 1 hour - inconsistent timezone handling

Root causes identified:
1. BookingsList.tsx uses date-fns format() without timezone awareness
2. Discord notifications use booking.timezone (mentor's timezone at booking time) for ALL recipients
3. No timezone field in mentorship_profiles (need to use timeSlotAvailability.timezone or infer)
4. Pattern not documented - led to "fixed before" but regressed

Technical context:
- Bookings store: startTime/endTime (Date), timezone (string - mentor's timezone at booking)
- MentorshipProfile has timeSlotAvailability.timezone field for mentors
- Browser timezone available via: Intl.DateTimeFormat().resolvedOptions().timeZone
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix platform booking display with viewer's timezone</name>
  <files>src/components/mentorship/BookingsList.tsx</files>
  <action>
Update BookingsList component to show times in viewer's browser timezone with timezone label:

1. Get viewer's timezone: `const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;`

2. Replace formatDate/formatTime functions with timezone-aware versions:
   ```typescript
   const formatDateTime = (date: Date) => {
     const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
     const dateObj = new Date(date);

     // Format: "Feb 18, 2026 at 2:30 PM (CET)"
     const dateStr = format(dateObj, "MMM d, yyyy");
     const timeStr = dateObj.toLocaleTimeString('en-US', {
       hour: 'numeric',
       minute: '2-digit',
       timeZone: viewerTimezone,
       hour12: true
     });

     // Extract timezone abbreviation (e.g., "CET", "PST")
     const tzAbbr = new Intl.DateTimeFormat('en-US', {
       timeZone: viewerTimezone,
       timeZoneName: 'short'
     }).formatToParts(dateObj)
       .find(part => part.type === 'timeZoneName')?.value || viewerTimezone;

     return `${dateStr} at ${timeStr} (${tzAbbr})`;
   };
   ```

3. Update line ~195 in booking display to use new formatDateTime:
   ```typescript
   <p className="text-sm opacity-70">
     {formatDateTime(booking.startTime)}
     {booking.templateId && (() => {
       const tmpl = SESSION_TEMPLATES.find(t => t.id === booking.templateId);
       return tmpl ? ` · ${tmpl.icon} ${tmpl.title}` : "";
     })()}
   </p>
   ```

4. Remove old formatDate and formatTime functions (no longer needed)

Why this approach: Using browser's Intl API ensures time is displayed in the viewer's local timezone automatically, with timezone label for clarity. This prevents the confusion of showing times without context.
  </action>
  <verify>
1. Start dev server: `npm run dev`
2. Navigate to a booking page (e.g., /mentorship/dashboard/[matchId]/bookings)
3. Verify booking times show format: "Feb 18, 2026 at 2:30 PM (CET)" with timezone abbreviation
4. Change system timezone and refresh - time should update to reflect new timezone
  </verify>
  <done>
BookingsList component displays all booking times in viewer's browser timezone with clear timezone label (e.g., "CET", "PST"). Times automatically adjust when viewer's timezone changes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Fix Discord notifications to use recipient's timezone</name>
  <files>src/app/api/mentorship/bookings/route.ts</files>
  <action>
Update Discord notification logic to show times in recipient's timezone (not booking.timezone):

**Problem:** Current code uses `booking.timezone` (mentor's timezone at booking time) for ALL Discord messages, regardless of recipient.

**Solution:** Fetch recipient's timezone from their profile and format times accordingly.

1. **POST /api/mentorship/bookings** (lines ~364-428):

   Extract timezone from profiles:
   ```typescript
   // After fetching mentorData and menteeData (lines ~220-265)
   const mentorTimezone = mentorData.timeSlotAvailability?.timezone || 'UTC';
   const menteeTimezone = menteeData.timeSlotAvailability?.timezone ||
                          menteeData.timezone || 'UTC';
   ```

   Update Discord notification sections (lines ~368-427):
   - For confirmed bookings (mentor notification): Use `mentorTimezone`
   - For pending_approval (mentor notification): Use `mentorTimezone`

   Replace lines 368-369:
   ```typescript
   const formattedDate = format(startTimeDate, "EEEE, MMMM d, yyyy");
   const formattedTime = format(startTimeDate, "h:mm a");
   ```

   With timezone-aware formatting:
   ```typescript
   // Format for mentor (notification recipient)
   const formattedDate = format(startTimeDate, "EEEE, MMMM d, yyyy");
   const formattedTime = startTimeDate.toLocaleTimeString('en-US', {
     hour: 'numeric',
     minute: '2-digit',
     timeZone: mentorTimezone,
     hour12: true
   });
   const tzAbbr = new Intl.DateTimeFormat('en-US', {
     timeZone: mentorTimezone,
     timeZoneName: 'short'
   }).formatToParts(startTimeDate)
     .find(part => part.type === 'timeZoneName')?.value || mentorTimezone;
   ```

   Update message templates to include timezone:
   ```typescript
   **Time:** ${formattedTime} (${tzAbbr})\n
   ```

2. **PUT /api/mentorship/bookings - APPROVE action** (lines ~590-608):

   After line 592 (`const { channelId } = await findMentorshipSessionInfo...`):
   ```typescript
   // Fetch mentee's timezone for notification
   const menteeDoc = await db.collection("mentorship_profiles").doc(bookingData.menteeId).get();
   const menteeTimezone = menteeDoc.data()?.timeSlotAvailability?.timezone ||
                          menteeDoc.data()?.timezone || 'UTC';
   ```

   Update formatting (replace lines 599-600):
   ```typescript
   const formattedDate = format(startDate, "EEEE, MMMM d, yyyy");
   const formattedTime = startDate.toLocaleTimeString('en-US', {
     hour: 'numeric',
     minute: '2-digit',
     timeZone: menteeTimezone,
     hour12: true
   });
   const tzAbbr = new Intl.DateTimeFormat('en-US', {
     timeZone: menteeTimezone,
     timeZoneName: 'short'
   }).formatToParts(startDate)
     .find(part => part.type === 'timeZoneName')?.value || menteeTimezone;
   ```

   Update message (line ~604):
   ```typescript
   ${menteeMention} — Your session on **${formattedDate}** at **${formattedTime}** (${tzAbbr}) has been confirmed by your mentor.
   ```

3. **PUT /api/mentorship/bookings - DECLINE action** (lines ~632-650):

   Add mentee timezone fetch after line 633, apply same timezone-aware formatting pattern.

4. **PUT /api/mentorship/bookings - CANCEL action** (lines ~666-706):

   Update lines 679-680 to use BOTH timezones (since message goes to channel visible to both):
   ```typescript
   // Get both timezones
   const mentorDoc = await db.collection("mentorship_profiles").doc(bookingData.mentorId).get();
   const menteeDoc = await db.collection("mentorship_profiles").doc(bookingData.menteeId).get();
   const mentorTimezone = mentorDoc.data()?.timeSlotAvailability?.timezone || 'UTC';
   const menteeTimezone = menteeDoc.data()?.timeSlotAvailability?.timezone ||
                          menteeDoc.data()?.timezone || 'UTC';

   // Format with both timezones if different
   const formattedDate = format(startDate, "EEEE, MMMM d, yyyy");
   const formatTimeWithTz = (date: Date, tz: string) => {
     const time = date.toLocaleTimeString('en-US', {
       hour: 'numeric',
       minute: '2-digit',
       timeZone: tz,
       hour12: true
     });
     const abbr = new Intl.DateTimeFormat('en-US', {
       timeZone: tz,
       timeZoneName: 'short'
     }).formatToParts(date)
       .find(part => part.type === 'timeZoneName')?.value || tz;
     return `${time} (${abbr})`;
   };

   const timeDisplay = mentorTimezone === menteeTimezone
     ? formatTimeWithTz(startDate, mentorTimezone)
     : `${formatTimeWithTz(startDate, mentorTimezone)} / ${formatTimeWithTz(startDate, menteeTimezone)}`;
   ```

   Update message (lines ~697-698):
   ```typescript
   **Time:** ${timeDisplay}
   ```

**Why this approach:** Each Discord notification recipient sees the time in THEIR timezone (fetched from their profile), not a hardcoded timezone. For channel messages visible to both, show both timezones if they differ.

**Fallback:** If timezone not found in profile, default to 'UTC' to ensure functionality doesn't break.
  </action>
  <verify>
1. Run TypeScript check: `npm run type-check`
2. Test booking creation with notifications (requires Discord bot configured)
3. Verify Discord messages show recipient's timezone
4. Check that channel messages (visible to both) show appropriate timezone format
  </verify>
  <done>
Discord notifications show times in recipient's timezone. Mentor receives notifications in their timezone, mentee receives notifications in their timezone. Channel messages show both timezones when they differ.
  </done>
</task>

<task type="auto">
  <name>Task 3: Document timezone handling pattern in STATE.md</name>
  <files>.planning/STATE.md</files>
  <action>
Add timezone handling architecture decision to STATE.md under the Decisions section (after line ~148).

Insert the following entry in the decisions table:

```markdown
| Timezone Display Pattern | quick-054 | Display times in viewer/recipient timezone, never hardcode. Platform: use browser timezone via Intl API. Discord: fetch recipient's profile timezone. Always include timezone label (e.g., "2:30 PM (CET)"). Prevents user confusion from ambiguous timestamps. |
```

Then add a detailed subsection after the decisions table (before "### Roadmap Evolution"):

```markdown
### Timezone Handling Architecture

**Context:** Bookings span multiple timezones (mentor in Sweden, mentee in Pakistan, etc.). Timestamps stored in Firestore as UTC Dates.

**Decision (quick-054):** Display times in viewer/recipient timezone, NEVER hardcode to booking timezone.

**Implementation Pattern:**

1. **Storage:** Always store UTC (Date objects in Firestore)
2. **Platform Display (UI):**
   - Use viewer's browser timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone`
   - Format with timezone label: "Feb 18, 2026 at 2:30 PM (CET)"
   - Rationale: User expects to see times in their local timezone

3. **Discord Notifications:**
   - Fetch recipient's timezone from their profile: `mentorshipProfile.timeSlotAvailability.timezone`
   - Format with timezone label: "Time: 2:30 PM (CET)"
   - Rationale: Each person should see times in their own timezone

4. **Channel Messages (Both Parties):**
   - Show both timezones if different: "2:30 PM (CET) / 1:30 PM (PKT)"
   - Show single timezone if same: "2:30 PM (CET)"
   - Rationale: Both parties see their local time without confusion

**Fallback:** Default to 'UTC' if timezone not found in profile.

**Testing:** When fixing timezone bugs, verify:
- [ ] Platform shows time in viewer's browser timezone with label
- [ ] Discord notifications use recipient's profile timezone with label
- [ ] Times adjust correctly when timezone changes
- [ ] Timezone labels are always visible (not hidden or missing)

**Why This Matters:** Previous fixes didn't document the pattern, leading to regressions. This decision ensures consistent timezone handling across the codebase.
```

**Rationale:** Documenting the pattern in STATE.md creates an architectural reference that:
1. Prevents future regressions (developers know the expected behavior)
2. Provides testing criteria (checkboxes for verification)
3. Explains the "why" (context for future maintainers)
4. Serves as a decision record (quick-054 reference for history)
  </action>
  <verify>
1. Read .planning/STATE.md and confirm new section exists
2. Verify markdown formatting is correct (no broken tables or lists)
3. Check that the decision is in the decisions table AND has detailed subsection
  </verify>
  <done>
STATE.md contains "Timezone Display Pattern" decision in table and detailed "Timezone Handling Architecture" subsection with implementation pattern, testing checklist, and rationale. Future developers have clear reference for timezone handling.
  </done>
</task>

</tasks>

<verification>
**End-to-end verification:**

1. **Platform Display:**
   - Navigate to /mentorship/dashboard/[matchId]/bookings
   - Verify all booking times show format: "MMM d, yyyy at h:mm AM/PM (TZ)"
   - Change system timezone → times should update automatically
   - Timezone label should always be visible

2. **Discord Notifications:**
   - Create a new booking
   - Check mentor's Discord notification shows time in mentor's timezone
   - Check mentee's perspective (if available) shows time in mentee's timezone
   - Verify timezone label is present in all notifications

3. **Documentation:**
   - Read .planning/STATE.md
   - Confirm "Timezone Display Pattern" decision exists in table
   - Confirm "Timezone Handling Architecture" subsection exists with implementation pattern
   - Verify testing checklist is present for future bug verification

**Success:** No more timezone confusion. Users always see times in their own timezone with clear labels. Pattern is documented to prevent recurrence.
</verification>

<success_criteria>
- [ ] BookingsList component shows all times in viewer's browser timezone with timezone label
- [ ] Discord notifications show times in recipient's timezone (not hardcoded booking.timezone)
- [ ] Channel messages show both timezones when they differ (mentor and mentee in different timezones)
- [ ] STATE.md documents "Timezone Display Pattern" in decisions table
- [ ] STATE.md has detailed "Timezone Handling Architecture" subsection with implementation pattern and testing checklist
- [ ] TypeScript compilation passes with no errors
- [ ] Manual testing confirms times display correctly in multiple timezones
- [ ] User sees consistent times across platform and Discord notifications
</success_criteria>

<output>
After completion, create `.planning/quick/54-fix-timezone-display-inconsistency-in-bo/054-SUMMARY.md`
</output>
