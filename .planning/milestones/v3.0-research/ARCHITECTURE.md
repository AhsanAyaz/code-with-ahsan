# Architecture Research: Project Collaboration & Learning Roadmaps

**Domain:** Mentorship platform with project collaboration and learning roadmaps
**Researched:** 2026-02-02
**Confidence:** HIGH

## Integration Architecture Overview

This research focuses on how NEW features (projects and roadmaps) integrate with the EXISTING mentorship platform architecture while maintaining consistency and reusability.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PUBLIC LAYER (New + Existing)                    │
├─────────────────────────────────────────────────────────────────────┤
│  /mentorship/browse     /projects/discover     /roadmaps/discover   │
│  (existing mentors)     (NEW projects)         (NEW roadmaps)       │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│              USER-FACING LAYER (Dashboard Integration)               │
├─────────────────────────────────────────────────────────────────────┤
│  /mentorship/dashboard  →  [My Projects] [My Roadmaps] tabs         │
│  (extend existing)          (NEW tabs, reuse layout)                │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    ADMIN LAYER (Tab Extension)                       │
├─────────────────────────────────────────────────────────────────────┤
│  /mentorship/admin  →  Add [Projects] [Roadmaps] tabs               │
│  (extend existing)     (NEW tabs, reuse auth + layout pattern)      │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER (Route Mirrors)                       │
├─────────────────────────────────────────────────────────────────────┤
│  /api/mentorship/admin/profiles  →  /api/mentorship/admin/projects  │
│  /api/mentorship/admin/sessions  →  /api/mentorship/admin/roadmaps  │
│  (existing patterns)                (NEW routes, same structure)    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER (Reuse Existing)                     │
├─────────────────────────────────────────────────────────────────────┤
│  /lib/discord.ts        /lib/firebaseAdmin.ts                       │
│  (REUSE for project     (REUSE db + storage exports)                │
│   channels)                                                          │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (New Collections)                      │
├─────────────────────────────────────────────────────────────────────┤
│  Firestore Collections:                                              │
│  • projects                  (NEW - project proposals)              │
│  • project_members          (NEW - team membership)                 │
│  • roadmaps                 (NEW - learning content)                │
│  • roadmap_versions         (NEW - version history)                 │
│  • roadmap_contributions    (NEW - mentor submissions)              │
│  • mentorship_profiles      (EXISTING - reuse for authorship)       │
│  • admin_sessions           (EXISTING - reuse for auth)             │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS (Reuse)                      │
├─────────────────────────────────────────────────────────────────────┤
│  Discord API                 Firebase Storage                        │
│  (REUSE channel creation)    (REUSE for markdown files)             │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### NEW Components to Build

| Component | Responsibility | Integrates With |
|-----------|----------------|-----------------|
| ProjectProposal | Submit/edit project proposals | MentorshipContext (user auth) |
| ProjectBrowser | Public discovery of projects | Existing browse patterns |
| ProjectDetail | View project, join team | Discord service for channel creation |
| ProjectAdmin | Admin approval workflow | Existing admin layout + auth |
| RoadmapEditor | Create/edit markdown roadmaps | Firebase Storage for content |
| RoadmapViewer | Render markdown with versioning | Existing public profile patterns |
| RoadmapAdmin | Review mentor contributions | Existing admin layout + auth |
| TeamManager | Manage project members | Discord service for role sync |

### EXISTING Components to Extend

| Component | Current Use | Extension Needed |
|-----------|-------------|------------------|
| /mentorship/admin/page.tsx | Admin dashboard with tabs | Add Projects + Roadmaps tabs |
| /mentorship/dashboard/page.tsx | User dashboard | Add My Projects + My Roadmaps sections |
| /lib/discord.ts | Mentorship channel creation | Add project channel creation function |
| /types/mentorship.ts | Type definitions | Add Project and Roadmap types |
| MentorshipContext | Auth + profile state | Extend to include project/roadmap authorship |

### REUSE Without Changes

| Component | Current Use | Reuse For |
|-----------|-------------|-----------|
| /lib/firebaseAdmin.ts | Firestore + Storage access | All new collections + markdown storage |
| /api/mentorship/admin/auth/route.ts | Admin authentication | Projects + Roadmaps admin auth |
| Admin password flow | Token-based auth | Same auth for new admin tabs |
| DaisyUI components | Existing UI library | All new UI components |

## Firestore Data Model Extensions

### NEW Collections

#### projects
```typescript
{
  id: string // auto-generated doc ID
  title: string
  description: string
  proposedBy: string // uid from mentorship_profiles
  proposedByProfile: { displayName, photoURL } // denormalized
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'archived'
  categories: string[] // ["web", "mobile", "data-science"]
  techStack: string[]
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  maxTeamSize: number
  currentTeamSize: number // denormalized from project_members count
  discordChannelId?: string
  discordChannelUrl?: string
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date
  approvedBy?: string // admin uid
  rejectedAt?: Date
  rejectionReason?: string
  completedAt?: Date
  archivedAt?: Date
}
```

**Integration Points:**
- `proposedBy` references `mentorship_profiles.uid`
- `approvedBy` validates against `admin_sessions`
- `discordChannelId` created via `/lib/discord.ts` (reuse existing pattern)

#### project_members
```typescript
{
  id: string // auto-generated
  projectId: string
  userId: string // uid from mentorship_profiles
  userProfile: { displayName, photoURL, role } // denormalized
  role: 'owner' | 'member'
  status: 'invited' | 'joined' | 'left'
  joinedAt?: Date
  leftAt?: Date
  invitedBy?: string
}
```

**Integration Points:**
- Composite index: `(projectId, userId)` for fast membership checks
- Query pattern: `where('projectId', '==', id).where('status', '==', 'joined')`
- Security rules: Read if member, write if owner/member

#### roadmaps
```typescript
{
  id: string // URL-friendly slug (e.g., 'react-fundamentals')
  title: string
  description: string
  category: string // "frontend" | "backend" | "data-science" | "devops"
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  estimatedHours: number

  // Versioning
  currentVersion: number
  publishedVersion: number // what users see

  // Authorship
  createdBy: string // uid from mentorship_profiles (mentor)
  createdByProfile: { displayName, photoURL } // denormalized
  contributors: Array<{ uid, displayName, photoURL }> // denormalized

  // Content
  contentUrl: string // Firebase Storage path to markdown file

  // Status
  status: 'draft' | 'pending_review' | 'published' | 'archived'

  // Timestamps
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date

  // Metadata
  views: number
  enrollments: number // users who started this roadmap
}
```

**Integration Points:**
- `createdBy` must exist in `mentorship_profiles` with `role: 'mentor'`
- `contentUrl` stored in Firebase Storage bucket (reuse existing storage instance)
- Security rules: Only mentors can create, admins can publish

#### roadmap_versions
```typescript
{
  id: string // auto-generated
  roadmapId: string // references roadmaps.id
  version: number
  contentUrl: string // Firebase Storage path
  changelog: string // what changed in this version
  createdBy: string // uid
  createdAt: Date
  publishedAt?: Date
  status: 'draft' | 'pending_review' | 'published'
}
```

**Integration Points:**
- Subcollection pattern: `roadmaps/{roadmapId}/versions/{versionId}`
- Query: `where('roadmapId', '==', id).orderBy('version', 'desc').limit(10)`
- Cleanup: When deleting roadmap, must cascade delete versions (Firebase doesn't auto-delete subcollections)

#### roadmap_contributions
```typescript
{
  id: string
  roadmapId: string
  contributorId: string // mentor uid
  contributorProfile: { displayName, photoURL }
  type: 'new_content' | 'edit' | 'correction'
  contentDiff: string // git-style diff or description
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: string // admin uid
  reviewNotes?: string
}
```

**Integration Points:**
- Admin review workflow (same pattern as mentor profile approval)
- On approval: Create new roadmap_version, increment roadmap.currentVersion

### EXISTING Collections (Reuse)

| Collection | Current Use | Reuse For |
|------------|-------------|-----------|
| mentorship_profiles | User profiles with role | Authorship checks (mentor role required for roadmaps) |
| admin_sessions | Admin authentication | Projects + Roadmaps admin operations |

## Data Flow Patterns

### Pattern 1: Project Proposal → Approval → Discord Channel

**Flow:**
```
1. User submits project proposal
   → POST /api/mentorship/projects
   → Create doc in 'projects' collection (status: 'pending')
   → Return projectId

2. Admin reviews in admin dashboard
   → GET /api/mentorship/admin/projects?status=pending
   → Display in admin UI (reuse existing admin layout)

3. Admin approves project
   → PUT /api/mentorship/admin/projects
   → Update project status to 'approved'
   → Call createProjectChannel(projectTitle, projectId, ownerDiscordUsername)
   → Update project.discordChannelId + discordChannelUrl

4. createProjectChannel() implementation
   → REUSE existing discord.ts patterns
   → Same monthly category strategy
   → Same permission structure (private by default)
   → Channel topic: "Project: {title} | ID: {projectId}"
```

**Code Integration:**
```typescript
// NEW function in /lib/discord.ts (mirrors createMentorshipChannel)
export async function createProjectChannel(
  projectTitle: string,
  projectId: string,
  ownerDiscordUsername?: string,
  teamMemberUsernames?: string[]
): Promise<ChannelResult | null> {
  // REUSE: getOrCreateMonthlyCategory()
  // REUSE: lookupMemberByUsername()
  // REUSE: fetchWithRateLimit()
  // Same permission structure as mentorship channels
}
```

### Pattern 2: Roadmap Creation → Version History → Publishing

**Flow:**
```
1. Mentor creates roadmap (draft)
   → POST /api/mentorship/roadmaps
   → Validate user has mentor role (check mentorship_profiles)
   → Create doc in 'roadmaps' (status: 'draft', version: 1)
   → Upload markdown to Firebase Storage
   → Create initial roadmap_version doc

2. Mentor edits roadmap
   → PUT /api/mentorship/roadmaps/{id}
   → Increment currentVersion
   → Create new roadmap_version doc
   → Update contentUrl in both roadmaps and versions

3. Mentor submits for review
   → PUT /api/mentorship/roadmaps/{id}/submit
   → Update status to 'pending_review'

4. Admin reviews and publishes
   → GET /api/mentorship/admin/roadmaps?status=pending_review
   → PUT /api/mentorship/admin/roadmaps/{id}/publish
   → Update status to 'published'
   → Set publishedVersion = currentVersion
   → Set publishedAt timestamp

5. Public discovery
   → GET /api/mentorship/roadmaps (public endpoint)
   → Filter: where('status', '==', 'published')
   → Return list for /roadmaps/discover page
```

**Storage Pattern:**
```
Firebase Storage structure:
roadmaps/
  {roadmapId}/
    v1.md
    v2.md
    v3.md
    assets/
      diagram-1.png
      diagram-2.png
```

### Pattern 3: Team Management → Discord Role Sync

**Flow:**
```
1. User requests to join project
   → POST /api/mentorship/projects/{id}/join
   → Create project_members doc (status: 'joined')
   → Increment project.currentTeamSize

2. Add user to Discord channel
   → If project.discordChannelId exists
   → Call addMemberToProjectChannel(channelId, userDiscordUsername)
   → Update Discord channel permissions (add VIEW + SEND_MESSAGES)

3. User leaves project
   → DELETE /api/mentorship/projects/{id}/members/{userId}
   → Update project_members (status: 'left', leftAt: Date)
   → Decrement project.currentTeamSize
   → Remove from Discord channel permissions
```

**Code Integration:**
```typescript
// NEW function in /lib/discord.ts
export async function addMemberToChannel(
  channelId: string,
  discordUsername: string
): Promise<boolean> {
  // REUSE: lookupMemberByUsername()
  // Add permission overwrite to existing channel
  // Discord API: PUT /channels/{channelId}/permissions/{memberId}
}
```

## Security Model (Firestore Security Rules)

### projects Collection
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      // Anyone can read approved/active projects
      allow read: if resource.data.status in ['approved', 'active', 'completed'];

      // Only authenticated users can create (starts as draft/pending)
      allow create: if request.auth != null &&
                       request.resource.data.proposedBy == request.auth.uid;

      // Owner can edit their own pending/draft projects
      allow update: if request.auth != null &&
                       resource.data.proposedBy == request.auth.uid &&
                       resource.data.status in ['draft', 'pending'];

      // Admin can update any project (approval workflow)
      // Validated via admin_sessions in API route
    }
  }
}
```

### project_members Collection
```javascript
match /project_members/{memberId} {
  // Members can read their own memberships
  allow read: if request.auth != null &&
                 resource.data.userId == request.auth.uid;

  // Anyone can read members of approved projects
  allow read: if exists(/databases/$(database)/documents/projects/$(resource.data.projectId)) &&
                 get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.status == 'approved';

  // Users can create membership (join project)
  allow create: if request.auth != null &&
                   request.resource.data.userId == request.auth.uid;

  // Owner can remove members
  allow delete: if request.auth != null &&
                   get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.proposedBy == request.auth.uid;
}
```

### roadmaps Collection
```javascript
match /roadmaps/{roadmapId} {
  // Anyone can read published roadmaps
  allow read: if resource.data.status == 'published';

  // Only mentors can create roadmaps
  allow create: if request.auth != null &&
                   get(/databases/$(database)/documents/mentorship_profiles/$(request.auth.uid)).data.role == 'mentor' &&
                   request.resource.data.createdBy == request.auth.uid;

  // Creator can edit their own draft/pending roadmaps
  allow update: if request.auth != null &&
                   resource.data.createdBy == request.auth.uid &&
                   resource.data.status in ['draft', 'pending_review'];

  // Admin publishes via API (validated with admin_sessions)
}
```

**Integration with Existing Auth:**
- API routes validate admin access using `admin_sessions` collection (same as existing admin routes)
- Client-side checks user from `MentorshipContext` (same as existing features)
- Security rules reference `mentorship_profiles` for role checks (mentor vs mentee)

## Route Structure Extensions

### Public Routes (NEW)
```
src/app/
  projects/
    discover/
      page.tsx              # Browse all approved projects
    [projectId]/
      page.tsx              # Project detail page
      join/
        page.tsx            # Join project flow
  roadmaps/
    discover/
      page.tsx              # Browse published roadmaps
    [roadmapId]/
      page.tsx              # Roadmap viewer (markdown rendering)
      versions/
        page.tsx            # Version history
```

### Dashboard Routes (EXTEND EXISTING)
```
src/app/mentorship/dashboard/
  page.tsx                  # Add "My Projects" and "My Roadmaps" sections
```

### Admin Routes (EXTEND EXISTING)
```
src/app/mentorship/admin/
  page.tsx                  # Add Projects and Roadmaps tabs to existing tab list
```

### API Routes (NEW, Mirror Existing Patterns)
```
src/app/api/mentorship/
  projects/
    route.ts                # GET (list) / POST (create)
    [id]/
      route.ts              # GET (detail) / PUT (update)
      join/
        route.ts            # POST (join team)
      members/
        route.ts            # GET (list members) / DELETE (leave)
  roadmaps/
    route.ts                # GET (list published) / POST (create)
    [id]/
      route.ts              # GET (detail) / PUT (update)
      submit/
        route.ts            # PUT (submit for review)
      versions/
        route.ts            # GET (version history)
  admin/
    projects/
      route.ts              # GET (all) / PUT (approve/reject)
    roadmaps/
      route.ts              # GET (pending) / PUT (publish/reject)
      contributions/
        route.ts            # GET (pending contributions) / PUT (approve)
```

**Pattern Consistency:**
- All admin routes check `admin_sessions` (same as `/api/mentorship/admin/profiles`)
- All GET routes return consistent JSON shape: `{ data: [...], error?: string }`
- All PUT routes use status transitions: `{ currentStatus, newStatus, allowed: bool }`

## Architectural Patterns to Follow

### Pattern 1: Admin Tab Extension (Reuse Existing Layout)

**What:** Extend existing admin dashboard with new tabs instead of creating separate admin pages

**When to use:** All new admin features (projects, roadmaps)

**Trade-offs:**
- PRO: Consistent UX, single auth flow, shared layout/navigation
- PRO: Reuse existing tab state management and streamer mode
- CON: Single page bundle grows larger (mitigate with lazy loading)

**Example:**
```typescript
// src/app/mentorship/admin/page.tsx (EXTEND)
type TabType =
  | "overview"
  | "pending-mentors"
  | "all-mentors"
  | "all-mentees"
  | "projects"          // NEW
  | "roadmaps";         // NEW

// Add tab buttons
<button onClick={() => setActiveTab("projects")}>Projects</button>
<button onClick={() => setActiveTab("roadmaps")}>Roadmaps</button>

// Add tab content
{activeTab === "projects" && <ProjectsAdminTab />}
{activeTab === "roadmaps" && <RoadmapsAdminTab />}
```

### Pattern 2: Discord Service Extension (Function Mirroring)

**What:** Add new functions to existing `/lib/discord.ts` that mirror mentorship channel patterns

**When to use:** Any feature needing Discord channel/role management

**Trade-offs:**
- PRO: Reuse rate limiting, error handling, monthly category logic
- PRO: Consistent channel naming and permission patterns
- CON: Single file grows larger (acceptable, it's a service module)

**Example:**
```typescript
// /lib/discord.ts (EXTEND)

// EXISTING: createMentorshipChannel(mentorName, menteeName, matchId)
// NEW: Similar function for projects
export async function createProjectChannel(
  projectTitle: string,
  projectId: string,
  ownerDiscordUsername?: string,
  teamMemberUsernames?: string[]
): Promise<ChannelResult | null> {
  // REUSE: getOrCreateMonthlyCategory()
  // REUSE: lookupMemberByUsername()
  // REUSE: Permission overwrite pattern
  // REUSE: fetchWithRateLimit()
}

// NEW: Add/remove members dynamically
export async function updateChannelMembers(
  channelId: string,
  addUsernames: string[],
  removeUsernames: string[]
): Promise<boolean> {
  // Update permissions on existing channel
}
```

### Pattern 3: Denormalized Profile Data (Performance Optimization)

**What:** Store frequently-accessed profile data (displayName, photoURL) directly in related documents

**When to use:**
- project.proposedByProfile
- project_members.userProfile
- roadmap.createdByProfile
- roadmap_contributions.contributorProfile

**Trade-offs:**
- PRO: Avoid JOINs (Firestore doesn't support joins efficiently)
- PRO: Faster reads for list views (no need to fetch profiles separately)
- CON: Data duplication, must update when profile changes
- CON: Eventual consistency (acceptable for display names/photos)

**Example:**
```typescript
// When creating project
const proposedByProfile = {
  displayName: user.displayName,
  photoURL: user.photoURL,
  role: user.role
};

await db.collection('projects').add({
  title: "My Project",
  proposedBy: user.uid,
  proposedByProfile, // Denormalized for fast display
  // ... other fields
});

// When profile updates (separate maintenance task)
// Update all denormalized references if displayName/photoURL changes
```

### Pattern 4: Status State Machine (Same as Mentorship Sessions)

**What:** Use explicit allowed transitions instead of allowing any status change

**When to use:** Project lifecycle, roadmap publishing, contribution review

**Trade-offs:**
- PRO: Prevents invalid state transitions (can't go from rejected → approved without re-pending)
- PRO: Easier to audit state changes
- CON: More validation code in API routes

**Example:**
```typescript
// /api/mentorship/admin/projects/route.ts (NEW, mirrors sessions/route.ts)

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending'],
  pending: ['approved', 'rejected'],
  approved: ['active'],
  active: ['completed', 'archived'],
  rejected: ['pending'], // Allow resubmission
  completed: ['archived'],
  archived: [], // Terminal state
};

// In PUT handler
const currentStatus = projectDoc.data()?.status;
const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
if (!allowedTargets.includes(newStatus)) {
  return NextResponse.json({
    error: `Cannot transition from ${currentStatus} to ${newStatus}`
  }, { status: 400 });
}
```

### Pattern 5: Version History via Subcollections

**What:** Store roadmap versions in a subcollection for cleaner queries and automatic ordering

**When to use:** Roadmap content versioning

**Trade-offs:**
- PRO: Clean separation, can query versions independently
- PRO: Better for pagination of version history
- CON: Must manually delete subcollections when deleting parent
- CON: Slightly more complex queries (need parent doc ID)

**Example:**
```typescript
// Structure
roadmaps/{roadmapId}
  └── versions/{versionId}

// Creating new version
await db.collection('roadmaps').doc(roadmapId)
  .collection('versions')
  .add({
    version: currentVersion + 1,
    contentUrl: newContentUrl,
    changelog: "Updated section 3",
    createdBy: userId,
    createdAt: new Date()
  });

// Querying versions
const versions = await db
  .collection('roadmaps').doc(roadmapId)
  .collection('versions')
  .orderBy('version', 'desc')
  .limit(10)
  .get();
```

## Build Order and Dependencies

Based on the integration architecture, here's the recommended build order:

### Phase 1: Foundation (Data Layer + Reusable Services)
**Dependencies:** None (extends existing architecture)

1. **Extend type definitions** (`/types/mentorship.ts`)
   - Add Project, ProjectMember, Roadmap, RoadmapVersion types
   - No breaking changes to existing types

2. **Extend Discord service** (`/lib/discord.ts`)
   - Add `createProjectChannel()` function
   - Add `updateChannelMembers()` function
   - Reuses all existing helper functions

3. **Create Firestore collections**
   - Create `projects` collection with security rules
   - Create `project_members` collection with security rules
   - Create `roadmaps` collection with security rules
   - Create `roadmap_versions` subcollection pattern
   - Test security rules with emulator

**Why this order:** Build the data foundation and reusable services before any UI. Extending existing services is low-risk.

### Phase 2: Projects Feature (End-to-End)
**Dependencies:** Phase 1 complete

4. **API routes for projects**
   - `/api/mentorship/projects/route.ts` (list, create)
   - `/api/mentorship/projects/[id]/route.ts` (detail, update)
   - `/api/mentorship/projects/[id]/join/route.ts` (join team)
   - Mirror existing admin API patterns

5. **Admin project management**
   - Extend `/mentorship/admin/page.tsx` with Projects tab
   - Create `<ProjectsAdminTab>` component
   - Reuse existing admin auth and layout

6. **Public project discovery**
   - Create `/projects/discover/page.tsx`
   - Create `<ProjectCard>` component (mirror mentor cards)
   - Create `/projects/[id]/page.tsx` detail view

7. **Project proposal flow**
   - Create project creation form
   - Integrate with API routes
   - Add to user dashboard

8. **Discord integration**
   - Wire up `createProjectChannel()` in approval flow
   - Test channel creation and permissions

**Why this order:** Complete one feature end-to-end before starting the next. Validate Discord integration works before moving to roadmaps.

### Phase 3: Roadmaps Feature (End-to-End)
**Dependencies:** Phase 2 complete (validates patterns work)

9. **API routes for roadmaps**
   - `/api/mentorship/roadmaps/route.ts` (list, create)
   - `/api/mentorship/roadmaps/[id]/route.ts` (detail, update)
   - `/api/mentorship/roadmaps/[id]/submit/route.ts` (submit for review)
   - `/api/mentorship/roadmaps/[id]/versions/route.ts` (version history)

10. **Storage integration**
    - Implement markdown upload to Firebase Storage
    - Add versioning logic (create new version on save)
    - Test storage paths and retrieval

11. **Admin roadmap management**
    - Extend `/mentorship/admin/page.tsx` with Roadmaps tab
    - Create `<RoadmapsAdminTab>` component
    - Add contribution review workflow

12. **Roadmap creation/editing**
    - Create markdown editor UI (or simple textarea for MVP)
    - Implement save → create version flow
    - Add to mentor dashboard

13. **Public roadmap discovery**
    - Create `/roadmaps/discover/page.tsx`
    - Create `/roadmaps/[id]/page.tsx` viewer
    - Implement markdown rendering (react-markdown or similar)
    - Add version history viewer

**Why this order:** Roadmaps build on validated patterns from projects. Storage integration is the new complexity, so build data flow before UI polish.

### Phase 4: Integration and Polish
**Dependencies:** Phases 2-3 complete

14. **Dashboard integration**
    - Add "My Projects" section to `/mentorship/dashboard`
    - Add "My Roadmaps" section (if user is mentor)
    - Cross-link: Show roadmaps relevant to user's projects

15. **Cross-feature integration**
    - Link projects to recommended roadmaps
    - Show contributor profiles (link to mentor profiles)
    - Add "Start a project" CTAs on roadmap pages

16. **Security rules validation**
    - Audit all security rules
    - Test with Firebase emulator
    - Ensure no data leaks

**Why this order:** Integration happens after individual features work. Polish and cross-linking add value without blocking core functionality.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Admin Pages

**What people might do:** Create `/projects/admin` and `/roadmaps/admin` as separate pages

**Why it's wrong:**
- Fragments admin experience (multiple logins, inconsistent UI)
- Duplicate auth logic across pages
- Harder to maintain consistent styling

**Do this instead:** Extend existing `/mentorship/admin` with new tabs. Single auth check, consistent layout, better UX.

### Anti-Pattern 2: Fetching Profiles in Loops

**What people might do:**
```typescript
// BAD: N+1 query problem
const projects = await db.collection('projects').get();
for (const project of projects.docs) {
  const profile = await db.collection('mentorship_profiles')
    .doc(project.data().proposedBy)
    .get();
  project.proposedByProfile = profile.data();
}
```

**Why it's wrong:**
- Firestore charges per read
- Slow (sequential fetches)
- Scales poorly (100 projects = 100 extra reads)

**Do this instead:** Denormalize profile data when creating project, or batch fetch profiles:
```typescript
// GOOD: Denormalize on write
await db.collection('projects').add({
  proposedBy: userId,
  proposedByProfile: { // Store directly
    displayName: user.displayName,
    photoURL: user.photoURL
  }
});

// GOOD: Batch fetch if needed
const userIds = [...new Set(projects.map(p => p.proposedBy))];
const profiles = await Promise.all(
  userIds.map(id => db.collection('mentorship_profiles').doc(id).get())
);
```

### Anti-Pattern 3: Creating Discord Channels Without Categories

**What people might do:**
```typescript
// BAD: Channel directly in guild
await createChannel(guildId, channelName); // No parent category
```

**Why it's wrong:**
- Discord guilds have 500 channel limit
- Channels without categories clutter server
- Existing mentorship uses monthly categories

**Do this instead:** Reuse monthly category pattern from mentorship channels:
```typescript
// GOOD: Use monthly category
const categoryId = await getOrCreateMonthlyCategory();
await createChannel(guildId, channelName, categoryId);
```

### Anti-Pattern 4: Deleting Documents Without Cleaning Subcollections

**What people might do:**
```typescript
// BAD: Delete roadmap, leave versions orphaned
await db.collection('roadmaps').doc(roadmapId).delete();
// roadmap_versions subcollection still exists!
```

**Why it's wrong:**
- Firestore doesn't cascade delete subcollections
- Orphaned data accumulates
- Affects billing and backups

**Do this instead:** Manually delete subcollections first:
```typescript
// GOOD: Delete subcollections first
const versions = await db.collection('roadmaps')
  .doc(roadmapId)
  .collection('versions')
  .get();

const batch = db.batch();
versions.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();

// Then delete parent
await db.collection('roadmaps').doc(roadmapId).delete();
```

### Anti-Pattern 5: Storing Large Markdown in Firestore Documents

**What people might do:**
```typescript
// BAD: Store markdown content directly in document
await db.collection('roadmaps').doc(id).update({
  content: markdownString // Could be 100KB+
});
```

**Why it's wrong:**
- Firestore document limit is 1MB
- Large documents slow down queries
- Can't version content efficiently
- Expensive to read (charged per document size)

**Do this instead:** Store content in Firebase Storage, reference URL in Firestore:
```typescript
// GOOD: Store in Storage, reference in Firestore
const contentPath = `roadmaps/${roadmapId}/v${version}.md`;
await storage.file(contentPath).save(markdownString);

await db.collection('roadmaps').doc(id).update({
  contentUrl: contentPath, // Small reference
  version: version
});
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 projects | Current architecture sufficient. In-memory filtering fine. |
| 100-1000 projects | Add Firestore composite indexes for filtering (status + category). Implement cursor-based pagination. |
| 1000-10000 projects | Consider Algolia/Typesense for search. Denormalization becomes critical. Add CDN caching for public discovery pages. |
| 10000+ projects | Archive old projects to separate collection. Implement data lifecycle policies. Consider project limits per user. |

| Scale | Roadmap Content Storage |
|-------|-------------------------|
| 0-100 roadmaps | Firebase Storage with direct URLs fine. Simple versioning (store all versions). |
| 100-1000 roadmaps | Implement version pruning (keep last 10 versions). Add CDN for markdown files. |
| 1000+ roadmaps | Consider git-based storage (GitHub API) for better diffing. Implement lazy loading for version history. |

### Scaling Priorities

1. **First bottleneck: Firestore read costs for denormalized data**
   - Symptom: High Firestore bills when listing projects
   - Fix: Implement result caching with `unstable_cache` (Next.js 14+)
   - Fix: Add pagination with `startAfter` cursor
   - Example:
   ```typescript
   const projectsCache = unstable_cache(
     async () => db.collection('projects').where('status', '==', 'approved').get(),
     ['approved-projects'],
     { revalidate: 300 } // 5 minutes
   );
   ```

2. **Second bottleneck: Discord API rate limits**
   - Symptom: Channel creation fails during high traffic (multiple projects approved at once)
   - Fix: Implement queue system (Bull/BullMQ with Redis)
   - Fix: Batch channel creation requests
   - Note: Existing `fetchWithRateLimit` helps, but may need job queue for scale

3. **Third bottleneck: Admin dashboard load time**
   - Symptom: `/mentorship/admin` slow with many pending items
   - Fix: Implement tab-level data loading (only fetch when tab active)
   - Fix: Add virtualization for long lists (react-window)
   - Fix: Move heavy operations to background jobs

## Integration Checklist

Before implementing, verify these integration points:

- [ ] **Auth Integration:** New API routes use same admin_sessions validation as existing routes
- [ ] **Type Safety:** All new types added to `/types/mentorship.ts` without breaking existing imports
- [ ] **Discord Service:** New functions mirror existing patterns (monthly categories, rate limiting)
- [ ] **Admin UI:** New tabs integrate seamlessly into existing admin page (same layout, styling, auth flow)
- [ ] **Firestore Security Rules:** New collections follow same permission patterns as mentorship_profiles/sessions
- [ ] **Data Denormalization:** Profile data cached in project/roadmap docs to avoid N+1 queries
- [ ] **Storage Paths:** Markdown files use consistent naming in Firebase Storage
- [ ] **Error Handling:** API routes return same JSON shape as existing routes `{ data?, error? }`
- [ ] **Loading States:** UI components use same loading/error patterns as existing mentorship features

## Sources

**Next.js + Firebase Integration:**
- [Integrate Firebase with Next.js | Firebase Codelabs](https://firebase.google.com/codelabs/firebase-nextjs)
- [Integrate Next.js | Firebase Hosting](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [Next.js App Router: Project Structure | MakerKit](https://makerkit.dev/blog/tutorials/nextjs-app-router-project-structure)
- [Next.js Folder Structure Best Practices 2026 | CodeByDeep](https://www.codebydeep.com/blog/next-js-folder-structure-best-practices-for-scalable-applications-2026-guide)

**Firestore Data Modeling:**
- [Cloud Firestore Data Model | Firebase](https://firebase.google.com/docs/firestore/data-model)
- [Choose a Data Structure | Firestore | Firebase](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Firestore NoSQL Data Modeling | Fireship.io](https://fireship.io/lessons/firestore-nosql-data-modeling-by-example/)

**Firestore Security Rules:**
- [Get Started with Cloud Firestore Security Rules | Firebase](https://firebase.google.com/docs/firestore/security/get-started)
- [Secure Data Access for Users and Groups | Firestore | Firebase](https://firebase.google.com/docs/firestore/solutions/role-based-access)
- [Writing Conditions for Cloud Firestore Security Rules | Firebase](https://firebase.google.com/docs/firestore/security/rules-conditions)

**Discord Integration:**
- [TidyCord - AI-Powered Discord Server Management](https://tidycord.de/)
- [Reaction Roles Discord Bot](https://www.reactionroles.com/)

**Project Lifecycle & Versioning:**
- [Project Lifecycle | Hyperledger TOC](https://toc.hyperledger.org/governing-documents/project-lifecycle.html)
- [Optimize Your Approval Process | Atlassian](https://www.atlassian.com/work-management/project-management/approval-process-workflow)
- [Versioned Documents with Firestore | GitHub Gist](https://gist.github.com/ydnar/8e4a51f7d1ce42e9bb4ae53ba049de4a)

**Best Practices & Performance:**
- [Best Practices for Cloud Firestore | Firebase](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore Query Performance Best Practices 2026 | Estuary](https://estuary.dev/blog/firestore-query-best-practices/)
- [Next.js API Routes: The Ultimate Guide | MakerKit](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices)

---
*Architecture research for: Project Collaboration & Learning Roadmaps integration with existing mentorship platform*
*Researched: 2026-02-02*
*Confidence: HIGH - Based on existing codebase analysis and verified 2026 documentation*
