# Dashboard Redesign Specification

## 1. Overview
This specification details the technical changes required to transform the `MentorshipDashboardPage` into a "Command Center" layout using React components and Tailwind CSS.

## 2. Component Architecture

### 2.1 `DashboardLayout` (New Component)
- **Path**: `src/components/mentorship/dashboard/DashboardLayout.tsx`
- **Purpose**: Main container for the dashboard grid.
- **Props**:
  - `user`: Authenticated user.
  - `profile`: Mentorship profile.
  - `stats`: Dashboard stats.
  - `matches`: Active matches.
  - `requests`: Pending requests/invitations.
- **Layout**: CSS Grid with responsive breakpoints.
  - Mobile: Single column.
  - Desktop: 3-column grid (Sidebar/Main/Widgets or just Widgets).

### 2.2 `ActionRequiredWidget`
- **Path**: `src/components/mentorship/dashboard/ActionRequiredWidget.tsx`
- **Props**:
  - `requests`: `MentorshipRequest[]` (for mentors).
  - `invitations`: `ProjectInvitation[]` (for mentees/mentors).
  - `onAction`: `(id: string, action: 'approve' | 'decline') => Promise<void>` (callback for optimistic updates).
- **UI**:
  - Header: "Action Required" (Red badge if > 0).
  - Content: List of request cards with "Approve" (Green) and "Decline" (Red) buttons.
  - Empty State: "All caught up!" (or hide widget).

### 2.3 `ActiveMatchesWidget`
- **Path**: `src/components/mentorship/dashboard/ActiveMatchesWidget.tsx`
- **Props**:
  - `matches`: `MatchWithProfile[]`.
- **UI**:
  - Header: "Active Mentorships".
  - Content: Grid of `MatchCard` components.
  - `MatchCard`:
    - Avatar + Name + Role.
    - Status badge ("Active").
    - "Message" button (link to Discord DM).
    - "Dashboard" button (link to match dashboard).

### 2.4 `StatsWidget`
- **Path**: `src/components/mentorship/dashboard/StatsWidget.tsx`
- **Props**: `stats: DashboardStats`.
- **UI**: Row of counters (Active Matches, Completed, etc.).

### 2.5 `QuickLinksWidget`
- **Path**: `src/components/mentorship/dashboard/QuickLinksWidget.tsx`
- **Props**: None (static links).
- **UI**: Small grid of icons/links for secondary actions (Browse, Settings, Community).

## 3. Page Refactor Plan (`src/app/mentorship/dashboard/page.tsx`)
1.  **Imports**: Import new widgets.
2.  **Data Fetching**: Enhance `useEffect` to fetch pending requests/invitations alongside stats.
3.  **Render**: Replace existing grid with `<DashboardLayout>`.
    - Pass data to widgets.
    - Handle loading states with skeleton loaders inside widgets.

## 4. Styling (Tailwind)
- **Grid**: `grid grid-cols-1 md:grid-cols-3 gap-6`.
- **Widget Container**: `card bg-base-100 shadow-xl p-4`.
- **Headers**: `text-xl font-bold mb-4`.
- **Actions**: `btn btn-sm btn-primary/error`.
