# Requirements: Mentorship Admin Dashboard Extension

**Defined:** 2026-01-23
**Core Value:** Administrators can see the complete picture of who is mentoring whom, and take action on mentorships without direct database access.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Mapping

- [ ] **MAP-01**: Admin can view a list of mentors with their assigned mentees
- [ ] **MAP-02**: Admin can view a list of mentees with their assigned mentors

### Discord Management

- [ ] **DISC-01**: Admin can edit Discord username for a mentor
- [ ] **DISC-02**: Admin can edit Discord username for a mentee
- [ ] **DISC-03**: Admin can regenerate Discord channel for a mentorship

### Mentorship Status

- [ ] **STAT-01**: Admin can mark a mentorship as completed
- [ ] **STAT-02**: Admin can revert a completed mentorship to active
- [ ] **STAT-03**: Admin can delete a mentorship entirely

### Declined Mentors

- [ ] **DECL-01**: Admin can filter All Mentors tab to show/hide declined mentors
- [ ] **DECL-02**: Admin can restore a declined mentor (change status to accepted)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Bulk Operations

- **BULK-01**: Admin can select multiple mentorships and mark all as completed
- **BULK-02**: Admin can export mentorship data to CSV

### Advanced Filtering

- **FILT-01**: Admin can filter mentorships by date range
- **FILT-02**: Admin can search mentorships by mentor/mentee name

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Discord channel deletion | Archives are sufficient, manual cleanup if needed |
| Creating new mentorships from admin | Users should go through normal request flow |
| Editing other profile fields from admin | Only Discord username for now, keep scope tight |
| Bulk delete operations | Too risky without additional safeguards |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 1 | Pending |
| MAP-02 | Phase 1 | Pending |
| DISC-01 | Phase 2 | Pending |
| DISC-02 | Phase 2 | Pending |
| DISC-03 | Phase 2 | Pending |
| STAT-01 | Phase 2 | Pending |
| STAT-02 | Phase 2 | Pending |
| STAT-03 | Phase 2 | Pending |
| DECL-01 | Phase 3 | Pending |
| DECL-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after roadmap creation*
