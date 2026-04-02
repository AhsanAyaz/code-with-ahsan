# Contributing to CodeWithAhsan

Thank you for your interest in contributing! This guide covers everything you need to get a PR merged.

---

## Finding Issues to Work On

- Browse [open issues](https://github.com/ahsanayaz/code-with-ahsan/issues) and look for the `good first issue` or `help wanted` labels.
- Comment on an issue to claim it before starting work — this prevents duplicate effort.
- For larger changes, open an issue first to discuss the approach before writing code.

---

## Fork and Branch Workflow

1. **Fork** the repository to your own GitHub account.

2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/code-with-ahsan.git
   cd code-with-ahsan
   ```

3. **Add the upstream remote** so you can keep your fork in sync:

   ```bash
   git remote add upstream https://github.com/ahsanayaz/code-with-ahsan.git
   ```

4. **Create a branch** from `main` for your change:

   ```bash
   git checkout -b fix/short-description   # for bug fixes
   git checkout -b feat/short-description  # for new features
   ```

5. Follow the [Local Development Setup](./README.md#local-development-setup) in the README to get the app running.

---

## Commit Message Conventions

We follow a lightweight [Conventional Commits](https://www.conventionalcommits.org/) style:

```
type(scope): short description

Optional body — explain the why, not the what.
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructure without behavior change |
| `test` | Adding or updating tests |
| `chore` | Dependency bumps, config, tooling |
| `docs` | Documentation only |

**Examples:**

```
feat(projects): add team size indicator to project card
fix(auth): handle expired token on profile page load
chore(deps): bump firebase to 12.7.0
```

Keep the subject line under 72 characters. Use the imperative mood ("add" not "added").

---

## Pull Request Process

1. **Keep PRs focused** — one logical change per PR. Smaller PRs get reviewed faster.

2. **Sync with upstream** before opening:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

3. **Run all checks locally** (see Testing section below).

4. **Open a pull request** against the `main` branch of the upstream repo.

5. Fill in the PR description: what changed, why, and how to test it.

6. Reference any related issue: `Closes #123`.

7. A maintainer will review and may request changes. Address feedback by pushing to the same branch — the PR updates automatically.

---

## Code Style

The project uses **ESLint** and **Prettier** for consistent formatting.

Run the linter:

```bash
npm run lint
```

Auto-format with Prettier (VSCode users: install the Prettier extension and enable "Format on Save"):

```bash
npx prettier --write .
```

**General conventions:**

- TypeScript everywhere — avoid `any` types unless truly necessary.
- React components use functional components with typed props.
- Keep components small and single-purpose; extract shared logic into `src/lib/` or `src/services/`.
- Server-side Firebase access goes through `src/lib/firebaseAdmin.ts` (Admin SDK). Client-side access uses `src/lib/firebase.ts` (client SDK).
- API routes live under `src/app/api/` and should validate input with Zod.

---

## Testing

### Unit tests

Run all unit tests:

```bash
npm test
```

Watch mode during development:

```bash
npm run test:watch
```

### Firestore security rules tests

Security rules tests require the Firestore emulator:

```bash
npm run test:rules
```

This command starts the emulator, runs the rules tests, then shuts down the emulator automatically.

**Please run both test suites before opening a PR.** PRs that break existing tests will not be merged until fixed.

### Writing new tests

- Unit tests live next to the code they test or in `src/__tests__/`.
- Security rules tests live in `src/__tests__/security-rules/`.
- Use Vitest APIs (`describe`, `it`, `expect`). Refer to existing test files for patterns.

---

## Local Seed Data

Use the seed script to populate the Firebase emulator with realistic sample data:

```bash
# Start emulators first
firebase emulators:start

# In another terminal
npm run seed
```

This creates sample users (members and mentors), projects, and roadmaps so you can test features without manually creating data.

---

## Questions?

Join the [CodeWithAhsan Discord](https://discord.gg/rEBSSh926k) and ask in the appropriate channel. We're happy to help new contributors get started.
