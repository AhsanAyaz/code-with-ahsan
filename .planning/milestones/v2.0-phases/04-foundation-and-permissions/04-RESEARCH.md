# Phase 4: Foundation & Permissions - Research

**Researched:** 2026-02-02
**Domain:** Firebase Firestore, TypeScript Type Systems, Permission Architecture
**Confidence:** HIGH

## Summary

This research investigates implementing a foundation layer with type definitions, Firestore collections, and a centralized permission system for a Next.js 16 + Firebase mentorship platform. The phase establishes infrastructure for project and roadmap management with role-based access control.

The standard approach combines:
- TypeScript module augmentation for extending existing types without breaking imports
- Firestore root collections with denormalized profile data for read optimization
- Hybrid RBAC permission system with both Firestore security rules and application-layer checks
- Data Access Layer (DAL) pattern for centralized permission validation
- Vitest for unit testing permission logic, @firebase/rules-unit-testing for security rule validation

Key finding: Next.js 16's shift from middleware.ts to proxy.ts emphasizes defense-in-depth - permission checks must happen at multiple layers (proxy, Server Components, Server Actions, and Data Access Layer), not just at the network boundary.

**Primary recommendation:** Implement a type-safe, action-based permission system at `src/lib/permissions.ts` that centralizes authorization logic and is consumed by both server-side code and Firestore security rules. Use custom claims for role checks in security rules, and implement comprehensive permission validation in a Data Access Layer.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase | 12.6.0 | Firestore client SDK | Already in use, provides typed Firestore access |
| firebase-admin | 13.6.0 | Server-side Firebase SDK | Already in use, required for custom claims and admin operations |
| @firebase/rules-unit-testing | latest (3.x) | Security rules testing | Official Firebase tool, only option for mocking auth in rules tests |
| vitest | latest (2.x) | Unit testing framework | 30-70% faster than Jest, native ESM/TypeScript support, recommended for Next.js 16 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rehype-sanitize | latest (6.x) | Markdown XSS prevention | Required for sanitizing roadmap Markdown content (PERM-05) |
| zod | latest (3.x) | Runtime validation | Input validation for GitHub URLs and user input (PERM-06) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest has larger ecosystem and is more mature, but Vitest is 30-70% faster and better suited for modern TypeScript/ESM projects |
| Custom claims | Firestore role documents | Role documents provide more flexibility but require database reads on every security rule evaluation; custom claims are included in auth token |
| Root collections | Subcollections | Subcollections would group related data but make cross-collection queries harder and increase security rule complexity |

**Installation:**
```bash
npm install @firebase/rules-unit-testing vitest @vitest/ui rehype-sanitize zod --save-dev
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── mentorship.ts        # Extended with Project, Roadmap types
├── lib/
│   ├── permissions.ts       # Centralized permission system (NEW)
│   ├── dal/                 # Data Access Layer (NEW)
│   │   ├── projects.ts
│   │   ├── roadmaps.ts
│   │   └── profiles.ts
│   └── validation/          # Input validation utilities (NEW)
│       ├── urls.ts
│       └── sanitize.ts
└── __tests__/               # Test files (NEW)
    ├── permissions.test.ts
    └── security-rules/
        └── firestore.test.ts

firestore.rules                # Security rules file (NEW)
vitest.config.ts              # Vitest configuration (NEW)
```

### Pattern 1: Type Extension with Module Augmentation
**What:** Extend existing types in `src/types/mentorship.ts` without breaking imports by adding new interfaces in the same file
**When to use:** Adding new domain types (Project, Roadmap) to an existing type module
**Example:**
```typescript
// Source: TypeScript Handbook - Declaration Merging
// src/types/mentorship.ts

// Existing types remain unchanged
export type MentorshipRole = "mentor" | "mentee" | null;
export interface MentorshipProfile { /* ... existing ... */ }

// Add new base types for v2.0 features
export type ProjectStatus = "pending" | "approved" | "active" | "completed" | "archived";
export type RoadmapStatus = "draft" | "pending" | "approved" | "active" | "archived";

export interface Project {
  id: string;
  title: string;
  description: string;
  creatorId: string;           // References MentorshipProfile.uid
  creatorProfile?: Partial<MentorshipProfile>; // Denormalized
  status: ProjectStatus;
  githubRepo?: string;
  techStack: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  maxTeamSize: number;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;         // Admin uid
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  userProfile?: Partial<MentorshipProfile>; // Denormalized
  role: "owner" | "member";
  joinedAt: Date;
}

export interface Roadmap {
  id: string;
  projectId: string;
  creatorId: string;
  title: string;
  content: string;             // Sanitized Markdown
  status: RoadmapStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface RoadmapVersion {
  id: string;
  roadmapId: string;
  version: number;
  content: string;
  createdBy: string;
  createdAt: Date;
  changeDescription?: string;
}
```

### Pattern 2: Firestore Collection Structure (Root + Denormalization)
**What:** Use root-level collections with denormalized profile data for read optimization
**When to use:** For main entities (projects, roadmaps) that need efficient querying and display
**Example:**
```typescript
// Source: Firebase Best Practices - Structure Data
// Collections structure:
// /projects/{projectId}
// /project_members/{memberId}  (composite key: projectId_userId)
// /roadmaps/{roadmapId}
// /roadmaps/{roadmapId}/versions/{versionId}  (subcollection for history)

// Denormalization strategy:
interface Project {
  // ... other fields ...
  creatorProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
  }; // Denormalized from MentorshipProfile
}

interface ProjectMember {
  // ... other fields ...
  userProfile?: {
    displayName: string;
    photoURL: string;
    username?: string;
  }; // Denormalized for efficient member list display
}

// Why: Reduces reads when displaying project lists or member lists
// Tradeoff: Profile updates must propagate to denormalized copies
```

### Pattern 3: Action-Based Permission System (Type-Safe)
**What:** Centralized permission functions with action-based naming and TypeScript type safety
**When to use:** All permission checks across the application
**Example:**
```typescript
// Source: RBAC TypeScript patterns from Multiple Sources
// src/lib/permissions.ts

import { MentorshipProfile, Project, Roadmap } from "@/types/mentorship";

// Permission action enums for type safety
export enum ProjectAction {
  CREATE = "project:create",
  EDIT = "project:edit",
  DELETE = "project:delete",
  APPROVE = "project:approve",
  MANAGE_MEMBERS = "project:manage_members",
  APPLY = "project:apply",
}

export enum RoadmapAction {
  CREATE = "roadmap:create",
  EDIT = "roadmap:edit",
  DELETE = "roadmap:delete",
  APPROVE = "roadmap:approve",
}

// Type-safe permission checker
interface PermissionContext {
  user: MentorshipProfile;
  resource?: Project | Roadmap;
  targetUserId?: string;
}

// Helper functions
function isAcceptedMentor(user: MentorshipProfile): boolean {
  return user.role === "mentor" && user.status === "accepted";
}

function isAdmin(user: MentorshipProfile): boolean {
  // Check custom claim via request.auth.token.admin on client
  // or via Firebase Admin SDK getUser() on server
  return user.status === "accepted"; // Placeholder - implement admin check
}

function isProjectOwner(userId: string, project: Project): boolean {
  return project.creatorId === userId;
}

// Permission check functions (action-based)
export async function canCreateProject(user: MentorshipProfile): Promise<boolean> {
  // PERM-01: Only accepted mentors can create projects
  return isAcceptedMentor(user);
}

export async function canEditProject(
  user: MentorshipProfile,
  project: Project
): Promise<boolean> {
  // Only project owner can edit
  return isProjectOwner(user.uid, project);
}

export async function canApproveProject(user: MentorshipProfile): Promise<boolean> {
  // PERM-03: Only admins can approve projects
  return isAdmin(user);
}

export async function canManageProjectMembers(
  user: MentorshipProfile,
  project: Project
): Promise<boolean> {
  // PERM-04: Only project creator and admins
  return isProjectOwner(user.uid, project) || isAdmin(user);
}

export async function canApplyToProject(
  user: MentorshipProfile,
  project: Project
): Promise<boolean> {
  // PERM-07: Only authenticated users
  if (!user) return false;

  // PERM-08: Project creator cannot apply to their own project
  if (user.uid === project.creatorId) return false;

  return true;
}

export async function canCreateRoadmap(
  user: MentorshipProfile,
  project: Project
): Promise<boolean> {
  // PERM-02: Only accepted mentors can create roadmaps
  // Additional check: Must be project owner or member
  return isAcceptedMentor(user) && isProjectOwner(user.uid, project);
}

export async function canApproveRoadmap(user: MentorshipProfile): Promise<boolean> {
  // PERM-03: Only admins can approve roadmaps
  return isAdmin(user);
}
```

### Pattern 4: Data Access Layer with Permission Validation
**What:** Centralize data access and embed permission checks before database operations
**When to use:** All server-side data access (Server Components, Server Actions, API routes)
**Example:**
```typescript
// Source: Next.js 16 Data Security Guide
// src/lib/dal/projects.ts

import { db } from "@/lib/firebaseAdmin";
import { Project } from "@/types/mentorship";
import { canCreateProject, canEditProject } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/dal/auth"; // Helper to get current user

export async function createProject(
  data: Omit<Project, "id" | "createdAt" | "updatedAt">
): Promise<Project> {
  // 1. Get current user
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Check permission
  if (!(await canCreateProject(user))) {
    throw new Error("Only accepted mentors can create projects");
  }

  // 3. Validate and sanitize input
  validateGitHubUrl(data.githubRepo); // PERM-06

  // 4. Perform database operation
  const projectRef = db.collection("projects").doc();
  const project: Project = {
    ...data,
    id: projectRef.id,
    creatorId: user.uid,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await projectRef.set(project);
  return project;
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch existing project
  const projectDoc = await db.collection("projects").doc(projectId).get();
  if (!projectDoc.exists) throw new Error("Project not found");

  const project = projectDoc.data() as Project;

  // Check permission
  if (!(await canEditProject(user, project))) {
    throw new Error("Only project owner can edit project");
  }

  // Validate input
  if (updates.githubRepo) {
    validateGitHubUrl(updates.githubRepo);
  }

  await projectDoc.ref.update({
    ...updates,
    updatedAt: new Date(),
  });
}
```

### Pattern 5: Firestore Security Rules with Custom Claims
**What:** Implement security rules that validate permissions using custom claims and document data
**When to use:** Defense-in-depth - security rules enforce permissions even if application code is bypassed
**Example:**
```javascript
// Source: Firebase RBAC with Custom Claims
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && request.auth.token.admin == true;
    }

    function isAcceptedMentor() {
      return isSignedIn() &&
             request.auth.token.role == "mentor" &&
             request.auth.token.status == "accepted";
    }

    function isProjectOwner(projectId) {
      return isSignedIn() &&
             get(/databases/$(database)/documents/projects/$(projectId)).data.creatorId == request.auth.uid;
    }

    // Projects collection
    match /projects/{projectId} {
      // Anyone can read approved/active projects
      allow read: if resource.data.status in ["approved", "active", "completed"];

      // Only accepted mentors can create projects (PERM-01)
      allow create: if isAcceptedMentor() &&
                       request.resource.data.creatorId == request.auth.uid &&
                       request.resource.data.status == "pending";

      // Only project owner can update (non-status fields)
      allow update: if isProjectOwner(projectId) &&
                       request.resource.data.status == resource.data.status;

      // Only admins can approve projects (PERM-03)
      allow update: if isAdmin() &&
                       request.resource.data.status != resource.data.status;

      // Only project owner or admin can delete
      allow delete: if isProjectOwner(projectId) || isAdmin();
    }

    // Project members collection
    match /project_members/{memberId} {
      allow read: if isSignedIn();

      // Only project owner or admin can manage members (PERM-04)
      allow create, update, delete: if isSignedIn() && (
        isProjectOwner(request.resource.data.projectId) || isAdmin()
      );
    }

    // Roadmaps collection
    match /roadmaps/{roadmapId} {
      allow read: if isSignedIn();

      // Only accepted mentors who own the project can create roadmaps (PERM-02)
      allow create: if isAcceptedMentor() &&
                       isProjectOwner(request.resource.data.projectId);

      // Only roadmap creator can update (non-status fields)
      allow update: if isSignedIn() &&
                       resource.data.creatorId == request.auth.uid &&
                       request.resource.data.status == resource.data.status;

      // Only admins can approve roadmaps (PERM-03)
      allow update: if isAdmin() &&
                       request.resource.data.status != resource.data.status;

      // Roadmap versions subcollection (audit trail)
      match /versions/{versionId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn() &&
                         request.resource.data.createdBy == request.auth.uid;
        allow update, delete: if false; // Versions are immutable
      }
    }
  }
}
```

### Pattern 6: Input Validation and Sanitization
**What:** Centralized validation utilities for GitHub URLs and Markdown sanitization
**When to use:** All user input processing before storage
**Example:**
```typescript
// Source: OWASP Validation Patterns + rehype-sanitize docs
// src/lib/validation/urls.ts

import { z } from "zod";

// GitHub repository URL pattern
const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;

export function validateGitHubUrl(url?: string): void {
  if (!url) return; // Optional field

  // Validate format
  if (!GITHUB_REPO_REGEX.test(url)) {
    throw new Error("Invalid GitHub repository URL format");
  }

  // Use Zod for additional validation
  const schema = z.string().url().startsWith("https://github.com/");
  schema.parse(url);
}

// src/lib/validation/sanitize.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

// Sanitize Markdown content to prevent XSS (PERM-05)
export async function sanitizeMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse) // Parse Markdown
    .use(remarkRehype, { allowDangerousHtml: true }) // Convert to HTML
    .use(rehypeSanitize, {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        // Block ALL event handlers
        "*": (defaultSchema.attributes?.["*"] || []).filter(
          (attr) => !attr.startsWith("on")
        ),
      },
      tagNames: [
        // Allow safe tags only
        ...(defaultSchema.tagNames || []),
      ].filter(
        (tag) =>
          ![
            "script",
            "object",
            "embed",
            "applet",
            "svg",
            "math",
            "style",
            "link",
            "meta",
            "base",
          ].includes(tag)
      ),
    })
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}
```

### Anti-Patterns to Avoid
- **Client-only permission checks:** Never rely solely on UI-level permission checks. Always validate on server-side (Server Actions, API routes, Data Access Layer)
- **Middleware-only authorization:** Next.js 16's proxy.ts is not sufficient for authorization. CVE-2025-29927 demonstrated that Server Actions can be invoked directly, bypassing middleware
- **Magic string roles:** Use TypeScript enums for role/status values to prevent typos and enable autocomplete
- **Overly nested subcollections:** Firestore recommends max 3-4 levels of nesting. Version history as subcollection under roadmaps is acceptable, but avoid deeper nesting
- **Custom claims for frequently changing data:** Custom claims require token refresh. Use for stable roles (admin, mentor), not for per-project permissions
- **Hand-rolling security rules duplication:** Keep permission logic DRY by using helper functions in both application code and security rules

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown XSS prevention | Custom HTML tag stripping | `rehype-sanitize` | Handles edge cases (event handlers, SVG scripts, data URIs), actively maintained, follows GitHub's sanitization model |
| URL validation | Simple regex or string matching | `zod` with `.url()` + custom refinement | Validates protocol, domain, path structure, and handles internationalized domains (IDN) correctly |
| Permission testing | Manual test cases with database setup | `@firebase/rules-unit-testing` | Official Firebase tool, mocks auth without real users, provides `assertSucceeds`/`assertFails` helpers, integrates with emulator |
| Role-based access logic | Scattered if-statements | Centralized permission functions with enums | Type safety, single source of truth, easier testing, clearer audit trail |
| Security rule duplication | Copy-paste permission logic | Helper functions in rules + shared TypeScript types | Firestore security rules support helper functions, reduces inconsistencies |
| Version history tracking | Manual previous version storage | Firestore subcollection with immutable documents | Automatic chronological ordering, efficient pagination, built-in timestamps |

**Key insight:** Firebase and TypeScript ecosystems have mature solutions for common security patterns. Custom implementations introduce bugs (XSS vulnerabilities, regex edge cases, auth bypass) and maintenance burden. Leverage battle-tested libraries and Firebase's built-in features.

## Common Pitfalls

### Pitfall 1: Assuming Middleware Provides Security
**What goes wrong:** Developers implement permission checks only in Next.js middleware/proxy.ts, assuming it protects all routes and Server Actions
**Why it happens:** Middleware runs on every request, creating false sense of security. CVE-2025-29927 revealed Server Actions can be invoked directly, bypassing middleware
**How to avoid:** Implement defense-in-depth:
1. Use proxy.ts for lightweight request filtering (geofencing, A/B routing)
2. Validate permissions in Server Actions themselves
3. Implement Data Access Layer with embedded permission checks
4. Enforce Firestore security rules as final defense
**Warning signs:**
- Permission logic only in proxy.ts
- Server Actions without permission checks
- Comments like "protected by middleware"

### Pitfall 2: Forgetting to Update Denormalized Data
**What goes wrong:** User updates their profile (name, photo) but denormalized copies in projects/members remain stale
**Why it happens:** Firestore doesn't support foreign keys or cascading updates. Denormalization requires manual propagation
**How to avoid:**
- Document which fields are denormalized and where
- Create update helper functions that propagate changes
- Use Cloud Functions (future) or batch writes to update all copies atomically
- Consider using `updateTag()` in Next.js 16 to invalidate cached data after profile updates
**Warning signs:**
- Profile updates don't trigger project/member updates
- Stale user photos/names in project lists
- No documentation of denormalization strategy

### Pitfall 3: Custom Claims Not Refreshing
**What goes wrong:** Admin grants user admin role via custom claims, but security rules still deny access
**Why it happens:** Custom claims are embedded in ID token. Token must be refreshed for claims to take effect
**How to avoid:**
- Call `await user.getIdToken(true)` on client to force token refresh after role changes
- Inform users they may need to refresh browser after role changes
- For critical role changes, consider sign-out/sign-in flow
- Use `request.auth.token` in security rules, not Firestore user documents
**Warning signs:**
- Role changes require page refresh or re-login
- Security rules work after delay (token expiry time)
- Mixing custom claims with Firestore role documents

### Pitfall 4: Security Rules Without Server-Side Validation
**What goes wrong:** Developers implement security rules but skip server-side validation, allowing malformed data
**Why it happens:** Security rules are seen as sufficient. However, rules are hard to test for data integrity (only access control)
**How to avoid:**
- Security rules prevent unauthorized access
- Server-side validation (Zod schemas) ensures data integrity
- Data Access Layer performs both: permission checks AND input validation
- Use Firestore security rules for access control, not business logic
**Warning signs:**
- No Zod schemas or input validation
- Security rules performing complex data validation
- Relying on client-side validation only

### Pitfall 5: Not Testing Security Rules
**What goes wrong:** Security rules appear to work manually, but have edge cases that allow unauthorized access
**Why it happens:** Manual testing only covers happy paths. Edge cases (unauthenticated users, wrong role, status changes) are missed
**How to avoid:**
- Write unit tests with `@firebase/rules-unit-testing`
- Test all combinations: authenticated/unauthenticated, each role, each status
- Test both `assertSucceeds` and `assertFails` cases
- Run tests in CI/CD before deploying rules
**Warning signs:**
- No `*.test.ts` files for security rules
- Manual testing only
- Security rules changed without tests

### Pitfall 6: Mixing Application Roles with IAM Roles
**What goes wrong:** Confusion between Firebase IAM roles (Owner, Editor, Viewer) and application roles (admin, mentor, mentee)
**Why it happens:** Both use similar terminology but serve different purposes
**How to avoid:**
- IAM roles control access to Firebase Console and Admin SDK
- Application roles control access to app features (managed via custom claims or Firestore)
- Don't use IAM roles for app-level authorization
- Document role hierarchy clearly
**Warning signs:**
- Trying to check IAM roles in security rules
- Granting IAM Editor role to app users
- Confusion between "admin" custom claim and IAM Owner role

## Code Examples

Verified patterns from official sources:

### Example 1: Vitest + @firebase/rules-unit-testing Setup
```typescript
// Source: Firebase Emulator Testing Documentation
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

// src/__tests__/setup.ts
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

export async function setupFirebaseTests() {
  const testEnv = await initializeTestEnvironment({
    projectId: "test-project-id",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "localhost",
      port: 8080,
    },
  });

  return testEnv;
}

// src/__tests__/security-rules/firestore.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { setupFirebaseTests } from "../setup";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await setupFirebaseTests();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Project Security Rules", () => {
  it("allows accepted mentor to create project", async () => {
    const alice = testEnv.authenticatedContext("alice", {
      role: "mentor",
      status: "accepted",
    });

    await assertSucceeds(
      alice.firestore().collection("projects").add({
        title: "Test Project",
        creatorId: "alice",
        status: "pending",
      })
    );
  });

  it("denies non-mentor to create project", async () => {
    const bob = testEnv.authenticatedContext("bob", {
      role: "mentee",
      status: "accepted",
    });

    await assertFails(
      bob.firestore().collection("projects").add({
        title: "Test Project",
        creatorId: "bob",
        status: "pending",
      })
    );
  });

  it("denies pending mentor to create project", async () => {
    const charlie = testEnv.authenticatedContext("charlie", {
      role: "mentor",
      status: "pending",
    });

    await assertFails(
      charlie.firestore().collection("projects").add({
        title: "Test Project",
        creatorId: "charlie",
        status: "pending",
      })
    );
  });

  it("allows admin to approve project", async () => {
    // Setup: Create project as mentor
    const mentor = testEnv.authenticatedContext("mentor", {
      role: "mentor",
      status: "accepted",
    });

    const projectRef = await mentor.firestore().collection("projects").add({
      title: "Test Project",
      creatorId: "mentor",
      status: "pending",
    });

    // Test: Admin approves
    const admin = testEnv.authenticatedContext("admin", {
      admin: true,
    });

    await assertSucceeds(
      admin.firestore().doc(projectRef.path).update({
        status: "approved",
        approvedBy: "admin",
        approvedAt: new Date(),
      })
    );
  });

  it("denies non-admin to approve project", async () => {
    const mentor = testEnv.authenticatedContext("mentor", {
      role: "mentor",
      status: "accepted",
    });

    const projectRef = await mentor.firestore().collection("projects").add({
      title: "Test Project",
      creatorId: "mentor",
      status: "pending",
    });

    // Try to approve as non-admin
    await assertFails(
      mentor.firestore().doc(projectRef.path).update({
        status: "approved",
      })
    );
  });
});
```

### Example 2: Permission Unit Tests
```typescript
// Source: TypeScript RBAC Testing Patterns
// src/__tests__/permissions.test.ts
import { describe, it, expect } from "vitest";
import {
  canCreateProject,
  canEditProject,
  canApproveProject,
  canApplyToProject,
} from "@/lib/permissions";
import { MentorshipProfile, Project } from "@/types/mentorship";

describe("Permission System", () => {
  const acceptedMentor: MentorshipProfile = {
    uid: "mentor1",
    role: "mentor",
    status: "accepted",
    displayName: "Alice Mentor",
    email: "alice@example.com",
    photoURL: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const pendingMentor: MentorshipProfile = {
    ...acceptedMentor,
    uid: "mentor2",
    status: "pending",
  };

  const mentee: MentorshipProfile = {
    ...acceptedMentor,
    uid: "mentee1",
    role: "mentee",
  };

  const admin: MentorshipProfile = {
    ...acceptedMentor,
    uid: "admin1",
    // In real implementation, check custom claim
    status: "accepted",
  };

  describe("canCreateProject", () => {
    it("allows accepted mentor to create project", async () => {
      expect(await canCreateProject(acceptedMentor)).toBe(true);
    });

    it("denies pending mentor to create project", async () => {
      expect(await canCreateProject(pendingMentor)).toBe(false);
    });

    it("denies mentee to create project", async () => {
      expect(await canCreateProject(mentee)).toBe(false);
    });
  });

  describe("canEditProject", () => {
    const project: Project = {
      id: "proj1",
      title: "Test Project",
      description: "Test",
      creatorId: "mentor1",
      status: "pending",
      techStack: ["TypeScript"],
      difficulty: "intermediate",
      maxTeamSize: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("allows project owner to edit project", async () => {
      expect(await canEditProject(acceptedMentor, project)).toBe(true);
    });

    it("denies non-owner to edit project", async () => {
      expect(await canEditProject(mentee, project)).toBe(false);
    });
  });

  describe("canApplyToProject", () => {
    const project: Project = {
      id: "proj1",
      title: "Test Project",
      description: "Test",
      creatorId: "mentor1",
      status: "approved",
      techStack: ["TypeScript"],
      difficulty: "intermediate",
      maxTeamSize: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("allows authenticated user to apply", async () => {
      expect(await canApplyToProject(mentee, project)).toBe(true);
    });

    it("denies project creator to apply to own project", async () => {
      expect(await canApplyToProject(acceptedMentor, project)).toBe(false);
    });
  });
});
```

### Example 3: Data Access Layer with Permission Checks
```typescript
// Source: Next.js 16 Data Security Documentation
// src/lib/dal/roadmaps.ts
import { db } from "@/lib/firebaseAdmin";
import { Roadmap, RoadmapVersion } from "@/types/mentorship";
import { canCreateRoadmap, canApproveRoadmap } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/dal/auth";
import { sanitizeMarkdown } from "@/lib/validation/sanitize";

export async function createRoadmap(
  projectId: string,
  data: { title: string; content: string }
): Promise<Roadmap> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch project to check permissions
  const projectDoc = await db.collection("projects").doc(projectId).get();
  if (!projectDoc.exists) throw new Error("Project not found");
  const project = projectDoc.data();

  // Check permission (PERM-02)
  if (!(await canCreateRoadmap(user, project))) {
    throw new Error("Only accepted mentors who own the project can create roadmaps");
  }

  // Sanitize Markdown content (PERM-05)
  const sanitizedContent = await sanitizeMarkdown(data.content);

  // Create roadmap
  const roadmapRef = db.collection("roadmaps").doc();
  const roadmap: Roadmap = {
    id: roadmapRef.id,
    projectId,
    creatorId: user.uid,
    title: data.title,
    content: sanitizedContent,
    status: "draft",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Create initial version in subcollection (audit trail)
  const versionRef = roadmapRef.collection("versions").doc();
  const version: RoadmapVersion = {
    id: versionRef.id,
    roadmapId: roadmap.id,
    version: 1,
    content: sanitizedContent,
    createdBy: user.uid,
    createdAt: new Date(),
    changeDescription: "Initial version",
  };

  // Atomic batch write
  const batch = db.batch();
  batch.set(roadmapRef, roadmap);
  batch.set(versionRef, version);
  await batch.commit();

  return roadmap;
}

export async function updateRoadmap(
  roadmapId: string,
  updates: { title?: string; content?: string; changeDescription?: string }
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const roadmapDoc = await db.collection("roadmaps").doc(roadmapId).get();
  if (!roadmapDoc.exists) throw new Error("Roadmap not found");

  const roadmap = roadmapDoc.data() as Roadmap;

  // Only creator can edit
  if (roadmap.creatorId !== user.uid) {
    throw new Error("Only roadmap creator can edit");
  }

  // Cannot edit approved roadmaps
  if (roadmap.status === "approved") {
    throw new Error("Cannot edit approved roadmap");
  }

  // Sanitize content if updated
  let sanitizedContent = roadmap.content;
  if (updates.content) {
    sanitizedContent = await sanitizeMarkdown(updates.content);
  }

  // Increment version
  const newVersion = roadmap.version + 1;

  // Create new version in subcollection
  const versionRef = roadmapDoc.ref.collection("versions").doc();
  const version: RoadmapVersion = {
    id: versionRef.id,
    roadmapId,
    version: newVersion,
    content: sanitizedContent,
    createdBy: user.uid,
    createdAt: new Date(),
    changeDescription: updates.changeDescription,
  };

  // Atomic update
  const batch = db.batch();
  batch.update(roadmapDoc.ref, {
    title: updates.title || roadmap.title,
    content: sanitizedContent,
    version: newVersion,
    updatedAt: new Date(),
  });
  batch.set(versionRef, version);
  await batch.commit();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts for all auth | proxy.ts + Data Access Layer | Next.js 16 (2024) | Middleware renamed to proxy.ts, emphasized as lightweight routing layer. Security must be defense-in-depth with Server Actions/DAL |
| Jest for testing | Vitest | 2023-2024 | 30-70% faster tests, native ESM/TypeScript support, better DX for modern projects |
| Custom claims only | Custom claims + Firestore rules helper functions | Ongoing best practice | Hybrid approach: custom claims for roles, helper functions in rules for complex checks |
| Subcollections for everything | Root collections + selective denormalization | Firestore evolution | Better query flexibility, reduced index complexity, faster reads at cost of write complexity |
| Security rules in Console | firestore.rules file + version control | Firebase tooling improvement | Rules versioned with code, tested in CI/CD, deployed via CLI |
| Manual markdown sanitization | rehype-sanitize | Unified ecosystem maturity (2021+) | Standardized, battle-tested XSS prevention following GitHub's model |

**Deprecated/outdated:**
- `@firebase/testing` (v8): Replaced by `@firebase/rules-unit-testing` (v9) in 2021. V9 has better emulator integration, doesn't touch production
- Namespace imports: `import * as firebase from 'firebase'` replaced by modular imports `import { getFirestore } from 'firebase/firestore'` for tree-shaking
- `middleware.ts`: Renamed to `proxy.ts` in Next.js 16. Old name still works but deprecated

## Open Questions

Things that couldn't be fully resolved:

1. **Admin role implementation strategy**
   - What we know: Custom claims are standard approach for admin role. Set via Firebase Admin SDK `setCustomUserClaims(uid, { admin: true })`
   - What's unclear: Where to implement admin grant UI? Should it be in-app or via separate admin tool? How to handle initial admin bootstrapping?
   - Recommendation: Start with Firebase Admin SDK script for bootstrapping first admin. Implement admin management UI in Phase 5 (Admin approval workflows). For Phase 4, focus on permission system assuming admins exist.

2. **Denormalization propagation mechanism**
   - What we know: Profile updates need to propagate to denormalized copies in projects/members
   - What's unclear: Best approach for this codebase - Cloud Functions (serverless) vs manual batch updates in application code?
   - Recommendation: For Phase 4, implement manual propagation in DAL (batch writes). Document clearly for future Cloud Functions migration. Add TODO comments for automation opportunity.

3. **Testing framework for integration tests**
   - What we know: Vitest recommended for unit tests, `@firebase/rules-unit-testing` for security rules
   - What's unclear: Integration test strategy for full Server Actions + Firestore flow? Playwright vs Vitest with emulator?
   - Recommendation: Phase 4 focuses on unit tests. Defer integration testing strategy to Phase 6 when workflows are more complex. Vitest + emulator sufficient for now.

4. **Version history storage efficiency**
   - What we know: Subcollection pattern (`roadmaps/{id}/versions/{versionId}`) is standard for audit trails
   - What's unclear: Storage cost implications for large Markdown content across many versions. Compression strategy?
   - Recommendation: Start with full content storage. Monitor Firestore storage costs. If needed, implement diff-based versioning in future (store only changes). Premature optimization risk high.

5. **Custom claims vs Firestore roles for project-level permissions**
   - What we know: Custom claims are for global roles (admin, mentor). Project-level roles (member, owner) should use Firestore
   - What's unclear: Should project membership be checked via custom claims array (e.g., `{ projects: ['proj1', 'proj2'] }`) or Firestore `project_members` collection?
   - Recommendation: Use Firestore `project_members` collection. Custom claims have 1000-byte limit and require token refresh. Project membership is dynamic and unbounded. Security rules can use `exists()` to check membership collection.

## Sources

### Primary (HIGH confidence)
- [Firebase Firestore Role-Based Access Control](https://firebase.google.com/docs/firestore/solutions/role-based-access) - Official Firebase documentation, last updated 2026-01-29 UTC
- [Firebase Security Rules Testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator) - Official Firebase documentation, last updated 2026-01-22 UTC
- [Next.js 16 Data Security Guide](https://nextjs.org/docs/app/guides/data-security) - Official Next.js documentation
- [Next.js 16 Authentication Guide](https://auth0.com/blog/whats-new-nextjs-16/) - Auth0 official blog, December 2025
- [TypeScript Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) - Official TypeScript handbook
- [rehype-sanitize GitHub](https://github.com/rehypejs/rehype-sanitize) - Official rehype plugin repository
- [@firebase/rules-unit-testing npm](https://www.npmjs.com/package/@firebase/rules-unit-testing) - Official Firebase testing package

### Secondary (MEDIUM confidence)
- [RBAC vs ABAC vs ReBAC in TypeScript](https://blog.webdevsimplified.com/2025-11/rbac-vs-abac-vs-rebac/) - Web Dev Simplified, November 2025
- [Building RBAC in Next.js](https://medium.com/@muhebollah.diu/building-a-scalable-role-based-access-control-rbac-system-in-next-js-b67b9ecfe5fa) - Medium article, verified patterns
- [Vitest vs Jest 2026](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb) - DEV Community, January 2026
- [Firebase RBAC with Custom Claims](https://www.freecodecamp.org/news/firebase-rbac-custom-claims-rules/) - freeCodeCamp, verified code examples
- [Firestore Version History Pattern](https://medium.com/google-cloud/building-a-time-machine-with-firestore-a-complete-guide-to-data-history-tracking-3bd1d506250c) - Google Cloud Community, February 2025
- [Firestore Query Best Practices 2026](https://estuary.dev/blog/firestore-query-best-practices/) - Estuary, verified denormalization guidance

### Tertiary (LOW confidence - flagged for validation)
- [CVE-2025-29927 Next.js Middleware Bypass](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) - Security vulnerability analysis, technical details accurate but requires official Next.js response verification
- [GitHub URL Validation Patterns](https://gist.github.com/dperini/729294) - Community gist, widely used but not official standard
- Various Medium articles on RBAC patterns - Useful patterns but require cross-verification with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries actively maintained, official Firebase/Next.js recommendations verified
- Architecture: HIGH - Patterns verified from multiple official sources (Firebase, Next.js, TypeScript docs)
- Pitfalls: MEDIUM - Based on CVE-2025-29927 analysis and community experiences, some extrapolation

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable ecosystem, Next.js 16 released October 2024, no major changes expected)

**Notes for planner:**
- No existing test framework in codebase - Vitest setup will be part of Phase 4 tasks
- Existing `firebaseAdmin.ts` pattern can be extended for Data Access Layer
- `src/types/mentorship.ts` already exists with proper structure - straightforward to extend
- No Firestore security rules file exists - will be created from scratch
- Existing codebase uses scattered permission checks (e.g., `role === "admin"`) - Phase 4 will centralize these patterns
