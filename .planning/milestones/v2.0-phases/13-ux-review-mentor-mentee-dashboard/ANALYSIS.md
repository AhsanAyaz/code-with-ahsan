# UX Analysis: Mentor & Mentee Dashboard

## 1. Executive Summary
The current dashboard follows a "Launchpad" pattern—a static grid of links. While functional, it fails to prioritize critical actions (pending requests) or provide immediate context (upcoming sessions). The proposed redesign shifts to a "Command Center" model using a Bento grid layout to surface actionable insights and improve user efficiency.

## 2. Current State Audit
- **Layout**: Grid of equal-sized cards.
- **Components**:
  - **Header**: User info + Role badge.
  - **Stats**: Row of 3-4 counters.
  - **Navigation**: 8-10 cards mixing operational tasks (Matches) with discovery (Browse).
  - **Guidelines**: Text-heavy accordions at the bottom.
- **Key Issues**:
  - **Visual Noise**: Discovery links dominate the view, distracting from core mentorship tasks.
  - **Buried Signals**: Pending requests are hidden in a card with a small badge.
  - **Lack of Urgency**: No visual distinction for time-sensitive tasks.
  - **Redundancy**: Many links duplicate global navigation.

## 3. Redesign Goals (2026 Standards)
1.  **Prioritize Action**: "Action Required" items must be the first thing a user sees.
2.  **Contextual Awareness**: Show "Next Session" or "Active Goals" directly on the dashboard.
3.  **Visual Hierarchy**: Use size/position (Bento grid) to denote importance.
4.  **Simplified Navigation**: Move static links to a secondary area or sidebar.

## 4. Proposed Layout Structure
**Header**:
- Welcome Message + "Daily Briefing" (e.g., "You have 2 pending requests").

**Primary Zone (Top-Left/Center)**:
- **"Action Required" Widget**:
  - Pending Requests/Invitations (List with Approve/Decline actions).
  - Upcoming Sessions (Next 24h).

**Secondary Zone (Top-Right)**:
- **"My Stats" Widget**:
  - Mini-charts for Goals/Roadmaps.
  - Active Match count.

**Tertiary Zone (Bottom)**:
- **"Active Mentorships" Grid**:
  - Cards for each active match with quick status.
- **"Quick Links" Footer**:
  - Small, unobtrusive links for Browse, Settings, Community.

## 5. Component Specifications
### 5.1 `ActionRequiredWidget`
- **Props**: `requests: MentorshipRequest[]`, `invitations: ProjectInvitation[]`.
- **State**: `loading` (optimistic UI for actions).
- **Behavior**: Lists items. Approve/Decline triggers API and removes item from list.

### 5.2 `ActiveMentorshipsWidget`
- **Props**: `matches: MatchWithProfile[]`.
- **Display**: Grid of `MatchCard` components (Avatar, Name, Role, Status).
- **Action**: Click navigates to match dashboard.

### 5.3 `DashboardStatsWidget`
- **Props**: `stats: DashboardStats`.
- **Display**: Visual counters with trend indicators (if available).
