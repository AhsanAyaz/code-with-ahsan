# Plan 01: Auth Middleware + Token Verification

---
wave: 1
depends_on: []
files_modified:
  - src/lib/auth.ts (NEW)
  - src/lib/firebaseAdmin.ts
  - src/app/api/projects/route.ts
  - src/app/api/projects/[id]/route.ts
  - src/app/api/projects/[id]/leave/route.ts
  - src/app/api/projects/[id]/applications/route.ts
  - src/app/api/projects/[id]/applications/[userId]/route.ts
  - src/app/api/projects/[id]/invitations/route.ts
  - src/app/api/projects/[id]/invitations/[userId]/route.ts
  - src/app/api/projects/[id]/members/route.ts
  - src/app/api/projects/[id]/members/[memberId]/route.ts
autonomous: true
---

## Goal

Add server-side Firebase ID token verification to all project API routes. Currently every endpoint trusts userId/creatorId/requestorId from the request body — anyone who knows a user ID can impersonate them.

## must_haves

- [ ] All mutating project endpoints (POST, PUT, DELETE) verify `Authorization: Bearer <token>` header
- [ ] Verified `uid` from token is used instead of trusting body-supplied userId
- [ ] GET endpoints that are public (project list, project detail, members list) remain unauthenticated
- [ ] GET endpoints with user-specific data (applications with userId filter) verify token
- [ ] Reusable `verifyAuth(request)` helper in `src/lib/auth.ts`
- [ ] Frontend sends Firebase ID token in Authorization header for all mutating requests

## Tasks

<task id="1">
Create `src/lib/auth.ts` — a reusable auth verification helper:

```typescript
import * as admin from "firebase-admin";

export interface AuthResult {
  uid: string;
  email?: string;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Returns the decoded token's uid, or null if invalid/missing.
 */
export async function verifyAuth(request: Request): Promise<AuthResult | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
```
</task>

<task id="2">
Export `auth` from `src/lib/firebaseAdmin.ts`:

Add after existing exports:
```typescript
export const auth = admin.auth();
```

This ensures the admin auth instance is initialized alongside `db` and `storage`.
</task>

<task id="3">
Update all **mutating** project API routes to verify auth. For each route:

1. Import: `import { verifyAuth } from "@/lib/auth";`
2. At the top of POST/PUT/DELETE handlers, add:
   ```typescript
   const authResult = await verifyAuth(request);
   if (!authResult) {
     return NextResponse.json({ error: "Authentication required" }, { status: 401 });
   }
   ```
3. Replace body-supplied userId with `authResult.uid`:
   - `src/app/api/projects/route.ts` POST: Use `authResult.uid` instead of `body.creatorId`
   - `src/app/api/projects/[id]/route.ts` PUT: Use `authResult.uid` for adminId/creatorId verification
   - `src/app/api/projects/[id]/leave/route.ts` POST: Use `authResult.uid` instead of `body.userId`
   - `src/app/api/projects/[id]/applications/route.ts` POST: Use `authResult.uid` instead of body userId
   - `src/app/api/projects/[id]/applications/[userId]/route.ts` PUT: Use `authResult.uid` for permission check
   - `src/app/api/projects/[id]/invitations/route.ts` POST: Use `authResult.uid` for invitedBy
   - `src/app/api/projects/[id]/invitations/[userId]/route.ts` PUT: Use `authResult.uid` for accept/decline
   - `src/app/api/projects/[id]/members/[memberId]/route.ts` DELETE: Use `authResult.uid` instead of `body.requestorId`

**Important:** Keep body fields like `action`, `feedback`, `message`, `techStack`, etc. — only replace identity fields.

**GET routes that stay public (no auth required):**
- `GET /api/projects` (list/discover)
- `GET /api/projects/[id]` (detail)
- `GET /api/projects/[id]/members` (member list)
- `GET /api/projects/[id]/applications` (but filter by userId should verify)
- `GET /api/projects/[id]/invitations` (list)
</task>

## Verification

- [ ] Requests without Authorization header to POST/PUT/DELETE → 401
- [ ] Requests with invalid token → 401
- [ ] Requests with valid token → proceed, using verified uid
- [ ] GET /api/projects and GET /api/projects/[id] work without auth header
- [ ] Body-supplied userId/creatorId/requestorId fields are ignored in favor of token uid
