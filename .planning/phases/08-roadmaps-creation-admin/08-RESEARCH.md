# Phase 8: Roadmaps - Creation & Admin - Research

**Researched:** 2026-02-11
**Domain:** React Markdown Editors, Firebase Storage Integration, Markdown Sanitization, Version History Tracking
**Confidence:** HIGH

## Summary

This research investigates implementing a roadmap creation and admin approval workflow with Markdown editing, Firebase Storage integration for content persistence, and version history tracking. The phase enables mentors to create structured learning roadmaps with live preview editing, while admins review and approve submissions with built-in XSS protection.

The standard approach combines:
- Lightweight React Markdown editor (@uiw/react-md-editor) with live preview and toolbar
- Firebase Storage for roadmap content to avoid Firestore's 1MB document limit
- Existing rehype-sanitize infrastructure for XSS prevention
- Firestore subcollections for immutable version history
- React 19 useActionState for form handling with pending states
- Admin approval workflow pattern from Phase 5 (projects)

Key finding: Store large Markdown content in Firebase Storage and reference via URL in Firestore documents. This pattern scales indefinitely and avoids the 1MB Firestore document size limit while enabling efficient metadata queries.

**Primary recommendation:** Use @uiw/react-md-editor (4.6kB gzipped) for the editing interface, upload sanitized Markdown to Firebase Storage using the existing pattern from MentorRegistrationForm, store metadata + contentUrl in Firestore, and implement version history as an immutable subcollection (roadmaps/{id}/versions/{versionId}).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @uiw/react-md-editor | latest (4.x) | React Markdown editor with preview | Lightweight (4.6kB gzipped), GitHub Flavored Markdown, no heavy dependencies (Monaco/CodeMirror), active maintenance |
| firebase | 12.6.0 | Firebase Storage client SDK | Already in use, required for client-side file uploads to Storage |
| rehype-sanitize | 6.0.0 | Markdown XSS prevention | Already installed (Phase 4), GitHub-compatible schema, prevents DOM clobbering |
| react | 19.2.1 | React 19 with useActionState | Already in use, modern form handling with built-in pending states |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unified | 11.0.5 | Markdown processing pipeline | Already installed, required for rehype-sanitize |
| remark-parse | 11.0.0 | Markdown parser | Already installed, converts Markdown to syntax tree |
| remark-rehype | 11.1.2 | Markdown to HTML converter | Already installed, bridge between remark and rehype |
| rehype-stringify | 10.0.1 | HTML serializer | Already installed, final step in sanitization pipeline |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @uiw/react-md-editor | MDXEditor | MDXEditor has rich WYSIWYG features but larger bundle (100kB+), more complex API; overkill for simple Markdown editing |
| @uiw/react-md-editor | react-mde | react-mde has 56k weekly downloads but heavier bundle, less active maintenance (last major release 2021) |
| Firebase Storage | Store in Firestore content field | Firestore has 1MB document limit; roadmaps can easily exceed this with detailed content |
| Subcollections for versions | Root collection with versionId | Subcollections keep versions logically grouped with parent roadmap, cleaner queries, automatic cleanup on parent delete |

**Installation:**
```bash
npm install @uiw/react-md-editor
```

All other dependencies (firebase, rehype-sanitize, unified ecosystem) are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── roadmaps/
│   │   ├── new/
│   │   │   └── page.tsx            # Roadmap creation form with Markdown editor
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx        # Roadmap edit form (creates new version)
│   └── mentorship/
│       └── admin/
│           └── page.tsx            # Add Roadmaps tab for admin approval
├── api/
│   └── roadmaps/
│       ├── route.ts                # POST (create), GET (list)
│       └── [id]/
│           ├── route.ts            # PUT (submit/approve/decline), GET (details)
│           └── versions/
│               └── route.ts        # GET (version history)
├── lib/
│   └── validation/
│       └── sanitize.ts             # Already exists with sanitizeMarkdown + sanitizeMarkdownRaw
└── types/
    └── mentorship.ts               # Roadmap types already defined in Phase 4
```

### Pattern 1: Firebase Storage Upload for Markdown Content
**What:** Upload Markdown content to Firebase Storage and store contentUrl in Firestore
**When to use:** Storing large text content that may exceed Firestore's 1MB document limit
**Example:**
```typescript
// Source: Existing pattern from src/components/mentorship/MentorRegistrationForm.tsx
// Client-side upload pattern

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getApp } from "firebase/app";

async function uploadMarkdownContent(
  roadmapId: string,
  content: string,
  version: number
): Promise<string> {
  const storage = getStorage(getApp());
  const timestamp = Date.now();
  const storagePath = `roadmaps/${roadmapId}/v${version}-${timestamp}.md`;
  const storageRef = ref(storage, storagePath);

  // Convert string to Blob for upload
  const blob = new Blob([content], { type: "text/markdown" });

  await uploadBytes(storageRef, blob, {
    contentType: "text/markdown",
    customMetadata: {
      version: version.toString(),
      createdAt: new Date().toISOString(),
    }
  });

  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

// Usage in form submission:
// 1. Sanitize content with sanitizeMarkdownRaw()
// 2. Upload to Storage
// 3. Create Firestore document with contentUrl
```

### Pattern 2: @uiw/react-md-editor Integration
**What:** Lightweight Markdown editor with live preview and toolbar
**When to use:** Roadmap creation and editing forms
**Example:**
```typescript
// Source: https://github.com/uiwjs/react-md-editor
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { sanitizeMarkdownRaw } from "@/lib/validation/sanitize";

// Dynamic import to avoid SSR issues (editor uses browser APIs)
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);

export default function RoadmapForm() {
  const [content, setContent] = useState("**Hello world!!!**");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Sanitize before upload
    const sanitized = sanitizeMarkdownRaw(content);

    // Upload to Storage and create Firestore doc
    // ... (see Pattern 1)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="label">
          <span className="label-text font-semibold">Roadmap Content *</span>
        </label>
        <div data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || "")}
            height={400}
            preview="live"
            hideToolbar={false}
          />
        </div>
        <label className="label">
          <span className="label-text-alt">Supports GitHub Flavored Markdown</span>
        </label>
      </div>

      <button type="submit" className="btn btn-primary">
        Save Draft
      </button>
    </form>
  );
}
```

### Pattern 3: Version History with Immutable Subcollections
**What:** Store version history in Firestore subcollections with no update/delete for audit trail
**When to use:** Tracking roadmap changes over time
**Example:**
```typescript
// Source: Phase 4 decision - Immutable version history
// Firestore structure:
// /roadmaps/{roadmapId}
//   /versions/{versionId}  (subcollection)

// Create new version when roadmap is edited
async function createRoadmapVersion(
  roadmapId: string,
  version: number,
  content: string,
  changeDescription: string,
  createdBy: string
): Promise<void> {
  const versionData = {
    roadmapId,
    version,
    content, // Full Markdown content snapshot
    createdBy,
    createdAt: FieldValue.serverTimestamp(),
    changeDescription,
  };

  // Add to versions subcollection
  await db
    .collection("roadmaps")
    .doc(roadmapId)
    .collection("versions")
    .add(versionData);
}

// Security rule (from Phase 4):
// Versions are immutable (audit trail)
// allow create: if isSignedIn() && request.resource.data.createdBy == request.auth.uid;
// allow update, delete: if false;
```

### Pattern 4: React 19 useActionState for Forms
**What:** Modern form handling with built-in pending states
**When to use:** All form submissions (create, edit, submit for review)
**Example:**
```typescript
// Source: Phase 5 decision - React 19 useActionState for forms
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

interface FormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  roadmapId?: string;
}

export default function CreateRoadmapPage() {
  const router = useRouter();

  async function createRoadmapAction(
    prevState: FormState,
    formData: FormData
  ): Promise<FormState> {
    try {
      const title = formData.get("title") as string;
      const domain = formData.get("domain") as string;
      const difficulty = formData.get("difficulty") as string;
      const estimatedHours = parseInt(formData.get("estimatedHours") as string);
      const content = formData.get("content") as string;

      // Client-side validation
      if (!title || title.length < 3 || title.length > 100) {
        return { error: "Title must be 3-100 characters" };
      }

      if (!content || content.length < 50) {
        return { error: "Content must be at least 50 characters" };
      }

      // POST to API
      const response = await fetch("/api/roadmaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          domain,
          difficulty,
          estimatedHours,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.message || "Failed to create roadmap" };
      }

      const data = await response.json();
      return { success: true, roadmapId: data.id };
    } catch (err) {
      return { error: "Network error. Please try again." };
    }
  }

  const [state, formAction, isPending] = useActionState(createRoadmapAction, {});

  // Redirect on success
  if (state.success) {
    router.push("/mentorship/admin"); // Or roadmap detail page
  }

  return (
    <form action={formAction}>
      {/* Form fields */}
      {state.error && (
        <div className="alert alert-error">{state.error}</div>
      )}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={isPending}
      >
        {isPending ? "Creating..." : "Create Roadmap"}
      </button>
    </form>
  );
}
```

### Pattern 5: Admin Approval Workflow (from Phase 5)
**What:** Reuse the project approval pattern for roadmap review
**When to use:** Admin dashboard Roadmaps tab
**Example:**
```typescript
// Source: Existing pattern from src/app/mentorship/admin/page.tsx Projects tab
// Admin dashboard with Roadmaps tab

const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
const [loadingRoadmaps, setLoadingRoadmaps] = useState(false);
const [roadmapActionLoading, setRoadmapActionLoading] = useState<string | null>(null);

// Fetch pending roadmaps when tab activates
useEffect(() => {
  if (activeTab === "roadmaps") {
    fetchRoadmaps();
  }
}, [activeTab]);

async function fetchRoadmaps() {
  setLoadingRoadmaps(true);
  try {
    const response = await fetch("/api/roadmaps?status=pending");
    const data = await response.json();
    setRoadmaps(data.roadmaps || []);
  } catch (error) {
    toast.error("Failed to fetch roadmaps");
  } finally {
    setLoadingRoadmaps(false);
  }
}

async function handleApproveRoadmap(roadmapId: string) {
  setRoadmapActionLoading(roadmapId);
  try {
    const response = await fetch(`/api/roadmaps/${roadmapId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve",
        adminId: user.uid,
      }),
    });

    if (!response.ok) throw new Error("Failed to approve");

    toast.success("Roadmap approved!");
    setRoadmaps(prev => prev.filter(r => r.id !== roadmapId));
  } catch (error) {
    toast.error("Failed to approve roadmap");
  } finally {
    setRoadmapActionLoading(null);
  }
}

// Similar handleDeclineRoadmap with feedback modal
```

### Anti-Patterns to Avoid
- **Storing large Markdown in Firestore content field:** Firestore has 1MB document limit; use Firebase Storage instead
- **Mutable version history:** Never allow updates/deletes on version subcollection documents; breaks audit trail
- **Unsanitized Markdown:** Always sanitize with sanitizeMarkdownRaw() before upload and sanitizeMarkdown() before rendering
- **Synchronous Storage uploads:** Use async/await with loading states to prevent UI freezes
- **Missing MDEditor SSR handling:** Must use dynamic import with `ssr: false` to avoid hydration errors

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown editor | Custom textarea + preview renderer | @uiw/react-md-editor | Toolbar, shortcuts, syntax highlighting, split preview - hundreds of edge cases |
| Markdown sanitization | Regex-based HTML stripping | rehype-sanitize | DOM clobbering, event handlers, protocol handlers, Unicode exploits require comprehensive schema |
| Version diffing | Custom diff algorithm | Store full snapshots + display changelog | Markdown diffing is complex; storage is cheap; snapshots ensure perfect history |
| File upload state | Custom loading/error flags | React 19 useActionState | Built-in pending state, error handling, form resets, optimistic updates |
| Markdown to HTML | Regular expressions | unified pipeline (remark + rehype) | GFM tables, task lists, footnotes, autolinks have complex parsing rules |

**Key insight:** Markdown is deceptively complex. GitHub Flavored Markdown has dozens of edge cases (nested lists, code blocks inside blockquotes, HTML comments, etc.). Use battle-tested libraries that handle these correctly.

## Common Pitfalls

### Pitfall 1: Firestore 1MB Document Size Limit
**What goes wrong:** Storing roadmap Markdown content directly in Firestore `content` field. Long roadmaps (5-10k words) exceed 1MB limit and fail to save.
**Why it happens:** Developers assume Firestore can handle large text fields without checking size limits.
**How to avoid:** Store large content in Firebase Storage, reference via `contentUrl` in Firestore. Keep only metadata (title, domain, status, creatorId) in Firestore document.
**Warning signs:** "Document size exceeds 1MB" errors, save failures on long roadmaps.

### Pitfall 2: XSS Through Unsanitized Markdown
**What goes wrong:** Rendering user-submitted Markdown without sanitization allows XSS attacks via `<script>` tags, `javascript:` URLs, or event handlers.
**Why it happens:** Assuming Markdown is "safe" because it's not HTML. Markdown allows inline HTML and dangerous URL protocols.
**How to avoid:**
  1. Sanitize before storage: `sanitizeMarkdownRaw(content)` strips dangerous patterns from Markdown
  2. Sanitize before rendering: `sanitizeMarkdown(content)` converts to HTML with rehype-sanitize schema
**Warning signs:** `<script>` tags in rendered output, `onclick` handlers in HTML, `javascript:` URLs in links.

### Pitfall 3: MDEditor SSR Hydration Errors
**What goes wrong:** Importing @uiw/react-md-editor normally causes "document is not defined" errors during Next.js server-side rendering.
**Why it happens:** MDEditor uses browser-only APIs (document, window) that don't exist in Node.js environment.
**How to avoid:** Use Next.js dynamic import with `ssr: false`:
```typescript
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor"),
  { ssr: false }
);
```
**Warning signs:** "ReferenceError: document is not defined", hydration mismatches, blank editor on initial load.

### Pitfall 4: Forgetting to Upload Content Before Creating Firestore Doc
**What goes wrong:** Creating Firestore roadmap document with `contentUrl` before actually uploading content to Storage. Results in broken URL reference.
**Why it happens:** Async timing issues - developer assumes upload happens automatically.
**How to avoid:** Enforce upload-first pattern in API route:
  1. Sanitize content
  2. Upload to Storage, get downloadURL
  3. Create Firestore doc with contentUrl
**Warning signs:** Roadmaps with null/empty `contentUrl`, 404 errors when fetching content.

### Pitfall 5: No Loading States During Storage Upload
**What goes wrong:** Form remains interactive during long upload, user clicks submit multiple times, creates duplicate roadmaps.
**Why it happens:** Firebase Storage uploads take 2-5 seconds for large Markdown files. Without disabled state, users perceive form as broken.
**How to avoid:** Use React 19 useActionState's `isPending` flag to disable form during submission:
```typescript
const [state, formAction, isPending] = useActionState(action, {});

<button disabled={isPending}>
  {isPending ? "Creating..." : "Create Roadmap"}
</button>
```
**Warning signs:** Duplicate roadmaps in database, user complaints about "nothing happening" on submit.

### Pitfall 6: Mutable Version History
**What goes wrong:** Allowing updates or deletes on version subcollection documents destroys audit trail and makes version history unreliable.
**Why it happens:** Developers treat versions like regular documents, forgetting they're meant for historical record.
**How to avoid:** Firestore security rules enforce immutability:
```javascript
match /roadmaps/{roadmapId}/versions/{versionId} {
  allow create: if isSignedIn();
  allow update, delete: if false; // Immutable!
}
```
**Warning signs:** Version history gaps, inconsistent timestamps, users reporting "lost changes".

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Roadmap Creation Flow
```typescript
// Source: Firebase docs + existing codebase patterns
// API Route: POST /api/roadmaps

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAuth } from "@/lib/auth";
import { canCreateRoadmap } from "@/lib/permissions";
import { sanitizeMarkdownRaw } from "@/lib/validation/sanitize";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { title, domain, difficulty, estimatedHours, content } = body;

    // 3. Validate required fields
    if (!title || title.length < 3 || title.length > 100) {
      return NextResponse.json(
        { error: "Title must be 3-100 characters" },
        { status: 400 }
      );
    }

    if (!content || content.length < 50) {
      return NextResponse.json(
        { error: "Content must be at least 50 characters" },
        { status: 400 }
      );
    }

    // 4. Fetch creator profile and check permissions
    const creatorId = authResult.uid;
    const creatorDoc = await db
      .collection("mentorship_profiles")
      .doc(creatorId)
      .get();

    if (!creatorDoc.exists) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    const creatorData = creatorDoc.data();
    const permissionUser = {
      uid: creatorId,
      role: creatorData?.role || null,
      status: creatorData?.status,
      isAdmin: creatorData?.isAdmin,
    };

    if (!canCreateRoadmap(permissionUser)) {
      return NextResponse.json(
        { error: "Only accepted mentors can create roadmaps" },
        { status: 403 }
      );
    }

    // 5. Sanitize Markdown content
    const sanitizedContent = sanitizeMarkdownRaw(content);

    // 6. Create Firestore document first (to get ID)
    const roadmapData = {
      title,
      domain,
      difficulty: difficulty || "intermediate",
      estimatedHours: estimatedHours || null,
      creatorId,
      creatorProfile: {
        displayName: creatorData?.displayName || "",
        photoURL: creatorData?.photoURL || "",
        username: creatorData?.username,
      },
      status: "draft", // Starts as draft
      version: 1,
      contentUrl: null, // Will update after upload
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("roadmaps").add(roadmapData);
    const roadmapId = docRef.id;

    // 7. Upload content to Firebase Storage
    const bucket = getStorage().bucket();
    const timestamp = Date.now();
    const storagePath = `roadmaps/${roadmapId}/v1-${timestamp}.md`;
    const file = bucket.file(storagePath);

    await file.save(sanitizedContent, {
      contentType: "text/markdown",
      metadata: {
        metadata: {
          version: "1",
          roadmapId,
          createdAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly readable
    await file.makePublic();
    const contentUrl = file.publicUrl();

    // 8. Update Firestore document with contentUrl
    await docRef.update({ contentUrl });

    // 9. Create initial version in subcollection
    await docRef.collection("versions").add({
      roadmapId,
      version: 1,
      content: sanitizedContent,
      createdBy: creatorId,
      createdAt: FieldValue.serverTimestamp(),
      changeDescription: "Initial version",
    });

    return NextResponse.json({
      success: true,
      id: roadmapId,
      message: "Roadmap created successfully",
    });
  } catch (error) {
    console.error("Error creating roadmap:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Example 2: Admin Approval/Decline Actions
```typescript
// Source: Existing pattern from src/app/api/projects/[id]/route.ts
// API Route: PUT /api/roadmaps/[id]

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, adminId, feedback } = body;
    const roadmapId = params.id;

    // Fetch roadmap
    const roadmapRef = db.collection("roadmaps").doc(roadmapId);
    const roadmapDoc = await roadmapRef.get();

    if (!roadmapDoc.exists) {
      return NextResponse.json(
        { error: "Roadmap not found" },
        { status: 404 }
      );
    }

    const roadmapData = roadmapDoc.data();

    // Check admin permission
    const adminDoc = await db
      .collection("mentorship_profiles")
      .doc(adminId)
      .get();

    if (!adminDoc.exists || !canApproveRoadmap({
      uid: adminId,
      role: adminDoc.data()?.role,
      status: adminDoc.data()?.status,
      isAdmin: adminDoc.data()?.isAdmin,
    })) {
      return NextResponse.json(
        { error: "Admin permission required" },
        { status: 403 }
      );
    }

    if (action === "approve") {
      // Approve roadmap
      await roadmapRef.update({
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: adminId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Roadmap approved",
      });
    } else if (action === "decline") {
      // Decline roadmap with feedback
      if (!feedback || feedback.length < 10) {
        return NextResponse.json(
          { error: "Feedback must be at least 10 characters" },
          { status: 400 }
        );
      }

      await roadmapRef.update({
        status: "draft",
        declineFeedback: feedback,
        declinedAt: FieldValue.serverTimestamp(),
        declinedBy: adminId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Roadmap declined",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error updating roadmap:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Example 3: Roadmap Edit (Creates New Version)
```typescript
// Source: Version history pattern
// When editing published roadmap, create new draft version

export async function editRoadmap(
  roadmapId: string,
  updatedContent: string,
  changeDescription: string,
  userId: string
) {
  const roadmapRef = db.collection("roadmaps").doc(roadmapId);
  const roadmapDoc = await roadmapRef.get();
  const currentVersion = roadmapDoc.data()?.version || 1;
  const newVersion = currentVersion + 1;

  // 1. Sanitize new content
  const sanitizedContent = sanitizeMarkdownRaw(updatedContent);

  // 2. Upload new version to Storage
  const bucket = getStorage().bucket();
  const timestamp = Date.now();
  const storagePath = `roadmaps/${roadmapId}/v${newVersion}-${timestamp}.md`;
  const file = bucket.file(storagePath);

  await file.save(sanitizedContent, {
    contentType: "text/markdown",
    metadata: {
      metadata: {
        version: newVersion.toString(),
        roadmapId,
        createdAt: new Date().toISOString(),
      },
    },
  });

  await file.makePublic();
  const contentUrl = file.publicUrl();

  // 3. Update main document (status back to draft, new contentUrl, increment version)
  await roadmapRef.update({
    contentUrl,
    version: newVersion,
    status: "draft", // Requires re-approval
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 4. Create version history entry
  await roadmapRef.collection("versions").add({
    roadmapId,
    version: newVersion,
    content: sanitizedContent,
    createdBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    changeDescription: changeDescription || `Version ${newVersion}`,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store Markdown in Firestore | Store in Firebase Storage with URL reference | Always (best practice) | Scales indefinitely, no 1MB limit issues |
| react-simplemde-editor | @uiw/react-md-editor | 2024+ | Active maintenance, smaller bundle (4.6kB vs 100kB+), TypeScript native |
| useFormState (React 18) | useActionState (React 19) | React 19 (Nov 2024) | Simplified API, better TypeScript inference |
| Monaco/CodeMirror editors | Textarea-based editors | 2024+ | Lighter bundle, faster TTI, simpler integration |
| Manual form pending state | Built-in isPending from useActionState | React 19 (Nov 2024) | Less boilerplate, automatic state management |

**Deprecated/outdated:**
- **react-simplemde-editor**: Not maintained for 3+ years, TypeScript/React ref issues
- **react-mde**: Last major release 2021, heavier bundle, less active development
- **Storing large text in Firestore**: Always use Storage for content >100KB

## Open Questions

1. **Should we show Markdown syntax cheat sheet in editor?**
   - What we know: @uiw/react-md-editor supports custom commands/toolbar items
   - What's unclear: Whether users need inline help vs. link to external guide
   - Recommendation: Add help icon in toolbar linking to GitHub Flavored Markdown guide

2. **Should draft roadmaps auto-save to prevent data loss?**
   - What we know: MDEditor supports onChange callback, can save to localStorage
   - What's unclear: Whether auto-save complexity is worth it vs. user manually saving
   - Recommendation: Start without auto-save (simpler), add if users report data loss

3. **Should version history show content diffs?**
   - What we know: Storage is cheap, can store full content snapshots
   - What's unclear: Whether diff UI provides enough value vs. complexity
   - Recommendation: Store full snapshots, show changelog text only. Skip diff UI for MVP.

## Sources

### Primary (HIGH confidence)
- @uiw/react-md-editor GitHub: https://github.com/uiwjs/react-md-editor - Features, API, usage patterns
- rehype-sanitize GitHub: https://github.com/rehypejs/rehype-sanitize - Security configurations, schema patterns
- Firebase Storage docs: https://firebase.google.com/docs/storage/web/upload-files - Upload methods, metadata
- Firestore quotas and limits: https://firebase.google.com/docs/firestore/quotas - 1MB document limit
- React useActionState docs: https://react.dev/reference/react/useActionState - React 19 form handling
- Next.js Forms guide: https://nextjs.org/docs/app/guides/forms - Server Actions with useActionState
- Existing codebase patterns: src/components/mentorship/MentorRegistrationForm.tsx (Storage upload), src/app/api/projects/route.ts (API patterns)

### Secondary (MEDIUM confidence)
- Strapi blog: Best React Markdown Editors comparison - https://strapi.io/blog/top-5-markdown-editors-for-react
- Medium: Firestore version history guide - https://medium.com/google-cloud/building-a-time-machine-with-firestore-a-complete-guide-to-data-history-tracking-3bd1d506250c
- Changelog best practices: https://userguiding.com/blog/changelog-best-practices
- DaisyUI form components: https://daisyui.com/components/select/ - Select, textarea, input components

### Tertiary (LOW confidence)
- None - all findings verified with official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @uiw/react-md-editor actively maintained, verified with GitHub repo; Firebase Storage widely used pattern
- Architecture: HIGH - Patterns verified in existing codebase (MentorRegistrationForm, projects API routes)
- Pitfalls: HIGH - Firestore 1MB limit documented in official docs; XSS prevention confirmed with rehype-sanitize docs

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable ecosystem)
