# Codebase Concerns

**Analysis Date:** 2026-01-23

## Tech Debt

**Weak Session Token Implementation:**
- Issue: Admin session tokens are generated using `Buffer.from(...).toString('base64')` with only Date.now() and Math.random() for entropy, not cryptographically secure
- Files: `src/app/api/mentorship/admin/auth/route.ts` (line 41)
- Impact: Admin sessions are predictable and vulnerable to token guessing attacks
- Fix approach: Replace with proper JWT library (jsonwebtoken) using RS256 or HS256, or use stronger randomization with crypto.randomBytes(32)

**Missing Authentication on Public API Routes:**
- Issue: Several endpoints lack proper authentication checks and rely only on uid parameter validation, allowing any user to access any other user's data
- Files:
  - `src/app/api/user-progress/route.ts` - No auth check on GET/POST
  - `src/app/api/mentorship/goals/route.ts` - Only validates uid presence, not ownership
  - `src/app/api/mentorship/mentee-requests/route.ts` - Could be vulnerable
- Impact: Users can modify or view data belonging to other users by spoofing uid parameter
- Fix approach: Implement middleware to verify Firebase auth token on every protected route, ensure uid matches authenticated user

**Insecure TLS Flag in Production:**
- Issue: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"` is set in development but could accidentally be enabled in prod
- Files:
  - `src/app/api/mentorship/announcement-image/route.tsx` (line 277)
  - `src/app/api/mentorship/announcement-image/mentor/route.tsx`
- Impact: Disables SSL/TLS certificate verification, enabling MITM attacks
- Fix approach: Remove this code entirely; use proper certificate handling through environment configuration

**Large Monolithic Components:**
- Issue: Several components exceed 700+ lines, mixing UI logic, state management, and API calls
- Files:
  - `src/app/mentorship/admin/page.tsx` (1148 lines)
  - `src/app/mentorship/mentors/[username]/MentorProfileClient.tsx` (802 lines)
  - `src/lib/discord.ts` (794 lines)
  - `src/app/mentorship/dashboard/[matchId]/page.tsx` (756 lines)
  - `src/app/logic-buddy/LogicBuddyClient.tsx` (711 lines)
- Impact: Difficult to test, maintain, and reason about. High risk of bugs with complex interactions
- Fix approach: Break into smaller, focused components with single responsibilities. Extract API logic to custom hooks

**TypeScript Any Types:**
- Issue: Loose type safety with `any` types used in several places
- Files: `src/components/MDXComponents.tsx` (line 79) - `components={MDXComponents as any}`
- Impact: Loses type safety benefits and makes refactoring risky
- Fix approach: Create proper TypeScript interfaces for component props and exports

**Unstructured Error Handling:**
- Issue: Widespread use of generic console.error() without structured logging or error recovery
- Files: 50+ files with pattern `console.error("Error fetching X:", error)`
- Impact: Difficult to debug production issues, no error aggregation/monitoring
- Fix approach: Implement proper logger usage (already exists as `createLogger`) consistently across codebase

## Security Considerations

**Admin Password Storage Vulnerability:**
- Risk: Simple password comparison without rate limiting. Session tokens stored in unencrypted Firestore
- Files: `src/app/api/mentorship/admin/auth/route.ts` (lines 34-48)
- Current mitigation: bcrypt for password hashing (good), 24-hour expiration on tokens (inadequate)
- Recommendations:
  - Add rate limiting on POST /admin/auth (max 5 attempts per IP per hour)
  - Store sessions in Redis instead of Firestore for better TTL handling
  - Implement admin role verification through Firebase custom claims
  - Add CSRF token verification for admin actions

**Missing Authorization Middleware:**
- Risk: Admin endpoints check token but don't verify it belongs to authenticated admin
- Files: `src/app/api/mentorship/admin/alerts/route.ts`, `src/app/api/mentorship/admin/profiles/route.ts`, etc.
- Current mitigation: x-admin-token header check only
- Recommendations:
  - Create middleware that validates token before route handler executes
  - Combine with user Firebase authentication
  - Add audit logging for all admin actions

**Insufficient Input Validation:**
- Risk: User inputs are minimally validated before database writes
- Files: `src/app/api/mentorship/match/route.ts` (lines 88-96 check status enum but no length limits on strings)
- Current mitigation: Some enum validation
- Recommendations:
  - Add zod or joi schema validation on all API inputs
  - Sanitize strings to prevent injection attacks
  - Add maximum length limits on all string fields
  - Validate array lengths before processing

**Email Injection Vulnerability:**
- Risk: User-supplied data (displayName, careerGoals, etc.) rendered in HTML emails without escaping
- Files: `src/lib/email.ts` - email templates embed user data directly
- Current mitigation: None visible
- Recommendations:
  - HTML-escape all user data in email templates
  - Use template library with auto-escaping
  - Test with XSS payloads in displayName field

**External Image URL Handling:**
- Risk: User profile photo URLs and UI avatar URLs fetched without validation or rate limiting
- Files: `src/app/api/mentorship/announcement-image/route.tsx` (lines 128-156)
- Current mitigation: None - any URL can be requested
- Recommendations:
  - Validate image URLs against whitelist of approved domains
  - Add timeout to fetch requests (currently unbounded)
  - Implement request rate limiting per user
  - Cache successful image fetches

## Performance Bottlenecks

**N+1 Query Pattern in Admin Profiles:**
- Problem: Fetching all sessions, all ratings, then iterating to count per user
- Files: `src/app/api/mentorship/admin/profiles/route.ts` (lines 24-52)
- Cause: Three separate collection queries followed by JavaScript iteration
- Improvement path:
  - Use Firestore aggregation queries instead
  - Denormalize counts to profile documents
  - Add indexes on (status, mentorId) and (mentorId, status)

**Unoptimized Discord Member Lookup:**
- Problem: Full member search API call on every match approval, no caching
- Files: `src/lib/discord.ts` (lines 100-143), called from `src/app/api/mentorship/match/route.ts` (lines 340-343)
- Cause: No in-memory or Redis cache for Discord member IDs
- Improvement path:
  - Cache Discord username->ID mappings for 1 hour
  - Bulk lookup multiple members in single API call
  - Pre-fetch Discord data when profile is created

**Image Generation on Every Request:**
- Problem: Announcement images regenerated from scratch each time, fetching external photos
- Files: `src/app/api/mentorship/announcement-image/route.tsx`
- Cause: No check if image already exists before regenerating
- Improvement path:
  - Check announcementImageUrl before processing
  - Add ETag/cache headers so client caches for 30 days
  - Batch image generation as background job instead of synchronous API call

**Context Dependencies in Useeffects:**
- Problem: useEffect lacks dependency array optimization, could cause unnecessary re-renders
- Files: `src/contexts/MentorshipContext.tsx` (line 145) - `useEffect` depends on `profile` but `refreshMatches` not memoized
- Cause: Context consumer functions recreated on every render
- Improvement path:
  - Use useCallback to memoize refreshProfile and refreshMatches
  - Add proper dependency arrays to all useEffect hooks

## Fragile Areas

**Discord Channel Creation Flow:**
- Files: `src/lib/discord.ts` (lines 155-255), `src/app/api/mentorship/match/route.ts` (lines 374-406)
- Why fragile:
  - Multiple API calls to Discord without transaction-like behavior
  - If category creation succeeds but channel creation fails, orphaned category left behind
  - Batch operations not atomic
  - Rate limit handling only retries 3 times, then fails silently
- Safe modification:
  - Extract to separate microservice with retry logic and dead letter queue
  - Implement idempotent channel creation (check if exists first)
  - Add Discord rate limit backoff with exponential retry
- Test coverage: No visible tests for Discord integration

**Admin Profile Status Updates:**
- Files: `src/app/api/mentorship/admin/profiles/route.ts` (lines 78-203)
- Why fragile:
  - When disabling a profile, updates 100+ sessions in batch without transaction
  - If batch commit partially fails, sessions could be in inconsistent state
  - Cascading updates to sessions not validated against current state
  - Email sending doesn't block, so notifications could fail silently
- Safe modification:
  - Use Firestore transactions instead of batch writes
  - Validate session state before each update
  - Implement idempotent status changes
  - Add compensation logic for partial failures
- Test coverage: No visible tests

**Session Matching Logic:**
- Files: `src/app/api/mentorship/match/route.ts` (lines 86-240)
- Why fragile:
  - Capacity checks race condition: mentor capacity checked then session approved separately
  - Between check and approval, another request could consume last slot
  - Auto-cancellation of pending requests happens after approval, not atomically
  - No validation that menteeId isn't already approved with another mentor
- Safe modification:
  - Use Firestore transactions to atomically check capacity and create session
  - Pre-check that mentee has no active sessions before approval
  - Make cancel-pending-requests part of same transaction
- Test coverage: No visible tests

**Context Initial Load Race Condition:**
- Files: `src/contexts/MentorshipContext.tsx` (lines 99-131)
- Why fragile:
  - Auth state changes trigger profile fetch
  - Profile fetch triggers match refresh
  - If component unmounts during fetches, state updates on unmounted component
  - Multiple simultaneous profile/match requests could race
- Safe modification:
  - Implement abort controller for fetch cleanup
  - Store request promises and cancel on unmount
  - Deduplicate simultaneous requests using singleton pattern
- Test coverage: No visible tests

## Scaling Limits

**Firebase Firestore Query Limits:**
- Current capacity: Fetching all profiles, sessions, ratings in admin dashboard is O(n)
- Limit: Admin page GET will timeout with 100,000+ users
- Scaling path:
  - Implement pagination (10 items per page)
  - Pre-aggregate stats to separate collection updated hourly
  - Use Firestore real-time listeners with limits instead of one-off queries

**Discord Category Channel Limit:**
- Current capacity: 45 channels per category (enforced at line 146 of discord.ts)
- Limit: Auto-creates new batch at 45 channels, but batching logic could create duplicate categories under race conditions
- Scaling path:
  - Use shared counter collection for atomic batch creation
  - Pre-create category batches during off-peak hours
  - Move to Discord stage channels or threads instead of channels

**Firebase Storage Upload Concurrency:**
- Current capacity: No rate limiting on announcement image uploads
- Limit: Uncontrolled concurrent uploads could trigger quota limits
- Scaling path:
  - Implement queue for image uploads
  - Add concurrency limit (max 5 concurrent uploads)
  - Batch images by matchId to reuse existing images

## Dependencies at Risk

**outdated firebase-admin Package:**
- Risk: No visible version lock in package.json, could pull breaking changes
- Impact: Auth initialization or Firestore API changes break in production
- Migration plan: Pin firebase-admin to specific major version (e.g., ^12.0.0), test minor version upgrades in staging

**Mailgun Dependency for Critical Email Flow:**
- Risk: Email sending failures fail silently with .catch() - emails never sent to users
- Impact: Users miss critical notifications (match approvals, mentor requests, completions)
- Migration plan:
  - Implement retry queue for failed emails
  - Add alert when email send fails
  - Use alternative provider (SendGrid, AWS SES) as fallback

**Discord.js (or Discord API Client) Not Used:**
- Risk: Raw Discord API calls are error-prone and lack helper libraries
- Impact: Each Discord feature requires manual HTTP handling with retry logic
- Migration plan: Evaluate discord.js library, but note startup time implications for serverless

## Missing Critical Features

**No Audit Logging:**
- Problem: Admin actions (disable user, change status) not logged for compliance/debugging
- Blocks: Cannot investigate who changed what when, required for GDPR compliance
- Files: `src/app/api/mentorship/admin/profiles/route.ts` - updates happen without logging

**No Rate Limiting:**
- Problem: API endpoints unprotected from brute force, spam, or DoS
- Blocks: Cannot safely expose endpoints publicly, vulnerable to abuse
- Files: All API routes in `src/app/api/`

**No Email Verification:**
- Problem: Email addresses accepted without verification step
- Blocks: Cannot be sure emails are valid, user communication fails
- Files: Profile creation routes don't trigger verification flow

**No User Consent/GDPR Compliance:**
- Problem: No consent collection for email/data processing
- Blocks: Not compliant with GDPR/CCPA if users from EU/CA
- Files: Entire mentorship system lacks consent tracking

## Test Coverage Gaps

**API Route Tests Missing:**
- Untested area: Admin authentication, authorization, profile updates
- Files:
  - `src/app/api/mentorship/admin/auth/route.ts` - No tests for token generation or session validation
  - `src/app/api/mentorship/match/route.ts` - No tests for capacity checks or race conditions
  - `src/app/api/mentorship/dashboard/[matchId]/route.ts` - No tests for status transitions
- Risk: Auth bypasses, data leaks, cascading failures go unnoticed
- Priority: **High** - admin and match-making APIs are critical paths

**Context Hook Tests Missing:**
- Untested area: MentorshipContext initialization, state updates, effect dependencies
- Files: `src/contexts/MentorshipContext.tsx`
- Risk: Race conditions during auth state changes cause silent failures
- Priority: **High** - used by entire mentorship feature

**Discord Integration Tests Missing:**
- Untested area: Channel creation, error handling, rate limit retry logic
- Files: `src/lib/discord.ts`
- Risk: Partial failures leave orphaned resources, user notifications fail silently
- Priority: **Medium** - affects user experience but doesn't expose data

**Email Sending Tests Missing:**
- Untested area: Email template rendering, recipient validation, failure scenarios
- Files: `src/lib/email.ts`
- Risk: Emails never reach users due to injection or malformed data
- Priority: **Medium** - affects user communication

---

*Concerns audit: 2026-01-23*
