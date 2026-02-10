# Plan 03: Nav Link + Loading States + Remove Member Fix

---
wave: 2
depends_on: [01, 02]
files_modified:
  - src/data/headerNavLinks.js
  - src/app/projects/[id]/page.tsx
autonomous: true
---

## Goal

Three small polish fixes: add My Projects nav link, fix the handleRemoveMember missing body bug, and add loading states to prevent double-clicks on leave/remove actions.

## must_haves

- [ ] "My Projects" link accessible from site navigation (for authenticated users)
- [ ] `handleRemoveMember` sends `{ requestorId: user.uid }` with Content-Type header in DELETE body
- [ ] Leave and Remove buttons show loading spinner and are disabled during async operations
- [ ] No double-submit possible on any destructive action

## Tasks

<task id="1">
Add "My Projects" to `src/data/headerNavLinks.js`:

Add a new entry to `COMMUNITY_LINKS` array after the Projects entry:
```javascript
{ href: "/projects/my", title: "My Projects", icon: "projects" },
```

Result:
```javascript
export const COMMUNITY_LINKS = [
  { href: "/mentorship", title: "Mentorship", icon: "mentorship" },
  { href: "/projects/discover", title: "Projects", icon: "projects" },
  { href: "/projects/my", title: "My Projects", icon: "projects" },
  { href: LINKS.DISCORD, title: "Discord", icon: "discord", external: true },
  { href: "/logic-buddy", title: "Logic Buddy", icon: "brain" },
];
```
</task>

<task id="2">
Add loading states to `src/app/projects/[id]/page.tsx`:

1. Add state variables:
```typescript
const [leaveLoading, setLeaveLoading] = useState(false);
const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
```

2. Update `handleLeaveProject` — wrap the `onConfirm` callback:
```typescript
onConfirm: async () => {
  setLeaveLoading(true);
  try {
    // ... existing fetch logic ...
  } finally {
    setLeaveLoading(false);
  }
},
```

3. Update `handleRemoveMember` — wrap the `onConfirm` callback:
```typescript
onConfirm: async () => {
  setRemovingMemberId(memberId);
  try {
    // ... existing fetch logic ...
  } finally {
    setRemovingMemberId(null);
  }
},
```

4. Update the Leave button JSX:
```jsx
<button
  onClick={handleLeaveProject}
  className="btn btn-outline btn-error btn-sm"
  disabled={leaveLoading}
>
  {leaveLoading ? (
    <>
      <span className="loading loading-spinner loading-sm"></span>
      Leaving...
    </>
  ) : (
    "Leave Project"
  )}
</button>
```

5. The remove button is inside TeamRoster — pass loading state. If TeamRoster doesn't support it, the loading state on the confirm modal's confirm button is sufficient. At minimum, disable the confirm button in ConfirmModal during the async operation.

Alternative: Update `showConfirm` to accept an async `onConfirm` and auto-disable the button. But for simplicity, the loading state on the outer trigger button is enough.
</task>

<task id="3">
Fix `handleRemoveMember` missing requestorId (if not already fixed by Plan 02 task 2):

Ensure the DELETE fetch includes:
```typescript
const response = await authFetch(
  `/api/projects/${projectId}/members/${memberId}`,
  {
    method: "DELETE",
    body: JSON.stringify({ requestorId: user?.uid }),
  }
);
```

This was a pre-existing bug — the server expects `requestorId` for permission checking but the frontend sends an empty DELETE.
</task>

## Verification

- [ ] "My Projects" appears in community navigation dropdown
- [ ] Leave button shows spinner and is disabled during request
- [ ] Remove member sends requestorId in body
- [ ] Cannot double-click Leave or Remove to fire multiple requests
