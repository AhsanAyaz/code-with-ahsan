---
phase: quick-12
plan: 01
subsystem: navigation-ui
tags: [ux, profile-menu, navigation, dropdown, styling]
dependency-graph:
  requires: []
  provides: ["Polished ProfileMenu with My Projects link"]
  affects: ["src/components/ProfileMenu.tsx", "src/data/headerNavLinks.js", "src/components/LayoutWrapper.tsx"]
tech-stack:
  added: []
  patterns: ["Click-outside-to-close dropdown", "Custom click-toggle UI pattern"]
key-files:
  created: []
  modified:
    - src/components/ProfileMenu.tsx
    - src/data/headerNavLinks.js
    - src/components/LayoutWrapper.tsx
decisions:
  - Move My Projects from Community to Profile dropdown (user-specific feature belongs in profile)
  - Add chevron to avatar button for visual affordance
  - Match Community dropdown styling patterns (shadow-lg, z-[100], click-outside-to-close)
metrics:
  duration: 2 minutes
  tasks: 2
  files: 3
  commits: 2
  completed: 2026-02-11
---

# Quick Task 12: Improve ProfileMenu - Add My Projects Link

**One-liner:** Moved My Projects to ProfileMenu, added chevron indicator, upgraded dropdown styling to match Community dropdown quality

## Overview

Improved the ProfileMenu component by moving "My Projects" from the Community dropdown into the Profile dropdown where it belongs (user-specific feature), adding a chevron indicator on the avatar button for visual affordance, and upgrading the dropdown styling to match the polished Community dropdown.

## Tasks Completed

### Task 1: Remove My Projects from Community dropdown
**Commit:** d7ed990

- Removed `{ href: "/projects/my", title: "My Projects", icon: "my-projects" }` from COMMUNITY_LINKS array in `src/data/headerNavLinks.js`
- Removed `{item.icon === "my-projects" && <span>📂</span>}` icon mapping in `src/components/LayoutWrapper.tsx`
- Verified with grep: no "my-projects" references remain
- Build passed with no errors

**Files modified:**
- `src/data/headerNavLinks.js` - Removed My Projects entry
- `src/components/LayoutWrapper.tsx` - Removed my-projects icon mapping

### Task 2: Upgrade ProfileMenu with My Projects link, chevron, and polished styling
**Commit:** ea07ebb

**Key changes:**

1. **Added chevron indicator to avatar button:**
   - Changed button layout to `flex items-center gap-1` container
   - Added down-chevron SVG (`M19 9l-7 7-7-7`, w-4 h-4, opacity-60) next to avatar
   - Keeps avatar at w-10 rounded-full with subtle chevron indicator

2. **Switched from daisyUI dropdown to custom click-toggle:**
   - Added `useRef<HTMLDivElement>` for dropdown container
   - Added `useEffect` click-outside handler (matches Community dropdown pattern)
   - Replaced `dropdown dropdown-end dropdown-open` classes with simple `relative` container
   - Conditional rendering: `{isOpen && (<ul>...</ul>)}`

3. **Upgraded dropdown menu styling to match Community dropdown:**
   - Changed from: `mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52`
   - Changed to: `absolute top-full right-0 z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-2`
   - Key improvements: `shadow-lg` (not `shadow`), `z-[100]` (not `z-[1]`), removed `menu-sm` for consistent text size, `absolute top-full right-0` positioning

4. **Added My Projects link:**
   ```jsx
   <li>
     <Link href="/projects/my" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
       <span>📂</span>
       My Projects
     </Link>
   </li>
   ```

5. **Removed daisyUI dropdown tabIndex attributes** - no longer needed with custom click-toggle

**Final dropdown structure:**
- Profile (user icon)
- My Projects (📂)
- Logout (arrow icon)

All items use consistent `flex items-center gap-2` styling with daisyUI `menu` hover states.

**Files modified:**
- `src/components/ProfileMenu.tsx` - Complete redesign: chevron, click-toggle, My Projects link, polished styling

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All success criteria met:

- ✅ My Projects link moved from Community to Profile dropdown
- ✅ Avatar has chevron indicating dropdown behavior
- ✅ ProfileMenu styling matches Community dropdown (shadow-lg, z-[100], spacing, hover states)
- ✅ Both dropdowns close on outside click and item click
- ✅ `npm run build` passed with no TypeScript or compilation errors
- ✅ Community dropdown no longer shows "My Projects"
- ✅ ProfileMenu dropdown shows: Profile, My Projects, Logout

## Self-Check: PASSED

**Files created/modified exist:**
```
FOUND: src/components/ProfileMenu.tsx
FOUND: src/data/headerNavLinks.js
FOUND: src/components/LayoutWrapper.tsx
```

**Commits exist:**
```
FOUND: d7ed990 (Task 1: Remove My Projects from Community dropdown)
FOUND: ea07ebb (Task 2: Upgrade ProfileMenu)
```

## Impact

**User Experience:**
- Better information architecture: My Projects is now in the Profile dropdown where user-specific features belong
- Visual affordance: Chevron on avatar button signals it's clickable
- Consistent design: Both Community and ProfileMenu dropdowns use same styling patterns
- Improved UX: Click-outside-to-close behavior works consistently across both dropdowns

**Code Quality:**
- Removed dead code (my-projects icon mapping)
- Consistent patterns (click-outside-to-close useEffect, dropdown styling)
- No tech debt introduced

## Notes

- ProfileMenu now follows same implementation pattern as Community dropdown (custom click-toggle vs daisyUI dropdown classes)
- Both dropdowns use identical z-index, shadow, and spacing values for visual consistency
- All three ProfileMenu items (Profile, My Projects, Logout) close the dropdown when clicked
- The chevron indicator provides clear visual feedback that the avatar is interactive
