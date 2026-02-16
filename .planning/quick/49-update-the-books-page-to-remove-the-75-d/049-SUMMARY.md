---
phase: quick-049
plan: 01
subsystem: content
tags: [books, ui, marketing]
dependency-graph:
  requires: []
  provides: [updated-book-promotions]
  affects: [books-page]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/data/booksData.js
decisions: []
metrics:
  duration: 1 min
  tasks: 1
  files-modified: 1
  commits: 1
  completed: 2026-02-16T06:59:38Z
---

# Quick Task 049: Update Book Promotions and Links

**One-liner:** Removed 75% OFF discount from Mastering Angular Signals and updated Zero to Website to link directly to z2website.com

## Context

The books page needed updates to reflect current pricing and availability:
- Mastering Angular Signals no longer has a 75% discount promotion
- Zero to Website book is now available at https://z2website.com, replacing the interest form workflow

## Implementation

### Task 1: Update book data for promotions and links

**Files modified:** `src/data/booksData.js`

**Changes made:**

1. **Mastering Angular Signals (id: 3):**
   - Removed `discount: "75% OFF"` field
   - Book card will no longer show discount badge in top-right corner
   - All other fields (link, btnText, actionType) remain unchanged

2. **Zero to Website (id: 4):**
   - Changed `link: null` to `link: "https://z2website.com"`
   - Changed `actionType: "interest-form"` to `actionType: "link"`
   - Changed `btnText: "Get Notified"` to `btnText: "Get your copy"`
   - Removed `discount: "Coming Soon"` field
   - Now opens z2website.com in new tab instead of showing interest form modal

**Commit:** `afae920`

## Verification

The implementation satisfies all success criteria:

- ✅ Mastering Angular Signals book entry has no discount field
- ✅ Zero to Website book links to https://z2website.com
- ✅ Zero to Website actionType changed to "link"
- ✅ Zero to Website btnText changed to "Get your copy"
- ✅ Zero to Website has no discount field
- ✅ All other book data remains unchanged

**Visual verification required:**
1. Visit http://localhost:3000/books
2. Confirm Mastering Angular Signals has no discount badge in top-right corner
3. Confirm Zero to Website has no "Coming Soon" badge
4. Click "Get your copy" on Zero to Website and verify it opens https://z2website.com in a new tab

## Deviations from Plan

None - plan executed exactly as written.

## Impact

**User-facing changes:**
- Books page now accurately reflects current pricing (no outdated discount)
- Zero to Website book is accessible via direct link instead of interest form
- Cleaner UI with removed promotional badges

**Technical debt:** None

## Self-Check: PASSED

**Files verified:**
```bash
[ -f "src/data/booksData.js" ] && echo "FOUND: src/data/booksData.js"
```
✅ FOUND: src/data/booksData.js

**Commits verified:**
```bash
git log --oneline --all | grep -q "afae920" && echo "FOUND: afae920"
```
✅ FOUND: afae920

All claims verified successfully.
