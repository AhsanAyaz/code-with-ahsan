# Stack Research: Project Collaboration & Learning Roadmaps

**Domain:** Mentorship platform extensions - project collaboration system and learning roadmap authoring
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

This research covers **ONLY** the stack additions needed for the new milestone features. The existing Next.js 16, React 19, Firebase Firestore, and DaisyUI foundation remains unchanged.

**Key Finding:** Leverage existing Markdown ecosystem already in package.json. Only 2-3 new packages needed:
- **GitHub integration**: Add `@octokit/rest` for repo creation/management
- **Markdown editing**: Add `@uiw/react-md-editor` for roadmap authoring
- **Everything else**: Already available (react-markdown, remark-gfm, gray-matter, Firebase, Discord)

## What's Already Available (DO NOT ADD)

Your package.json already contains the Markdown processing pipeline needed for learning roadmaps:

| Package | Current Version | Purpose | Already Used For |
|---------|----------------|---------|------------------|
| `react-markdown` | 10.1.0 | Markdown → React rendering | Blog posts |
| `remark-gfm` | 4.0.1 | GitHub Flavored Markdown (tables, checklists) | Blog content |
| `gray-matter` | 4.0.3 | Frontmatter parsing | Blog metadata |
| `rehype-autolink-headings` | 7.1.0 | Auto-link headings | Blog navigation |
| `rehype-slug` | 6.0.0 | Generate heading IDs | Blog anchors |
| `rehype-prism-plus` | 2.0.1 | Syntax highlighting | Code blocks |
| `firebase` | 12.6.0 | Firestore database | Mentor profiles, matches |
| `firebase-admin` | 13.6.0 | Admin SDK (server-side) | Admin operations |
| `date-fns` | 4.1.0 | Date formatting | Timestamps |
| `axios` | 1.13.2 | HTTP client | API requests |

**Translation:** You can render and store Markdown roadmaps TODAY without installing anything new.

## Required New Packages

### GitHub API Integration

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@octokit/rest` | ^22.0.1 | GitHub REST API client | Official GitHub SDK, actively maintained (updated 3 months ago), widely adopted (3100+ npm dependents), works server-side in Next.js API routes |

**Why not alternatives:**
- `octokit` (all-batteries SDK): Includes GraphQL + REST. We only need REST. Smaller is better.
- Direct `fetch()` to GitHub API: Reinventing the wheel. Octokit handles auth, rate limits, pagination.

**Use cases for this milestone:**
- Create GitHub repositories when projects approved
- Add collaborators to project repos
- Set repo permissions (read/write based on team role)
- List user's repos for linking existing projects

### Markdown Editing (WYSIWYG for Mentors)

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `@uiw/react-md-editor` | ^4.0.4 | Lightweight Markdown WYSIWYG editor | Smallest bundle (4.6 KB gzipped), live preview, toolbar, TypeScript support, actively maintained, no heavyweight dependencies like Monaco/CodeMirror |

**Why not alternatives:**
- `MDXEditor`: 851 KB gzipped (185x larger). Overkill for simple roadmap editing.
- `react-markdown-editor-lite`: Unmaintained since 2023.
- Plain `<textarea>`: Poor UX for mentors. Need preview, formatting toolbar.
- `TinyMCE/CKEditor`: Rich text editors. We want Markdown, not HTML.

**Use cases for this milestone:**
- Mentor authoring interface for learning roadmaps
- Preview while writing
- Insert tables, code blocks, checklists without memorizing syntax

## Supporting Libraries (Optional Enhancements)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `github-slugger` | 2.0.0 | Generate URL-safe slugs | **ALREADY INSTALLED** - Use for project slugs, roadmap URLs |
| `reading-time` | 1.5.0 | Estimate reading time | **ALREADY INSTALLED** - Show "15 min read" on roadmaps |

## Installation

```bash
# Core new packages (GitHub + Markdown editing)
npm install @octokit/rest@^22.0.1 @uiw/react-md-editor@^4.0.4

# No other packages needed - everything else already in package.json
```

## Storage Strategy (Firebase Firestore)

### Collections Structure

Based on Firestore best practices for subcollections and document references:

```
/projects (collection)
  /{projectId} (document)
    - title, description, mentorId, status (draft/active/completed)
    - createdAt, updatedAt
    - githubRepoUrl, discordChannelId

    /team (subcollection)
      /{userId} (document)
        - role (owner/member), joinedAt, invitedBy

    /applications (subcollection)
      /{userId} (document)
        - status (pending/approved/rejected), appliedAt, message

/roadmaps (collection)
  /{roadmapId} (document)
    - title, slug, category (web-dev/ml/ai/etc)
    - authorId (mentor), status (draft/published)
    - content (Markdown string)
    - createdAt, updatedAt, publishedAt
    - metadata { readingTime, lastEditedBy }

/project-templates (collection)
  /{templateId} (document)
    - name, description, tags
    - techStack (array), difficulty (beginner/intermediate/advanced)
    - templateRepoUrl (optional GitHub template)
```

**Why subcollections for team/applications:**
- Each project can have many team members (subcollection scales)
- Applications are project-specific, never queried globally
- Follows Firebase best practice: "Use subcollections for 1-to-many relationships within a bounded context"

**Why root collection for roadmaps:**
- Need to query all published roadmaps globally (discovery page)
- Authors filter (mentor's dashboard)
- Firestore rule: "If you need to query across parents, use root collection + document reference"

**Document size consideration:**
- Roadmap content stored as single Markdown string field
- Firestore limit: 1 MB per document
- Typical roadmap: 10-50 KB (safe margin)
- If roadmap exceeds 500 KB, warn mentor to split into multiple guides

### Indexes Required

```javascript
// Firestore composite indexes needed:
// - roadmaps: (status, publishedAt DESC) - for published roadmaps sorted by date
// - roadmaps: (authorId, status, updatedAt DESC) - for mentor dashboard
// - projects: (status, createdAt DESC) - for project discovery
// - projects/team: (role, joinedAt) - for member filtering
```

## Discord Integration (Reuse Existing)

Your `src/lib/discord.ts` already has everything needed:

| Capability | Existing Function | Adaptation Needed |
|------------|------------------|-------------------|
| Create project channel | `createMentorshipChannel()` | ✅ Works as-is (just pass project name instead of mentor/mentee names) |
| Send updates | `sendChannelMessage()` | ✅ Already exported |
| Archive on completion | `archiveMentorshipChannel()` | ✅ Works for completed projects |
| Assign roles | `assignDiscordRole()` | ✅ Can assign "Project Leader" / "Developer" roles |

**Example adaptation:**
```typescript
// Create channel for approved project
await createMentorshipChannel(
  projectLeadName,
  teamMemberName,
  projectId, // matchId param
  projectLeadDiscordUsername,
  teamMemberDiscordUsername
);
```

**New Discord constants to add:**
```typescript
// Add to lib/discord.ts
export const DISCORD_PROJECT_CATEGORY_ID = "YOUR_CATEGORY_ID";
export const DISCORD_PROJECT_LEADER_ROLE_ID = "YOUR_ROLE_ID";
export const DISCORD_DEVELOPER_ROLE_ID = "YOUR_ROLE_ID";
```

## GitHub API Integration Approach

### Authentication Strategy

**Recommendation:** GitHub App installation (not personal access tokens)

**Why:**
- GitHub Apps can act on behalf of organization (not individual user)
- Fine-grained permissions (only repo creation/collaborator management)
- Tokens auto-refresh, no expiration hassles
- Audit log shows "Code with Ahsan Bot" not "Ahsan's account"

**Setup:**
1. Create GitHub App in organization settings
2. Install app, get installation ID
3. Generate private key for server-side authentication
4. Store in Firebase Functions environment variables

**Environment variables needed:**
```bash
GITHUB_APP_ID=12345
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_INSTALLATION_ID=67890
GITHUB_ORG_NAME=code-with-ahsan
```

### API Route Structure

Use Next.js API Routes (NOT Server Actions) because:
- GitHub webhooks need public endpoints
- Server Actions don't have stable URLs
- API routes better for external integrations

**Endpoints to create:**
```
/api/projects/[projectId]/github/create-repo
/api/projects/[projectId]/github/add-collaborator
/api/projects/[projectId]/github/remove-collaborator
/api/webhooks/github (for repo events)
```

### Octokit Usage Pattern

```typescript
// app/api/projects/[projectId]/github/create-repo/route.ts
import { Octokit } from "@octokit/rest";

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  // Server-side only - use GitHub App auth
  const octokit = new Octokit({
    auth: await getGitHubAppToken(), // Helper to generate JWT
  });

  const { data: repo } = await octokit.repos.createInOrg({
    org: process.env.GITHUB_ORG_NAME!,
    name: `project-${params.projectId}`,
    description: projectDescription,
    private: false,
    auto_init: true,
  });

  return Response.json({ repoUrl: repo.html_url });
}
```

### Webhook Handling

**Use case:** Sync GitHub activity to Firestore (commits, PRs, etc.)

**Best practice from GitHub docs:**
- Respond with 200 OK within 10 seconds
- Queue processing asynchronously (don't block response)
- Verify webhook signature for security

**Implementation pattern:**
```typescript
// app/api/webhooks/github/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256");
  const payload = await request.text();

  // 1. Verify signature (security)
  if (!verifyGitHubSignature(payload, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 2. Queue for async processing (respond fast)
  await queueWebhookProcessing(JSON.parse(payload));

  // 3. Return 200 immediately
  return new Response("OK", { status: 200 });
}
```

## Markdown Rendering Strategy

### For Learning Roadmaps (Read-Only Display)

**Use existing pipeline** - Already configured in your blog:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrismPlus from 'rehype-prism-plus';

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings, rehypePrismPlus]}
>
  {roadmapContent}
</ReactMarkdown>
```

**Confidence:** HIGH - This exact setup is already rendering blog posts. Zero configuration needed.

### For Roadmap Authoring (WYSIWYG Editor)

**Use new package** - `@uiw/react-md-editor`:

```typescript
import MDEditor from '@uiw/react-md-editor';

<MDEditor
  value={markdown}
  onChange={(val) => setMarkdown(val || '')}
  preview="live"
  height={500}
/>
```

**Features you get:**
- Split-pane (editor | preview)
- Toolbar (bold, italic, headers, code blocks, tables)
- Keyboard shortcuts (Cmd+B for bold)
- Dark mode support (matches DaisyUI themes)

### Security Consideration

**Warning:** DO NOT use `rehype-raw` to allow raw HTML in user-submitted roadmaps.

**Why:** XSS vulnerability. Mentor writes `<script>alert('hack')</script>` in roadmap → executes on viewer's browser.

**Safe approach:**
- `react-markdown` default: Strips all HTML (safe)
- Use `remark-gfm` for rich formatting (tables, task lists) - no HTML needed
- Admin review catches malicious content before publishing

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-mdx-remote` | Compiles MDX (JSX in Markdown). Overkill for simple guides. Security risk (execute code). | `react-markdown` with `remark-gfm` (already installed) |
| `mongodb` or `mongoose` | You already have Mongoose v9.0.1 installed, but this is likely unused. **Do not use MongoDB for this milestone.** Firestore is already your database. | Firebase Firestore (already in use) |
| `@vercel/og` for roadmap images | Generates Open Graph images. Nice-to-have, not MVP. Adds 200 KB bundle. | Defer to post-MVP. Use static OG image template. |
| `react-pdf` | If you consider PDF export for roadmaps. Heavy (500 KB+), complex, low ROI for MVP. | Defer. Use "Print to PDF" browser feature. |
| `@octokit/graphql` | GraphQL API for GitHub. More complex, no benefit over REST for repo CRUD. | `@octokit/rest` (recommended above) |
| `discord.js` | Full Discord bot library (3 MB+). You already have REST API integration via `lib/discord.ts` (lightweight). | Keep existing `fetch()`-based Discord integration |
| `zod` for form validation | Nice-to-have. DaisyUI forms + basic HTML5 validation sufficient for MVP. | Defer. Add in polish phase if needed. |

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| GitHub Integration | `@octokit/rest` | `octokit` (full SDK) | If you later need GraphQL for complex queries (e.g., contribution graphs) |
| Markdown Editing | `@uiw/react-md-editor` | `MDXEditor` | If you need collaborative editing (like Google Docs for Markdown) - not needed for solo mentor authoring |
| Roadmap Storage | Firestore root collection | Firestore subcollection under `/mentors/{id}/roadmaps` | If roadmaps are ONLY visible on mentor's profile (not global discovery) - but you want discovery page, so use root collection |
| Project Team Storage | Firestore subcollection | Array field in project doc | If max 5 team members and never need to query "all projects user is in" - but you want "My Projects" dashboard, so use subcollection |
| Discord Channels | Reuse existing `lib/discord.ts` | `discord.js` library | If you need complex bot commands, slash commands, reactions - but you only need channel CRUD, so keep existing |

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@octokit/rest` | 22.0.1 | Node.js 18+ (Next.js 16 ✅) | Requires native `fetch()` - Node 16 unsupported |
| `@uiw/react-md-editor` | 4.0.4 | React 19 ✅, Next.js 16 ✅ | Peer deps: `react@>=16.8.0`, `react-dom@>=16.8.0` |
| `react-markdown` | 10.1.0 (existing) | React 19 ✅ | Already working in your blog |
| `remark-gfm` | 4.0.1 (existing) | `react-markdown@10` ✅ | Already configured |

**No version conflicts detected.** All new packages compatible with existing Next.js 16 + React 19 stack.

## Migration Path from Existing Code

### What to Reuse

1. **Firestore patterns**: Your existing `lib/firestore.ts` (if exists) or inline Firestore calls for mentor profiles → Apply same pattern for projects/roadmaps
2. **Discord integration**: `lib/discord.ts` functions → No changes needed, just call with project data
3. **Markdown rendering**: Your blog post rendering logic → Copy-paste for roadmap display
4. **DaisyUI components**: Forms, cards, badges → Style project proposals, roadmap cards
5. **Admin auth**: Existing admin dashboard auth → Gate roadmap approval, project moderation

### What to Build New

1. **GitHub integration**: No existing GitHub code → New `lib/github.ts` utility file
2. **Markdown editor component**: Blog uses read-only rendering → New `RoadmapEditor.tsx` component
3. **Project team management**: No existing multi-user collaboration → New team invite/join logic
4. **Approval workflows**: Mentor profiles approval exists → Adapt pattern for projects + roadmaps

## Sources

### GitHub Integration
- [@octokit/rest npm package](https://www.npmjs.com/package/@octokit/rest) — Latest version, installation
- [Octokit REST.js Documentation](https://octokit.github.io/rest.js/) — API reference
- [GitHub Webhooks Best Practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks) — Official guidance
- [Next.js Server Actions vs API Routes](https://dev.to/myogeshchavan97/nextjs-server-actions-vs-api-routes-dont-build-your-app-until-you-read-this-4kb9) — Why API routes for webhooks

### Markdown Rendering
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) — Official repo, usage guide
- [React Markdown Complete Guide 2025](https://strapi.io/blog/react-markdown-complete-guide-security-styling) — Security best practices
- [Next.js MDX Guide](https://nextjs.org/docs/app/guides/mdx) — Official Next.js documentation
- [@uiw/react-md-editor npm](https://www.npmjs.com/package/@uiw/react-md-editor) — Lightweight editor choice
- [5 Best Markdown Editors for React Compared](https://strapi.io/blog/top-5-markdown-editors-for-react) — Alternatives evaluation

### Firebase Firestore
- [Choose a Data Structure - Firestore](https://firebase.google.com/docs/firestore/manage-data/structure-data) — Subcollections vs references
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices) — Official guidelines
- [Firestore Query Performance Best Practices 2026](https://estuary.dev/blog/firestore-query-best-practices/) — Optimization strategies

---
*Stack research for: Code With Ahsan - Project Collaboration & Learning Roadmaps*
*Researched: 2026-02-02*
*Confidence: HIGH — All recommendations verified with official documentation and 2026-current sources*
