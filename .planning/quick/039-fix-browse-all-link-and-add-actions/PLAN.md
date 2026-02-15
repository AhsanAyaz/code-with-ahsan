# Quick Task: Fix Browse All Link and Add Actions to Projects Widget

## Goal
Fix the "Browse All" link in the "My Projects" widget to point to the correct user projects page (`/projects/my`) instead of the public showcase. Additionally, add action buttons (like "Edit") to the project cards in the widget for better UX.

## Tasks
- [ ] **Fix Browse All Link**: Update `src/components/mentorship/dashboard/MyProjectsWidget.tsx` to link to `/projects/my`.
- [ ] **Add Actions**: Add an "Edit" button to project cards in `MyProjectsWidget.tsx` for projects where the user is the creator.
- [ ] **Verify Showcase**: Confirm `src/app/projects/showcase/page.tsx` exists (already done via `ls`).

## UX Improvements
- **Direct Navigation**: "Browse All" now takes users to their managed projects.
- **Quick Actions**: Creators can edit projects directly from the dashboard widget.

## Implementation Details
- In `MyProjectsWidget.tsx`:
    - Change `href="/projects"` to `href="/projects/my"`.
    - Add an "Edit" button (pencil icon or text) for projects where `creatorId === userId`.
