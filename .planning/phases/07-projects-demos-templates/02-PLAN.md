# Plan 02: Frontend Auth Header Integration

---
wave: 1
depends_on: []
files_modified:
  - src/contexts/MentorshipContext.tsx
  - src/lib/apiClient.ts (NEW)
  - src/app/projects/[id]/page.tsx
  - src/app/projects/new/page.tsx
autonomous: true
---

## Goal

Update the frontend to send Firebase ID tokens in the Authorization header for all mutating API calls. Create a thin fetch wrapper so every call site doesn't need to manually get the token.

## must_haves

- [ ] `src/lib/apiClient.ts` provides `authFetch()` that auto-attaches Bearer token
- [ ] All `fetch()` calls in project pages that do POST/PUT/DELETE use `authFetch()`
- [ ] GET requests can continue using plain `fetch()` (no auth required for public data)
- [ ] Token is obtained from `currentUser.getIdToken()` (Firebase client SDK)
- [ ] Graceful fallback if user is not logged in (don't crash, let the 401 propagate)

## Tasks

<task id="1">
Create `src/lib/apiClient.ts`:

```typescript
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";

/**
 * Authenticated fetch wrapper. Automatically attaches Firebase ID token
 * as Bearer token in Authorization header for mutating requests.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = getAuth(getApp());
  const user = auth.currentUser;

  const headers = new Headers(options.headers);

  if (user) {
    const token = await user.getIdToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}
```
</task>

<task id="2">
Update `src/app/projects/[id]/page.tsx`:

1. Import: `import { authFetch } from "@/lib/apiClient";`
2. Replace every mutating `fetch()` call with `authFetch()`:
   - `handleApproveApplication` — PUT
   - `handleDeclineApplication` — PUT
   - `handleInvite` — POST
   - `handleAcceptInvitation` — PUT
   - `handleDeclineInvitation` — PUT
   - `handleLeaveProject` — POST
   - `handleRemoveMember` — DELETE

3. For `handleRemoveMember`, also add `requestorId` to the DELETE body:
   ```typescript
   body: JSON.stringify({ requestorId: user?.uid }),
   ```
   And add `headers: { "Content-Type": "application/json" }` to the request.

**Keep** read-only `fetch()` calls as-is (fetchProjectData's GET calls).
</task>

<task id="3">
Update `src/app/projects/new/page.tsx` (if it has a form submission):

Read the file. If it calls POST `/api/projects`, replace that `fetch()` with `authFetch()`. The `creatorId` in the body can remain (for backwards compat during migration) but the server will use the token uid.
</task>

## Verification

- [ ] All POST/PUT/DELETE calls in project pages use `authFetch()`
- [ ] GET calls remain plain `fetch()`
- [ ] `handleRemoveMember` sends `requestorId` in body + Content-Type header
- [ ] `authFetch` doesn't crash when user is null (just sends without token)
