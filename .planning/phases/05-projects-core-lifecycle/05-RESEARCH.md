# Phase 5: Projects - Core Lifecycle - Research

**Researched:** 2026-02-02
**Domain:** Next.js 16 Server Actions, Discord Bot Integration, Firestore Project Management
**Confidence:** HIGH

## Summary

This research investigates implementing a complete project lifecycle workflow (create → approve → Discord channel → complete) for a mentorship platform using Next.js 16, React 19, Firebase Firestore, and Discord Bot integration. The phase builds on Phase 4's type definitions, permission system, and validation utilities to deliver end-to-end project management with Discord collaboration channels.

The standard approach combines:
- API Routes (not Server Actions) for complex multi-step operations with Discord integration
- React 19's useActionState for form validation and error handling in client components
- Extending existing admin dashboard tab pattern for project approval workflow
- Reusing proven Discord channel creation patterns from mentorship with project-specific categories
- Firestore `FieldValue.serverTimestamp()` for automatic activity tracking
- Next.js 16's revalidatePath for cache invalidation after mutations

Key finding: API Routes are preferred over Server Actions for project creation/approval because Discord channel creation involves external API calls with rate limiting, timeouts, and complex error scenarios that benefit from traditional HTTP response patterns and better observability. Server Actions work well for simple CRUD but struggle with multi-service orchestration.

**Primary recommendation:** Implement project creation as API routes at `/api/projects` with denormalized profile data, extend admin dashboard with new "Projects" tab following existing patterns, create Discord project channels in a "Projects" category (separate from "Mentorship" categories), and use `lastActivityAt` timestamp pattern for stale content detection.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.0.10 | App Router with API Routes | Already in use, API Routes preferred for multi-service operations |
| React | 19.2.1 | Form handling with useActionState | Already in use, useActionState simplifies form state management |
| Firebase Admin | 13.6.0 | Server-side Firestore operations | Already in use, provides FieldValue.serverTimestamp() |
| Discord.js (via REST API) | - | Discord Bot integration | Already abstracted in src/lib/discord.ts |
| zod | 3.x | Form validation schemas | Already in use for GitHub URL validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | latest | Date formatting in UI | Already in use in admin dashboard |
| DaisyUI | latest | Tab components and modals | Already in use, CSS-only solution for tabs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API Routes | Server Actions | Server Actions cleaner syntax but poor for multi-service orchestration (Discord + Firestore), harder error handling, limited timeout control |
| Separate categories | Single "Projects" category | Monthly batching (like Mentorship) prevents hitting Discord's 50-channel category limit |
| Client-side forms | Server Components with forms | Client components needed for validation state, loading states, and immediate feedback |

**Installation:**
```bash
# No new dependencies required - all patterns use existing libraries
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── projects/
│   │       ├── route.ts              # POST: create, GET: list
│   │       └── [id]/
│   │           └── route.ts          # PUT: status updates
│   └── mentorship/
│       └── admin/
│           └── page.tsx              # Extended with Projects tab
├── lib/
│   ├── discord.ts                    # Extended with project channel functions
│   ├── permissions.ts                # Already has canCreateProject, canApproveProject
│   └── validation/
│       └── urls.ts                   # Already has validateGitHubUrl
└── types/
    └── mentorship.ts                 # Already has Project, ProjectStatus types
```

### Pattern 1: API Route for Project Creation
**What:** POST /api/projects endpoint that creates Firestore document with denormalized creator profile data
**When to use:** Project creation form submission (multi-step: validation → Firestore write → Discord channel)
**Example:**
```typescript
// Source: Next.js 16 API Routes documentation
// src/app/api/projects/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canCreateProject } from "@/lib/permissions";
import { validateGitHubUrl } from "@/lib/validation/urls";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, githubRepo, techStack, difficulty, maxTeamSize, creatorId } = body;

    // 1. Get creator profile for permission check and denormalization
    const creatorDoc = await db.collection("mentorship_profiles").doc(creatorId).get();
    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const creatorProfile = creatorDoc.data();

    // 2. Permission check using Phase 4 permissions system
    if (!canCreateProject({
      uid: creatorId,
      role: creatorProfile?.role,
      status: creatorProfile?.status
    })) {
      return NextResponse.json({ error: "Forbidden: Only accepted mentors can create projects" }, { status: 403 });
    }

    // 3. Validate GitHub URL using Phase 4 validation utilities
    const validatedGithubUrl = githubRepo ? validateGitHubUrl(githubRepo) : undefined;

    // 4. Create project document with denormalized creator data
    const projectData = {
      title,
      description,
      creatorId,
      creatorProfile: {
        displayName: creatorProfile.displayName,
        photoURL: creatorProfile.photoURL,
        username: creatorProfile.username,
      },
      status: "pending", // Requires admin approval
      githubRepo: validatedGithubUrl,
      techStack: techStack || [],
      difficulty,
      maxTeamSize,
      lastActivityAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("projects").add(projectData);

    return NextResponse.json({
      success: true,
      projectId: docRef.id,
      message: "Project submitted for approval"
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({
      error: "Failed to create project",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
```

### Pattern 2: Admin Approval with Discord Channel Creation
**What:** PUT /api/projects/[id] endpoint for status transitions (pending → approved → active) with Discord integration
**When to use:** Admin approves project, automatically creating Discord channel and updating status to active
**Example:**
```typescript
// Source: Existing mentorship match approval pattern from src/app/api/mentorship/match/route.ts
// src/app/api/projects/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { createProjectChannel } from "@/lib/discord";
import { canApproveProject } from "@/lib/permissions";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, adminId, declineReason } = body;

    const projectRef = db.collection("projects").doc(id);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Permission check for admin-only actions
    const adminDoc = await db.collection("mentorship_profiles").doc(adminId).get();
    const adminProfile = adminDoc.data();

    if (!canApproveProject({
      uid: adminId,
      role: adminProfile?.role,
      isAdmin: true // Would check against admin list or custom claims
    }, projectData as any)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (action === "approve") {
      // Update status to approved (Discord channel creation happens after approval)
      await projectRef.update({
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: adminId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Create Discord channel for the project (blocking to ensure completion)
      try {
        const channelResult = await createProjectChannel(
          projectData.title,
          projectData.creatorProfile.displayName,
          id,
          projectData.creatorProfile.discordUsername
        );

        if (channelResult) {
          // Update to active status with Discord channel info
          await projectRef.update({
            status: "active",
            discordChannelId: channelResult.channelId,
            discordChannelUrl: channelResult.channelUrl,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      } catch (discordError) {
        console.error("Discord channel creation failed:", discordError);
        // Project stays in approved status, admin can retry channel creation
      }

      return NextResponse.json({
        success: true,
        message: "Project approved and Discord channel created"
      }, { status: 200 });

    } else if (action === "decline") {
      await projectRef.update({
        status: "declined",
        declineReason,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Project declined"
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({
      error: "Failed to update project",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
```

### Pattern 3: Discord Project Channel Creation
**What:** Extend src/lib/discord.ts with project-specific channel creation in "Projects" category
**When to use:** When admin approves a project, create a Discord channel for team collaboration
**Example:**
```typescript
// Source: Existing createMentorshipChannel pattern from src/lib/discord.ts
// Addition to src/lib/discord.ts

/**
 * Get or create a "Projects" category for project channels
 * Similar to mentorship monthly categories but for projects
 * Creates "Projects", "Projects - Batch 2", etc. as needed
 */
async function getOrCreateProjectsCategory(): Promise<string | null> {
  const guildId = getGuildId();
  const baseName = "Projects";

  try {
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/guilds/${guildId}/channels`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      log.error(`Failed to fetch guild channels: ${response.status}`);
      return null;
    }

    const channels = await response.json();

    // Find all "Projects" categories (base or with batch suffix)
    const projectCategories = channels.filter(
      (ch: { type: number; name: string }) =>
        ch.type === 4 &&
        (ch.name.toLowerCase() === baseName.toLowerCase() ||
          ch.name.toLowerCase().startsWith(baseName.toLowerCase() + " - batch"))
    );

    // Sort by batch number
    projectCategories.sort((a: { name: string }, b: { name: string }) => {
      const getBatchNum = (name: string): number => {
        const match = name.match(/batch\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : 1;
      };
      return getBatchNum(a.name) - getBatchNum(b.name);
    });

    // Check latest category for space
    if (projectCategories.length > 0) {
      const latestCategory = projectCategories[projectCategories.length - 1];
      const channelsInCategory = channels.filter(
        (ch: { parent_id?: string }) => ch.parent_id === latestCategory.id
      ).length;

      if (channelsInCategory < MAX_CHANNELS_PER_CATEGORY) {
        return latestCategory.id;
      }

      // Need new batch
      const currentBatch = latestCategory.name.toLowerCase() === baseName.toLowerCase()
        ? 1
        : parseInt(latestCategory.name.match(/batch\s*(\d+)/i)?.[1] || "1", 10);
      const newBatchNum = currentBatch + 1;
      const newCategoryName = `${baseName} - Batch ${newBatchNum}`;

      return await createCategory(guildId, newCategoryName);
    }

    // Create first category
    return await createCategory(guildId, baseName);
  } catch (error) {
    log.error(`Error getting/creating projects category: ${error}`);
    return null;
  }
}

/**
 * Create a Discord channel for a project with pinned message
 */
export async function createProjectChannel(
  projectTitle: string,
  creatorName: string,
  projectId: string,
  creatorDiscordUsername?: string
): Promise<ChannelResult | null> {
  log.debug(`Creating project channel for: ${projectTitle}`);

  const guildId = getGuildId();
  const categoryId = await getOrCreateProjectsCategory();

  // Sanitize project title for channel name
  const sanitize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .slice(0, 50); // Discord channel name limit is 100, keep it reasonable

  const channelName = `proj-${sanitize(projectTitle)}`;

  // Permission overwrites: @everyone cannot view, creator has access
  const permissionOverwrites: Array<{
    id: string;
    type: number;
    allow: string;
    deny?: string;
  }> = [
    {
      id: guildId, // @everyone role
      type: 0,
      allow: "0",
      deny: "1024", // VIEW_CHANNEL denied
    },
  ];

  // Look up creator by username and add permissions
  let creatorMemberId: string | null = null;
  if (creatorDiscordUsername) {
    const creator = await lookupMemberByUsername(creatorDiscordUsername);
    if (creator) {
      creatorMemberId = creator.id;
      permissionOverwrites.push({
        id: creator.id,
        type: 1, // Member
        allow: "3072", // VIEW_CHANNEL + SEND_MESSAGES
      });
    }
  }

  try {
    const channelPayload: Record<string, unknown> = {
      name: channelName,
      type: 0, // GUILD_TEXT
      topic: `Project: ${projectTitle} | Creator: ${creatorName} | ID: ${projectId}`,
      permission_overwrites: permissionOverwrites,
    };

    if (categoryId) {
      channelPayload.parent_id = categoryId;
    }

    const response = await fetchWithRateLimit(
      `${DISCORD_API}/guilds/${guildId}/channels`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(channelPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`Channel creation failed: ${response.status} - ${errorText}`);
      return null;
    }

    const channel = await response.json();
    log.debug(`Project channel created: ${channel.name} (ID: ${channel.id})`);

    // Send welcome message
    const creatorMention = creatorMemberId
      ? `<@${creatorMemberId}>`
      : `**${creatorName}**`;

    await sendChannelMessage(
      channel.id,
      `🚀 **Project Channel Created!**\n\n` +
        `Welcome to the **${projectTitle}** project channel!\n\n` +
        `**Project Lead:** ${creatorMention}\n\n` +
        `This is your team's collaboration space. Use it to:\n` +
        `• Coordinate development tasks\n` +
        `• Share code snippets and resources\n` +
        `• Discuss architecture and implementation\n` +
        `• Plan milestones and demos\n\n` +
        `Happy building! 🎉`
    );

    const result: ChannelResult = {
      channelId: channel.id,
      channelUrl: `https://discord.com/channels/${guildId}/${channel.id}`,
    };

    return result;
  } catch (error) {
    log.error("Error creating project channel:", error);
    return null;
  }
}

/**
 * Archive a project channel (when project is completed)
 * Reuses existing archiveMentorshipChannel pattern
 */
export async function archiveProjectChannel(
  channelId: string,
  projectTitle: string
): Promise<boolean> {
  return archiveMentorshipChannel(
    channelId,
    `📦 **Project "${projectTitle}" has been completed!**\n\n` +
      `This channel is now archived. Great work team! 🎉`
  );
}
```

### Pattern 4: Admin Dashboard Extension with Projects Tab
**What:** Extend existing admin dashboard tabs to include "Projects" tab with pending/all projects views
**When to use:** Admin needs to review and approve pending project proposals
**Example:**
```typescript
// Source: Existing tab pattern from src/app/mentorship/admin/page.tsx
// Extension to src/app/mentorship/admin/page.tsx

type TabType = "overview" | "pending-mentors" | "all-mentors" | "all-mentees" | "projects";

// Add state for projects data
const [projects, setProjects] = useState<Project[]>([]);
const [loadingProjects, setLoadingProjects] = useState(false);

// Add useEffect to fetch projects when tab is active
useEffect(() => {
  const fetchProjects = async () => {
    if (activeTab !== "projects") return;

    setLoadingProjects(true);
    try {
      const response = await fetch("/api/projects?status=pending");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  fetchProjects();
}, [activeTab]);

// Add Projects tab button in tab list
<button
  onClick={() => setActiveTab("projects")}
  className={`tab ${activeTab === "projects" ? "tab-active" : ""}`}
>
  Projects
  {pendingProjectsCount > 0 && (
    <span className="badge badge-warning badge-sm ml-2">
      {pendingProjectsCount}
    </span>
  )}
</button>

// Add Projects tab content
{activeTab === "projects" && (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">Pending Project Proposals</h2>
    </div>

    {loadingProjects ? (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    ) : projects.length === 0 ? (
      <div className="text-center py-8 text-base-content/60">
        No pending project proposals
      </div>
    ) : (
      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="card bg-base-200 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="card-title">{project.title}</h3>
                  <p className="text-sm text-base-content/60 mt-2">
                    {project.description}
                  </p>

                  <div className="flex gap-4 mt-4 text-sm">
                    <div>
                      <span className="font-semibold">Creator:</span>{" "}
                      {project.creatorProfile?.displayName}
                    </div>
                    <div>
                      <span className="font-semibold">Tech Stack:</span>{" "}
                      {project.techStack.join(", ")}
                    </div>
                    <div>
                      <span className="font-semibold">Difficulty:</span>{" "}
                      <span className="badge badge-sm">
                        {project.difficulty}
                      </span>
                    </div>
                  </div>

                  {project.githubRepo && (
                    <div className="mt-2 text-sm">
                      <span className="font-semibold">GitHub:</span>{" "}
                      <a
                        href={project.githubRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary"
                      >
                        {project.githubRepo}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="card-actions justify-end mt-4">
                <button
                  onClick={() => handleApproveProject(project.id)}
                  disabled={actionLoading === project.id}
                  className="btn btn-success btn-sm"
                >
                  {actionLoading === project.id ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Approve"
                  )}
                </button>
                <button
                  onClick={() => handleDeclineProject(project.id)}
                  disabled={actionLoading === project.id}
                  className="btn btn-error btn-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

### Pattern 5: Activity Timestamp Tracking
**What:** Use `FieldValue.serverTimestamp()` to update `lastActivityAt` on every project interaction
**When to use:** Track project activity for stale content detection and sorting
**Example:**
```typescript
// Source: Firestore best practices - https://firebase.google.com/docs/firestore/best-practices
// Pattern for updating lastActivityAt on any project activity

// On project creation
await db.collection("projects").add({
  // ... other fields
  lastActivityAt: FieldValue.serverTimestamp(),
  createdAt: FieldValue.serverTimestamp(),
});

// On project updates (status change, member join, etc.)
await projectRef.update({
  // ... other fields
  lastActivityAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

// Query for stale projects (no activity in 30 days)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const staleProjects = await db
  .collection("projects")
  .where("status", "==", "active")
  .where("lastActivityAt", "<", thirtyDaysAgo)
  .get();
```

### Anti-Patterns to Avoid

**Don't use Server Actions for Discord integration:**
- Server Actions have implicit 60s timeout on Vercel
- Discord API can be slow with rate limiting
- Error handling is less flexible than API Routes
- Can't return proper HTTP status codes for debugging

**Don't store full profile objects in project documents:**
- Denormalize only displayName, photoURL, username (fields unlikely to change)
- Don't include email, role, expertise (can change, causes data inconsistency)
- Use firestore-admin batch writes if you need to update denormalized data

**Don't create project channels without category management:**
- Discord has 50-channel limit per category
- Implement batch strategy like mentorship channels to prevent hitting limits
- Monitor category size before creating new channels

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Discord channel name sanitization | Custom regex | Existing `sanitize` function from discord.ts | Handles special characters, length limits, Discord-specific rules |
| GitHub URL validation | String contains check | `validateGitHubUrl` from validation/urls.ts | Zod schema with proper regex, rejects non-HTTPS, validates format |
| Permission checks | Inline role checks | `canCreateProject`, `canApproveProject` from permissions.ts | Centralized, tested, handles edge cases |
| Server timestamps | `new Date()` or client time | `FieldValue.serverTimestamp()` | Prevents clock skew issues, consistent across timezones |
| Admin authentication | Session cookies | Existing admin token pattern | Already implemented in mentorship admin dashboard |
| Category overflow handling | Manual tracking | `getOrCreateMonthlyCategory` pattern | Proven solution handles Discord limits, automatic batching |

**Key insight:** The codebase already has proven patterns for all core operations (Discord integration, admin workflows, validation, permissions). Reuse these patterns rather than creating project-specific variations.

## Common Pitfalls

### Pitfall 1: Discord Channel Creation Timing
**What goes wrong:** Creating Discord channel before Firestore commit causes orphaned channels if Firestore write fails
**Why it happens:** Discord API succeeds but subsequent Firestore write throws error, leaving channel without database reference
**How to avoid:**
- Always create Firestore document first
- Create Discord channel second
- Update Firestore with channel info third
- Use try-catch to handle Discord failures gracefully
**Warning signs:** Channels appearing in Discord without corresponding projects in database

### Pitfall 2: Denormalized Data Staleness
**What goes wrong:** User changes display name, but project documents still show old name
**Why it happens:** Denormalized data is a snapshot at creation time, not a live reference
**How to avoid:**
- Only denormalize fields that rarely change (displayName, photoURL)
- Don't denormalize email, role, or status
- Document that denormalized data may be stale (it's a feature for read performance, not a bug)
- If needed, implement batch update function to refresh denormalized data (but rarely needed)
**Warning signs:** User reports seeing old names in project cards

### Pitfall 3: Server Action Timeout with Discord API
**What goes wrong:** Discord API takes 15-30s with rate limiting, Server Action times out after 60s, operation fails
**Why it happens:** Server Actions on Vercel have implicit timeout, Discord rate limiting can delay responses
**How to avoid:**
- Use API Routes (route.ts) instead of Server Actions for Discord operations
- API Routes have better timeout control and error handling
- Keep Server Actions for simple CRUD without external service calls
**Warning signs:** Intermittent timeout errors during project approval

### Pitfall 4: Missing Cache Revalidation After Mutations
**What goes wrong:** User creates/approves project but doesn't see it in list until manual refresh
**Why it happens:** Next.js 16 caches aggressively, mutations don't invalidate cached data automatically
**How to avoid:**
- Call `revalidatePath('/admin/projects')` after mutations
- Use `revalidateTag('projects')` if implementing tagged caching
- Return success status from API to trigger client-side refetch
**Warning signs:** Users reporting they don't see their changes until refresh

### Pitfall 5: Discord Permission Overwrites Without User Lookup
**What goes wrong:** Creating channel with Discord username but not validating user exists in server
**Why it happens:** Assuming Discord username is valid without calling lookupMemberByUsername
**How to avoid:**
- Always look up Discord members before creating channels
- Store Discord user ID (not just username) if possible
- Fail gracefully if user not found (create channel without mention)
- Log warnings for missing Discord users
**Warning signs:** Channels created but project creator can't access them

## Code Examples

Verified patterns from existing codebase:

### Project Creation Form with React 19 useActionState
```typescript
// Source: React 19 documentation - https://react.dev/blog/2024/12/05/react-19
// Client component for project creation form

"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

interface FormState {
  success?: boolean;
  error?: string;
  projectId?: string;
}

async function createProjectAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        githubRepo: formData.get("githubRepo"),
        techStack: formData.get("techStack")?.toString().split(",").map(s => s.trim()),
        difficulty: formData.get("difficulty"),
        maxTeamSize: parseInt(formData.get("maxTeamSize") as string),
        creatorId: formData.get("creatorId"),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Failed to create project" };
    }

    return { success: true, projectId: data.projectId };
  } catch (error) {
    return { error: "Network error occurred" };
  }
}

export function CreateProjectForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createProjectAction, {});

  // Redirect on success
  if (state.success) {
    router.push("/projects");
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="creatorId" value={userId} />

      <div className="form-control">
        <label className="label">
          <span className="label-text">Project Title *</span>
        </label>
        <input
          type="text"
          name="title"
          required
          disabled={isPending}
          className="input input-bordered"
          placeholder="My Awesome Project"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Description *</span>
        </label>
        <textarea
          name="description"
          required
          disabled={isPending}
          className="textarea textarea-bordered h-24"
          placeholder="What is your project about?"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">GitHub Repository URL</span>
        </label>
        <input
          type="url"
          name="githubRepo"
          disabled={isPending}
          className="input input-bordered"
          placeholder="https://github.com/username/repo"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Tech Stack (comma-separated)</span>
        </label>
        <input
          type="text"
          name="techStack"
          disabled={isPending}
          className="input input-bordered"
          placeholder="React, Node.js, PostgreSQL"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Difficulty</span>
          </label>
          <select name="difficulty" disabled={isPending} className="select select-bordered">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Max Team Size</span>
          </label>
          <input
            type="number"
            name="maxTeamSize"
            min="1"
            max="10"
            defaultValue="4"
            disabled={isPending}
            className="input input-bordered"
          />
        </div>
      </div>

      {state.error && (
        <div className="alert alert-error">
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary w-full"
      >
        {isPending ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Creating...
          </>
        ) : (
          "Create Project"
        )}
      </button>
    </form>
  );
}
```

### Discord Pinned Message with Project Details
```typescript
// Source: Discord API documentation - https://discord.com/developers/docs/resources/message
// Addition to src/lib/discord.ts

/**
 * Pin a message in a Discord channel
 * Used for pinning project details in project channels
 */
async function pinMessage(channelId: string, messageId: string): Promise<boolean> {
  log.debug(`Pinning message ${messageId} in channel ${channelId}`);

  try {
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/channels/${channelId}/pins/${messageId}`,
      {
        method: "PUT",
        headers: getHeaders(),
      }
    );

    if (response.status === 204) {
      log.debug(`Message pinned successfully`);
      return true;
    } else {
      const errorText = await response.text();
      log.error(`Failed to pin message: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    log.error("Error pinning message:", error);
    return false;
  }
}

/**
 * Send and pin project details message in channel
 */
export async function sendProjectDetailsMessage(
  channelId: string,
  project: {
    title: string;
    description: string;
    githubRepo?: string;
    techStack: string[];
    difficulty: string;
  }
): Promise<boolean> {
  const detailsMessage =
    `📋 **Project Details**\n\n` +
    `**Title:** ${project.title}\n` +
    `**Description:** ${project.description}\n\n` +
    `**Tech Stack:** ${project.techStack.join(", ")}\n` +
    `**Difficulty:** ${project.difficulty}\n\n` +
    (project.githubRepo ? `**GitHub:** ${project.githubRepo}\n\n` : "") +
    `---\n` +
    `*This message is pinned for quick reference.*`;

  try {
    // Send message
    const response = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content: detailsMessage }),
      }
    );

    if (!response.ok) {
      log.error(`Failed to send project details: ${response.status}`);
      return false;
    }

    const message = await response.json();

    // Pin the message
    await pinMessage(channelId, message.id);

    return true;
  } catch (error) {
    log.error("Error sending project details:", error);
    return false;
  }
}
```

### Firestore Query for Pending Projects
```typescript
// Source: Firebase Admin SDK documentation
// Example query for admin dashboard

async function getPendingProjects(): Promise<Project[]> {
  const snapshot = await db
    .collection("projects")
    .where("status", "==", "pending")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    lastActivityAt: doc.data().lastActivityAt?.toDate() || new Date(),
  })) as Project[];
}

async function getActiveProjectsByCreator(creatorId: string): Promise<Project[]> {
  const snapshot = await db
    .collection("projects")
    .where("creatorId", "==", creatorId)
    .where("status", "in", ["active", "approved"])
    .orderBy("lastActivityAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Project[];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server Actions for all mutations | API Routes for multi-service operations | Next.js 16 (2024) | Better error handling, timeout control, observability for complex workflows |
| useFormState | useActionState | React 19 (Dec 2024) | Renamed hook, same functionality for form pending/error states |
| revalidatePath only | revalidatePath + updateTag | Next.js 16 (2024) | updateTag provides immediate cache expiration for read-your-writes patterns |
| Single Discord category | Monthly batching categories | Custom pattern (2024) | Prevents hitting Discord's 50-channel limit, enables unlimited scaling |
| Client-side timestamps | FieldValue.serverTimestamp() | Always preferred | Prevents clock skew, ensures consistency across distributed clients |

**Deprecated/outdated:**
- useFormState: Renamed to useActionState in React 19, update imports
- revalidateTag without cacheLife: Now requires profile parameter in Next.js 16
- DISCORD_MENTORSHIP_CATEGORY_ID env var: Replaced by dynamic category creation logic

## Open Questions

Things that couldn't be fully resolved:

1. **Project Member Management**
   - What we know: Phase 5 creates projects, Phase 4 defines ProjectMember type
   - What's unclear: How/when team members join projects (auto-approval? creator approval? admin approval?)
   - Recommendation: Implement basic "Apply to Project" in Phase 5, defer approval workflow to later phase

2. **Discord Channel Access for Team Members**
   - What we know: Channel created with creator access, Discord supports adding members via permission overwrites
   - What's unclear: When to add team members to Discord (on application? on approval? on first activity?)
   - Recommendation: Start with creator-only access on creation, add members when they're approved to project (separate API call)

3. **Project Completion Requirements**
   - What we know: Status transitions to "completed", Discord channel archives
   - What's unclear: Should there be milestone/demo requirements before completion? Admin verification?
   - Recommendation: Implement simple creator-initiated completion for Phase 5, add verification in later phase

4. **Stale Project Detection Threshold**
   - What we know: lastActivityAt tracks activity, need to detect stale projects
   - What's unclear: What's the threshold? 30 days? 60 days? Different by difficulty?
   - Recommendation: Start with 30-day threshold for all projects, make configurable in later phase if needed

## Sources

### Primary (HIGH confidence)
- Next.js 16 API Routes documentation: https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- React 19 useActionState documentation: https://react.dev/blog/2024/12/05/react-19
- Firebase Firestore serverTimestamp: https://firebase.google.com/docs/firestore/best-practices
- Discord API Channel endpoints: https://discord.com/developers/docs/resources/channel
- Existing codebase patterns: src/lib/discord.ts, src/app/mentorship/admin/page.tsx, src/lib/permissions.ts

### Secondary (MEDIUM confidence)
- [Next.js Server Actions: Complete Guide with Examples for 2026](https://dev.to/marufrahmanlive/nextjs-server-actions-complete-guide-with-examples-for-2026-2do0)
- [Handling Form Validation Errors with useActionState](https://aurorascharff.no/posts/handling-form-validation-errors-and-resets-with-useactionstate/)
- [Firestore Query Best Practices for 2026](https://estuary.dev/blog/firestore-query-best-practices/)
- [Discord channel naming conventions discussion](https://github.com/discord/discord-api-docs/discussions/5338)
- [Tracking timestamps with Firestore](https://wneild.medium.com/tracking-document-timestamps-with-firestore-638a5522753c)

### Tertiary (LOW confidence)
- DaisyUI tabs component: https://daisyui.com/components/tab/ (confirmed existing usage in codebase)
- Discord pinned messages API: https://discord.com/developers/docs/resources/message (50 pin limit documented)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, verified in package.json and codebase
- Architecture: HIGH - Patterns verified in existing mentorship implementation (API routes, Discord integration, admin dashboard)
- Pitfalls: HIGH - Based on actual patterns and anti-patterns observed in mentorship code
- Discord integration: HIGH - Existing discord.ts provides proven patterns to extend
- Form handling: MEDIUM - React 19 useActionState is documented but not yet used in codebase

**Research date:** 2026-02-02
**Valid until:** 30 days (2026-03-04) - Stack is stable, patterns are proven, unlikely to change rapidly
