# Phase 1: Mentorship Mapping View - Research

**Researched:** 2026-01-23
**Domain:** Next.js 16 Admin Dashboard with Firebase Firestore Relationships
**Confidence:** HIGH

## Summary

This phase enhances existing admin dashboard tabs ("All Mentors" and "All Mentees") with mentorship relationship mapping. The technical domain involves React 19 client components, DaisyUI UI patterns for expandable lists, Firebase Firestore queries for related documents, and URL-based search/pagination following Next.js 16 App Router conventions.

The existing codebase uses Next.js 16 App Router with React 19, Firebase/Firestore for data, DaisyUI for UI components, and client-side data fetching patterns with admin token authentication. The admin dashboard at `src/app/mentorship/admin/page.tsx` already implements tabbed navigation, profile listing, and admin actions following established patterns we should extend.

The standard approach is to fetch mentorship matches from Firestore and perform client-side joins with mentor/mentee profiles. DaisyUI collapse components handle expandable sections, skeleton components show loading states, and badge components display status indicators. URL search params manage filtering and pagination to keep state shareable and bookmarkable.

**Primary recommendation:** Use client-side data fetching with URL search params for filtering, implement DaisyUI collapse/skeleton/badge components for UI, and handle Firestore relationships through client-side joins with batched queries to avoid N+1 problems.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.0.10 | App Router framework | Already in use, provides page routing and API routes |
| React | 19.2.1 | Client component state | Required for interactive admin UI with useState |
| Firebase | 12.6.0 | Firestore database | Already configured, stores all mentorship data |
| firebase-admin | 13.6.0 | Server-side Firestore | Used in existing API routes for admin operations |
| DaisyUI | 5.5.1-beta.2 | UI component library | Already styled throughout admin dashboard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.0 | Date formatting | Already used, format "Last activity" and "Start date" |
| lucide-react | 0.562.0 | Icon library | Already used, provides icons for expand/collapse |
| use-debounce | N/A | Debounce search input | Recommended by Next.js docs for search filtering |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DaisyUI | Shadcn UI | Shadcn popular in 2026 templates but DaisyUI already integrated |
| Client-side joins | Firestore denormalization | Denormalization costs writes, client joins cost reads |
| URL params | React state only | URL params enable bookmarking and SSR but already decided in context |

**Installation:**
```bash
npm install use-debounce
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/api/mentorship/admin/
├── matches/
│   └── route.ts              # GET endpoint for mentorship matches with filters
src/app/mentorship/admin/
└── page.tsx                  # Enhance existing tabs with relationship sections
```

### Pattern 1: Client Component with URL Search Params
**What:** Use Next.js `useSearchParams`, `usePathname`, and `useRouter` to manage filtering and pagination state in the URL rather than React state.

**When to use:** For any list view that needs search, filtering, or pagination. Enables bookmarkable URLs and server-side rendering of initial state.

**Example:**
```typescript
// Source: https://nextjs.org/learn/dashboard-app/adding-search-and-pagination
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export default function MentorList() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1'); // Reset to page 1 on new search

    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }

    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <input
      onChange={(e) => handleSearch(e.target.value)}
      defaultValue={searchParams.get('query')?.toString()}
      placeholder="Search mentors..."
    />
  );
}
```

### Pattern 2: DaisyUI Collapse for Expandable Lists
**What:** Use DaisyUI collapse component with checkbox-based toggle to show/hide mentorship relationships.

**When to use:** For showing 3-5 relationships initially with "Show X more" expansion, or for hiding completed mentorships by default.

**Example:**
```typescript
// Source: https://daisyui.com/components/collapse/
<div className="collapse collapse-arrow bg-base-100 border border-base-300">
  <input type="checkbox" defaultChecked={false} />
  <div className="collapse-title text-sm font-medium">
    <span className="badge badge-neutral">3 mentees</span>
  </div>
  <div className="collapse-content">
    {/* Mentee cards rendered here */}
  </div>
</div>
```

### Pattern 3: Client-Side Joins with Batch Fetching
**What:** Fetch mentorship matches, extract unique mentor/mentee IDs, batch fetch profiles in a single query to avoid N+1, then join in client code.

**When to use:** Firestore doesn't support joins. For one-to-many relationships (mentor has many mentees), fetch matches then batch-fetch related profiles.

**Example:**
```typescript
// Source: Existing pattern in src/app/api/mentorship/admin/profiles/route.ts
// Fetch all matches
const matchesSnapshot = await db.collection('mentorship_matches')
  .where('status', 'in', ['active', 'completed'])
  .get();

// Extract unique partner IDs
const mentorIds = [...new Set(matchesSnapshot.docs.map(d => d.data().mentorId))];
const menteeIds = [...new Set(matchesSnapshot.docs.map(d => d.data().menteeId))];

// Batch fetch profiles (Firestore allows up to 30 items in 'in' query)
const mentorProfiles = await Promise.all(
  chunk(mentorIds, 30).map(ids =>
    db.collection('mentorship_profiles').where('uid', 'in', ids).get()
  )
);

// Build lookup maps
const mentorMap = new Map(mentorProfiles.flatMap(snap =>
  snap.docs.map(doc => [doc.id, doc.data()])
));

// Join in client code
const mentorships = matchesSnapshot.docs.map(doc => ({
  ...doc.data(),
  mentorProfile: mentorMap.get(doc.data().mentorId),
  menteeProfile: menteeMap.get(doc.data().menteeId)
}));
```

### Pattern 4: Skeleton Loading States
**What:** Use DaisyUI skeleton component to show animated placeholders while loading data.

**When to use:** During initial page load or when filtering/pagination changes. Matches the existing content structure.

**Example:**
```typescript
// Source: https://daisyui.com/components/skeleton/
{loadingProfiles ? (
  <div className="space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex gap-4">
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
) : (
  // Actual content
)}
```

### Pattern 5: Status Badges with DaisyUI
**What:** Use DaisyUI badge component with semantic color classes for mentorship status indicators.

**When to use:** Display status (Active, Completed, Pending, Cancelled) with color coding.

**Example:**
```typescript
// Source: https://daisyui.com/components/badge/
const statusBadgeClass = {
  active: 'badge-success',
  completed: 'badge-neutral',
  pending: 'badge-warning',
  cancelled: 'badge-error'
};

<span className={`badge ${statusBadgeClass[status]}`}>
  {status.charAt(0).toUpperCase() + status.slice(1)}
</span>
```

### Anti-Patterns to Avoid
- **Fetching profiles in a loop:** Creates N+1 query problem. Always batch fetch with `where('uid', 'in', ids)` in chunks of 30.
- **Using React state for search/pagination:** Next.js docs recommend URL search params for bookmarkable state.
- **Server Components with useState:** Admin dashboard needs `'use client'` directive for interactivity.
- **Denormalizing match data into profiles:** Updates to match status would require updating multiple documents. Keep matches as separate collection.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search input debouncing | setTimeout/clearTimeout manually | `use-debounce` library | Handles cleanup, edge cases, and TypeScript types correctly |
| Pagination UI | Custom button logic | DaisyUI join + pagination pattern | Pre-styled, accessible, consistent with existing UI |
| Loading skeletons | CSS shimmer animation | DaisyUI skeleton component | Matches existing theme, built-in animation |
| Status color mapping | Inline style objects | DaisyUI badge semantic classes | Theme-aware, consistent across light/dark modes |
| URL param management | Manual URLSearchParams manipulation | Next.js useSearchParams hooks | Handles router integration, type-safe |
| Date formatting | new Date().toString() | date-fns format() | Already in use, handles timezones consistently |

**Key insight:** Admin dashboards have many edge cases (empty states, loading states, error states, pagination boundaries) that DaisyUI and Next.js patterns already handle. Custom implementations miss accessibility, theming, and mobile responsiveness.

## Common Pitfalls

### Pitfall 1: N+1 Query Problem in Expandable Lists
**What goes wrong:** Fetching mentor profiles first, then for each mentor expanded, fetching their mentees individually creates N+1 queries (1 for mentors + N queries for each mentor's mentees).

**Why it happens:** Natural instinct is to fetch data as you expand sections. Firestore charges per document read, so this gets expensive fast.

**How to avoid:** Fetch all mentorship matches upfront (filtered by status), extract all unique profile IDs, batch fetch profiles in chunks of 30 (Firestore `in` query limit), then join client-side.

**Warning signs:** Firestore read count spikes when expanding sections. Loading spinner appears when clicking expand.

### Pitfall 2: Stale Data After Pagination
**What goes wrong:** User filters for "active mentorships", sees page 1, goes to page 2, then the filter is ignored because page 2 doesn't preserve the filter state.

**Why it happens:** Using React state for filtering but URL params for pagination. The URL becomes the source of truth, but filter state is lost on page change.

**How to avoid:** Put ALL list state (search, filters, pagination) in URL search params using `useSearchParams` and update via `router.replace()`. Never mix URL state and React state.

**Warning signs:** Filtering works on page 1 but resets when navigating. Back button doesn't restore previous filter state.

### Pitfall 3: Firestore Query Limitations with Multiple Filters
**What goes wrong:** Trying to query mentorship matches with `where('status', '==', 'active').where('mentorId', '==', uid)` fails because Firestore requires composite indexes for multiple field filters.

**Why it happens:** Firestore's query engine requires indexes for compound queries. The error message suggests creating an index, but this delays development.

**How to avoid:** For admin views with flexible filtering, fetch broader data set (e.g., all active matches) and filter client-side. Only use compound Firestore queries for high-volume production queries where you can pre-create indexes.

**Warning signs:** Firestore error "The query requires an index" during development. Need to click index creation link and wait.

### Pitfall 4: Empty States Without Clear Guidance
**What goes wrong:** Mentor has no mentees, UI shows blank space or "No mentees found" without explaining why or what to do.

**Why it happens:** Developers treat empty state as an error case rather than a valid state deserving thoughtful design.

**How to avoid:** For "No mentees assigned", show: (1) Empty state message, (2) Badge showing "0 mentees", (3) Keep the section visible (not hidden). This aligns with user expectation from context: show ALL mentors, even those with no relationships.

**Warning signs:** User confusion about whether data failed to load or truly is empty. Empty sections disappear entirely.

### Pitfall 5: Client-Side Search Not Filtering All Fields
**What goes wrong:** Search box only filters by display name, missing matches where Discord username or email matches the search term.

**Why it happens:** Simple `includes()` check on one field is easiest to implement first.

**How to avoid:** Search should check multiple fields: displayName, email, discordUsername. Create a combined searchable string or check multiple fields in filter function.

**Warning signs:** User reports "I searched for their Discord name but nothing came up". Confusion about what fields are searchable.

## Code Examples

Verified patterns from official sources:

### Fetching Matches with Related Profiles (API Route)
```typescript
// Source: Existing pattern in src/app/api/mentorship/admin/profiles/route.ts
// New route: src/app/api/mentorship/admin/matches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role'); // 'mentor' | 'mentee'

  try {
    // Fetch all active and completed matches
    const matchesSnapshot = await db.collection('mentorship_matches')
      .where('status', 'in', ['active', 'completed', 'pending', 'cancelled'])
      .get();

    // Extract unique IDs
    const mentorIds = [...new Set(matchesSnapshot.docs.map(d => d.data().mentorId))];
    const menteeIds = [...new Set(matchesSnapshot.docs.map(d => d.data().menteeId))];

    // Batch fetch profiles (Firestore 'in' limit is 30)
    const chunkArray = (arr: string[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const mentorSnapshots = await Promise.all(
      chunkArray(mentorIds, 30).map(ids =>
        db.collection('mentorship_profiles').where('uid', 'in', ids).get()
      )
    );

    const menteeSnapshots = await Promise.all(
      chunkArray(menteeIds, 30).map(ids =>
        db.collection('mentorship_profiles').where('uid', 'in', ids).get()
      )
    );

    // Build lookup maps
    const mentorMap = new Map();
    mentorSnapshots.forEach(snap =>
      snap.docs.forEach(doc => mentorMap.set(doc.id, doc.data()))
    );

    const menteeMap = new Map();
    menteeSnapshots.forEach(snap =>
      snap.docs.forEach(doc => menteeMap.set(doc.id, doc.data()))
    );

    // Join data
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      mentorProfile: mentorMap.get(doc.data().mentorId),
      menteeProfile: menteeMap.get(doc.data().menteeId),
    }));

    // Group by role
    const grouped = role === 'mentor'
      ? groupByMentor(matches)
      : groupByMentee(matches);

    return NextResponse.json({ matches: grouped });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}

function groupByMentor(matches: any[]) {
  const grouped = new Map();
  matches.forEach(match => {
    if (!grouped.has(match.mentorId)) {
      grouped.set(match.mentorId, {
        mentor: match.mentorProfile,
        mentorships: []
      });
    }
    grouped.get(match.mentorId).mentorships.push(match);
  });
  return Array.from(grouped.values());
}

function groupByMentee(matches: any[]) {
  const grouped = new Map();
  matches.forEach(match => {
    if (!grouped.has(match.menteeId)) {
      grouped.set(match.menteeId, {
        mentee: match.menteeProfile,
        mentorships: []
      });
    }
    grouped.get(match.menteeId).mentorships.push(match);
  });
  return Array.from(grouped.values());
}
```

### Client-Side Pagination and Search
```typescript
// Source: https://nextjs.org/learn/dashboard-app/adding-search-and-pagination
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export default function MentorshipMappingView() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const currentPage = Number(searchParams.get('page')) || 1;
  const query = searchParams.get('query') || '';
  const pageSize = 10;

  const [mentorships, setMentorships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMentorships();
  }, [currentPage, query]);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1'); // Reset pagination

    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }

    replace(`${pathname}?${params.toString()}`);
  }, 300);

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  // Filter and paginate client-side
  const filtered = mentorships.filter(m => {
    const searchStr = query.toLowerCase();
    return (
      m.mentor?.displayName?.toLowerCase().includes(searchStr) ||
      m.mentor?.email?.toLowerCase().includes(searchStr) ||
      m.mentor?.discordUsername?.toLowerCase().includes(searchStr)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div>
      <input
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={query}
        placeholder="Search by name, email, or Discord..."
        className="input input-bordered w-full"
      />

      {loading ? (
        <SkeletonList />
      ) : (
        <div className="space-y-4">
          {paginatedData.map(item => (
            <MentorCard key={item.mentor.uid} data={item} />
          ))}
        </div>
      )}

      <div className="join mt-4">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            className={`join-item btn ${page === currentPage ? 'btn-active' : ''}`}
            onClick={() => replace(createPageURL(page))}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Expandable Mentorship List with Status Badges
```typescript
// Source: https://daisyui.com/components/collapse/ + https://daisyui.com/components/badge/
interface MentorCardProps {
  data: {
    mentor: MentorshipProfile;
    mentorships: Array<{
      id: string;
      status: 'active' | 'completed' | 'pending' | 'cancelled';
      menteeProfile: MentorshipProfile;
      discordChannelUrl?: string;
      approvedAt?: string;
      lastContactAt?: string;
    }>;
  };
}

export default function MentorCard({ data }: MentorCardProps) {
  const { mentor, mentorships } = data;

  const activeMentorships = mentorships.filter(m => m.status === 'active');
  const completedMentorships = mentorships.filter(m => m.status === 'completed');

  const statusBadgeClass = {
    active: 'badge-success',
    completed: 'badge-neutral',
    pending: 'badge-warning',
    cancelled: 'badge-error'
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body">
        <div className="flex items-center gap-4">
          <img
            src={mentor.photoURL}
            alt={mentor.displayName}
            className="w-16 h-16 rounded-full"
          />
          <div className="flex-1">
            <h3 className="font-semibold">{mentor.displayName}</h3>
            <p className="text-sm text-base-content/70">{mentor.email}</p>
            <p className="text-sm text-base-content/70">@{mentor.discordUsername || 'N/A'}</p>
          </div>
          <span className="badge badge-lg">
            {mentorships.length} {mentorships.length === 1 ? 'mentee' : 'mentees'}
          </span>
        </div>

        {mentorships.length === 0 ? (
          <div className="mt-4 text-center text-base-content/50">
            No mentees assigned
          </div>
        ) : (
          <>
            {/* Active mentorships */}
            <div className="collapse collapse-arrow bg-base-200 mt-4">
              <input type="checkbox" defaultChecked={true} />
              <div className="collapse-title font-medium">
                Active Mentorships ({activeMentorships.length})
              </div>
              <div className="collapse-content space-y-3">
                {activeMentorships.map(m => (
                  <div key={m.id} className="card bg-base-100 shadow-sm">
                    <div className="card-body p-4">
                      <div className="flex items-start gap-3">
                        <img
                          src={m.menteeProfile.photoURL}
                          alt={m.menteeProfile.displayName}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.menteeProfile.displayName}</span>
                            <span className={`badge badge-sm ${statusBadgeClass[m.status]}`}>
                              {m.status}
                            </span>
                          </div>
                          <p className="text-sm text-base-content/70">@{m.menteeProfile.discordUsername}</p>
                          <p className="text-sm text-base-content/70">{m.menteeProfile.email}</p>

                          <div className="flex gap-4 mt-2 text-xs text-base-content/60">
                            <span>Started: {formatDate(m.approvedAt)}</span>
                            <span>Last activity: {formatDate(m.lastContactAt)}</span>
                          </div>

                          {m.discordChannelUrl ? (
                            <a
                              href={m.discordChannelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link link-primary text-sm mt-2"
                            >
                              Discord Channel
                            </a>
                          ) : (
                            <span className="badge badge-warning badge-sm mt-2">
                              No Discord channel
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed mentorships */}
            {completedMentorships.length > 0 && (
              <div className="collapse collapse-arrow bg-base-200 mt-2">
                <input type="checkbox" defaultChecked={false} />
                <div className="collapse-title font-medium">
                  Completed Mentorships ({completedMentorships.length})
                </div>
                <div className="collapse-content space-y-3">
                  {/* Similar structure as active */}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A';
  return format(new Date(dateStr), 'MMM d, yyyy');
}
```

### Skeleton Loading State
```typescript
// Source: https://daisyui.com/components/skeleton/
function SkeletonList() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="skeleton h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-3 w-2/3" />
              </div>
              <div className="skeleton h-8 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server Components for admin UI | Client Components with 'use client' | React 19 / Next.js 13+ | Admin dashboards need interactivity (state, events), must use client components |
| React state for search/pagination | URL search params | Next.js 13+ App Router | Enables bookmarkable URLs, SSR compatibility, better UX |
| CSS-in-JS (styled-components) | Tailwind + component libraries | 2023-2026 trend | DaisyUI provides pre-styled components, faster development |
| Firestore denormalization | Client-side joins | Depends on read/write ratio | Admin views have low traffic, client joins are simpler |
| Manual skeleton components | DaisyUI skeleton | DaisyUI 5.x | Built-in animations, theme-aware |
| React Query / SWR | Native fetch with useEffect | Next.js 16 patterns | For admin low-frequency updates, simpler without extra library |

**Deprecated/outdated:**
- `pages/` directory: Next.js 13+ uses `app/` directory with App Router. Existing codebase uses App Router.
- `getServerSideProps`: Replaced by Server Components and Route Handlers in App Router.
- Class components: React 19 focuses on functional components with hooks.

## Open Questions

Things that couldn't be fully resolved:

1. **Should we pre-fetch all matches or fetch on demand per tab?**
   - What we know: Current admin page fetches all profiles upfront, existing pattern is client-side fetch on mount
   - What's unclear: With many mentorships (100+ mentors, 500+ matches), would fetching all matches upfront be slow?
   - Recommendation: Start with fetch-all-upfront (simpler, existing pattern), optimize later if performance issue observed. Admin views typically have <100 mentors.

2. **Should search be client-side or server-side?**
   - What we know: Next.js docs show both patterns, existing admin page does client-side filtering
   - What's unclear: When does dataset size require server-side search with Firestore queries?
   - Recommendation: Client-side search for Phase 1 (simpler, consistent with existing code). Server-side search would require composite indexes.

3. **How to handle mentees with multiple mentors (edge case)?**
   - What we know: Context says "List all mentors equally (no primary/secondary distinction)"
   - What's unclear: If a mentee has 10 mentors (unusual), does UI become unwieldy?
   - Recommendation: Follow context decision, use same expandable pattern. Monitor real data, adjust if >5 mentors per mentee becomes common.

## Sources

### Primary (HIGH confidence)
- Next.js Official Docs: [Adding Search and Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - URL search params pattern
- DaisyUI Official Docs: [Collapse Component](https://daisyui.com/components/collapse/) - Expandable sections
- DaisyUI Official Docs: [Skeleton Component](https://daisyui.com/components/skeleton/) - Loading states
- DaisyUI Official Docs: [Badge Component](https://daisyui.com/components/badge/) - Status indicators
- DaisyUI Official Docs: [Pagination Component](https://daisyui.com/components/pagination/) - Pagination UI
- Firebase Official Docs: [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries) - Query best practices
- Existing codebase: `src/app/api/mentorship/admin/profiles/route.ts` - Batch fetching pattern

### Secondary (MEDIUM confidence)
- [Next.js 16 Admin Dashboard Templates 2026](https://nextjstemplates.com/blog/admin-dashboard-templates) - Modern patterns
- [React 19 Best Practices 2026](https://dev.to/jay_sarvaiya_reactjs/react-19-best-practices-write-clean-modern-and-efficient-react-code-1beb) - Client component patterns
- [Firestore Query Performance Best Practices 2026](https://estuary.dev/blog/firestore-query-best-practices/) - Denormalization vs joins
- [Empty State UX Best Practices](https://www.eleken.co/blog-posts/empty-state-ux) - Empty state design

### Tertiary (LOW confidence)
- [N+1 Query Problem in React](https://medium.com/@sujalranaop/n-1-query-problem-how-to-get-rid-of-it-a-practical-guide-b8cf3cc9b5d9) - Performance pitfalls
- [React Pagination Best Practices 2026](https://www.contentful.com/blog/react-pagination/) - Pagination approaches

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, versions verified
- Architecture: HIGH - Patterns verified against Next.js official docs and existing codebase
- Pitfalls: MEDIUM - N+1 and Firestore limitations verified, others based on common React patterns
- Code examples: HIGH - Derived from official docs and existing codebase patterns

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable stack, unlikely to change)
