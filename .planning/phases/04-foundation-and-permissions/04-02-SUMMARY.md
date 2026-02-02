---
phase: 04-foundation-and-permissions
plan: 02
subsystem: security
tags: [firestore, security-rules, validation, zod, rehype-sanitize, xss-prevention, github-urls]

# Dependency graph
requires:
  - phase: 04-01
    provides: Type definitions and test infrastructure for v2.0 features
provides:
  - Firestore security rules for projects, project_members, roadmaps, and roadmap versions
  - GitHub URL validation utilities using zod
  - Markdown XSS sanitization using rehype-sanitize
  - Defense-in-depth security foundation for v2.0 collections
affects: [04-03, phase-05, phase-06, phase-07, phase-08]

# Tech tracking
tech-stack:
  added: [unified, remark-parse, remark-rehype, rehype-stringify, rehype-sanitize]
  patterns: [Firestore security rules with helper functions, Input validation utilities, Markdown sanitization pipeline]

key-files:
  created:
    - firestore.rules
    - src/lib/validation/urls.ts
    - src/lib/validation/sanitize.ts
  modified: []

key-decisions:
  - "Use Firestore security rules helper functions for DRY access control logic"
  - "Implement sanitizeMarkdown (HTML output) and sanitizeMarkdownRaw (Markdown storage) for flexibility"
  - "GitHub URL validation requires https:// protocol only, no http:// allowed"
  - "Roadmap versions subcollection is immutable (audit trail pattern)"

patterns-established:
  - "Security rules pattern: Helper functions (isSignedIn, isAdmin, isAcceptedMentor) reduce duplication"
  - "Validation pattern: Separate validate* (throws) and isValid* (boolean) functions for flexibility"
  - "Sanitization pattern: unified/remark/rehype pipeline with custom schema for XSS prevention"

# Metrics
duration: 2min
completed: 2026-02-02
---

# Phase 04 Plan 02: Foundation & Permissions - Security Rules Summary

**Firestore security rules with role-based access control and input validation utilities for GitHub URLs and Markdown XSS prevention**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-02T02:00:13Z
- **Completed:** 2026-02-02T02:02:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Firestore security rules enforce PERM-01 (mentor creates projects), PERM-02 (mentor creates roadmaps), PERM-03 (admin approves), PERM-04 (owner/admin manages members)
- GitHub URL validation rejects non-https and non-GitHub URLs using zod schema with regex
- Markdown sanitization strips script tags, event handlers, and dangerous elements using rehype-sanitize
- Defense-in-depth security: Rules protect even if application code bypassed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Firestore security rules** - `edbbb6f` (feat)
2. **Task 2: Create input validation utilities** - `c16a62f` (feat)

## Files Created/Modified
- `firestore.rules` - Security rules for projects, project_members, roadmaps, and roadmap versions with helper functions
- `src/lib/validation/urls.ts` - GitHub URL validation (validateGitHubUrl, isValidGitHubUrl)
- `src/lib/validation/sanitize.ts` - Markdown XSS prevention (sanitizeMarkdown, sanitizeMarkdownRaw)

## Decisions Made
- **Helper functions in security rules:** Created isSignedIn(), isAdmin(), isAcceptedMentor() to DRY access control logic and make rules more maintainable
- **Two sanitization functions:** sanitizeMarkdown for rendering (Markdown → HTML), sanitizeMarkdownRaw for storage (strip dangerous patterns from Markdown)
- **Strict GitHub URL validation:** Require https:// protocol only, reject http:// to prevent mixed-content and security warnings
- **Immutable version history:** Roadmap versions subcollection has `allow update, delete: if false` to preserve audit trail

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - dependencies installed successfully, TypeScript compiled cleanly, all verification checks passed.

## User Setup Required

None - no external service configuration required. Firestore security rules will be deployed in future phase when Firebase hosting is configured.

## Next Phase Readiness

**Ready for Phase 5 (Admin Approval Workflows):**
- Security rules enforce permission requirements (PERM-01 through PERM-04)
- Validation utilities ready for use in Server Actions
- Defense-in-depth foundation established

**Ready for Phase 6 (Project Creation & Discovery):**
- Input validation utilities can be imported and used in project creation forms
- Firestore rules prevent unauthorized project creation

**Ready for Phase 8 (Roadmap Creation & Versioning):**
- Markdown sanitization ready for roadmap content
- GitHub URL validation ready for project repository links
- Immutable version history pattern established in security rules

**No blockers or concerns.**

---
*Phase: 04-foundation-and-permissions*
*Completed: 2026-02-02*
