#!/bin/bash
# Automated release creation script for Code With Ahsan
# Usage: ./scripts/create-release.sh <version> [previous-version]
# Example: ./scripts/create-release.sh v2.1 v2.0

set -e

VERSION=$1
PREV_VERSION=${2:-$(git describe --tags --abbrev=0 2>/dev/null || echo "v1.0")}

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version> [previous-version]"
  echo "Example: $0 v2.1 v2.0"
  exit 1
fi

echo "🚀 Creating release $VERSION (from $PREV_VERSION)"
echo ""

# Check if tag already exists
if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "❌ Tag $VERSION already exists!"
  exit 1
fi

# Ensure we're on main and up to date
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  Warning: You're on branch '$CURRENT_BRANCH', not 'main'"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Generate release notes
NOTES_FILE="RELEASE_NOTES_${VERSION}.md"
echo "📝 Generating release notes..."

cat > "$NOTES_FILE" << EOF
# Code With Ahsan $VERSION

**Release Date:** $(date +"%B %d, %Y")

## What's New

### ✨ Features
EOF

git log ${PREV_VERSION}..HEAD --pretty=format:"%s" | grep "^feat" | sed 's/^feat/\-/' >> "$NOTES_FILE"

cat >> "$NOTES_FILE" << EOF

### 🐛 Bug Fixes
EOF

git log ${PREV_VERSION}..HEAD --pretty=format:"%s" | grep "^fix" | sed 's/^fix/\-/' >> "$NOTES_FILE"

cat >> "$NOTES_FILE" << EOF

### 📚 Documentation & Improvements
EOF

git log ${PREV_VERSION}..HEAD --pretty=format:"%s" | grep "^docs\|^refactor\|^perf\|^style" | sed 's/^docs/\-/; s/^refactor/\-/; s/^perf/\-/; s/^style/\-/' >> "$NOTES_FILE"

cat >> "$NOTES_FILE" << EOF

## 📊 Statistics

EOF

COMMIT_COUNT=$(git log ${PREV_VERSION}..HEAD --oneline | wc -l | tr -d ' ')
AUTHOR_COUNT=$(git log ${PREV_VERSION}..HEAD --format='%an' | sort -u | wc -l | tr -d ' ')
FILES_CHANGED=$(git diff --shortstat ${PREV_VERSION} HEAD | awk '{print $1}' || echo "0")
INSERTIONS=$(git diff --shortstat ${PREV_VERSION} HEAD | awk '{print $4}' || echo "0")
DELETIONS=$(git diff --shortstat ${PREV_VERSION} HEAD | awk '{print $6}' || echo "0")

cat >> "$NOTES_FILE" << EOF
- **${COMMIT_COUNT}** commits since ${PREV_VERSION}
- **${AUTHOR_COUNT}** contributor(s)
- **${FILES_CHANGED}** files changed
- **${INSERTIONS}** insertions (+), **${DELETIONS}** deletions (-)

---

**Full Changelog:** https://github.com/AhsanAyaz/code-with-ahsan/compare/${PREV_VERSION}...${VERSION}
EOF

echo "✅ Release notes created: $NOTES_FILE"
echo ""

# Show preview
echo "📄 Release notes preview:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
head -30 "$NOTES_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Confirm
read -p "Create tag and GitHub release for $VERSION? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Cancelled"
  exit 1
fi

# Create annotated tag
echo "🏷️  Creating tag..."
git tag -a "$VERSION" -m "Release $VERSION

See $NOTES_FILE for full details."

# Push tag
echo "⬆️  Pushing tag to remote..."
git push origin "$VERSION"

# Create GitHub release
echo "🌐 Creating GitHub release..."
if command -v gh &> /dev/null; then
  gh release create "$VERSION" \
    --title "$VERSION" \
    --notes-file "$NOTES_FILE" \
    --latest

  echo ""
  echo "✅ Release created successfully!"
  echo "🔗 https://github.com/AhsanAyaz/code-with-ahsan/releases/tag/$VERSION"
else
  echo "⚠️  gh CLI not found. Tag pushed but GitHub release not created."
  echo "   Install gh CLI: https://cli.github.com/"
  echo "   Or create release manually: https://github.com/AhsanAyaz/code-with-ahsan/releases/new?tag=$VERSION"
fi

echo ""
echo "🎉 Done!"
