---
phase: 08-roadmaps-creation-admin
plan: 01
subsystem: roadmaps-api
tags: [backend, api, firebase-storage, versioning, admin-approval]
dependencies:
  requires: [permissions-system, firebase-admin, auth, sanitization]
  provides: [roadmap-crud-api, version-history-api]
  affects: []
tech-stack:
  added: [firebase-storage-markdown]
  patterns: [storage-upload, subcollection-versioning, action-based-mutations]
key-files:
  created:
    - src/app/api/roadmaps/route.ts
    - src/app/api/roadmaps/[id]/route.ts
    - src/app/api/roadmaps/[id]/versions/route.ts
  modified: []
decisions:
  - Store Markdown content in Firebase Storage (not Firestore) for unlimited size
  - Version subcollection stores contentUrl references (not full content) for efficiency
  - Edit action always creates new version and resets status to draft for re-approval
  - Only accepted mentors can create roadmaps (stricter than project creation)
  - Admin-only approval workflow (same pattern as projects)
metrics:
  duration: 2
  tasks: 2
  files: 3
  commits: 2
  completed: 2026-02-11
---

# Phase 08 Plan 01: Roadmap CRUD API with Storage Integration Summary

**One-liner:** Complete roadmap API with Firebase Storage for Markdown content, versioning via subcollections, and admin approval workflow following project patterns.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | Create roadmap collection and list API routes | b6d18a1 | POST creates roadmap with Storage upload, GET filters by status/creatorId |
| 2 | Create roadmap detail, actions, and version history routes | 84ef487 | GET fetches content from Storage, PUT handles submit/approve/request-changes/edit, versions endpoint |

## What Was Built

### API Endpoints Created

**POST /api/roadmaps** - Create roadmap
- Validates title (3-100 chars), domain (8 valid values), difficulty, content (min 50 chars)
- Checks `canCreateRoadmap` (accepted mentors only)
- Sanitizes Markdown with `sanitizeMarkdownRaw`
- Uploads to Storage: `roadmaps/{docId}/v1-{timestamp}.md`
- Creates Firestore metadata doc with `contentUrl`
- Creates initial version in `roadmaps/{id}/versions` subcollection
- Returns `{ success: true, id }`

**GET /api/roadmaps** - List roadmaps
- Filters by `status` and/or `creatorId` query params
- Orders by `createdAt` descending, limit 50
- Serializes Firestore timestamps to ISO strings
- Returns `{ roadmaps: [...] }`

**GET /api/roadmaps/[id]** - Get single roadmap
- Fetches metadata from Firestore
- Fetches Markdown content from `contentUrl` via HTTP
- Includes full content in response
- Returns `{ roadmap: { id, ...data, content } }`

**PUT /api/roadmaps/[id]** - Roadmap actions
- **submit**: Creator submits draft for review (status: draft → pending)
- **approve**: Admin approves pending roadmap (status: pending → approved)
- **request-changes**: Admin requests changes with feedback (status: pending → draft, stores feedback)
- **edit**: Owner/admin edits roadmap
  - Creates new version: `v{N+1}-{timestamp}.md`
  - Uploads to Storage, updates `contentUrl` and `version`
  - Resets status to draft for re-approval
  - Creates version entry in subcollection
  - Supports optional metadata updates (title, description, domain, difficulty, estimatedHours)

**GET /api/roadmaps/[id]/versions** - Version history
- Queries `roadmaps/{id}/versions` subcollection
- Orders by version number descending
- Returns `{ versions: [...] }`

## Technical Implementation

### Storage Architecture
- **Why Storage?** Markdown content can be large (unbounded), Firestore has 1MB doc limit
- **Pattern:** Firestore stores metadata + contentUrl, Storage stores actual Markdown
- **Path format:** `roadmaps/{roadmapId}/v{version}-{timestamp}.md`
- **Access:** Files made public after upload, fetched via URL in GET endpoint

### Version Management
- **Subcollection:** `roadmaps/{roadmapId}/versions/{versionId}`
- **Version docs contain:** roadmapId, version number, contentUrl (reference), createdBy, createdAt, changeDescription
- **Immutable:** No updates/deletes on version docs (audit trail pattern from Phase 4 decision)
- **Main doc tracks:** Current version number and contentUrl

### Permission Model
- **Create:** `canCreateRoadmap(user)` - accepted mentors only (PERM-02)
- **Approve/request-changes:** `canApproveRoadmap(user, roadmap)` - admins only (PERM-03)
- **Edit:** `canEditRoadmap(user, roadmap)` - owner or admin
- **Submit:** Creator-only (enforced in route logic)

### Data Flow
1. **Creation:** Validate → Create Firestore doc → Upload to Storage → Update with contentUrl → Create version v1
2. **Edit:** Validate → Upload new file → Update Firestore (contentUrl + version) → Create version vN → Reset to draft
3. **Retrieve:** Fetch Firestore doc → Fetch content from contentUrl → Merge and return

## Validation Rules

### Required Fields
- `title`: 3-100 characters
- `domain`: One of 8 valid domains (web-dev, frontend, backend, ml, ai, mcp, agents, prompt-engineering)
- `difficulty`: beginner | intermediate | advanced
- `content`: Minimum 50 characters (substantive content required)

### Optional Fields
- `description`: Max 500 characters (short summary for listings)
- `estimatedHours`: 1-1000 if provided

### Action Requirements
- **submit**: Must be draft, must be creator
- **approve**: Must be pending, must be admin
- **request-changes**: Must be pending, must be admin, feedback min 10 chars
- **edit**: Must be owner/admin, content min 50 chars

## Security

- **Authentication:** All mutating endpoints verify auth via `verifyAuth(request)`
- **Authorization:** Role-based checks via permission system functions
- **Content Sanitization:** `sanitizeMarkdownRaw` strips script tags, event handlers, javascript: URLs, data: URLs
- **File Access:** Storage files made public (content intended for public consumption)

## Integration Points

**Depends on:**
- Permission system (`canCreateRoadmap`, `canApproveRoadmap`, `canEditRoadmap`)
- Firebase Admin SDK (Firestore + Storage)
- Auth verification (`verifyAuth`)
- Markdown sanitization (`sanitizeMarkdownRaw`)

**Provides for:**
- Phase 08 Plan 02: Roadmap creation form UI
- Phase 08 Plan 03: Admin roadmap approval dashboard

## Deviations from Plan

None - plan executed exactly as written. All must-have truths satisfied, all artifacts created with correct exports.

## Verification Results

✅ `npx tsc --noEmit` - TypeScript compilation passed
✅ `npm run build` - Next.js build succeeded, all routes registered
✅ All three route files exist with correct exports (POST, GET, PUT handlers)
✅ POST uses `sanitizeMarkdownRaw` before Storage upload
✅ POST uses `verifyAuth` and `canCreateRoadmap` permission check
✅ PUT approve/request-changes use `canApproveRoadmap` permission check
✅ PUT edit uses `canEditRoadmap` permission check and creates version subcollection entry

## Success Criteria Met

- [x] Roadmap creation stores sanitized Markdown in Firebase Storage and metadata in Firestore
- [x] Roadmap listing supports status and creatorId filters
- [x] Single roadmap detail includes content fetched from Storage URL
- [x] Admin can approve or request changes on pending roadmaps
- [x] Edit action creates new version, uploads new content to Storage, resets status to draft
- [x] Version history returns chronological version entries ordered by version descending
- [x] All mutating endpoints verify authentication via verifyAuth
- [x] All actions enforce role-based permissions (mentor creates, admin approves, owner/admin edits)

## Self-Check: PASSED

**Created files verified:**
```bash
$ [ -f "src/app/api/roadmaps/route.ts" ] && echo "FOUND"
FOUND
$ [ -f "src/app/api/roadmaps/[id]/route.ts" ] && echo "FOUND"
FOUND
$ [ -f "src/app/api/roadmaps/[id]/versions/route.ts" ] && echo "FOUND"
FOUND
```

**Commits verified:**
```bash
$ git log --oneline --all | grep -E "b6d18a1|84ef487"
84ef487 feat(08-01): create roadmap detail, actions, and version history routes
b6d18a1 feat(08-01): create roadmap collection and list API routes
```

All claimed files exist and all commits are present in git history.
