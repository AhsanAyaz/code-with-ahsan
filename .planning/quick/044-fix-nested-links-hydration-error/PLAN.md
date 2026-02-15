# Quick Task: Fix Nested Links Hydration Error

## Goal
Resolve the React hydration error caused by nested `<a>` tags (using Next.js `<Link>` inside another `<Link>`) in the `MyProjectsWidget` component.

## Tasks
- [x] **Un-nest Links**: Moved the "Edit" button `<Link>` outside of the main project card `<Link>`.
- [x] **Adjust Positioning**: Used `absolute` positioning for the Edit button to maintain its visual location within the card without being a DOM child of the main link.
- [x] **Adjust Padding**: Moved `p-6` from the parent `div` to the main `<Link>` to ensure the entire card area is clickable while keeping the Edit button correctly aligned.

## UX Improvements
- **Stability**: Prevents hydration mismatches and potential browser rendering issues.
- **Accessibility**: Corrects invalid HTML structure where links were inside links.
