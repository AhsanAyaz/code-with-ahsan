# Quick Task 32: Add Status Badges to My Projects Page

## Overview
Add color-coded status badges to project cards in the My Projects page (Created tab) to improve status visibility. Currently, project cards don't show the project status (pending, active, completed, declined).

## Context
- **Primary file:** `src/app/projects/my/page.tsx`
- **Component used:** `src/components/projects/ProjectCard.tsx`
- **Reference styling:** `src/app/admin/projects/page.tsx` (getStatusBadgeClass function at lines 225-238)

## Current State
- The My Projects page displays project cards using the ProjectCard component
- ProjectCard shows title, creator, description, difficulty badge, tech stack, and team size
- No status badge is currently displayed
- Admin projects page already has a working `getStatusBadgeClass` helper function

## Implementation Plan

### Task 1: Add getStatusBadgeClass helper to ProjectCard component
**File:** `src/components/projects/ProjectCard.tsx`

**Action:**
1. Add the `getStatusBadgeClass` helper function inside the component (before the return statement):
   ```typescript
   const getStatusBadgeClass = (status: string) => {
     switch (status) {
       case "pending":
         return "badge-warning";
       case "active":
         return "badge-success";
       case "completed":
         return "badge-info";
       case "declined":
         return "badge-error";
       default:
         return "badge-ghost";
     }
   };
   ```

2. Add the status badge display in the card body, positioned next to the title (update the title div section around line 28-35):
   ```typescript
   <div className="flex items-center gap-2 mb-2">
     <h2 className="card-title text-lg">{project.title}</h2>
     <span className={`badge badge-sm ${getStatusBadgeClass(project.status)}`}>
       {project.status}
     </span>
     {project.pendingApplicationCount != null && project.pendingApplicationCount > 0 && (
       <span className="badge badge-primary badge-sm whitespace-nowrap">
         {project.pendingApplicationCount} pending
       </span>
     )}
   </div>
   ```

**Why:**
- Adds the helper function directly to the component rather than creating a shared utility (simpler for a single-use case)
- Places the status badge prominently next to the title for immediate visibility
- Maintains consistency with the pending application count badge display
- Follows the same color scheme as the admin page

**Verify:**
1. Component compiles without errors: `npm run build` or `npm run dev`
2. Visually inspect the My Projects page (Created tab) - each project card should show a color-coded status badge next to the title
3. Test with different project statuses if available:
   - Pending projects: yellow badge
   - Active projects: green badge
   - Completed projects: blue badge
   - Declined projects: red badge

**Done:**
- [x] getStatusBadgeClass function added to ProjectCard component
- [x] Status badge displayed next to project title
- [x] Badge uses correct DaisyUI classes (badge-warning, badge-success, badge-info, badge-error)
- [x] Layout properly handles both status badge and pending application count badge
- [x] Visual verification confirms badges display correctly on My Projects page

## Expected Outcome
Project cards in the My Projects page (Created tab) will display color-coded status badges matching the admin projects page styling:
- **Pending**: Yellow/warning badge
- **Active**: Green/success badge
- **Completed**: Blue/info badge
- **Declined**: Red/error badge

The status badge will be positioned next to the project title, providing immediate visual feedback about project status.

## Testing Notes
- Test with projects in different statuses if available in the database
- Verify that the badge doesn't break the layout when both status badge and pending application count badge are present
- Check responsive behavior on mobile/tablet screens
- Confirm color scheme matches the admin page styling
