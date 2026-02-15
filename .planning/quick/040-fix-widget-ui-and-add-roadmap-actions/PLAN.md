# Quick Task: Fix Widget UI and Add Roadmap Actions

## Goal
Improve the UI of the "My Projects" widget to prevent button overlap and add explicit action items (Edit) to the "My Roadmaps" widget for better consistency and discoverability.

## Tasks
- [x] **Project Widget UI Fix**:
    - Increased padding in project cards (`p-4` -> `p-6`).
    - Moved the Edit button to the bottom-right corner of the card to avoid overlapping with the status badge.
    - Set the Edit button to be always visible (removed `group-hover:flex`).
- [x] **Roadmap Widget Actions**:
    - Added an "Edit" (✎) button next to the status badge for each roadmap.
    - Set the Edit button to be always visible.
    - Ensured roadmap titles are correctly truncated when actions are present.

## UX Improvements
- **Clear Actions**: Users no longer need to hover to find editing capabilities.
- **Improved Hierarchy**: Status badges and action buttons are clearly separated, preventing visual collision.
- **Consistency**: Both Projects and Roadmaps widgets now offer direct editing from the dashboard.
