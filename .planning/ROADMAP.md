# Roadmap: Mentorship Admin Dashboard Extension

## Overview

This roadmap extends the existing mentorship admin dashboard with mentor-mentee mapping views and mentorship management capabilities. We'll build a new Mentorships tab showing relationships, add Discord username editing and channel regeneration, enable mentorship status management, and enhance the All Mentors tab with declined mentor filtering and restoration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Mentorship Mapping View** - Display mentor-mentee relationships in existing dashboard tabs
- [x] **Phase 2: Discord & Status Management** - Enable Discord updates, channel regeneration, and mentorship status changes
- [ ] **Phase 3: Declined Mentor Management** - Filter and restore declined mentors on All Mentors tab

## Phase Details

### Phase 1: Mentorship Mapping View
**Goal**: Administrators can view complete mentor-mentee relationship mappings
**Depends on**: Nothing (first phase)
**Requirements**: MAP-01, MAP-02
**Success Criteria** (what must be TRUE):
  1. Admin can see a list of mentors with all their assigned mentees displayed
  2. Admin can see a list of mentees with all their assigned mentors displayed
  3. Mentorship data includes Discord channel links and current status
  4. View integrates into existing admin dashboard tabs (All Mentors, All Mentees)
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — API endpoint for mentorship matches with profile joins
- [x] 01-02-PLAN.md — UI enhancement for relationship display in existing tabs

### Phase 2: Discord & Status Management
**Goal**: Administrators can update Discord usernames, regenerate channels, and manage mentorship lifecycle
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, STAT-01, STAT-02, STAT-03
**Success Criteria** (what must be TRUE):
  1. Admin can edit a mentor's Discord username and see it update in the system
  2. Admin can edit a mentee's Discord username and see it update in the system
  3. Admin can regenerate a Discord channel for a mentorship and receive new channel link
  4. Admin can mark an active mentorship as completed and see status reflect completion
  5. Admin can revert a completed mentorship back to active status
  6. Admin can delete a mentorship entirely and it disappears from the list
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — API endpoints for Discord username updates and mentorship status/deletion
- [x] 02-02-PLAN.md — UI for inline Discord editing, status buttons, and delete confirmation

### Phase 3: Declined Mentor Management
**Goal**: Administrators can filter declined mentors and restore them if needed
**Depends on**: Phase 2
**Requirements**: DECL-01, DECL-02
**Success Criteria** (what must be TRUE):
  1. Admin can toggle a filter on All Mentors tab to show or hide declined mentors
  2. Admin can restore a declined mentor to accepted status
  3. Restored mentors appear in the default (non-declined) mentor list
**Plans**: TBD

Plans:
- [ ] 03-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Mentorship Mapping View | 2/2 | Complete | 2026-01-23 |
| 2. Discord & Status Management | 2/2 | Complete | 2026-01-23 |
| 3. Declined Mentor Management | 0/TBD | Not started | - |
