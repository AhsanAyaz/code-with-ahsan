# Quick Task: Unify Dashboard Header Buttons and Roadmap Actions

## Goal
Improve visual and functional consistency across the dashboard widgets and roadmap management views by standardizing header buttons and unifying action menus.

## Tasks
- [x] **Unify Widget Headers**:
    - Added `+ New` button to `MyProjectsWidget` header.
    - Standardized `+ New` and `Browse All` positioning in both `MyProjectsWidget` and `MyRoadmapsWidget`.
- [x] **Consolidate Roadmap Actions**:
    - Already created `RoadmapActionsDropdown` to provide a single source of truth for roadmap actions (Edit, Submit, Delete, Preview).
    - Already integrated this dropdown into:
        - `MyRoadmapsWidget` (Dashboard)
        - `MyRoadmapsPage` (/roadmaps/my)
        - `RoadmapDetailPage` (/roadmaps/[id])
- [x] **Refine Roadmap Detail Actions**:
    - Added logic to `RoadmapActionsDropdown` to hide redundant "Preview" button when on the detail page.
- [x] **Item Limits**: Both dashboard widgets are now limited to the 3 most recent items to maintain a clean layout.

## UX Improvements
- **Action Symmetry**: Both main widgets now offer identical navigation and creation shortcuts.
- **Reduced Confusion**: Users no longer see different sets of actions in different views for the same roadmap.
- **Efficiency**: One-click access to "New Project" or "New Roadmap" directly from the dashboard.
