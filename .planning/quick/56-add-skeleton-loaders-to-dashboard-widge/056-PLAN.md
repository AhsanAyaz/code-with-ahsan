---
phase: 56-add-skeleton-loaders-to-dashboard-widget
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/mentorship/dashboard/ActiveMatchesWidget.tsx
  - src/app/mentorship/dashboard/page.tsx
autonomous: true

must_haves:
  truths:
    - "Empty state messages are NOT shown while data is loading"
    - "ActiveMatchesWidget shows skeleton cards during fetch"
    - "Only after fetch completes and data is empty does the empty state appear"
  artifacts:
    - path: "src/components/mentorship/dashboard/ActiveMatchesWidget.tsx"
      provides: "loading prop and skeleton UI for active matches"
      contains: "loading"
    - path: "src/app/mentorship/dashboard/page.tsx"
      provides: "loadingMatches state tracking in DashboardContent"
      contains: "loadingMatches"
  key_links:
    - from: "src/app/mentorship/dashboard/page.tsx"
      to: "src/components/mentorship/dashboard/ActiveMatchesWidget.tsx"
      via: "loading prop passed from DashboardContent"
      pattern: "loading.*loadingMatches"
---

<objective>
Fix the premature empty state flash on the mentorship dashboard by adding skeleton loaders to ActiveMatchesWidget while its data loads from the API.

Purpose: Users currently see "You don't have any active mentees yet." immediately on page load before the fetch completes, which is confusing and looks broken.
Output: ActiveMatchesWidget shows animated skeleton placeholders during loading and only shows empty state after the fetch resolves with no data.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@src/components/mentorship/dashboard/ActiveMatchesWidget.tsx
@src/app/mentorship/dashboard/page.tsx
@src/components/mentorship/dashboard/MyProjectsWidget.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add loading prop and skeleton UI to ActiveMatchesWidget</name>
  <files>src/components/mentorship/dashboard/ActiveMatchesWidget.tsx</files>
  <action>
    Add a `loading?: boolean` prop to `ActiveMatchesWidgetProps`. When `loading` is true, return a skeleton card matching the widget's card structure instead of the real content.

    The skeleton should mirror the existing pattern used in MyProjectsWidget (which is already correct):
    - Outer card div: `className="card bg-base-100 shadow-xl col-span-1 md:col-span-2"`
    - Card body with a skeleton title bar: `className="h-7 w-48 bg-base-200 rounded animate-pulse mb-4"`
    - Two skeleton match cards in a grid: `className="h-24 bg-base-200 rounded-box animate-pulse"`

    Exact skeleton JSX to add as early return when loading is true:

    ```tsx
    if (loading) {
      return (
        <div className="card bg-base-100 shadow-xl col-span-1 md:col-span-2">
          <div className="card-body">
            <div className="h-7 w-48 bg-base-200 rounded animate-pulse mb-4"></div>
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-base-200 rounded-box animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    ```

    Update the function signature:
    ```tsx
    export default function ActiveMatchesWidget({
      matches,
      role,
      loading = false,
    }: ActiveMatchesWidgetProps) {
    ```

    Update the interface:
    ```tsx
    interface ActiveMatchesWidgetProps {
      matches: MatchWithProfile[];
      role: "mentor" | "mentee";
      loading?: boolean;
    }
    ```

    Do NOT change any other logic in the component.
  </action>
  <verify>TypeScript compilation: `npx tsc --noEmit` passes without errors in the widget file.</verify>
  <done>ActiveMatchesWidget accepts a `loading` prop; when true, renders two skeleton cards and the title skeleton instead of matches or empty state.</done>
</task>

<task type="auto">
  <name>Task 2: Track matches loading state and pass it to ActiveMatchesWidget</name>
  <files>src/app/mentorship/dashboard/page.tsx</files>
  <action>
    In `DashboardContent` (the sub-component, not the main page), the `fetchMatches` async call in `useEffect` currently starts with `matches` initialized to `[]`. Add a `loadingMatches` state to track whether the fetch is in progress.

    1. Add state at the top of `DashboardContent`, alongside the existing loading states:
       ```tsx
       const [loadingMatches, setLoadingMatches] = useState(true);
       ```

    2. In the `fetchMatches` function inside the `useEffect`, set `loadingMatches` to `false` in a `finally` block:
       ```tsx
       const fetchMatches = async () => {
         try {
           const response = await fetch(
             `/api/mentorship/my-matches?uid=${user.uid}&role=${profile.role}`,
           );
           if (response.ok) {
             const data = await response.json();
             setActiveMatches(data.activeMatches || []);
           }
         } catch (error) {
           console.error("Error fetching matches:", error);
         } finally {
           setLoadingMatches(false);
         }
       };
       ```

    3. Pass `loading={loadingMatches}` to `ActiveMatchesWidget` in the JSX:
       ```tsx
       <ActiveMatchesWidget
         matches={activeMatches}
         role={profile.role!}
         loading={loadingMatches}
       />
       ```

    Do NOT change the `handleAction` logic, the projects fetch, the roadmaps fetch, or any other part of `DashboardContent`.
  </action>
  <verify>
    1. `npx tsc --noEmit` passes with no errors.
    2. Run the dev server: `npm run dev`
    3. Visit http://localhost:3000/mentorship/dashboard while logged in — confirm the Active Mentorships widget shows animated skeleton placeholders briefly before the real content (or empty state) appears.
  </verify>
  <done>The Active Mentorships widget no longer shows an empty state message during the initial API fetch. It displays skeleton cards while loading, then shows real matches or the empty state once the fetch resolves.</done>
</task>

</tasks>

<verification>
After both tasks complete, the loading sequence for the Active Mentorships widget should be:
1. Page loads → `loadingMatches = true` → skeleton cards render
2. API fetch completes → `loadingMatches = false` → real data or empty state renders

Confirm no TypeScript errors: `npx tsc --noEmit`
</verification>

<success_criteria>
- Visiting /mentorship/dashboard no longer shows "You don't have any active mentees/mentors yet." during initial load
- The Active Mentorships widget shows two animated skeleton rectangles while loading
- After fetch resolves, empty state or real match cards appear correctly
- No regressions in MyProjectsWidget or MyRoadmapsWidget (they already have correct skeleton behavior)
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/56-add-skeleton-loaders-to-dashboard-widge/056-SUMMARY.md`
</output>
