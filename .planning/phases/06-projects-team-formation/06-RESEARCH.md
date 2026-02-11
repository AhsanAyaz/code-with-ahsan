# Phase 6: Projects - Team Formation - Research

**Researched:** 2026-02-02
**Domain:** Team Application/Invitation System, Project Discovery UI, Discord Team Management, Firestore Query Patterns
**Confidence:** HIGH

## Summary

This research investigates implementing a complete team formation system for collaborative projects in a mentorship platform. The phase enables developers to discover projects through a searchable/filterable public page, apply to join teams with application messages, and allows project creators to manage membership through approvals, declines with feedback, and direct invitations by Discord username or email. The system includes skill-level mismatch warnings, automatic Discord channel permissions, and real-time team roster displays.

The standard approach combines Next.js 16 API routes for application/invitation management, React 19 client components with debounced search for discovery UI, Firestore composite keys for application/invitation documents, Discord REST API for dynamic channel permission management, and denormalized team member data for efficient roster rendering. Building on Phase 5's project creation foundation, this phase extends the Discord integration, adds new Firestore collections (project_applications, project_invitations), and creates public-facing discovery pages with advanced filtering.

Key architectural decision: Use Firestore snapshot listeners for real-time application notifications rather than polling, composite document IDs ({projectId}_{userId}) to prevent duplicate applications, and Discord permission overwrites API to dynamically add/remove team members from project channels. The discovery page implements client-side search state with URL sync for shareable filtered views.

**Primary recommendation:** Implement project discovery as a public page at /projects with tech stack/skill level filters using URL search params, create separate collections for applications and invitations with composite keys, extend Discord lib with addMemberToChannel/removeMemberFromChannel functions using permission overwrites, add skill mismatch detection helper comparing user profile difficulty preference against project difficulty, and use React 19 useActionState for application/invitation form handling with optimistic UI updates.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.0.10 | App Router with API Routes and searchParams | Already in use, searchParams async in 16 for filtering |
| React | 19.2.1 | useActionState for forms, useState for search | Already in use, useActionState simplifies pending states |
| Firebase Admin | 13.6.0 | Firestore queries with composite indexes | Already in use, supports complex filtering queries |
| Discord REST API | v10 | Permission overwrites for channel members | Already abstracted in discord.ts, official bot API |
| Firestore Client SDK | latest | onSnapshot listeners for real-time notifications | Official Firebase SDK for real-time updates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | latest | Relative timestamps ("2 days ago") | Already in use for admin dashboard dates |
| lodash.debounce | 4.x | Search input debouncing | Standard for search optimization, prevents excessive queries |
| DaisyUI | latest | Badge components, cards, modals | Already in use, CSS-only solution for UI components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Composite document IDs | Separate counter + unique constraint | Composite IDs simpler, no race conditions, follows Phase 5 pattern |
| URL search params | Client-only state | URL params enable shareable links, browser back/forward navigation |
| Permission overwrites | Discord roles per project | Overwrites scale better (no 250 role limit), simpler cleanup |
| Real-time listeners | Polling with intervals | Listeners lower latency, fewer reads, automatic fan-out |

**Installation:**
```bash
npm install lodash.debounce
npm install --save-dev @types/lodash.debounce
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── projects/
│   │       ├── [id]/
│   │       │   ├── applications/
│   │       │   │   ├── route.ts           # POST: apply, GET: list applications
│   │       │   │   └── [userId]/
│   │       │   │       └── route.ts       # PUT: approve/decline application
│   │       │   ├── invitations/
│   │       │   │   ├── route.ts           # POST: invite, GET: list invitations
│   │       │   │   └── [userId]/
│   │       │   │       └── route.ts       # PUT: accept/decline invitation
│   │       │   └── members/
│   │       │       └── [memberId]/
│   │       │           └── route.ts       # DELETE: remove member
│   │       └── route.ts                   # Already exists (Phase 5)
│   ├── projects/
│   │   ├── page.tsx                       # Discovery page (public)
│   │   └── [id]/
│   │       └── page.tsx                   # Project detail page
│   └── mentorship/
│       └── dashboard/
│           └── page.tsx                   # Extended with My Applications section
├── lib/
│   ├── discord.ts                         # Extended with member management
│   ├── permissions.ts                     # Already has canApplyToProject
│   └── validation/
│       └── skillMatch.ts                  # NEW: Skill mismatch detection
├── types/
│   └── mentorship.ts                      # Extended with application/invitation types
└── components/
    └── projects/
        ├── ProjectCard.tsx                # For discovery grid
        ├── ProjectFilters.tsx             # Tech stack + difficulty filters
        ├── ApplicationForm.tsx            # Apply to project modal
        └── TeamRoster.tsx                 # Current team display
```

### Pattern 1: Project Discovery with Filters and Search
**What:** Public page listing all Active projects with client-side filtering by tech stack, difficulty, search term, synced to URL params
**When to use:** /projects discovery page for developers to find projects to join
**Example:**
```typescript
// Source: Next.js 16 searchParams documentation + debounce patterns
// src/app/projects/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import debounce from "lodash.debounce";
import type { Project } from "@/types/mentorship";

export default function ProjectsDiscoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [techFilter, setTechFilter] = useState<string[]>(
    searchParams.get("tech")?.split(",").filter(Boolean) || []
  );
  const [difficultyFilter, setDifficultyFilter] = useState<string>(
    searchParams.get("difficulty") || ""
  );

  // Debounced URL sync (500ms delay)
  const updateURL = useMemo(
    () =>
      debounce((search: string, tech: string[], difficulty: string) => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (tech.length > 0) params.set("tech", tech.join(","));
        if (difficulty) params.set("difficulty", difficulty);

        const queryString = params.toString();
        router.push(`/projects${queryString ? `?${queryString}` : ""}`);
      }, 500),
    [router]
  );

  // Fetch active projects (client-side filtering for simplicity)
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/projects?status=active");
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    updateURL(searchTerm, techFilter, difficultyFilter);
  }, [searchTerm, techFilter, difficultyFilter, updateURL]);

  // Client-side filtering
  const filteredProjects = projects.filter((project) => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesTitle = project.title.toLowerCase().includes(searchLower);
      const matchesDescription = project.description.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesDescription) return false;
    }

    // Tech stack filter
    if (techFilter.length > 0) {
      const hasMatchingTech = techFilter.some((tech) =>
        project.techStack.some((t) => t.toLowerCase() === tech.toLowerCase())
      );
      if (!hasMatchingTech) return false;
    }

    // Difficulty filter
    if (difficultyFilter && project.difficulty !== difficultyFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Discover Projects</h1>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search projects..."
          className="input input-bordered w-full"
        />

        <div className="flex gap-4">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="select select-bordered"
          >
            <option value="">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {/* Tech stack multi-select would go here */}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Pattern 2: Application Submission with Composite Keys
**What:** POST /api/projects/[id]/applications creates application document with composite ID {projectId}_{userId}
**When to use:** Developer applies to join a project, prevents duplicate applications
**Example:**
```typescript
// Source: Firestore composite key patterns + Phase 5 ProjectMember pattern
// src/app/api/projects/[id]/applications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { canApplyToProject } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { userId, message } = body;

    // Validate required fields
    if (!userId || !message) {
      return NextResponse.json(
        { error: "User ID and message are required" },
        { status: 400 }
      );
    }

    // Fetch project
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data();

    // Fetch user profile
    const userDoc = await db.collection("mentorship_profiles").doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // Permission check (authenticated, not owner)
    if (!canApplyToProject(
      { uid: userId, role: userData?.role, status: userData?.status },
      projectData as any
    )) {
      return NextResponse.json(
        { error: "Cannot apply to this project" },
        { status: 403 }
      );
    }

    // Composite key prevents duplicate applications
    const applicationId = `${projectId}_${userId}`;

    // Check if application already exists
    const existingApp = await db
      .collection("project_applications")
      .doc(applicationId)
      .get();

    if (existingApp.exists) {
      return NextResponse.json(
        { error: "You have already applied to this project" },
        { status: 409 }
      );
    }

    // Create application document
    await db
      .collection("project_applications")
      .doc(applicationId)
      .set({
        id: applicationId,
        projectId,
        userId,
        userProfile: {
          displayName: userData?.displayName || "",
          photoURL: userData?.photoURL || "",
          username: userData?.username,
        },
        message,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });

    // Update project lastActivityAt
    await db.collection("projects").doc(projectId).update({
      lastActivityAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, applicationId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Skill Mismatch Warning Helper
**What:** Function to detect if user's skill level mismatches project difficulty (e.g., beginner applying to advanced project)
**When to use:** Before showing application form, display warning if mismatch detected
**Example:**
```typescript
// Source: UX adaptive design patterns 2026
// src/lib/validation/skillMatch.ts

import type { ProjectDifficulty } from "@/types/mentorship";

export interface SkillMismatch {
  hasWarning: boolean;
  message?: string;
  severity: "info" | "warning" | "error";
}

/**
 * Detect skill level mismatch between user and project
 *
 * @param userSkillLevel - User's self-reported skill level from profile
 * @param projectDifficulty - Project's difficulty level
 * @returns Mismatch details with warning message if applicable
 */
export function detectSkillMismatch(
  userSkillLevel: ProjectDifficulty | undefined,
  projectDifficulty: ProjectDifficulty
): SkillMismatch {
  // No user skill level set - show info message
  if (!userSkillLevel) {
    return {
      hasWarning: true,
      message: "Consider updating your profile with your skill level for better project matches.",
      severity: "info",
    };
  }

  const levelMap: Record<ProjectDifficulty, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };

  const userLevel = levelMap[userSkillLevel];
  const projectLevel = levelMap[projectDifficulty];

  // Beginner applying to advanced project
  if (userLevel === 1 && projectLevel === 3) {
    return {
      hasWarning: true,
      message:
        "This project is marked as Advanced. As a beginner, you may find the complexity challenging. Consider intermediate projects first.",
      severity: "warning",
    };
  }

  // Significant mismatch (2+ levels difference)
  if (Math.abs(userLevel - projectLevel) >= 2) {
    return {
      hasWarning: true,
      message: `This project's difficulty (${projectDifficulty}) differs significantly from your skill level (${userSkillLevel}). You may face challenges.`,
      severity: "warning",
    };
  }

  // Advanced user applying to beginner project (info, not warning)
  if (userLevel === 3 && projectLevel === 1) {
    return {
      hasWarning: true,
      message:
        "This project is marked as Beginner. You may find it less challenging given your advanced skill level.",
      severity: "info",
    };
  }

  // Good match
  return {
    hasWarning: false,
    severity: "info",
  };
}
```

### Pattern 4: Discord Channel Member Management
**What:** Add/remove team members from project Discord channels using permission overwrites
**When to use:** When application is approved or member is removed from project
**Example:**
```typescript
// Source: Discord.js permission overwrites documentation
// Addition to src/lib/discord.ts

/**
 * Add a member to a project Discord channel
 * Grants VIEW_CHANNEL and SEND_MESSAGES permissions
 */
export async function addMemberToChannel(
  channelId: string,
  discordUsername: string
): Promise<boolean> {
  log.debug(`Adding ${discordUsername} to channel ${channelId}`);

  try {
    // Lookup Discord member by username
    const member = await lookupMemberByUsername(discordUsername);
    if (!member) {
      log.error(`Discord user ${discordUsername} not found in server`);
      return false;
    }

    // Add permission overwrite for this member
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/channels/${channelId}/permissions/${member.id}`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          type: 1, // Member type
          allow: "3072", // VIEW_CHANNEL (1024) + SEND_MESSAGES (2048)
        }),
      }
    );

    if (response.status === 204) {
      log.debug(`Member ${discordUsername} added to channel successfully`);
      return true;
    } else {
      const errorText = await response.text();
      log.error(`Failed to add member: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    log.error("Error adding member to channel:", error);
    return false;
  }
}

/**
 * Remove a member from a project Discord channel
 * Deletes their permission overwrite (reverts to category/server defaults)
 */
export async function removeMemberFromChannel(
  channelId: string,
  discordUsername: string
): Promise<boolean> {
  log.debug(`Removing ${discordUsername} from channel ${channelId}`);

  try {
    // Lookup Discord member by username
    const member = await lookupMemberByUsername(discordUsername);
    if (!member) {
      log.error(`Discord user ${discordUsername} not found in server`);
      return false;
    }

    // Delete permission overwrite for this member
    const response = await fetchWithRateLimit(
      `${DISCORD_API}/channels/${channelId}/permissions/${member.id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      }
    );

    if (response.status === 204) {
      log.debug(`Member ${discordUsername} removed from channel successfully`);
      return true;
    } else {
      const errorText = await response.text();
      log.error(`Failed to remove member: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    log.error("Error removing member from channel:", error);
    return false;
  }
}
```

### Pattern 5: Real-Time Application Notifications
**What:** Use Firestore onSnapshot listener for project creator to receive real-time notifications of new applications
**When to use:** Project detail page for creators to see pending applications without refresh
**Example:**
```typescript
// Source: Firestore real-time listeners documentation 2026
// Component snippet for project creator dashboard

"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Client-side Firebase

interface Application {
  id: string;
  userId: string;
  userProfile: {
    displayName: string;
    photoURL: string;
  };
  message: string;
  status: string;
  createdAt: Date;
}

export function PendingApplications({ projectId }: { projectId: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create query for pending applications
    const q = query(
      collection(db, "project_applications"),
      where("projectId", "==", projectId),
      where("status", "==", "pending")
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const apps = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Application[];

        setApplications(apps);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to applications:", error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [projectId]);

  if (loading) {
    return <div className="loading loading-spinner"></div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">
        Pending Applications ({applications.length})
      </h3>

      {applications.map((app) => (
        <div key={app.id} className="card bg-base-200 shadow-md">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <img
                src={app.userProfile.photoURL}
                alt={app.userProfile.displayName}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <p className="font-semibold">{app.userProfile.displayName}</p>
                <p className="text-sm text-base-content/60">
                  Applied {formatDistanceToNow(app.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>

            <p className="mt-3">{app.message}</p>

            <div className="card-actions justify-end mt-4">
              <button className="btn btn-success btn-sm">Approve</button>
              <button className="btn btn-error btn-sm">Decline</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Anti-Patterns to Avoid

**Don't query applications without composite indexes:**
- Applications filtered by projectId AND status require composite index
- Firestore will return error link to create missing index on first query
- Pre-create index in firestore.indexes.json during development

**Don't add Discord members without validating username exists:**
- Always call lookupMemberByUsername before adding permissions
- Handle case where Discord username in profile doesn't exist on server
- Fail gracefully with clear error message to user

**Don't allow duplicate applications:**
- Use composite document ID {projectId}_{userId} as primary key
- Check existence before creating new application document
- Return 409 Conflict status if duplicate detected

**Don't store application message in project document:**
- Keep applications in separate collection for scalability
- Project document only stores team member references (via project_members collection)
- Applications are temporary (archived after approval/decline)

**Don't implement real-time updates by polling:**
- Use Firestore onSnapshot listeners for application notifications
- Listeners are more efficient (fewer reads, automatic fan-out)
- Handle listener cleanup in useEffect return to prevent memory leaks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search input debouncing | Custom setTimeout/clearTimeout logic | lodash.debounce with useCallback | Handles edge cases (cleanup, trailing calls), battle-tested, 1-line integration |
| URL search param sync | Manual URLSearchParams manipulation | Next.js useSearchParams + useRouter | Handles encoding, browser history, server/client hydration edge cases |
| Duplicate application prevention | Client-side validation only | Firestore composite document IDs | Server-enforced uniqueness, atomic check-and-set, no race conditions |
| Discord permission bits | String constants | Discord.js PermissionFlagsBits enum | Type-safe, documentation-linked, prevents typos in permission values |
| Skill level comparison | String equality checks | Numeric level mapping with threshold logic | Handles multi-level mismatches, extensible for 5-level systems, clear severity tiers |
| Real-time notifications | setInterval polling | Firestore onSnapshot listeners | Lower latency, fewer reads, automatic reconnection, built-in error handling |

**Key insight:** Phase 5 established patterns for Firestore composite keys (ProjectMember), Discord channel management (rate limiting, lookup), and permission checks. Extend these patterns rather than creating new approaches for team formation.

## Common Pitfalls

### Pitfall 1: Missing Composite Index for Filtered Queries
**What goes wrong:** Query like `where("projectId", "==", id).where("status", "==", "pending")` fails with "index required" error
**Why it happens:** Firestore requires composite index for queries filtering on multiple fields (except array-contains-any)
**How to avoid:**
- Create firestore.indexes.json in project root with required indexes
- Deploy indexes with `firebase deploy --only firestore:indexes`
- Alternatively, follow error message link on first query to auto-create index in Firebase Console
- Document required indexes in Phase 6 research for planner to include in tasks
**Warning signs:** "The query requires an index" error on application listing endpoint

### Pitfall 2: Discord Username Not in Server
**What goes wrong:** User has Discord username in profile but isn't in the Discord server, permission overwrites fail silently
**Why it happens:** lookupMemberByUsername returns null for users not in server, but code doesn't handle null case
**How to avoid:**
- Always check lookupMemberByUsername result before using member.id
- Log warning when Discord user not found but continue without failing entire operation
- Display message to user: "Discord permissions will be added when you join the server"
- Consider webhook to auto-detect when user joins server and retroactively add permissions
**Warning signs:** Team members report they can't see project channel despite being approved

### Pitfall 3: Race Condition on Application Approval
**What goes wrong:** Two approvals happen simultaneously, both try to create ProjectMember document, one overwrites the other
**Why it happens:** No atomic check-and-set when approving application and creating member document
**How to avoid:**
- Use composite document ID for ProjectMember: `${projectId}_${userId}`
- Use Firestore transaction or batch write when approving (delete application + create member + add Discord permissions)
- Check if member already exists before creating (idempotent operation)
- Return 409 Conflict if member already exists
**Warning signs:** ProjectMember count doesn't match approved applications count

### Pitfall 4: Search State Lost on Tab Switch
**What goes wrong:** User filters projects, clicks project detail, goes back, filters are reset to defaults
**Why it happens:** Search state stored in component state without URL sync, lost on navigation
**How to avoid:**
- Initialize filter state from URL searchParams on mount
- Update URL params when filters change (debounced to prevent excessive history entries)
- Use router.push with query string rather than router.replace (preserves browser back button)
- Read searchParams again on component mount to restore filter state
**Warning signs:** User complaints about having to re-enter filters after viewing project details

### Pitfall 5: Skill Mismatch Warning Blocks Application
**What goes wrong:** Warning modal prevents user from applying even if they understand the risk
**Why it happens:** UX treats warning as blocking error rather than advisory information
**How to avoid:**
- Show warning as info banner above application form, not blocking modal
- Include "I understand" checkbox if warning is severe (beginner → advanced)
- Never prevent application submission based on skill mismatch (user knows their capabilities better than algorithm)
- Use adaptive UI: show warning but allow override with explicit acknowledgment
**Warning signs:** Low application rates for advanced projects, user feedback about being unable to apply

### Pitfall 6: Invitations Without Email Validation
**What goes wrong:** Project creator invites by email, but email doesn't exist in system or matches wrong user
**Why it happens:** No validation that email corresponds to registered user before creating invitation
**How to avoid:**
- Query mentorship_profiles by email before creating invitation
- Return clear error if email not found: "No user found with email X. They must create a profile first."
- For Discord username invites, validate with lookupMemberByUsername before creating invitation
- Store both userId and contact method (email/Discord) in invitation document for clarity
**Warning signs:** Invitations created but never accepted (user doesn't exist)

## Code Examples

Verified patterns from Phase 5 and official sources:

### Application Approval with Batch Operations
```typescript
// Source: Firestore batch write documentation
// src/app/api/projects/[id]/applications/[userId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { addMemberToChannel } from "@/lib/discord";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId } = await params;
    const body = await request.json();
    const { action, feedback } = body; // action: "approve" | "decline"

    const applicationId = `${projectId}_${userId}`;
    const memberDocId = `${projectId}_${userId}`; // Same composite key pattern

    // Fetch application
    const appDoc = await db
      .collection("project_applications")
      .doc(applicationId)
      .get();

    if (!appDoc.exists) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    const appData = appDoc.data();

    if (action === "approve") {
      // Use batch write for atomicity
      const batch = db.batch();

      // 1. Update application status
      batch.update(appDoc.ref, {
        status: "approved",
        approvedAt: FieldValue.serverTimestamp(),
      });

      // 2. Create project member document
      const memberRef = db.collection("project_members").doc(memberDocId);
      batch.set(memberRef, {
        id: memberDocId,
        projectId,
        userId,
        userProfile: appData?.userProfile,
        role: "member",
        joinedAt: FieldValue.serverTimestamp(),
      });

      // 3. Update project lastActivityAt
      const projectRef = db.collection("projects").doc(projectId);
      batch.update(projectRef, {
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      // Commit batch (atomic)
      await batch.commit();

      // 4. Add to Discord channel (non-blocking, after batch commit)
      const projectDoc = await projectRef.get();
      const projectData = projectDoc.data();

      if (projectData?.discordChannelId && appData?.userProfile?.username) {
        try {
          // Fetch full user profile for Discord username
          const userDoc = await db
            .collection("mentorship_profiles")
            .doc(userId)
            .get();
          const userData = userDoc.data();

          if (userData?.discordUsername) {
            await addMemberToChannel(
              projectData.discordChannelId,
              userData.discordUsername
            );
          }
        } catch (discordError) {
          console.error("Discord permission add failed:", discordError);
          // Non-blocking - member is already approved in database
        }
      }

      return NextResponse.json(
        { success: true, message: "Application approved" },
        { status: 200 }
      );
    } else if (action === "decline") {
      // Update application status to declined
      await appDoc.ref.update({
        status: "declined",
        declinedAt: FieldValue.serverTimestamp(),
        feedback: feedback || null,
      });

      return NextResponse.json(
        { success: true, message: "Application declined" },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing application:", error);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
```

### Project Invitation by Email or Discord Username
```typescript
// Source: Phase 5 denormalized profile pattern
// src/app/api/projects/[id]/invitations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { lookupMemberByUsername } from "@/lib/discord";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { invitedBy, email, discordUsername } = body;

    // Must provide either email or Discord username
    if (!email && !discordUsername) {
      return NextResponse.json(
        { error: "Either email or Discord username is required" },
        { status: 400 }
      );
    }

    // Fetch project to verify creator permissions (done in frontend)
    const projectDoc = await db.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Find user by email or Discord username
    let userId: string | null = null;
    let userProfile: any = null;

    if (email) {
      const userQuery = await db
        .collection("mentorship_profiles")
        .where("email", "==", email)
        .limit(1)
        .get();

      if (userQuery.empty) {
        return NextResponse.json(
          {
            error: "User not found",
            message:
              "No user found with that email. They must create a profile first.",
          },
          { status: 404 }
        );
      }

      const userDoc = userQuery.docs[0];
      userId = userDoc.id;
      userProfile = userDoc.data();
    } else if (discordUsername) {
      // Validate Discord username exists on server
      const discordMember = await lookupMemberByUsername(discordUsername);
      if (!discordMember) {
        return NextResponse.json(
          {
            error: "Discord user not found",
            message: "User with that Discord username is not in the server.",
          },
          { status: 404 }
        );
      }

      // Find user profile by Discord username
      const userQuery = await db
        .collection("mentorship_profiles")
        .where("discordUsername", "==", discordUsername)
        .limit(1)
        .get();

      if (userQuery.empty) {
        return NextResponse.json(
          {
            error: "User not found",
            message:
              "No user profile linked to that Discord username. They must link their profile.",
          },
          { status: 404 }
        );
      }

      const userDoc = userQuery.docs[0];
      userId = userDoc.id;
      userProfile = userDoc.data();
    }

    // Check if already a team member
    const memberDocId = `${projectId}_${userId}`;
    const existingMember = await db
      .collection("project_members")
      .doc(memberDocId)
      .get();

    if (existingMember.exists) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 409 }
      );
    }

    // Check if invitation already exists
    const invitationId = `${projectId}_${userId}`;
    const existingInvitation = await db
      .collection("project_invitations")
      .doc(invitationId)
      .get();

    if (existingInvitation.exists) {
      return NextResponse.json(
        { error: "Invitation already sent to this user" },
        { status: 409 }
      );
    }

    // Create invitation document
    await db
      .collection("project_invitations")
      .doc(invitationId)
      .set({
        id: invitationId,
        projectId,
        userId,
        userProfile: {
          displayName: userProfile?.displayName || "",
          photoURL: userProfile?.photoURL || "",
          username: userProfile?.username,
        },
        invitedBy,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
      });

    // Update project lastActivityAt
    await db.collection("projects").doc(projectId).update({
      lastActivityAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, invitationId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}
```

### Team Roster with Role Badges
```typescript
// Source: DaisyUI badge components + Phase 5 denormalized pattern
// src/components/projects/TeamRoster.tsx

"use client";

import { useEffect, useState } from "react";
import type { ProjectMember, Project } from "@/types/mentorship";

interface TeamRosterProps {
  project: Project;
}

export function TeamRoster({ project }: TeamRosterProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(
          `/api/projects/${project.id}/members`
        );
        if (response.ok) {
          const data = await response.json();
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [project.id]);

  if (loading) {
    return <div className="loading loading-spinner"></div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Team Roster ({members.length + 1})</h3>

      <div className="space-y-3">
        {/* Project Creator (always first) */}
        <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
          <img
            src={project.creatorProfile?.photoURL}
            alt={project.creatorProfile?.displayName}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <p className="font-semibold">
              {project.creatorProfile?.displayName}
            </p>
            {project.creatorProfile?.username && (
              <p className="text-sm text-base-content/60">
                @{project.creatorProfile.username}
              </p>
            )}
          </div>
          <span className="badge badge-primary">Creator</span>
        </div>

        {/* Team Members */}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
          >
            <img
              src={member.userProfile?.photoURL}
              alt={member.userProfile?.displayName}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <p className="font-semibold">
                {member.userProfile?.displayName}
              </p>
              {member.userProfile?.username && (
                <p className="text-sm text-base-content/60">
                  @{member.userProfile.username}
                </p>
              )}
            </div>
            <span className="badge">Member</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side filtering | Client-side filtering with server-fetched data | Next.js 13+ (2023) | Better UX (instant filters), simpler backend, trade-off: loads all data upfront |
| Polling for notifications | Firestore snapshot listeners | Firebase SDK v9+ (2021) | Real-time updates, fewer reads, lower latency, automatic reconnection |
| String permission values | Numeric bitfield permissions | Discord API v10 (2022) | Consistent with Discord.js, type-safe, bitwise operations for complex checks |
| Separate roles per project | Permission overwrites per user | Discord best practice (2020+) | Scales past 250-role limit, easier cleanup, more granular control |
| URL state management | useSearchParams hook | Next.js 13 App Router (2023) | Type-safe, server/client compatible, handles encoding edge cases |

**Deprecated/outdated:**
- Discord.js v13 permission constants: Use numeric strings in REST API calls directly (no library dependency)
- Firestore .where().where() without indexes: Auto-index creation added to Firebase CLI (still requires explicit index creation for production)
- useFormStatus hook: Replaced by useActionState in React 19 (useFormStatus still works but useActionState is more comprehensive)

## Open Questions

Things that couldn't be fully resolved:

1. **Application Notification Delivery**
   - What we know: Firestore listeners provide real-time updates in-app, Discord DMs possible for out-of-app notifications
   - What's unclear: Should we notify applicants via Discord DM when approved/declined? Email? Both?
   - Recommendation: Start with in-app notifications only (Firestore listeners), add Discord DM in later phase if users request it. Email notifications require email service setup (SendGrid/Postman).

2. **Maximum Team Size Enforcement**
   - What we know: Project.maxTeamSize field exists, current members can be counted via project_members collection
   - What's unclear: Should applications be automatically rejected when team is full? Should creator still see applications?
   - Recommendation: Prevent new applications when team is full (check count before allowing application submission), display "Team Full" badge on project cards. Creator can still remove members to make space.

3. **Application Expiration/Auto-Decline**
   - What we know: Applications stay in "pending" status indefinitely if not acted upon
   - What's unclear: Should old applications auto-expire after X days? Should creator be reminded of pending applications?
   - Recommendation: Start without expiration for MVP. Consider adding "Applied X days ago" badge in UI to prompt creator action. Auto-expiration can be added later with scheduled function if needed.

4. **Skill Level Storage for Developers**
   - What we know: MentorshipProfile has fields for mentees/mentors, no explicit skill level field for general developers
   - What's unclear: Should we add skillLevel field to MentorshipProfile for all users? Or infer from other fields (education, experience)?
   - Recommendation: Add optional skillLevel field ("beginner" | "intermediate" | "advanced") to MentorshipProfile during Phase 6. Use in skill mismatch detection. Default to null (treated as "not set" in warnings).

5. **Discord Channel Visibility for Applicants**
   - What we know: Channel is private (only creator has access initially), members added after approval
   - What's unclear: Should applicants see read-only view of channel before joining to assess project activity?
   - Recommendation: Keep channel fully private until approval for MVP. Public activity feed could be added later if users request it for transparency.

## Sources

### Primary (HIGH confidence)
- Next.js 16 searchParams: https://nextjs.org/docs/app/api-reference/file-conventions/page
- React 19 useActionState: https://react.dev/blog/2024/12/05/react-19
- Firestore composite indexes: https://firebase.google.com/docs/firestore/query-data/index-overview
- Firestore real-time listeners: https://firebase.google.com/docs/firestore/query-data/listen (updated Jan 2026)
- Discord permission overwrites: https://discord.com/developers/docs/resources/channel#edit-channel-permissions
- Existing codebase patterns: src/lib/discord.ts, src/lib/permissions.ts, src/types/mentorship.ts, firestore.rules

### Secondary (MEDIUM confidence)
- [Epic Next.js 15 Tutorial Part 8: Search and Pagination](https://dev.to/strapi/epic-next-js-15-tutorial-part-8-search-and-pagination-in-nextjs-5449)
- [Firestore Query Best Practices for 2026](https://estuary.dev/blog/firestore-query-best-practices/)
- [UX Workflow: A Guide to Streamlining User Experiences](https://www.door3.com/blog/ux-workflow)
- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [Debounce React Search Optimization](https://medium.com/nerd-for-tech/debounce-your-search-react-input-optimization-fd270a8042b)
- [Discord.js Permissions Guide](https://discordjs.guide/popular-topics/permissions.html)

### Tertiary (LOW confidence)
- [17 Best Onboarding Flow Examples for New Users (2026)](https://whatfix.com/blog/user-onboarding-examples/) - Airtable team formation example
- [Enterprise UX Design in 2026: Challenges and Best Practices](https://www.wearetenet.com/blog/enterprise-ux-design) - Adaptive UI patterns
- [State of UX in 2026](https://www.nngroup.com/articles/state-of-ux-2026/) - Skill-based interface adaptation trends

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All core libraries already in use (Next.js 16, React 19, Firebase), only lodash.debounce is new
- Architecture: HIGH - Extends Phase 5 patterns (composite keys, Discord management, permissions), verified in codebase
- Pitfalls: HIGH - Based on observed patterns in Phase 5 implementation and Firestore documentation warnings
- Discord member management: HIGH - Official Discord API v10 documentation for permission overwrites
- Search/filter patterns: MEDIUM - Standard React patterns but debounce implementation has variations in community
- Skill mismatch warnings: MEDIUM - UX pattern research from 2026 articles but no industry standard API

**Research date:** 2026-02-02
**Valid until:** 30 days (2026-03-04) - Stable APIs, patterns proven in Phase 5, Next.js 16/React 19 unlikely to change rapidly
