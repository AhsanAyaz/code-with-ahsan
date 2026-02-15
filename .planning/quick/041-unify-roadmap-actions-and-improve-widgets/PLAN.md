# Quick Task: Unify Roadmap Actions and Improve Widgets

## Goal
Standardize roadmap management actions across the application using a shared dropdown component and improve the dashboard widgets for better usability and information density.

## Tasks
- [x] **Create `RoadmapActionsDropdown`**: A reusable component for Edit, Submit, Delete, and Preview actions.
- [x] **Update `MyRoadmapsWidget`**:
    - Use `RoadmapActionsDropdown`.
    - Limit to 3 most recent roadmaps.
    - Add "Browse All" link.
    - Add warning icon for roadmaps with admin feedback.
- [x] **Update `MyRoadmapsPage`**: Replace custom buttons with `RoadmapActionsDropdown`.
- [x] **Update `RoadmapDetailPage`**: Replace custom buttons with `RoadmapActionsDropdown`.
- [x] **Update `MyProjectsWidget`**: Limit to 3 most recent projects for consistency.

## UX Improvements
- **Consistency**: Users see the same action menu everywhere.
- **Clarity**: Feedback status is visible at a glance on the dashboard.
- **Focus**: Dashboard widgets now show only the most relevant recent items, reducing clutter.
