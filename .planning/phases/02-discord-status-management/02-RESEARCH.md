# Phase 2: Discord & Status Management - Research

**Researched:** 2026-01-23
**Domain:** Next.js API mutations, Firestore document updates, state management
**Confidence:** HIGH

## Summary

Phase 2 adds CRUD operations to the admin dashboard built in Phase 1. The domain involves three main areas: (1) updating Discord usernames in Firestore profiles, (2) regenerating Discord channel links for mentorships, and (3) managing mentorship lifecycle status transitions (active/completed/deleted).

The standard approach uses Next.js API routes with PUT/DELETE methods, Firestore Admin SDK's `update()` method for field-level changes, and client-side state updates with optimistic UI patterns. The existing codebase already follows these patterns (see Phase 1's profile status management), so this phase extends the pattern to new domains.

Critical insight: Mentorship status transitions form a state machine (pending → active → completed, with ability to revert). Invalid transitions (e.g., pending → deleted) should be prevented at the API level to maintain data integrity.

**Primary recommendation:** Use Firestore batched writes for Discord username updates that affect both profile and mentorship session documents, implement explicit status transition validation, and provide inline editing UI to minimize modal dialogs.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.0.10 | API Routes (App Router) | Already in use, handles PUT/DELETE/PATCH methods natively |
| firebase-admin | 13.6.0 | Firestore mutations | Already in use, server-side document updates |
| React | 19.2.1 | Client UI with state | Already in use, native useOptimistic hook for optimistic updates |
| date-fns | 4.1.0 | Timestamp formatting | Already in use for dates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | 10.1.0 | Debounced search | Already in use, apply to inline edit validation |
| Zod | N/A | Schema validation | Optional - for Discord username format validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API Routes | Server Actions | Server Actions are newer but require form-based interactions; API routes better for programmatic mutations from existing UI |
| useOptimistic (React 19) | TanStack Query | TanStack Query adds optimistic updates + caching but requires new dependency; React native hook sufficient for this phase |
| Inline editing | Modal forms | Modals interrupt workflow; inline editing faster for single-field updates like Discord username |

**Installation:**
```bash
# No new dependencies required - all libraries already installed
# Optional for validation:
npm install zod
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/api/mentorship/admin/
├── profiles/
│   └── route.ts              # Existing: GET, PUT (status updates)
├── discord/
│   └── route.ts              # NEW: PUT (username updates, channel regeneration)
├── sessions/
│   └── route.ts              # NEW: PUT (status transitions), DELETE (remove mentorship)
└── matches/
    └── route.ts              # Existing: GET (Phase 1)
```

### Pattern 1: Field-Level Update API Route

**What:** API route that validates input, updates specific Firestore fields, returns updated document
**When to use:** Updating Discord username, regenerating channel URL, status transitions

**Example:**
```typescript
// Source: Existing pattern from src/app/api/mentorship/admin/profiles/route.ts (Phase 1)
// Adapted for Discord username updates

export async function PUT(request: NextRequest) {
  try {
    const { uid, discordUsername, role } = await request.json()

    // Validate input
    if (!uid || !discordUsername) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate Discord username format (2-32 chars, lowercase, alphanumeric + _ .)
    if (!/^[a-z0-9_.]{2,32}$/.test(discordUsername)) {
      return NextResponse.json(
        { error: 'Invalid Discord username format' },
        { status: 400 }
      )
    }

    // Update Firestore document - use update() for field-level changes
    const profileRef = db.collection('mentorship_profiles').doc(uid)
    await profileRef.update({
      discordUsername,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return NextResponse.json({ success: true, uid, discordUsername })
  } catch (error) {
    console.error('Error updating Discord username:', error)
    return NextResponse.json(
      { error: 'Failed to update Discord username' },
      { status: 500 }
    )
  }
}
```

### Pattern 2: Status Transition Validation

**What:** Validate that status transitions follow allowed state machine rules
**When to use:** Marking mentorships complete, reverting to active, deleting

**Example:**
```typescript
// Source: Best practices from commercetools state machine docs
// https://docs.commercetools.com/learning-model-your-business-structure/state-machines/states-and-best-practices

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: ['active'], // Can revert completed → active
  cancelled: [] // Cannot transition from cancelled
}

function validateTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || []
  return allowed.includes(newStatus)
}

export async function PUT(request: NextRequest) {
  const { sessionId, status } = await request.json()

  // Fetch current status
  const sessionRef = db.collection('mentorship_sessions').doc(sessionId)
  const sessionDoc = await sessionRef.get()

  if (!sessionDoc.exists) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const currentStatus = sessionDoc.data()?.status

  // Validate transition
  if (!validateTransition(currentStatus, status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${currentStatus} to ${status}` },
      { status: 400 }
    )
  }

  // Update with timestamp
  await sessionRef.update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(status === 'completed' && { completedAt: admin.firestore.FieldValue.serverTimestamp() })
  })

  return NextResponse.json({ success: true })
}
```

### Pattern 3: Optimistic UI Update

**What:** Update UI immediately, revert if API call fails
**When to use:** Discord username editing, status changes - any mutation where instant feedback improves UX

**Example:**
```typescript
// Source: React 19 useOptimistic hook - https://react.dev/reference/react/useOptimistic
import { useOptimistic, useState } from 'react'

function DiscordUsernameEditor({ profile }: { profile: MentorshipProfile }) {
  const [isEditing, setIsEditing] = useState(false)
  const [optimisticUsername, setOptimisticUsername] = useOptimistic(
    profile.discordUsername || ''
  )

  const handleSave = async (newUsername: string) => {
    // Optimistically update UI
    setOptimisticUsername(newUsername)
    setIsEditing(false)

    try {
      const response = await fetch('/api/mentorship/admin/discord', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: profile.uid, discordUsername: newUsername })
      })

      if (!response.ok) {
        throw new Error('Update failed')
      }

      // Success - optimistic update was correct
    } catch (error) {
      // Revert optimistic update
      setOptimisticUsername(profile.discordUsername || '')
      toast.error('Failed to update Discord username')
    }
  }

  return isEditing ? (
    <input
      defaultValue={optimisticUsername}
      onBlur={(e) => handleSave(e.target.value)}
    />
  ) : (
    <div onClick={() => setIsEditing(true)}>
      {optimisticUsername}
    </div>
  )
}
```

### Pattern 4: Batched Write for Related Documents

**What:** Use Firestore batched writes when updating multiple documents atomically
**When to use:** If Discord username update needs to propagate to related documents

**Example:**
```typescript
// Source: Firebase Firestore transactions docs
// https://firebase.google.com/docs/firestore/manage-data/transactions

// If mentorship_sessions also store Discord usernames (for denormalization)
const batch = db.batch()

// Update profile
const profileRef = db.collection('mentorship_profiles').doc(uid)
batch.update(profileRef, {
  discordUsername: newUsername,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
})

// Update all related mentorship sessions
const sessions = await db.collection('mentorship_sessions')
  .where(role === 'mentor' ? 'mentorId' : 'menteeId', '==', uid)
  .get()

sessions.docs.forEach(doc => {
  batch.update(doc.ref, {
    [role === 'mentor' ? 'mentorDiscordUsername' : 'menteeDiscordUsername']: newUsername
  })
})

await batch.commit()
```

### Anti-Patterns to Avoid

- **Using set() instead of update():** `set()` overwrites entire document, losing fields. Use `update()` for field-level changes. Only use `set()` with `{merge: true}` if you need to create-or-update behavior.
- **No transition validation:** Allowing arbitrary status changes (e.g., cancelled → active) creates invalid states. Always validate transitions against allowed state machine rules.
- **Modal dialogs for single-field edits:** Opening a modal to edit Discord username is excessive. Use inline editing with blur/enter to save.
- **Updating without timestamps:** Always update `updatedAt` field to track when changes occurred.
- **Not handling update conflicts:** If two admins edit simultaneously, last-write-wins. For critical fields, use Firestore transactions with read-then-write to detect conflicts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Optimistic updates | Custom state tracking with revert logic | React 19's useOptimistic hook | Built-in hook handles pending state, automatic revert, type-safe |
| Discord username validation | Custom regex without specs | Discord's official format (2-32 chars, lowercase, [a-z0-9_.]) | Discord changed format in 2023, official rules prevent invalid usernames |
| Date/time formatting | Custom date formatters | date-fns (already installed) | Handles timezones, locales, edge cases |
| Input debouncing | Custom setTimeout logic | use-debounce (already installed) | Handles cleanup, cancellation, React lifecycle |
| State machine validation | Ad-hoc if/else chains | Explicit ALLOWED_TRANSITIONS map | Self-documenting, maintainable, prevents bugs |

**Key insight:** The existing codebase (Phase 1) already solved most of these problems. Phase 2 extends existing patterns rather than introducing new complexity.

## Common Pitfalls

### Pitfall 1: Firestore Document Update Rate Limits
**What goes wrong:** Updating same document too frequently causes contention errors
**Why it happens:** Maximum write rate to a single document is ~1 per second under contention. Multiple admins editing same profile simultaneously can trigger this.
**How to avoid:**
- Use debounced input for inline editing (already have use-debounce)
- Show "Saving..." indicator during updates
- Handle 503/RESOURCE_EXHAUSTED errors gracefully with retry
**Warning signs:** Users report "Update failed" errors during simultaneous edits

### Pitfall 2: Discord Username Format Mismatch
**What goes wrong:** Users enter old-format usernames (Username#1234) or invalid characters
**Why it happens:** Discord changed username format in 2023. Old discriminator format no longer valid.
**How to avoid:**
- Client-side validation: `/^[a-z0-9_.]{2,32}$/` regex
- Server-side validation: same regex before Firestore update
- Show format hint: "2-32 characters, lowercase, alphanumeric + underscore/period"
**Warning signs:** API returns 400 errors, usernames rejected by Discord API later

### Pitfall 3: Status Transition Without Validation
**What goes wrong:** Mentorships end up in invalid states (e.g., cancelled → active)
**Why it happens:** Frontend sends arbitrary status values, backend accepts without validation
**How to avoid:**
- Define ALLOWED_TRANSITIONS map at API level
- Validate current status before allowing transition
- Return 400 error with clear message: "Cannot transition from X to Y"
**Warning signs:** Data inconsistencies, mentorships in unexpected states

### Pitfall 4: Deleting Without Cascade Consideration
**What goes wrong:** Deleting mentorship leaves orphaned data in related collections
**Why it happens:** Delete only removes document from mentorship_sessions, doesn't clean up related data
**How to avoid:**
- Document what gets deleted (just the session? or related messages/reviews too?)
- Use soft delete (status: 'deleted') instead of hard delete if data recovery needed
- If hard delete required, use batched writes to remove related documents
**Warning signs:** Orphaned data found during audits, storage costs higher than expected

### Pitfall 5: Missing Timestamp Updates
**What goes wrong:** updatedAt field not refreshed, can't track when changes occurred
**Why it happens:** Forgot to include `updatedAt: FieldValue.serverTimestamp()` in update payload
**How to avoid:**
- Create helper function that automatically adds updatedAt to all mutations
- Code review checklist: verify timestamp fields present
- Add status-specific timestamps (completedAt, cancelledAt) for audit trail
**Warning signs:** updatedAt timestamps stale, can't determine when last edit occurred

### Pitfall 6: Optimistic Update Race Conditions
**What goes wrong:** Optimistic update applies, then API fails, but UI shows stale optimistic state
**Why it happens:** useOptimistic doesn't automatically revert on failure, must handle manually
**How to avoid:**
- Always wrap API calls in try/catch
- On error, explicitly revert optimistic state to original value
- Show toast notification on failure so user knows update didn't persist
**Warning signs:** Users report edits "disappearing" after page refresh

### Pitfall 7: Modal Overuse for Simple Edits
**What goes wrong:** Every edit opens modal, interrupts workflow, requires click to close
**Why it happens:** Default to modal dialogs without considering inline alternatives
**How to avoid:**
- Use inline editing for single-field changes (Discord username)
- Reserve modals for multi-field forms or destructive actions (delete confirmation)
- Click-to-edit pattern: display value, click to show input, blur/enter to save
**Warning signs:** User complaints about "too many clicks", slow editing workflow

## Code Examples

Verified patterns from official sources and existing codebase:

### Firestore Field Update (Admin SDK)
```typescript
// Source: Firebase Admin SDK docs + existing Phase 1 pattern
// https://firebase.google.com/docs/firestore/manage-data/add-data

// Update specific fields without overwriting document
const profileRef = db.collection('mentorship_profiles').doc(uid)
await profileRef.update({
  discordUsername: newUsername,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
})

// Alternative: set with merge for create-or-update behavior
await profileRef.set({
  discordUsername: newUsername,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
}, { merge: true })
```

### Next.js API Route Structure
```typescript
// Source: Existing pattern from src/app/api/mentorship/admin/profiles/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebaseAdmin'
import * as admin from 'firebase-admin'

export async function PUT(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json()
    const { uid, fieldName, fieldValue } = body

    if (!uid || !fieldName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Perform update
    const docRef = db.collection('collection_name').doc(uid)
    await docRef.update({
      [fieldName]: fieldValue,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return NextResponse.json({ success: true, uid })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      )
    }

    await db.collection('collection_name').doc(id).delete()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
```

### Inline Edit Component Pattern
```typescript
// Source: Best practices from React community + UX research
// https://www.eleken.co/blog-posts/modal-ux

import { useState } from 'react'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  placeholder?: string
}

function InlineEdit({ value, onSave, placeholder }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentValue, setCurrentValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(currentValue)
      setIsEditing(false)
    } catch (error) {
      // Revert to original value on error
      setCurrentValue(value)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <div
        className="cursor-pointer hover:bg-base-200 rounded px-2 py-1"
        onClick={() => setIsEditing(true)}
      >
        {value || <span className="text-base-content/50">{placeholder}</span>}
      </div>
    )
  }

  return (
    <input
      type="text"
      className="input input-bordered input-sm"
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave()
        if (e.key === 'Escape') {
          setCurrentValue(value)
          setIsEditing(false)
        }
      }}
      autoFocus
      disabled={isSaving}
    />
  )
}
```

### Delete with Confirmation
```typescript
// Source: DaisyUI modal pattern + existing alerts pattern from Phase 1

function DeleteMentorshipButton({ sessionId, onDeleted }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/mentorship/admin/sessions?id=${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Delete failed')

      onDeleted(sessionId)
      toast.success('Mentorship deleted successfully')
    } catch (error) {
      toast.error('Failed to delete mentorship')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        className="btn btn-error btn-sm"
        onClick={() => (document.getElementById('delete-modal') as HTMLDialogElement)?.showModal()}
      >
        Delete
      </button>

      <dialog id="delete-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Delete Mentorship?</h3>
          <p className="py-4">
            This action cannot be undone. The mentorship will be permanently removed.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost">Cancel</button>
            </form>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server Actions for all mutations | API Routes for programmatic mutations | Next.js 13-15 | Server Actions better for form submissions, API Routes better for existing UI-driven mutations |
| TanStack Query for optimistic updates | React 19 useOptimistic hook | React 19 (2024) | Native hook simpler for basic cases, TanStack still better for complex caching needs |
| Discord username with discriminator (User#1234) | Unique lowercase username (user) | Discord update 2023 | All new usernames must follow new format, validation regex changed |
| Modals for all edits | Inline editing for single fields | Modern UX research 2020+ | Inline editing faster, less disruptive, better for admin workflows |

**Deprecated/outdated:**
- **Discord discriminator format (Username#1234):** No longer valid, must use lowercase alphanumeric usernames
- **Firestore set() without merge:** Overwrites entire document, loses fields. Use update() or set with merge: true
- **Pages Router API routes:** Next.js 13+ uses App Router, different file structure and patterns

## Open Questions

### 1. Discord Channel Regeneration Scope
**What we know:**
- Requirement DISC-03 states "Admin can regenerate Discord channel for a mentorship"
- Current data structure has `discordChannelId` and `discordChannelUrl` fields in mentorship_sessions
- These fields appear to be set during mentorship creation (Phase 1 or earlier)

**What's unclear:**
- Does "regenerate" mean creating a NEW Discord channel via Discord API, or updating the URL/ID to an existing channel?
- Is there existing Discord bot integration code that creates channels?
- Who has permissions to create Discord channels (bot? admin? manual process?)

**Recommendation:**
If no Discord bot integration exists, implement as "Update Discord channel URL" - admin pastes new channel URL from manually created channel. If bot integration exists, investigate bot code and use bot API to create new channel. Start with simpler URL update approach, add bot integration if needed.

### 2. Soft Delete vs Hard Delete
**What we know:**
- Requirement STAT-03: "Admin can delete a mentorship entirely"
- Current Phase 1 implementation shows mentorships with status including 'cancelled'
- No existing "deleted" status in status list

**What's unclear:**
- Should delete be permanent (hard delete from Firestore) or soft delete (status: 'deleted')?
- Are there related documents (reviews, session notes) that should be cascade-deleted?
- Is there a business need to recover deleted mentorships?

**Recommendation:**
Implement as hard delete (Firestore doc.delete()) unless user requests soft delete. Hard delete is simpler and matches "entirely" wording in requirements. Add confirmation modal to prevent accidental deletion. If recovery is needed, soft delete with status: 'deleted' and filter from UI queries.

### 3. Real-time Updates for Multi-Admin Scenarios
**What we know:**
- Multiple admins might use dashboard simultaneously
- Phase 1 has no real-time updates, uses fetch on load
- Firestore supports real-time listeners (onSnapshot)

**What's unclear:**
- Should dashboard show real-time updates when another admin makes changes?
- Expected number of concurrent admins (2-3? 10+?)
- Performance impact of real-time listeners for large datasets

**Recommendation:**
Don't implement real-time updates in Phase 2. Add manual refresh button if needed. Real-time updates add complexity (listener cleanup, race conditions) without clear UX benefit for admin tools. Revisit if users report stale data issues.

## Sources

### Primary (HIGH confidence)
- Firebase Firestore Admin SDK documentation - https://firebase.google.com/docs/firestore/manage-data/add-data
- Firebase Transactions and Batched Writes - https://firebase.google.com/docs/firestore/manage-data/transactions
- React 19 useOptimistic hook - https://react.dev/reference/react/useOptimistic
- Discord username format rules - https://support.discord.com/hc/en-us/articles/12620128861463-New-Usernames-Display-Names
- Next.js 16 official documentation - https://nextjs.org/blog/next-16
- Existing codebase patterns from Phase 1 (src/app/api/mentorship/admin/profiles/route.ts, src/app/mentorship/admin/page.tsx)

### Secondary (MEDIUM confidence)
- Next.js API Routes best practices - https://makerkit.dev/blog/tutorials/nextjs-api-best-practices
- Firestore best practices - https://firebase.google.com/docs/firestore/best-practices
- State machine best practices - https://docs.commercetools.com/learning-model-your-business-structure/state-machines/states-and-best-practices
- Modal UX best practices - https://www.eleken.co/blog-posts/modal-ux
- Next.js error handling patterns - https://betterstack.com/community/guides/scaling-nodejs/error-handling-nextjs/

### Tertiary (LOW confidence)
- WebSearch: TanStack Query vs useOptimistic (2026 community patterns)
- WebSearch: Discord bot channel creation (requires verification with actual Discord bot code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified versions from package.json
- Architecture: HIGH - Patterns based on existing Phase 1 implementation and official docs
- Pitfalls: HIGH - Based on Firebase best practices docs and known Discord format changes
- Discord channel regeneration: LOW - Unclear if bot integration exists, recommend starting with URL update approach

**Research date:** 2026-01-23
**Valid until:** 30 days (stable domain - Firestore Admin SDK, Next.js API routes change infrequently)

**Key assumptions:**
1. No Discord bot integration exists (will need verification)
2. Hard delete acceptable for STAT-03 (can change to soft delete if requested)
3. Single admin at a time is primary use case (no real-time sync needed)
4. Existing Phase 1 patterns (handleStatusChange, profile updates) provide reference implementation
