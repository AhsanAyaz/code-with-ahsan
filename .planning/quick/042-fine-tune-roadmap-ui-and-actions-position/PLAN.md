# Quick Task: Fine-tune Roadmap UI and Actions Position

## Goal
Improve visual consistency and action discoverability by adjusting the position of feedback indicators and action menus in roadmap-related views.

## Tasks
- [x] **Dashboard Widget (`MyRoadmapsWidget.tsx`)**:
    - Moved the admin feedback warning icon from the title to the status badge area for better visual grouping.
    - Grouped the feedback icon and status badge together.
- [x] **My Roadmaps Page (`src/app/roadmaps/my/page.tsx`)**:
    - Relocated the `RoadmapActionsDropdown` (three-dots menu) from the bottom of the card to the top-right header area.
    - Removed redundant `card-actions` div at the bottom of the card.

## UX Improvements
- **Action Grouping**: Status and feedback (the "What") are now visually associated with Actions (the "How").
- **Efficiency**: Users can find management actions immediately at the top of the card without scrolling.
- **Visual Balance**: Cards appear more balanced with consistent header-level actions.
