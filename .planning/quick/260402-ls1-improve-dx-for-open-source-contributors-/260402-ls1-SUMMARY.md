---
phase: quick
plan: 260402-ls1
subsystem: dx
tags: [contributing, onboarding, firebase-emulators, seed-data, readme]
dependency_graph:
  requires: []
  provides: [local-dev-setup, env-template, seed-data, contributor-guide]
  affects: [README.md, .env.example, scripts/seed-firestore.ts, CONTRIBUTING.md]
tech_stack:
  added: [firebase-admin (emulator seed), @ngneat/falso (fake data)]
  patterns: [idempotent-seed-script, env-layering]
key_files:
  created:
    - .env.example
    - scripts/seed-firestore.ts
    - CONTRIBUTING.md
  modified:
    - README.md
    - package.json
    - .gitignore
decisions:
  - Use projectId='demo-codewithahsan' in seed script (matches Firebase emulator singleProjectMode convention)
  - Add !.env.example to .gitignore so template can be tracked without exposing real secrets
  - Seed script is idempotent — clears existing seed docs before writing (safe to re-run)
  - dry-run flag lets script describe what it would write without emulator running (good for CI checks)
metrics:
  duration: 4 minutes
  completed: 2026-04-02T13:47:00Z
  tasks_completed: 2
  files_changed: 6
---

# Quick Task 260402-ls1: Improve DX for Open-Source Contributors — Summary

**One-liner:** Local dev onboarding with .env.example, Firebase emulator seed script (users/projects/roadmaps), rewritten README, and CONTRIBUTING.md.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create .env.example and Firestore seed script | 48fc5e8 | .env.example, scripts/seed-firestore.ts, package.json, .gitignore |
| 2 | Rewrite README.md and create CONTRIBUTING.md | a46e4c9 | README.md, CONTRIBUTING.md |

## What Was Built

### .env.example
A complete env var template organized into three sections:
- **Required** — Firebase client SDK vars (using emulator-safe placeholder values) and emulator host vars (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`)
- **Optional** — External service keys (Mailchimp, Mailgun, Discord, Gemini, YouTube, Google OAuth, etc.) with comments explaining each
- **Production only** — `VERCEL_OIDC_TOKEN` and `FIREBASE_SERVICE_ACCOUNT_KEY` variants clearly separated

### scripts/seed-firestore.ts
Idempotent seed script that populates the Firebase emulator with:
- 6 sample users (members and mentors with fake names/emails)
- 4 sample projects (active/approved/pending statuses)
- 2 sample roadmaps (approved and draft)

Supports `--dry-run` flag for verification without a running emulator. Added `npm run seed` script to package.json.

### README.md
Rewritten from a personal profile card to a proper open-source project README with: project description, feature list, tech stack table, prerequisites, numbered 6-step local dev guide, available scripts table, project structure overview, contributing link, and About the Author section (all original badges and Buy Me a Coffee button preserved).

### CONTRIBUTING.md
Full contributor guide covering: how to find issues, fork/branch workflow, commit message conventions (Conventional Commits style matching existing git history), PR process, code style (ESLint + Prettier), testing expectations (both `npm test` and `npm run test:rules`), and a note on using the seed script.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added .env.example exception to .gitignore**
- **Found during:** Task 1 (when committing .env.example)
- **Issue:** `.gitignore` had a `.env*` glob that excluded `.env.example` from git tracking, making it impossible to commit the template file
- **Fix:** Added `!.env.example` exception line directly after the `.env*` rule
- **Files modified:** .gitignore
- **Commit:** 48fc5e8

## Known Stubs

None — all content is substantive. The seed script uses `@ngneat/falso` for realistic fake data, not placeholder text.

## Self-Check: PASSED

- [x] .env.example exists and is tracked by git
- [x] scripts/seed-firestore.ts exists and compiles (dry-run verified)
- [x] package.json has `seed` script
- [x] README.md has "Local Development" section, references .env.example and firebase emulators
- [x] CONTRIBUTING.md exists with fork workflow and testing info
- [x] Original author social badges and Buy Me a Coffee button preserved in README
- [x] Commits 48fc5e8 and a46e4c9 exist in git log
