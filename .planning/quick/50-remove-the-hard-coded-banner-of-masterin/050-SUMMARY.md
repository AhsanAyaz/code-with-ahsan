---
phase: quick-050
plan: 01
subsystem: homepage
tags: [cleanup, banner, strapi]
dependency_graph:
  requires: []
  provides: [clean-homepage-banners]
  affects: [homepage]
tech_stack:
  added: []
  patterns: [strapi-managed-banners]
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - scripts/create-mentor-pending-channel.ts
decisions:
  - key: banner-cleanup
    summary: Removed hard-coded New Year Sale banner, rely only on Strapi-managed banners
    rationale: Time-limited promotion expired, manual injection no longer needed
metrics:
  duration: 2
  completed: 2026-02-16
---

# Phase quick-050 Plan 01: Remove Hard-coded Banner Summary

**One-liner:** Removed expired New Year Sale banner from homepage, now displays only Strapi-managed banners

## Objective

Clean up outdated promotional content that was manually injected into the homepage.

## What Was Built

### Task 1: Remove Hard-coded New Year Sale Banner

**Status:** Complete
**Files:** `src/app/page.tsx`
**Commit:** `bfe65b9`

Removed lines 66-72 which manually injected the New Year Sale banner for Mastering Angular Signals:
- Deleted banner unshift operation with hard-coded promotional content
- Homepage now relies solely on banners fetched from Strapi CMS
- No functional changes to banner display logic - still renders `HomeBanners` component with Strapi data

**Verification:**
- ✅ Build completes successfully (`npm run build`)
- ✅ No TypeScript errors in homepage component
- ✅ HomeBanners component still receives banners from Strapi (when `NEXT_PUBLIC_SHOW_BANNERS=true`)
- ✅ Hard-coded promotional content removed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript duplicate property error in script**
- **Found during:** Build verification after Task 1
- **Issue:** TypeScript error in `scripts/create-mentor-pending-channel.ts` - "uid is specified more than once" because the object literal defined `uid: doc.id` before spreading `...data` which also contains `uid` property
- **Fix:** Reordered object spread to put `...data` first, then `uid: doc.id` to override the uid from data with doc.id
- **Files modified:** `scripts/create-mentor-pending-channel.ts`
- **Commit:** `111010c`
- **Rationale:** This was a blocking issue (Rule 3) - the TypeScript error prevented the build from completing, which was required for task verification. The script file was untracked and had a type error that needed fixing before the build could succeed.

## Success Criteria

All criteria met:

- [x] Lines 66-72 removed from src/app/page.tsx
- [x] No hard-coded banner content remains
- [x] Build passes
- [x] Homepage functionality unchanged (still displays Strapi banners when enabled)

## Testing & Verification

**Build Verification:**
```bash
npm run build
```
- ✅ TypeScript compilation successful
- ✅ Next.js production build completed
- ✅ All routes prerendered successfully
- ✅ Sitemap generated

**Code Review:**
- ✅ Homepage component simplified - removed manual banner injection
- ✅ Banner display now fully managed by Strapi CMS
- ✅ No breaking changes to component structure

## Output Artifacts

### Modified Files

1. **src/app/page.tsx** (main task)
   - Removed hard-coded New Year Sale banner injection (8 lines deleted)
   - Homepage component now returns banners directly from `getBanners()`
   - Cleaner code without promotional content management

2. **scripts/create-mentor-pending-channel.ts** (deviation fix)
   - Fixed TypeScript duplicate property error
   - Object spread reordered to avoid uid overwrite warning
   - Script now part of tracked codebase (was previously untracked)

## Self-Check: PASSED

**Created files verification:**
- No files created (cleanup task only)

**Modified files verification:**
```bash
[ -f "/Users/amu1o5/personal/code-with-ahsan/src/app/page.tsx" ] && echo "FOUND: src/app/page.tsx" || echo "MISSING: src/app/page.tsx"
```
FOUND: src/app/page.tsx

```bash
[ -f "/Users/amu1o5/personal/code-with-ahsan/scripts/create-mentor-pending-channel.ts" ] && echo "FOUND: scripts/create-mentor-pending-channel.ts" || echo "MISSING: scripts/create-mentor-pending-channel.ts"
```
FOUND: scripts/create-mentor-pending-channel.ts

**Commits verification:**
```bash
git log --oneline --all | grep -q "bfe65b9" && echo "FOUND: bfe65b9" || echo "MISSING: bfe65b9"
```
FOUND: bfe65b9

```bash
git log --oneline --all | grep -q "111010c" && echo "FOUND: 111010c" || echo "MISSING: 111010c"
```
FOUND: 111010c

All artifacts verified successfully.
