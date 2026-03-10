# Phase 09: Roadmaps - Discovery & Rendering - Research

**Researched:** 2026-02-11
**Domain:** Next.js App Router, Markdown Rendering, Firestore Querying, Catalog/Discovery UX
**Confidence:** HIGH

## Summary

Phase 09 builds public roadmap discovery and detail pages using existing proven patterns from the codebase. The project already has complete infrastructure for catalog pages (projects discovery), filtering/search UI (ProjectFilters, ShowcaseFilters), and Markdown rendering dependencies (react-markdown, rehype-prism-plus, Prism CSS already configured). The roadmaps API (Phase 08) provides all necessary data endpoints.

**Primary recommendation:** Replicate the projects discovery pattern (/src/app/projects/discover/page.tsx) for roadmaps catalog, reuse filtering components pattern, create a MarkdownRenderer component using react-markdown + rehype-prism-plus (dependencies already installed), and query mentors by matching roadmap.domain to mentor.expertise[] for related mentors display.

The implementation is straightforward because all infrastructure exists - no new dependencies needed, proven patterns to follow, and API endpoints ready.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | ^10.1.0 | Render Markdown to React components | De facto React Markdown renderer, 35k+ stars |
| rehype-prism-plus | ^2.0.1 | Syntax highlighting with line numbers | Battle-tested, supports diff blocks and line highlighting |
| react | 19.2.1 | UI framework | Project standard |
| next | 16.0.10 | App Router framework | Project standard |
| @tailwindcss/typography | ^0.5.19 | Prose styling for Markdown | Official Tailwind plugin for rich content |

### Supporting (Already Configured)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unified | ^11.0.5 | Markdown processing pipeline | Already in project, powers remark/rehype |
| remark-gfm | ^4.0.1 | GitHub Flavored Markdown | Tables, strikethrough, task lists |
| lodash.debounce | ^4.0.8 | Debounce search input | Already used in projects discovery |
| use-debounce | ^10.1.0 | React hook for debouncing | Alternative hook-based approach |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | next-mdx-remote | MDX more powerful but overkill for read-only content |
| rehype-prism-plus | shiki | Shiki has VS Code themes but slower, already have Prism CSS |
| Client-side filtering | Server-side API filtering | Current data size (<100 roadmaps) makes client-side faster |

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── roadmaps/
│       ├── page.tsx                    # Catalog page (NEW)
│       └── [id]/
│           └── page.tsx                # Detail page (NEW)
├── components/
│   ├── roadmaps/
│   │   ├── RoadmapCard.tsx            # Card component (NEW)
│   │   ├── RoadmapFilters.tsx         # Filter UI (NEW)
│   │   └── MarkdownRenderer.tsx       # Markdown display (NEW)
│   └── mentorship/
│       └── MentorCard.tsx              # Reuse existing for related mentors
└── app/api/roadmaps/                   # Already exists from Phase 08
```

### Pattern 1: Discovery/Catalog Page (Projects Discovery Pattern)
**What:** Client-side filtered catalog with search, domain filter, difficulty filter
**When to use:** Small-to-medium datasets (<1000 items) where instant filtering UX is valuable
**Example:**
```typescript
// Source: /src/app/projects/discover/page.tsx (existing pattern to replicate)
"use client";

function RoadmapDiscoveryContent() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [domainFilter, setDomainFilter] = useState<RoadmapDomain | "all">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<ProjectDifficulty | "all">("all");

  // Fetch on mount
  useEffect(() => {
    const fetchRoadmaps = async () => {
      const response = await fetch("/api/roadmaps?status=approved");
      const data = await response.json();
      setRoadmaps(data.roadmaps || []);
      setLoading(false);
    };
    fetchRoadmaps();
  }, []);

  // Client-side filtering
  const filteredRoadmaps = roadmaps.filter((roadmap) => {
    // Search: title + description
    if (searchTerm) {
      const matches =
        roadmap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roadmap.description?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matches) return false;
    }

    // Domain filter
    if (domainFilter !== "all" && roadmap.domain !== domainFilter) {
      return false;
    }

    // Difficulty filter
    if (difficultyFilter !== "all" && roadmap.difficulty !== difficultyFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-8">
      <RoadmapFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        domainFilter={domainFilter}
        setDomainFilter={setDomainFilter}
        difficultyFilter={difficultyFilter}
        setDifficultyFilter={setDifficultyFilter}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoadmaps.map((roadmap) => (
          <RoadmapCard key={roadmap.id} roadmap={roadmap} />
        ))}
      </div>
    </div>
  );
}

export default function RoadmapsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RoadmapDiscoveryContent />
    </Suspense>
  );
}
```

### Pattern 2: Markdown Rendering with Syntax Highlighting
**What:** Render Markdown with code highlighting using existing Prism CSS
**When to use:** Displaying roadmap content from contentUrl
**Example:**
```typescript
// Source: Combined from package.json dependencies + /src/css/prism.css
// NEW component to create
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrism]}
        components={{
          // Custom code block rendering if needed
          code({ node, inline, className, children, ...props }) {
            return inline ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
```
**Note:** Prism CSS already imported in /src/app/globals.css line 105: `@import "../css/prism.css";`

### Pattern 3: Related Mentors Query
**What:** Find mentors whose expertise matches roadmap domain
**When to use:** Roadmap detail page to show mentors teaching that domain
**Example:**
```typescript
// Source: /src/app/api/mentorship/mentors/route.ts (existing pattern to adapt)
// Roadmap domains map to mentor expertise array

// Domain mapping (from research)
const DOMAIN_OPTIONS = [
  { value: "web-dev", label: "Web Development" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "ml", label: "Machine Learning" },
  { value: "ai", label: "AI" },
  { value: "mcp", label: "MCP Servers" },
  { value: "agents", label: "AI Agents" },
  { value: "prompt-engineering", label: "Prompt Engineering" },
];

// Client-side approach (simpler for initial implementation)
async function fetchRelatedMentors(roadmapDomain: RoadmapDomain) {
  // Fetch all accepted public mentors
  const response = await fetch("/api/mentorship/mentors?public=true");
  const { mentors } = await response.json();

  // Filter where expertise includes matching domain
  // E.g., roadmap.domain = "frontend" -> mentor.expertise includes "Frontend"
  const domainLabel = DOMAIN_OPTIONS.find(d => d.value === roadmapDomain)?.label;

  return mentors.filter((mentor: MentorshipProfile) =>
    mentor.expertise?.some(exp =>
      exp.toLowerCase().includes(roadmapDomain.toLowerCase()) ||
      exp.toLowerCase().includes(domainLabel?.toLowerCase() || "")
    )
  ).slice(0, 3); // Show top 3
}

// Alternative: API route approach
// GET /api/roadmaps/[id]/related-mentors
// Benefits: Cleaner separation, better for future optimization
// Tradeoff: Extra API route to maintain
```

### Pattern 4: Roadmap Detail Page (Server Component for SEO)
**What:** Server Component that fetches roadmap data and renders Markdown
**When to use:** /roadmaps/[id] route for individual roadmap pages
**Example:**
```typescript
// Source: Next.js App Router patterns + existing API structure
// NEW page to create

import { notFound } from 'next/navigation';
import MarkdownRenderer from '@/components/roadmaps/MarkdownRenderer';
import MentorCard from '@/components/mentorship/MentorCard';

interface RoadmapDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoadmapDetailPage({ params }: RoadmapDetailPageProps) {
  const { id } = await params;

  // Fetch roadmap (Server Component - no loading state needed)
  const roadmapRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/roadmaps/${id}`, {
    cache: 'no-store', // Always fresh for now
  });

  if (!roadmapRes.ok) {
    notFound();
  }

  const { roadmap } = await roadmapRes.json();

  // Fetch related mentors
  const mentorsRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/mentorship/mentors?public=true`,
    { cache: 'no-store' }
  );
  const { mentors } = await mentorsRes.json();

  const relatedMentors = mentors
    .filter((m: any) =>
      m.expertise?.some((exp: string) =>
        exp.toLowerCase().includes(roadmap.domain.toLowerCase())
      )
    )
    .slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{roadmap.title}</h1>
        <div className="flex items-center gap-4 text-sm text-base-content/70">
          <span className="badge badge-primary">{roadmap.domain}</span>
          <span className="badge badge-secondary">{roadmap.difficulty}</span>
          {roadmap.estimatedHours && (
            <span>{roadmap.estimatedHours}h estimated</span>
          )}
        </div>
        {roadmap.description && (
          <p className="mt-4 text-lg text-base-content/80">{roadmap.description}</p>
        )}
      </div>

      {/* Markdown Content */}
      <MarkdownRenderer content={roadmap.content} />

      {/* Related Mentors */}
      {relatedMentors.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Related Mentors</h2>
          <p className="text-base-content/70 mb-6">
            These mentors teach {roadmap.domain} and can help guide you through this roadmap
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedMentors.map((mentor: any) => (
              <MentorCard
                key={mentor.uid}
                mentor={mentor}
                // Props differ - this is view-only, no request functionality
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Don't use useSearchParams directly in Server Components:** Wrap in Suspense and extract to Client Component to avoid hydration errors
- **Don't fetch markdown content without sanitization:** API already sanitizes with sanitizeMarkdownRaw, but verify on render
- **Don't skip loading states on client components:** Projects discovery pattern shows proper loading/error states
- **Don't filter server-side initially:** Client-side filtering is faster for <100 items and provides instant UX

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown to HTML conversion | Custom parser with regex | react-markdown | Handles edge cases, XSS protection, extensible |
| Syntax highlighting | Manual Prism.js integration | rehype-prism-plus | Integrates with unified pipeline, line numbers, diff support |
| Debounced search | Custom setTimeout logic | lodash.debounce or use-debounce | Already in project, handles cleanup, tested |
| Typography styles | Custom prose CSS | @tailwindcss/typography | Already installed, theme-aware, comprehensive |
| Filter UI state management | Custom reducer | Simple useState | Projects discovery proves useState is sufficient |
| Markdown security | Custom sanitization | sanitizeMarkdownRaw (existing) | Already implemented in API, don't duplicate |

**Key insight:** The roadmap content is stored in Firebase Storage and fetched via contentUrl. The API already sanitizes on upload (Phase 08), so the rendering layer should trust the API but still use react-markdown for safe HTML conversion.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with useSearchParams
**What goes wrong:** Using useSearchParams in a component without Suspense boundary causes Next.js hydration errors
**Why it happens:** Server renders without search params, client renders with them
**How to avoid:** Always wrap pages using useSearchParams in Suspense (see projects/discover/page.tsx line 189-200)
**Warning signs:** Console error "Text content did not match" or "Hydration failed"

### Pitfall 2: Missing Prism CSS Styles
**What goes wrong:** Code blocks render but have no syntax highlighting colors
**Why it happens:** Forgot to import Prism CSS or rehype-prism-plus not configured
**How to avoid:** Verify /src/app/globals.css line 105 imports prism.css; verify rehypePrism in rehypePlugins array
**Warning signs:** Code blocks look like plain text, no token colors

### Pitfall 3: Blocking Render on Content Fetch
**What goes wrong:** Page loads slowly because markdown content fetch blocks initial render
**Why it happens:** Fetching full content in Server Component or useEffect without streaming
**How to avoid:** For Server Components, rely on Next.js streaming; for Client Components, show metadata first, then fetch content
**Warning signs:** Slow Time to First Byte (TTFB), users see blank page

### Pitfall 4: Domain-to-Expertise Mismatch
**What goes wrong:** Related mentors don't appear even though relevant mentors exist
**Why it happens:** Roadmap domain values don't match mentor expertise strings exactly
**How to avoid:** Use case-insensitive partial matching or maintain a mapping table (e.g., "frontend" roadmap matches "Frontend", "React", "Vue" expertise)
**Warning signs:** Empty "Related Mentors" section on detail pages

### Pitfall 5: Client-Side Filter Performance Degradation
**What goes wrong:** Filtering becomes slow as roadmap count grows
**Why it happens:** Re-rendering full list on every keystroke
**How to avoid:** Monitor performance; if >100 roadmaps, move to server-side filtering with debounced API calls
**Warning signs:** Input lag when typing in search, janky UI

### Pitfall 6: Stale Cached Content
**What goes wrong:** Users see old roadmap content after author updates
**Why it happens:** Aggressive Next.js caching or CDN caching of contentUrl
**How to avoid:** Use `cache: 'no-store'` for detail page fetches initially; later optimize with revalidation tags
**Warning signs:** Editors report changes not appearing, version mismatch

## Code Examples

Verified patterns from existing codebase:

### Filter Component Pattern
```typescript
// Source: /src/components/projects/ProjectFilters.tsx
// Adapt for RoadmapFilters component

interface RoadmapFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  domainFilter: RoadmapDomain | "all";
  setDomainFilter: (value: RoadmapDomain | "all") => void;
  difficultyFilter: ProjectDifficulty | "all";
  setDifficultyFilter: (value: ProjectDifficulty | "all") => void;
}

export default function RoadmapFilters({
  searchTerm,
  setSearchTerm,
  domainFilter,
  setDomainFilter,
  difficultyFilter,
  setDifficultyFilter,
}: RoadmapFiltersProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Search Input */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Search Roadmaps</span>
        </label>
        <input
          type="text"
          placeholder="Search by title or description..."
          className="input input-bordered w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Domain Filter */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Domain</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value as RoadmapDomain | "all")}
        >
          <option value="all">All Domains</option>
          <option value="web-dev">Web Development</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="ml">Machine Learning</option>
          <option value="ai">AI</option>
          <option value="mcp">MCP Servers</option>
          <option value="agents">AI Agents</option>
          <option value="prompt-engineering">Prompt Engineering</option>
        </select>
      </div>

      {/* Difficulty Filter */}
      <div className="form-control">
        <label className="label">
          <span className="label-text font-semibold">Difficulty Level</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as ProjectDifficulty | "all")}
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
    </div>
  );
}
```

### Card Component Pattern
```typescript
// Source: /src/components/projects/ProjectCard.tsx
// Adapt for RoadmapCard component

import Link from "next/link";
import Image from "next/image";
import { Roadmap } from "@/types/mentorship";

interface RoadmapCardProps {
  roadmap: Roadmap;
}

export default function RoadmapCard({ roadmap }: RoadmapCardProps) {
  const truncatedDescription =
    roadmap.description && roadmap.description.length > 150
      ? roadmap.description.substring(0, 150) + "..."
      : roadmap.description;

  return (
    <Link href={`/roadmaps/${roadmap.id}`}>
      <div className="card bg-base-200 shadow-md hover:shadow-lg transition-shadow h-full cursor-pointer">
        <div className="card-body">
          <h2 className="card-title text-lg">{roadmap.title}</h2>

          {roadmap.creatorProfile && (
            <div className="flex items-center gap-2 mb-2">
              {roadmap.creatorProfile.photoURL && (
                <Image
                  src={roadmap.creatorProfile.photoURL}
                  alt={roadmap.creatorProfile.displayName}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-base-content/70">
                {roadmap.creatorProfile.displayName}
              </span>
            </div>
          )}

          {truncatedDescription && (
            <p className="text-sm text-base-content/70 mb-3">
              {truncatedDescription}
            </p>
          )}

          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-primary badge-sm">
              {roadmap.domain}
            </span>
            <span className="badge badge-secondary badge-sm">
              {roadmap.difficulty}
            </span>
          </div>

          {roadmap.estimatedHours && (
            <div className="text-xs text-base-content/60">
              {roadmap.estimatedHours} hours estimated
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
```

### Typography Prose Wrapper
```typescript
// Source: /src/app/books/mastering-angular-signals/page.tsx line 50
// Pattern for wrapping Markdown content

<div className="prose dark:prose-invert max-w-none pt-8 pb-8">
  <MarkdownRenderer content={roadmap.content} />
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MDX for all content | react-markdown for read-only, MDX for interactive | 2024 | Simpler for roadmaps (no interactivity needed) |
| Server-side filtering | Client-side filtering for small datasets | 2023 | Instant UX, lower server load |
| getServerSideProps | App Router Server Components | Next.js 13+ | Better streaming, simpler data fetching |
| Prism.js manual setup | rehype-prism-plus | 2023 | Unified pipeline integration, less boilerplate |
| Custom Markdown sanitization | DOMPurify or rehype-sanitize | Ongoing | rehype-sanitize in dependencies but not used; API uses custom sanitizeMarkdownRaw |

**Deprecated/outdated:**
- ~~getStaticProps for roadmap pages~~ → Use Server Components with cache: 'no-store' for now
- ~~next-mdx-remote for rendering~~ → Use react-markdown for simpler read-only content
- ~~Manual Prism.js + CSS imports~~ → Use rehype-prism-plus plugin

## Open Questions

1. **Should related mentors be filtered by domain match or allow broader matching?**
   - What we know: Mentor expertise is free-form array, roadmap domain is enum
   - What's unclear: Best UX for matching (strict vs. fuzzy)
   - Recommendation: Start with fuzzy case-insensitive matching, iterate based on feedback

2. **Should roadmap catalog support URL-based filters (like projects discovery)?**
   - What we know: Projects discovery uses URL params synced with state (line 24-32, 58-76 in discover/page.tsx)
   - What's unclear: If this adds value for roadmaps (fewer filters than projects)
   - Recommendation: Implement URL params for consistency and shareability (minimal effort, proven pattern)

3. **Server Component vs Client Component for detail page?**
   - What we know: Server Components better for SEO, Client Components better for interactivity
   - What's unclear: If we need client-side state on detail page
   - Recommendation: Start with Server Component for SEO, content is read-only

4. **Should markdown content be streamed or fetched upfront?**
   - What we know: API returns content in GET /api/roadmaps/[id] (line 30-41 in [id]/route.ts)
   - What's unclear: Performance impact of large roadmaps
   - Recommendation: Fetch upfront in Server Component (Next.js streams automatically), optimize later if needed

## Sources

### Primary (HIGH confidence)
- Existing codebase files (verified patterns):
  - /src/app/projects/discover/page.tsx - Discovery page pattern
  - /src/components/projects/ProjectFilters.tsx - Filter UI pattern
  - /src/components/projects/ProjectCard.tsx - Card component pattern
  - /src/app/api/roadmaps/route.ts - API structure
  - /src/app/api/roadmaps/[id]/route.ts - Detail endpoint
  - /src/app/api/mentorship/mentors/route.ts - Mentor filtering
  - /src/css/prism.css - Syntax highlighting styles
  - /src/app/globals.css - Prism CSS import confirmation
  - /package.json - Dependency verification

### Secondary (MEDIUM confidence)
- [Enhancing React-Markdown with Syntax Highlighting](https://hannadrehman.com/blog/enhancing-your-react-markdown-experience-with-syntax-highlighting) - react-markdown + rehype-prism integration
- [rehype-prism-plus GitHub](https://github.com/timlrx/rehype-prism-plus) - Official plugin documentation
- [Markdown Syntax Highlighting Next.js App Router](https://colinhemphill.com/blog/markdown-syntax-highlighting-with-the-nextjs-app-router) - App Router specific guidance
- [Next.js App Router Server Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) - Official Next.js docs
- [Next.js Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data) - Official data fetching patterns
- [Firestore Query Documentation](https://firebase.google.com/docs/firestore/query-data/queries) - Firestore filtering patterns

### Tertiary (LOW confidence)
- None - all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed and configured
- Architecture: HIGH - Proven patterns exist in codebase (projects discovery)
- Pitfalls: HIGH - Based on observed patterns and Next.js App Router known issues
- Related mentors: MEDIUM - Pattern clear but domain-to-expertise mapping needs validation

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable stack, established patterns)
