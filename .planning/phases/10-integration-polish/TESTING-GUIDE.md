# Phase 10: Integration & Polish - Testing Guide

Quick reference guide for manual testing of the complete roadmap system.

## Prerequisites

- ✅ Two accounts ready:
  - **Mentor account** (accepted mentor with permission to create roadmaps)
  - **Admin account** (admin with approval permissions)
- ✅ Browser with clean cache/cookies for testing
- ✅ Development server running locally

## Test Suite 1: Dashboard Integration (5 mins)

### As Mentor with Roadmaps
1. Login and navigate to `/mentorship/dashboard`
2. **Check Stats Section:**
   - ✓ "My Roadmaps" stat visible (4th stat)
   - ✓ Shows correct count
3. **Check Navigation Cards:**
   - ✓ "Browse Roadmaps" card visible
   - ✓ "Create Roadmap" card visible (gradient blue/purple)
   - ✓ "My Roadmaps" card visible (only if you have roadmaps)
4. **Click Each Card:**
   - ✓ "Browse Roadmaps" → goes to `/roadmaps`
   - ✓ "Create Roadmap" → goes to `/roadmaps/new`
   - ✓ "My Roadmaps" → goes to `/roadmaps/my`

### As Mentee (No Roadmaps)
1. Login as mentee
2. **Check Dashboard:**
   - ✓ No "My Roadmaps" stat
   - ✓ "Browse Roadmaps" card visible
   - ✓ No "Create Roadmap" card
   - ✓ No "My Roadmaps" card

**Expected Result:** Dashboard shows appropriate roadmap features based on user role and status.

---

## Test Suite 2: Breadcrumb Navigation (3 mins)

### Test All Pages
1. **From Dashboard → Roadmaps Catalog:**
   - ✓ Breadcrumbs: `Dashboard / Roadmaps`
   - ✓ Click "Dashboard" → returns to dashboard

2. **From Dashboard → My Roadmaps:**
   - ✓ Breadcrumbs: `Dashboard / Roadmaps / My Roadmaps`
   - ✓ Click "Dashboard" → returns to dashboard
   - ✓ Click "Roadmaps" → goes to catalog

3. **From Roadmaps → Roadmap Detail:**
   - ✓ Breadcrumbs: `Dashboard / Roadmaps / {Roadmap Title}`
   - ✓ Click "Dashboard" → returns to dashboard
   - ✓ Click "Roadmaps" → returns to catalog

4. **Test Browser Navigation:**
   - ✓ Browser back button works correctly
   - ✓ Browser forward button works correctly

**Expected Result:** Breadcrumbs provide clear navigation context on all roadmap pages.

---

## Test Suite 3: Initial Roadmap Creation (10 mins)

### Create and Submit Roadmap
1. **As Mentor:** Navigate to `/roadmaps/new`
2. **Fill Form:**
   - Title: "Test Roadmap - [Your Name]"
   - Domain: Any
   - Difficulty: Any
   - Description: "This is a test roadmap"
   - Content: Add markdown with headers, code blocks, lists
3. **Save Draft:**
   - ✓ Success message appears
   - ✓ Redirected to `/roadmaps/my`
   - ✓ Roadmap appears with "Draft" badge
4. **Preview Draft:**
   - ✓ Click "Preview" button
   - ✓ Content renders correctly
   - ✓ "Edit" button visible
5. **Submit for Review:**
   - ✓ Return to "My Roadmaps"
   - ✓ Click "Submit for Review"
   - ✓ Badge changes to "Pending Review"
   - ✓ "Edit" button hidden
   - ✓ Shows "⏳ Awaiting Admin Review"

**Expected Result:** Roadmap created as draft, submittable for review, status changes to pending.

---

## Test Suite 4: Admin Initial Review (5 mins)

### Approve Initial Submission
1. **As Admin:** Navigate to `/mentorship/admin`
2. **Find Test Roadmap:**
   - ✓ Shows in "Pending Roadmaps" section
   - ✓ Shows correct title, domain, difficulty
3. **Preview:**
   - ✓ Click "Preview" button
   - ✓ Opens in new tab showing roadmap
   - ✓ Yellow warning: "Admin Preview Mode"
   - ✓ No "Edit" button (pending status)
4. **Approve:**
   - ✓ Return to admin page
   - ✓ Click "Approve"
   - ✓ Success toast appears
   - ✓ Roadmap removed from admin queue
5. **Verify Published:**
   - ✓ Navigate to `/roadmaps`
   - ✓ Roadmap appears in public catalog
   - ✓ Click card to view
   - ✓ Content displays correctly

**Expected Result:** Admin can preview and approve, roadmap becomes public (v1).

---

## Test Suite 5: Admin Request Changes (Initial) (8 mins)

### Create New Draft and Request Changes
1. **As Mentor:** Create another roadmap, submit for review
2. **As Admin:** Find pending roadmap
3. **Request Changes:**
   - ✓ Click "Request Changes"
   - ✓ Modal opens
   - ✓ Enter feedback: "Please add more code examples"
   - ✓ Click "Request Changes"
   - ✓ Success toast appears
   - ✓ Roadmap removed from admin queue
4. **As Mentor:** Navigate to `/roadmaps/my`
   - ✓ Roadmap status back to "Draft"
   - ✓ Yellow "Admin Requested Changes" banner visible
   - ✓ Feedback text displayed
   - ✓ "Edit" button visible
5. **Make Changes:**
   - ✓ Click "Edit"
   - ✓ Make changes to content
   - ✓ Save
   - ✓ Return to "My Roadmaps"
   - ✓ Feedback banner removed
   - ✓ Can submit for review again

**Expected Result:** Admin feedback workflow works, mentor can edit after feedback.

---

## Test Suite 6: Edit Approved Roadmap (Draft Version) (10 mins)

### Create Draft Version of Approved Roadmap
1. **As Mentor:** Find approved roadmap in "My Roadmaps"
2. **Start Edit:**
   - ✓ Badge shows "Published"
   - ✓ "Edit" button visible
   - ✓ Click "Edit"
3. **Make Changes:**
   - ✓ Change title: Add " v2" to end
   - ✓ Change description
   - ✓ Change content
   - ✓ Save changes
4. **Verify Draft Created:**
   - ✓ Blue "Draft under review" banner appears
   - ✓ Shows draft version number (v2)
   - ✓ Shows "published version remains visible" message
   - ✓ "Edit" button now hidden
   - ✓ Shows "⏳ Draft v2 Under Review"
5. **Verify Published Version Still Live:**
   - ✓ Navigate to `/roadmaps`
   - ✓ Find roadmap in catalog
   - ✓ Click to view
   - ✓ OLD title still showing (no "v2")
   - ✓ OLD content still showing

**Expected Result:** Draft version (v2) created, published version (v1) remains live.

---

## Test Suite 7: Admin Preview Draft Version (8 mins)

### Admin Reviews Draft Version
1. **As Admin:** Navigate to `/mentorship/admin`
2. **Find Roadmap with Draft:**
   - ✓ Roadmap appears in queue
   - ✓ Card shows NEW title (with "v2")
   - ✓ Card shows NEW description
   - ✓ Badge shows "Draft v2"
3. **Preview Draft:**
   - ✓ Click "Preview" button
   - ✓ Opens roadmap detail page
   - ✓ URL includes `?preview=draft` parameter
   - ✓ Shows NEW title (with "v2")
   - ✓ Shows NEW content
   - ✓ "Edit" button is HIDDEN
   - ✓ Version shown matches draft version
4. **Verify Can't Edit During Preview:**
   - ✓ No "Edit" button visible
   - ✓ Only "Back to Roadmaps" available

**Expected Result:** Admin sees draft version in preview, not published version. Edit button hidden.

---

## Test Suite 8: Admin Request Changes (Draft Version) (10 mins)

### Request Changes on Draft
1. **As Admin:** Find roadmap with pending draft
2. **Request Changes:**
   - ✓ Click "Request Changes"
   - ✓ Modal opens
   - ✓ Enter feedback: "The code example needs syntax highlighting"
   - ✓ Click "Request Changes"
   - ✓ Success toast appears
   - ✓ Roadmap removed from admin queue
3. **As Mentor:** Navigate to `/roadmaps/my`
   - ✓ Find roadmap
   - ✓ Blue "Draft under review" banner removed
   - ✓ Yellow "Admin Requested Changes" banner appears
   - ✓ Feedback text displayed
   - ✓ "Edit" button now visible
4. **Edit After Feedback:**
   - ✓ Click "Edit"
   - ✓ Make changes
   - ✓ Save
   - ✓ Return to "My Roadmaps"
   - ✓ Blue "Draft under review" banner reappears
   - ✓ Feedback banner removed
   - ✓ Draft version number incremented (v3)

**Expected Result:** Admin can request changes on draft, mentor can edit and resubmit, creates new draft version.

---

## Test Suite 9: Admin Approve Draft Version (8 mins)

### Approve Draft and Publish
1. **As Admin:** Navigate to admin dashboard
2. **Find Roadmap with Draft:**
   - ✓ Shows in queue with draft badge
   - ✓ Shows latest metadata from draft
3. **Preview Draft:**
   - ✓ Click "Preview"
   - ✓ Verify shows correct draft content
4. **Approve Draft:**
   - ✓ Return to admin page
   - ✓ Click "Approve Draft" button
   - ✓ Success toast appears
   - ✓ Roadmap IMMEDIATELY removed from admin queue (no second click needed)
5. **Verify Published:**
   - ✓ Navigate to `/roadmaps`
   - ✓ Find roadmap in catalog
   - ✓ Click to view
   - ✓ Shows NEW title (with "v2" or "v3")
   - ✓ Shows NEW content
   - ✓ Version number increased
6. **As Mentor:** Check "My Roadmaps"
   - ✓ Blue "Draft under review" banner removed
   - ✓ Badge shows "Published"
   - ✓ "Edit" button visible again

**Expected Result:** Draft becomes published, replaces previous version, admin queue auto-updates.

---

## Test Suite 10: Cross-Feature Navigation (5 mins)

### Test Navigation Between Features
1. **Start at Dashboard:**
   - ✓ Navigate to Dashboard
2. **Roadmaps Journey:**
   - ✓ Click "Browse Roadmaps"
   - ✓ Use breadcrumbs to return to Dashboard
   - ✓ Click "Browse Roadmaps" again
   - ✓ Click a roadmap card
   - ✓ View detail page
   - ✓ Check "Related Mentors" section
   - ✓ Click a mentor card
   - ✓ View mentor profile
3. **Back to Roadmaps:**
   - ✓ Use browser back button
   - ✓ Returns to roadmap detail
   - ✓ Use breadcrumbs to navigate to catalog
   - ✓ Use breadcrumbs to navigate to dashboard
4. **My Roadmaps Flow:**
   - ✓ From dashboard, click "My Roadmaps"
   - ✓ Use breadcrumbs: Roadmaps → Dashboard
   - ✓ Navigate back to "My Roadmaps"
   - ✓ Click "Preview" on a roadmap
   - ✓ Use breadcrumbs to navigate back

**Expected Result:** All navigation flows work smoothly, breadcrumbs always accurate, no broken links.

---

## Quick Bug Check Scenarios

### Edge Cases to Verify

1. **Concurrent Edit Prevention:**
   - ✓ Try to edit roadmap while draft is pending
   - ✓ Should see "Draft already exists" message (until admin responds)

2. **Permission Checks:**
   - ✓ Mentee can browse but not create
   - ✓ Non-accepted mentor cannot create
   - ✓ Only admin can approve/request changes

3. **Data Freshness:**
   - ✓ Admin dashboard shows draft metadata (not stale)
   - ✓ Stats on dashboard update after creating roadmap
   - ✓ Catalog updates after roadmap approved

4. **Preview Mode:**
   - ✓ Preview without ?preview=draft shows published version
   - ✓ Preview with ?preview=draft shows draft version
   - ✓ Edit button hidden during preview

5. **Feedback Workflow:**
   - ✓ Feedback clears when new draft created
   - ✓ Can't edit without feedback on rejected draft
   - ✓ Can edit after receiving feedback

---

## Success Criteria

All test suites should pass with ✓ on every item. Key indicators of success:

- ✅ Dashboard integration works for all roles
- ✅ Breadcrumbs provide clear navigation context
- ✅ Initial roadmap workflow (create → submit → approve) works
- ✅ Admin feedback workflow (request changes → edit → resubmit) works
- ✅ Draft version system works (edit approved → admin preview → approve)
- ✅ Admin sees draft metadata before approval
- ✅ Preview functionality shows correct version
- ✅ No stale data at any point in workflow
- ✅ All navigation flows work smoothly
- ✅ No broken links or missing features

---

## Reporting Issues

If any test fails, note:
1. **Test Suite & Step:** Which test and which specific step failed
2. **Expected vs Actual:** What should have happened vs what actually happened
3. **Screenshots:** Capture any error messages or unexpected UI
4. **Console Errors:** Check browser console for any errors
5. **Role & State:** Which user role, what workflow state

---

_Testing Guide for Phase 10: Integration & Polish_
_Created: 2026-02-12_
