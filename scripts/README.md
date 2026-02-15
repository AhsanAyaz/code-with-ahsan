# Scripts

Utility scripts for Code With Ahsan development and deployment.

## Release Management

### `create-release.sh`

Automated release creation script that generates release notes, creates tags, and publishes GitHub releases.

**Usage:**
```bash
./scripts/create-release.sh <version> [previous-version]
```

**Examples:**
```bash
# Create v2.1 release (auto-detects previous version)
./scripts/create-release.sh v2.1

# Create v2.1 release from specific previous version
./scripts/create-release.sh v2.1 v2.0
```

**What it does:**
1. ✅ Validates version doesn't already exist
2. 📝 Generates release notes from commits (features, fixes, docs)
3. 📊 Includes statistics (commits, contributors, files changed)
4. 🏷️ Creates annotated git tag
5. ⬆️ Pushes tag to remote
6. 🌐 Creates GitHub release using gh CLI

**Requirements:**
- Git
- GitHub CLI (`gh`) - [Install](https://cli.github.com/)
- Conventional commit messages (feat:, fix:, docs:, etc.)

**Release Notes Format:**
The script generates a `RELEASE_NOTES_<version>.md` file with:
- Features (commits starting with `feat:`)
- Bug fixes (commits starting with `fix:`)
- Documentation (commits starting with `docs:`, `refactor:`, `perf:`, `style:`)
- Statistics and changelog link

**Tips:**
- Use semantic versioning (e.g., v2.0, v2.1, v3.0)
- Follow conventional commit format for better release notes
- Review the generated release notes before confirming
- The script will prompt for confirmation before creating the release

## Other Scripts

### `generate-sitemap.js`

Generates XML sitemap for SEO (runs automatically in `npm run postbuild`).
