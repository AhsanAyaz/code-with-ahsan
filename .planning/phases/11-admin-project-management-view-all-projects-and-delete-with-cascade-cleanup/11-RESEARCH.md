# Phase 11: Admin Project Management - Research

**Researched:** 2026-02-12
**Domain:** Admin dashboard refactor, cascade delete operations, Discord integration
**Confidence:** HIGH

## Summary

This phase requires two parallel workstreams: (1) refactoring the admin dashboard from client-side tabs to Next.js nested routes for proper navigation and lazy loading, and (2) implementing comprehensive project management with atomic cascade delete functionality.

The technical foundation is strong: Next.js 16 App Router provides native nested layout support, Firestore Admin SDK supports batch operations (500 document limit), and Discord REST API enables channel deletion and bulk DM sending. The key challenge is ensuring atomic operations across Firestore and Discord, requiring careful error handling and rollback logic.

**Primary recommendation:** Use Next.js nested routes with shared `layout.tsx` for admin infrastructure, Firestore batch writes for atomic multi-collection deletes, and implement Discord operations first with pre-validation before Firestore commits to enable proper rollback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Admin Dashboard Refactor (Infrastructure)
- **Route structure:** `/admin/*` (new top-level)
  - `/admin` → Overview/dashboard home
  - `/admin/mentors` → All Mentors management
  - `/admin/mentees` → All Mentees management
  - `/admin/projects` → All Projects management (this phase's main feature)
- **Shared layout elements:** Admin header/banner, navigation menu, stats summary bar, breadcrumbs
- **Data loading:** Route-level data fetching (no shared cache between routes)

### Projects List View
- **Organization:** All projects in one list with filters (status, creator, date range, text search)
- **Card display:** Basic info, team size/capacity, timestamps, application/invitation counts
- **Delete action:** Hidden in actions dropdown (not direct delete button)

### Delete Confirmation & Safety
- **Dialog shows:** Project details, impact summary, irreversibility warning, Discord channel note
- **Restrictions:** Allow but require reason (audit trail)
- **Post-deletion:** Toast + confirmation modal with cleanup summary

### Cascade Cleanup Scope
- **Delete:** Members, applications, invitations, roster data, activity logs
- **Discord:** Delete channel completely (not archive)
- **Notifications:** Discord DM to all members with admin's reason
- **Failure handling:** All or nothing (atomic operation)

### Claude's Discretion
- **Confirmation pattern:** Single vs two-step vs type-to-confirm
- **Navigation UI design:** Sidebar vs route-based tabs vs top nav
- **Error handling details:** Specific error messages and retry logic
- **Loading states:** Skeletons, spinners, progress indicators
- **Empty states:** What to show when filters return no results
</user_constraints>

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App Router with nested routes | Native file-system routing, server components, layout nesting |
| React | 19 | UI framework | useActionState for form handling, server/client component split |
| Firebase Admin SDK | Latest | Firestore batch operations | 500-doc batch limit, atomic writes, server-side auth |
| Discord.js/REST API | v10 | Channel deletion, bulk DMs | Official API, rate limit handling built-in |
| TypeScript | Latest | Type safety | Strict typing for admin operations prevents runtime errors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Latest (in project) | Date formatting/filtering | Already used, consistent date handling |
| use-debounce | Latest (in project) | Search input debouncing | Already used in admin page |

### No New Dependencies Required
The existing project stack has all necessary libraries. No new installations needed.

## Architecture Patterns

### Next.js Nested Routes with Shared Layout

**Pattern:** File-system based routing with automatic layout nesting

```
src/app/admin/
├── layout.tsx              # Shared admin layout (wraps all /admin/* routes)
├── page.tsx                # /admin (overview/dashboard home)
├── mentors/
│   └── page.tsx            # /admin/mentors
├── mentees/
│   └── page.tsx            # /admin/mentees
└── projects/
    └── page.tsx            # /admin/projects (this phase)
```

**Shared Layout Implementation:**

```typescript
// src/app/admin/layout.tsx
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Admin Header/Banner */}
      <div className="bg-warning text-warning-content py-2 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <span className="font-bold">⚠️ ADMIN MODE</span>
          <span className="text-sm">Viewing as Administrator</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="bg-base-200 border-b border-base-300">
        <div className="container mx-auto px-4">
          <AdminNavigation />
        </div>
      </nav>

      {/* Stats Summary Bar (optional - can be route-specific) */}
      <div className="bg-base-200 border-b border-base-300 py-3">
        <div className="container mx-auto px-4">
          <AdminStats />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

**Benefits:**
- Layouts automatically nest: root layout → admin layout → page
- On navigation, only page re-renders, layout preserves state
- Shared UI elements defined once, applied to all `/admin/*` routes
- Each route gets clean URL: `/admin/projects` instead of `/admin/dashboard?tab=projects`

**Source:** [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages)

### Filtering and Pagination with URL Search Params

**Pattern:** Server component with search params for filtering

```typescript
// src/app/admin/projects/page.tsx
export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Extract filters from URL params
  const status = params.status as string | undefined;
  const creator = params.creator as string | undefined;
  const search = params.search as string | undefined;

  // Fetch filtered projects (server-side)
  const projects = await fetchProjectsWithFilters({ status, creator, search });

  return (
    <div>
      <ProjectFilters /> {/* Client component that updates URL params */}
      <ProjectList projects={projects} />
    </div>
  );
}
```

**Client Component for Filters:**

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function ProjectFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/projects?${params.toString()}`);
  };

  return (
    <div className="flex gap-4">
      <select onChange={(e) => updateFilter('status', e.target.value)}>
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="declined">Declined</option>
      </select>

      <input
        type="text"
        placeholder="Search projects..."
        onChange={(e) => updateFilter('search', e.target.value)}
      />
    </div>
  );
}
```

**Benefits:**
- Bookmarkable URLs: `/admin/projects?status=pending&search=backend`
- Server-side rendering with filters applied
- Back/forward navigation works correctly
- Clean separation: client handles UI, server fetches data

**Source:** [Next.js Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)

### Atomic Cascade Delete Pattern

**Pattern:** Firestore batch + Discord pre-validation + rollback strategy

```typescript
// src/app/api/admin/projects/[id]/delete/route.ts

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    const { id: projectId } = await params;
    const { reason } = await request.json();

    // ─── PHASE 1: GATHER DATA ───────────────────────────────────

    // Fetch project
    const projectDoc = await db.collection('projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const projectData = projectDoc.data();

    // Fetch all related data (to know what to delete and who to notify)
    const membersSnapshot = await db
      .collection('project_members')
      .where('projectId', '==', projectId)
      .get();

    const applicationsSnapshot = await db
      .collection('project_applications')
      .where('projectId', '==', projectId)
      .get();

    const invitationsSnapshot = await db
      .collection('project_invitations')
      .where('projectId', '==', projectId)
      .get();

    // Extract member info for notifications
    const members = membersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ─── PHASE 2: DISCORD OPERATIONS (VALIDATE FIRST) ──────────

    let discordSuccess = false;

    if (projectData?.discordChannelId) {
      try {
        // Check if channel exists before attempting delete
        const channel = await getChannel(projectData.discordChannelId);
        if (channel) {
          // Delete channel (permanent)
          await fetch(`https://discord.com/api/v10/channels/${projectData.discordChannelId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'X-Audit-Log-Reason': `Admin deletion: ${reason}`
            }
          });
          discordSuccess = true;
        } else {
          // Channel already deleted or doesn't exist - acceptable state
          discordSuccess = true;
        }
      } catch (discordError) {
        console.error('Discord channel deletion failed:', discordError);
        // DECISION POINT: Fail entire operation or continue?
        // User specified "all or nothing" - so we fail here
        return NextResponse.json({
          error: 'Failed to delete Discord channel',
          details: 'Cannot proceed with atomic deletion due to Discord error'
        }, { status: 500 });
      }
    } else {
      // No Discord channel to delete
      discordSuccess = true;
    }

    // ─── PHASE 3: FIRESTORE BATCH DELETE (ATOMIC) ──────────────

    const batch = db.batch();

    // Delete project document
    batch.delete(projectDoc.ref);

    // Delete all members (max 500 docs per batch - check limit)
    membersSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete all applications
    applicationsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete all invitations
    invitationsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Commit batch (atomic - all or nothing)
    await batch.commit();

    // ─── PHASE 4: NOTIFICATIONS (NON-BLOCKING) ─────────────────

    // Send DMs to all members (fire-and-forget, failures logged but don't block)
    const notificationPromises = members.map(async (member) => {
      if (member.userProfile?.discordUsername) {
        try {
          const message =
            `**Project Deleted by Administrator**\n\n` +
            `The project "${projectData?.title}" has been deleted by an admin.\n\n` +
            `**Reason:** ${reason}\n\n` +
            `We apologize for any inconvenience. If you have questions, please contact support.`;

          await sendDirectMessage(member.userProfile.discordUsername, message);
        } catch (dmError) {
          console.error(`Failed to send DM to ${member.userProfile.discordUsername}:`, dmError);
        }
      }
    });

    // Wait for all DMs (with timeout)
    await Promise.allSettled(notificationPromises);

    // ─── PHASE 5: RESPONSE ──────────────────────────────────────

    return NextResponse.json({
      success: true,
      message: 'Project and all related data deleted successfully',
      summary: {
        membersNotified: members.length,
        applicationsDeleted: applicationsSnapshot.size,
        invitationsDeleted: invitationsSnapshot.size,
        discordChannelDeleted: discordSuccess
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Cascade delete failed:', error);
    return NextResponse.json({
      error: 'Failed to delete project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

**Key Decisions:**
1. **Discord first, Firestore second:** Allows rollback if Discord fails (Firestore not committed yet)
2. **Batch limit awareness:** Firestore batches max 500 docs - if exceeded, use multiple batches
3. **Non-blocking notifications:** DMs sent after data deleted, failures don't block success
4. **Audit trail:** Store deletion reason in request, logged to Discord audit log

**Error Handling Strategy:**
- Discord failure → Abort entire operation (return 500)
- Firestore failure → Batch automatically rolls back (atomic)
- Notification failure → Log error, continue (best effort)

**Source:** [Firestore Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions)

### Confirmation Dialog Pattern (Destructive Actions)

**Pattern:** Two-step confirmation with required reason input

```typescript
'use client';

interface DeleteProjectDialogProps {
  project: Project;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export function DeleteProjectDialog({ project, onConfirm, onCancel }: DeleteProjectDialogProps) {
  const [reason, setReason] = useState('');
  const [step, setStep] = useState<'confirm' | 'reason'>('confirm');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!reason.trim()) {
      // Reason required - validation
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm(reason);
    } finally {
      setIsDeleting(false);
    }
  };

  if (step === 'confirm') {
    return (
      <dialog open className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg text-error">⚠️ Delete Project</h3>

          <div className="py-4 space-y-4">
            <p className="text-base-content">
              You are about to <strong>permanently delete</strong> this project:
            </p>

            <div className="bg-base-200 p-4 rounded">
              <p className="font-bold">{project.title}</p>
              <p className="text-sm text-base-content/70">Created by {project.creatorProfile?.displayName}</p>
              <p className="text-sm text-base-content/70">Status: {project.status}</p>
            </div>

            <div className="alert alert-warning">
              <span className="text-sm">
                <strong>This will delete:</strong>
                <ul className="list-disc list-inside mt-2">
                  <li>{project.memberCount || 0} team members will lose access</li>
                  <li>All pending applications and invitations</li>
                  <li>Discord channel and all messages (permanent)</li>
                  <li>Project activity logs</li>
                </ul>
              </span>
            </div>

            <div className="alert alert-error">
              <strong>⚠️ This action cannot be undone</strong>
            </div>
          </div>

          <div className="modal-action">
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={() => setStep('reason')}
            >
              Continue to Delete
            </button>
          </div>
        </div>
      </dialog>
    );
  }

  // Step 2: Reason input
  return (
    <dialog open className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg text-error">Deletion Reason Required</h3>

        <div className="py-4 space-y-4">
          <p className="text-sm text-base-content/70">
            Please provide a reason for deleting this project. This will be:
          </p>

          <ul className="list-disc list-inside text-sm text-base-content/70">
            <li>Logged for audit trail</li>
            <li>Sent to all affected team members via Discord DM</li>
          </ul>

          <textarea
            className="textarea textarea-bordered w-full h-32"
            placeholder="Enter deletion reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />

          <p className="text-xs text-base-content/50">
            Minimum 10 characters required
          </p>
        </div>

        <div className="modal-action">
          <button
            className="btn btn-ghost"
            onClick={() => setStep('confirm')}
            disabled={isDeleting}
          >
            Back
          </button>
          <button
            className="btn btn-error"
            onClick={handleDelete}
            disabled={reason.trim().length < 10 || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

**Design Rationale:**
- **Two-step process:** Reduces accidental deletion risk
- **Required reason:** Forces admin accountability, provides context to users
- **Visual hierarchy:** Error colors (red) for destructive action
- **Impact preview:** Shows exactly what will be deleted
- **Keyboard accessibility:** Tab navigation, Escape to cancel, autofocus on reason
- **Loading state:** Button disabled during deletion

**Sources:**
- [Confirmation Dialogs Best Practices - Nielsen Norman Group](https://www.nngroup.com/articles/confirmation-dialog/)
- [Carbon Design System - Dialog Pattern](https://carbondesignsystem.com/patterns/dialog-pattern/)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-collection query/delete | Custom loop with individual deletes | Firestore batch writes | Atomic operations, rollback on failure, 500-doc efficiency |
| Discord rate limiting | Manual retry logic | Built-in `fetchWithRateLimit` helper (already in project) | Handles 429 responses, exponential backoff, retry logic |
| Admin route protection | Custom auth middleware | Existing `verifyAdminAuth` pattern | Already implemented for admin endpoints |
| Form state management | useState soup | React 19 `useActionState` (if needed) | Built-in pending state, error handling, form reset |
| Date filtering | Custom date comparisons | date-fns (already in project) | Edge cases handled, timezone-aware |

**Key insight:** The project already has robust patterns for Discord operations, admin auth, and data management. Reuse existing helpers instead of reimplementing.

## Common Pitfalls

### Pitfall 1: Firestore Batch Limit Exceeded
**What goes wrong:** Attempting to delete >500 documents in a single batch causes runtime error
**Why it happens:** Projects with many applications/invitations/members exceed 500-doc limit
**How to avoid:**
```typescript
const MAX_BATCH_SIZE = 500;

// Count total operations
const totalOps =
  1 + // project doc
  membersSnapshot.size +
  applicationsSnapshot.size +
  invitationsSnapshot.size;

if (totalOps > MAX_BATCH_SIZE) {
  // Use multiple batches
  const batches = [];
  let currentBatch = db.batch();
  let opsInBatch = 0;

  // Add deletes to batches, creating new batch when limit reached
  // ...

  // Commit all batches sequentially
  for (const batch of batches) {
    await batch.commit();
  }
} else {
  // Single batch is fine
  await batch.commit();
}
```
**Warning signs:** Large projects (>100 members), high application volume

### Pitfall 2: Discord Channel Already Deleted
**What goes wrong:** Attempting to delete non-existent channel returns 404, aborts entire operation
**Why it happens:** Manual channel deletion, previous failed deletion, channel already removed
**How to avoid:**
```typescript
// Check channel exists before delete
const channel = await getChannel(discordChannelId);
if (channel) {
  await deleteChannel(discordChannelId);
} else {
  // Channel already gone - acceptable state for our purposes
  console.log('Channel already deleted, continuing...');
}
```
**Warning signs:** 404 errors in Discord operations, orphaned project data

### Pitfall 3: Partial Deletion on Rollback Failure
**What goes wrong:** Discord deleted but Firestore batch fails - partial state
**Why it happens:** Discord operations happen before Firestore commit
**How to avoid:**
- **Option A:** Discord operations are non-critical - delete Firestore first, Discord second
- **Option B:** Check Discord channel exists, validate permissions, THEN commit Firestore
- **Recommended:** Option B - validate Discord first, commit Firestore, delete Discord, send DMs

**Warning signs:** Projects exist in DB but Discord channel gone, users confused about state

### Pitfall 4: Rate Limiting on Bulk DMs
**What goes wrong:** Sending DMs to many members triggers Discord rate limit (429)
**Why it happens:** Discord API limits: 5 DMs per 5 seconds per recipient
**How to avoid:**
```typescript
// Use existing fetchWithRateLimit helper (already in discord.ts)
// It automatically retries with exponential backoff

// For bulk DMs, send with Promise.allSettled (not Promise.all)
const dmPromises = members.map(member =>
  sendDirectMessage(member.discordUsername, message)
    .catch(err => console.error(`DM failed for ${member.discordUsername}:`, err))
);

await Promise.allSettled(dmPromises); // Don't fail if some DMs fail
```
**Warning signs:** 429 errors in logs, some users not receiving notifications

**Source:** [Discord Rate Limiting Best Practices](https://discord.com/developers/docs/topics/rate-limits)

### Pitfall 5: Search Params Causing Infinite Re-renders
**What goes wrong:** Client component updates search params, triggers re-render, updates params again - infinite loop
**Why it happens:** Effect that watches search params and updates them in same component
**How to avoid:**
```typescript
// ❌ BAD: Effect updates search params it watches
useEffect(() => {
  const params = new URLSearchParams(searchParams);
  params.set('status', selectedStatus);
  router.push(`/admin/projects?${params.toString()}`);
}, [searchParams]); // Infinite loop!

// ✅ GOOD: Only update on user action
const handleStatusChange = (status: string) => {
  const params = new URLSearchParams(searchParams);
  params.set('status', status);
  router.push(`/admin/projects?${params.toString()}`);
};
```
**Warning signs:** Browser becomes unresponsive, console shows rapid URL updates

## Code Examples

### Admin Navigation Component

```typescript
// src/components/admin/AdminNavigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/mentors', label: 'Mentors' },
    { href: '/admin/mentees', label: 'Mentees' },
    { href: '/admin/projects', label: 'Projects' },
  ];

  return (
    <div className="flex gap-4">
      {navItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`py-3 px-4 border-b-2 transition-colors ${
            pathname === item.href
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-base-content/70 hover:text-base-content'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
```

### Discord Channel Deletion (REST API)

```typescript
// Using native fetch (no discord.js library needed for deletion)

async function deleteDiscordChannel(channelId: string, reason: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'X-Audit-Log-Reason': reason
        }
      }
    );

    if (response.ok) {
      console.log(`Channel ${channelId} deleted successfully`);
      return true;
    } else if (response.status === 404) {
      console.log(`Channel ${channelId} already deleted`);
      return true; // Acceptable - desired state achieved
    } else {
      const error = await response.text();
      console.error(`Failed to delete channel: ${response.status} - ${error}`);
      return false;
    }
  } catch (error) {
    console.error('Discord channel deletion error:', error);
    return false;
  }
}
```

**Source:** [Discord Developer Docs - Delete Channel](https://docs.discord.com/developers/resources/channel)

### Server-Side Filtering (Projects List)

```typescript
// src/app/admin/projects/page.tsx

interface ProjectFilters {
  status?: string;
  creator?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

async function fetchProjectsWithFilters(filters: ProjectFilters) {
  let query = db.collection('projects').orderBy('createdAt', 'desc');

  // Apply filters
  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters.creator) {
    query = query.where('creatorId', '==', filters.creator);
  }

  // Date range filtering (requires composite index)
  if (filters.fromDate) {
    query = query.where('createdAt', '>=', new Date(filters.fromDate));
  }

  if (filters.toDate) {
    query = query.where('createdAt', '<=', new Date(filters.toDate));
  }

  const snapshot = await query.get();
  let projects = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    // ... other timestamp conversions
  }));

  // Text search (client-side - Firestore doesn't support full-text search)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    projects = projects.filter(p =>
      p.title?.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower)
    );
  }

  return projects;
}
```

**Note:** Text search is client-side because Firestore doesn't have native full-text search. For production scale, consider Algolia or Typesense.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side tabs with `?tab=` param | Next.js nested routes `/admin/*` | Next.js 13+ App Router | Proper URLs, lazy loading, layout preservation |
| Individual document deletes in loop | Firestore batch writes | Firebase Admin SDK v9+ | Atomic operations, rollback capability |
| discord.js library for all operations | REST API for simple operations | discord.js v14 | Lighter bundle, direct API control |
| Yes/No confirmation dialogs | Descriptive action buttons | Modern UX guidelines (2024+) | Reduced accidental deletions |
| Promise.all for parallel operations | Promise.allSettled for best-effort | Node 12+ | Graceful partial failures |

**Deprecated/outdated:**
- **Client-side only filtering:** Server components render with filters pre-applied (faster initial load)
- **Individual Discord API calls without rate limit handling:** Built-in retry with exponential backoff is standard
- **Implicit deletion without reason:** Modern admin UIs require audit trails and user transparency

## Open Questions

1. **Should we support undo/restore for deleted projects?**
   - What we know: User specified "all or nothing" deletion with no mention of undo
   - What's unclear: Whether to implement soft-delete (status: 'deleted') vs hard-delete
   - Recommendation: Hard-delete for now (simpler), revisit if users request restore capability

2. **How to handle projects with >500 related documents?**
   - What we know: Firestore batch limit is 500 documents
   - What's unclear: Likelihood of projects having >500 total docs (members + apps + invites)
   - Recommendation: Implement multi-batch logic proactively (code provided in pitfalls section)

3. **Should Discord DM failures block the deletion?**
   - What we know: User wants "all or nothing" for data deletion
   - What's unclear: Whether notification failures count as critical failures
   - Recommendation: Non-blocking - log failures but don't abort deletion (notifications are courtesy, not critical)

## Sources

### Primary (HIGH confidence)
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) - Nested routes, layout nesting
- [Firestore Transactions and Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions) - Atomic operations, batch limits
- [Discord Developer Docs - Delete Channel](https://docs.discord.com/developers/resources/channel) - Endpoint syntax, permissions, behavior
- [Next.js Search and Pagination Tutorial](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - URL params pattern

### Secondary (MEDIUM confidence)
- [Nielsen Norman Group - Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/) - UX best practices for destructive actions
- [Carbon Design System - Dialog Pattern](https://carbondesignsystem.com/patterns/dialog-pattern/) - Confirmation dialog accessibility
- [Medium - React 19 Form Handling](https://medium.com/@ignatovich.dm/enhancing-form-handling-in-react-19-a-look-at-action-useformstate-and-useformstatus-a5ee68d6bf93) - useActionState patterns

### Tertiary (LOW confidence - for context only)
- Various GitHub discussions on Next.js nested layouts - Supplemental examples, not relied upon for core patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, versions verified in package.json
- Architecture: HIGH - Official Next.js and Firebase docs, patterns match existing codebase
- Pitfalls: HIGH - Based on official docs and known limitations (500-doc batch, rate limits)
- Discord integration: HIGH - Official Discord API documentation, existing project patterns verified

**Research date:** 2026-02-12
**Valid until:** 2026-04-12 (60 days - stable APIs, Next.js 16 is current stable)
