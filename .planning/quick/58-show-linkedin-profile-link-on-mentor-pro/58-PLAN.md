---
phase: 58-show-linkedin-profile-link-on-mentor-pro
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/types/mentorship.ts
  - src/components/mentorship/MentorRegistrationForm.tsx
  - src/app/api/mentorship/mentors/[username]/route.ts
  - src/app/mentorship/mentors/[username]/MentorProfileClient.tsx
  - src/app/profile/page.tsx
autonomous: true
requirements: [QUICK-58]

must_haves:
  truths:
    - "Mentors can enter a LinkedIn URL during registration"
    - "Mentor's LinkedIn URL is persisted and returned by the public profile API"
    - "Mentor profile page displays a clickable LinkedIn link near the mentor's name/role"
    - "LinkedIn link opens in a new tab with rel=noopener noreferrer"
  artifacts:
    - path: "src/types/mentorship.ts"
      provides: "linkedinUrl optional field on MentorshipProfile and PublicMentor"
      contains: "linkedinUrl?: string"
    - path: "src/components/mentorship/MentorRegistrationForm.tsx"
      provides: "LinkedIn URL input field wired to state and submitted with form data"
    - path: "src/app/api/mentorship/mentors/[username]/route.ts"
      provides: "linkedinUrl included in mentor response object"
    - path: "src/app/mentorship/mentors/[username]/MentorProfileClient.tsx"
      provides: "LinkedIn anchor tag in profile header"
    - path: "src/app/profile/page.tsx"
      provides: "linkedinUrl included in mentorInitialData"
  key_links:
    - from: "MentorRegistrationForm.tsx"
      to: "Firestore via onSubmit"
      via: "linkedinUrl field in submitted data object (line 334 pattern)"
      pattern: "linkedinUrl.*trim"
    - from: "route.ts mentor object"
      to: "MentorProfileClient.tsx"
      via: "linkedinUrl property on MentorProfileDetails"
      pattern: "linkedinUrl.*profileData"
---

<objective>
Add a `linkedinUrl` field to mentor profiles so mentors can surface their LinkedIn presence publicly on their profile page.

Purpose: Mentors currently submit a CV/LinkedIn URL (stored as `cvUrl`) during registration but it is never surfaced publicly. This adds a dedicated `linkedinUrl` field that is collected during registration, stored, exposed via the public API, and rendered on the mentor profile page.
Output: Five files updated — types, registration form, API route, profile display component, and profile page initial data.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add linkedinUrl to types and wire through data layer</name>
  <files>
    src/types/mentorship.ts
    src/app/api/mentorship/mentors/[username]/route.ts
    src/app/profile/page.tsx
  </files>
  <action>
    **src/types/mentorship.ts**
    - In `MentorshipProfile` (line 32, after `cvUrl?: string`), add: `linkedinUrl?: string; // Public LinkedIn profile URL`
    - In `PublicMentor` (line 64, after `isAtCapacity?: boolean`), add: `linkedinUrl?: string;`
    Note: `MentorProfileDetails` extends `PublicMentor` so it inherits `linkedinUrl` automatically — no change needed there.

    **src/app/api/mentorship/mentors/[username]/route.ts**
    - In the `mentor` object literal (lines 97-117), after `status: profileData.status,`, add: `linkedinUrl: profileData.linkedinUrl,`

    **src/app/profile/page.tsx**
    - In `mentorInitialData` (around line 225, after `cvUrl: profile.cvUrl || ""`), add: `linkedinUrl: profile.linkedinUrl || "",`
  </action>
  <verify>Run `npx tsc --noEmit` — should produce zero type errors related to linkedinUrl.</verify>
  <done>TypeScript compiles cleanly; `linkedinUrl` is present on `MentorshipProfile`, `PublicMentor`, the API response object, and `mentorInitialData`.</done>
</task>

<task type="auto">
  <name>Task 2: Add LinkedIn URL input to MentorRegistrationForm</name>
  <files>src/components/mentorship/MentorRegistrationForm.tsx</files>
  <action>
    **State** — After `const [cvUrl, setCvUrl] = useState(initialData?.cvUrl || "");` (line 74), add:
    ```
    const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedinUrl || "");
    ```

    **initialData interface** — In `MentorRegistrationFormProps.initialData` (around line 15-29), add `linkedinUrl?: string;` after `cvUrl?: string;`.

    **Form submission** — In the data object passed to `onSubmit` (around line 334, where `cvUrl: cvUrl.trim()` lives), add: `linkedinUrl: linkedinUrl.trim(),`

    **Input field** — Directly after the closing `</div>` of the "CV/Resume URL" form-control block (after line 730), and still inside the two-column grid `div` (the grid currently only has CV + Max Mentees), insert a new row below the grid with a standalone form-control for LinkedIn URL:

    ```jsx
    {/* LinkedIn Profile URL */}
    <div className="form-control">
      <label className="label">
        <span className="label-text font-semibold">LinkedIn Profile URL</span>
        <span className="label-text-alt text-base-content/60">Optional</span>
      </label>
      <input
        type="url"
        placeholder="https://linkedin.com/in/your-profile"
        className="input input-bordered w-full"
        value={linkedinUrl}
        onChange={(e) => setLinkedinUrl(e.target.value)}
      />
      <label className="label">
        <span className="label-text-alt text-base-content/60">
          Shown publicly on your mentor profile
        </span>
      </label>
    </div>
    ```

    Place this new form-control block after the existing CV/Max Mentees two-column grid (outside that grid div) so it spans full width and does not disturb existing layout.
  </action>
  <verify>
    1. Run `npx tsc --noEmit` — no errors.
    2. Load `/profile` as a mentor in the browser and confirm the LinkedIn URL input appears below the CV/Max Mentees row, pre-populated from saved data.
  </verify>
  <done>LinkedIn URL input is visible in the registration/edit form, its value is included in the onSubmit payload, and TypeScript is satisfied.</done>
</task>

<task type="auto">
  <name>Task 3: Display LinkedIn link on mentor public profile page</name>
  <files>src/app/mentorship/mentors/[username]/MentorProfileClient.tsx</files>
  <action>
    In the profile header info section (after line 553, directly after the `{mentor.currentRole && ...}` block and before the `{/* Stats */}` comment), insert:

    ```jsx
    {mentor.linkedinUrl && (
      <a
        href={mentor.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
      >
        {/* LinkedIn icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        LinkedIn Profile
      </a>
    )}
    ```

    This renders only when `mentor.linkedinUrl` is truthy, placed between the currentRole paragraph and the Stats row so it sits naturally in the header info block.
  </action>
  <verify>
    1. Run `npx tsc --noEmit` — no errors.
    2. Visit a mentor's public profile page (`/mentorship/mentors/[username]`) for a mentor who has a `linkedinUrl` saved — confirm the LinkedIn link appears below their role with the icon, and clicking it opens in a new tab.
    3. For a mentor without `linkedinUrl`, confirm no link element is rendered.
  </verify>
  <done>Mentor profile page conditionally shows a linked LinkedIn button with icon in the header, opening in a new tab, only when `linkedinUrl` is present.</done>
</task>

</tasks>

<verification>
Run `npx tsc --noEmit` — zero type errors.
Manually test end-to-end: save a LinkedIn URL on the profile edit page, then view the public mentor profile page and confirm the link is displayed and navigates correctly.
</verification>

<success_criteria>
- `linkedinUrl?: string` exists on both `MentorshipProfile` and `PublicMentor` in `src/types/mentorship.ts`
- Mentor registration/edit form has a LinkedIn URL input that persists on save
- Public mentor API response (`/api/mentorship/mentors/[username]`) includes `linkedinUrl`
- Mentor public profile page shows a clickable LinkedIn link with icon when `linkedinUrl` is set
- Link uses `target="_blank" rel="noopener noreferrer"`
- TypeScript compiles with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/58-show-linkedin-profile-link-on-mentor-pro/58-SUMMARY.md`
</output>
