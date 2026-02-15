# Phase 10 Research: Integration & Polish

## 1. Dashboard Integration Strategy

### 1.1 My Projects Widget
- **Data Source**: `GET /api/projects?creatorId={uid}` and `GET /api/projects?member={uid}`.
- **Display**: Similar to `ActiveMatchesWidget` but specifically for project collaboration.
- **Priority**: High. Should be visible in the main operational zone.

### 1.2 My Roadmaps Widget (Mentor Only)
- **Data Source**: `GET /api/roadmaps?creatorId={uid}`.
- **Display**: List of roadmaps with status badges (Draft, Pending, Approved).
- **Priority**: Medium-High for mentors.

## 2. Cross-Feature Links

### 2.1 Project Detail -> Recommended Roadmaps
- **Logic**: Use `techStack` from project to match `domain` or tags in Roadmaps.
- **Placement**: Sidebar or bottom of project detail page.

### 2.2 Roadmap Detail -> Related Projects
- **Logic**: Use `domain` from roadmap to find projects with matching `techStack`.
- **Placement**: Bottom of roadmap detail page.

## 3. Regression Test Plan

### 3.1 Core Mentorship Flow
- Profile creation/editing.
- Mentorship request/approval.
- Discord channel creation for matches.

### 3.2 Projects Flow
- Project creation.
- Application/Invitation.
- Discord member management.

### 3.3 Roadmaps Flow
- Roadmap creation/versioning.
- Public catalog rendering.

## 4. Implementation Plan
- **Plan 10-01**: Dashboard integration (My Projects, My Roadmaps widgets).
- **Plan 10-02**: Cross-feature recommendation logic and UI.
- **Plan 10-03**: Polish, regression testing, and final verification.
