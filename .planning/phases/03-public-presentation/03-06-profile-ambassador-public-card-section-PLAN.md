---
phase: 3
plan: "03-06"
title: "/profile 'Ambassador Public Card' editing section (PRESENT-03 + PRESENT-04 edit side)"
wave: 3
depends_on: ["03-03"]
files_modified:
  - "src/app/profile/AmbassadorPublicCardSection.tsx"
  - "src/app/profile/page.tsx"
autonomous: true
requirements:
  - "PRESENT-03"
  - "PRESENT-04"
must_haves:
  - "Authenticated users whose `profile.roles` contains `\"ambassador\"` or `\"alumni-ambassador\"` see a new 'Ambassador Public Card' section on `/profile` — the section is NOT rendered for any other role (D-05, gated via `hasRole`)."
  - "The section edits all seven public fields (university, city, publicTagline, twitterUrl, githubUrl, personalSiteUrl, cohortPresentationVideoUrl) and submits them to `PATCH /api/ambassador/profile` (the endpoint from plan 03-03) — no direct Firestore writes from the client."
  - "The cohort presentation video URL field shows a live `VideoEmbed` preview below the input once the URL classifies to a known type via `isValidVideoUrl` + `classifyVideoUrl` (PRESENT-04 edit side); unknown or empty values show no preview."
  - "Save success and save failure both surface via `useToast()` — matching the existing `/profile` page conventions — and the form re-hydrates from the PATCH response so the UI never shows stale state."
---

<objective>
Ship the editing surface that turns the ambassador subdoc's public fields into something an ambassador can actually curate (PRESENT-03), plus the URL-paste UX for the cohort presentation video with inline preview (PRESENT-04 edit side). All the writes land on `PATCH /api/ambassador/profile` from plan 03-03 — this plan intentionally adds zero server-side logic. It introduces one new client component (`AmbassadorPublicCardSection`) that sits on the existing `/profile` page between the "Ambassador Application Status" section and the "Skill Level" card, fully gated by `hasRole(profile, "ambassador") || hasRole(profile, "alumni-ambassador")` so non-ambassador users never see it. Form UX follows the toast + `authFetch` conventions already used elsewhere on the page; video preview reuses the existing Phase 2 `VideoEmbed` component and `videoUrl.ts` classifier with zero new validators.
</objective>

<context>
- Depends on plan 03-03 (`PATCH /api/ambassador/profile` AND `GET /api/ambassador/profile`) — both endpoints MUST exist before this section can hydrate/save. Plan 03-03 Task 1 ships PATCH; Plan 03-03 Task 2 ships GET alongside it. By the time 03-03 is merged, both handlers live in `src/app/api/ambassador/profile/route.ts`.
- Does NOT depend on plans 03-04 or 03-05 — the form can ship independently of the public-facing render.
- Firestore Admin SDK guardrail: this plan only sends JSON to an HTTP endpoint; it does not write to Firestore directly. The guardrail concern is fully absorbed by plan 03-03's handler.
- Form state management: prefer React local `useState` per-field. No Zod on the client — the server is the source of truth for validation; the client only prevents obvious nulls and gives inline URL feedback for the video field.
- Initial field values: load from the GET handler Plan 03-03 Task 2 ships. Task 0 below is a hard pre-flight assertion — if the GET handler is missing, this plan STOPS with a pointer back to 03-03 Task 2. No inline "decide at execution" branching.
</context>

<tasks>

<task id="0" title="Pre-flight assertion — GET /api/ambassador/profile must exist">
  <read_first>
    - src/app/api/ambassador/profile/route.ts (must already exist from plan 03-03)
    - .planning/phases/03-public-presentation/03-03-patch-ambassador-profile-endpoint-PLAN.md (Task 2 defines the GET handler)
  </read_first>
  <action>
    Run this single assertion. It is a gate, not a decision. The form loader in Task 1 calls `GET /api/ambassador/profile`; plan 03-03 Task 2 is the agreed source for that handler. If either the file is missing or the GET export is absent, STOP this plan and hand back to the orchestrator with a pointer to plan 03-03 Task 2.

    ```bash
    test -f src/app/api/ambassador/profile/route.ts \
      && grep -q "export async function GET" src/app/api/ambassador/profile/route.ts \
      || {
        echo "STOP: GET /api/ambassador/profile is missing."
        echo "Plan 03-06 requires the GET handler shipped by Plan 03-03 Task 2."
        echo "Either execute Plan 03-03 first, or revisit it if Task 2 was skipped."
        exit 1
      }
    ```

    Additionally confirm the PATCH handler is present (sanity — Plan 03-03 Task 1 should have shipped it):

    ```bash
    grep -q "export async function PATCH" src/app/api/ambassador/profile/route.ts \
      || { echo "STOP: PATCH /api/ambassador/profile is missing — Plan 03-03 Task 1 incomplete."; exit 1; }
    ```

    No files are created or modified in this task. On success, proceed to Task 1.
  </action>
  <acceptance_criteria>
    - `test -f src/app/api/ambassador/profile/route.ts` exits 0.
    - `grep -q "export async function GET" src/app/api/ambassador/profile/route.ts` exits 0.
    - `grep -q "export async function PATCH" src/app/api/ambassador/profile/route.ts` exits 0.
    - No new files created, no existing files modified.
  </acceptance_criteria>
</task>

<task id="1" title="Create AmbassadorPublicCardSection client component">
  <read_first>
    - src/app/profile/page.tsx (existing section-card pattern, useToast + authFetch imports, role-gated-section precedent at line 307)
    - src/app/profile/AmbassadorApplicationStatus.tsx (existing Phase-2 ambassador subsection — closest visual + data-loading precedent)
    - src/lib/ambassador/videoUrl.ts (isValidVideoUrl, classifyVideoUrl — reuse for inline preview)
    - src/app/admin/ambassadors/[applicationId]/VideoEmbed.tsx (shared Phase-2 VideoEmbed — reuse)
    - src/lib/permissions.ts (hasRole)
    - src/contexts/ToastContext.tsx (useToast API)
    - src/lib/apiClient.ts (authFetch API)
    - src/types/ambassador.ts (AmbassadorPublicFieldsInput, VideoEmbedType)
  </read_first>
  <action>
    Create `src/app/profile/AmbassadorPublicCardSection.tsx` as a client component. Co-locate with `AmbassadorApplicationStatus.tsx` — both are `/profile`-local ambassador concerns.

    Responsibilities:
    1. On mount, call `GET /api/ambassador/profile` via `authFetch`; hydrate seven input fields from the response. Show nothing (or a skeleton) until the load resolves — avoids layout shift, matches the `AmbassadorApplicationStatus` pattern.
    2. Render a DaisyUI `card bg-base-100 shadow-xl` wrapping a `<form>` with these controls:
       - `university` — `<input type="text">` (max 120 chars, native `maxLength` attr; optional)
       - `city` — `<input type="text">` (max 120 chars; optional)
       - `publicTagline` — `<textarea rows={2}>` (max 120 chars, with a live `X / 120` counter under the textarea — classic DaisyUI `label-text-alt` pattern)
       - `twitterUrl`, `githubUrl`, `personalSiteUrl` — `<input type="url">` each (optional)
       - `cohortPresentationVideoUrl` — `<input type="url">` (optional)
    3. Below the video URL input, render a LIVE preview region:
       - Compute `classifyVideoUrl(value)` on every keystroke (local state).
       - If the classification is `"youtube" | "loom" | "drive"` AND `isValidVideoUrl(value)` returns true, render `<VideoEmbed videoUrl={value} videoEmbedType={classification} />` inside a bordered div. Otherwise render nothing (no error message — the server is the authority; inline error only if the URL is obviously malformed and non-empty).
    4. Submit handler:
       - Build a payload object including only fields that differ from the hydrated baseline AND are non-empty (to send empty-string clears, include them explicitly as `""` — the PATCH handler from plan 03-03 uses `FieldValue.delete()` for empty strings per D-05a).
       - Wait — this is subtle. Re-check plan 03-03 task description: it specifies "`FieldValue.delete()` for empty-string clears" which means the CLIENT should send `""` to indicate "clear this field". So: include every field that's changed (even if cleared), as `""` (cleared) or the new value.
       - Reject submit if every field is untouched (no-op UX — disable the Save button).
       - Fire `await authFetch('/api/ambassador/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })`.
       - On 200: re-hydrate from response, `toast.success("Public card updated")`.
       - On 4xx/5xx: parse `{ error }` if present, `toast.error(error ?? "Could not save")`.
       - Disable the submit button while in-flight; show a DaisyUI spinner inside the button (`<span className="loading loading-spinner loading-sm" />`).
    5. Accessibility: every input has a `<label htmlFor>`, error text is `role="alert"`, the form uses `<form onSubmit={(e) => { e.preventDefault(); void save(); }}>`.

    The component accepts ZERO props — it's a self-contained card that reads the current user from `useMentorship()` the same way `AmbassadorApplicationStatus.tsx` does.

    Skeleton contents (executor fills in the standard React boilerplate):

    ```tsx
    "use client";
    import { useEffect, useMemo, useState } from "react";
    import { useMentorship } from "@/contexts/MentorshipContext";
    import { useToast } from "@/contexts/ToastContext";
    import { authFetch } from "@/lib/apiClient";
    import { classifyVideoUrl, isValidVideoUrl } from "@/lib/ambassador/videoUrl";
    import VideoEmbed from "@/app/admin/ambassadors/[applicationId]/VideoEmbed";
    import type { VideoEmbedType } from "@/types/ambassador";

    type PublicFieldsState = {
      university: string;
      city: string;
      publicTagline: string;
      twitterUrl: string;
      githubUrl: string;
      personalSiteUrl: string;
      cohortPresentationVideoUrl: string;
    };

    const EMPTY: PublicFieldsState = {
      university: "",
      city: "",
      publicTagline: "",
      twitterUrl: "",
      githubUrl: "",
      personalSiteUrl: "",
      cohortPresentationVideoUrl: "",
    };

    export default function AmbassadorPublicCardSection() {
      const { user } = useMentorship();
      const toast = useToast();

      const [loaded, setLoaded] = useState(false);
      const [initial, setInitial] = useState<PublicFieldsState>(EMPTY);
      const [form, setForm] = useState<PublicFieldsState>(EMPTY);
      const [saving, setSaving] = useState(false);

      useEffect(() => {
        if (!user) return;
        (async () => {
          try {
            const res = await authFetch("/api/ambassador/profile");
            if (!res.ok) {
              setLoaded(true);
              return;
            }
            const body = (await res.json()) as Partial<PublicFieldsState>;
            const hydrated: PublicFieldsState = { ...EMPTY, ...body };
            setInitial(hydrated);
            setForm(hydrated);
          } finally {
            setLoaded(true);
          }
        })();
      }, [user]);

      // Derived video preview
      const videoType: VideoEmbedType = useMemo(
        () => classifyVideoUrl(form.cohortPresentationVideoUrl),
        [form.cohortPresentationVideoUrl]
      );
      const videoPreviewable =
        form.cohortPresentationVideoUrl.trim().length > 0 &&
        isValidVideoUrl(form.cohortPresentationVideoUrl) &&
        videoType !== "unknown";

      const dirty = useMemo(
        () =>
          (Object.keys(initial) as (keyof PublicFieldsState)[]).some(
            (k) => initial[k] !== form[k]
          ),
        [initial, form]
      );

      async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!dirty || saving) return;
        setSaving(true);
        try {
          // Send every field that differs from the baseline — empty strings
          // are meaningful to the server (they trigger FieldValue.delete()).
          const payload: Partial<PublicFieldsState> = {};
          (Object.keys(initial) as (keyof PublicFieldsState)[]).forEach((k) => {
            if (initial[k] !== form[k]) payload[k] = form[k];
          });

          const res = await authFetch("/api/ambassador/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const { error } = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            toast.error(error ?? "Could not save your public card");
            return;
          }

          const body = (await res.json()) as Partial<PublicFieldsState>;
          const hydrated: PublicFieldsState = { ...EMPTY, ...body };
          setInitial(hydrated);
          setForm(hydrated);
          toast.success("Public card updated");
        } catch {
          toast.error("Network error — try again");
        } finally {
          setSaving(false);
        }
      }

      // Loader skeleton — avoids flash of empty form.
      if (!loaded) return null;

      const update =
        (k: keyof PublicFieldsState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setForm((f) => ({ ...f, [k]: e.target.value }));

      return (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-4">
            <h3 className="card-title">🎓 Ambassador Public Card</h3>
            <p className="text-sm text-base-content/70">
              This is what people see on your public ambassador card and on
              the public /ambassadors page. Only fill in what you want to share.
            </p>

            <div className="divider my-0"></div>

            <form onSubmit={save} className="space-y-4">
              {/* university + city */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label" htmlFor="ap-university">
                    <span className="label-text font-semibold">University</span>
                  </label>
                  <input
                    id="ap-university"
                    type="text"
                    maxLength={120}
                    className="input input-bordered"
                    value={form.university}
                    onChange={update("university")}
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="ap-city">
                    <span className="label-text font-semibold">City</span>
                  </label>
                  <input
                    id="ap-city"
                    type="text"
                    maxLength={120}
                    className="input input-bordered"
                    value={form.city}
                    onChange={update("city")}
                  />
                </div>
              </div>

              {/* publicTagline */}
              <div className="form-control">
                <label className="label" htmlFor="ap-tagline">
                  <span className="label-text font-semibold">
                    Public tagline
                  </span>
                </label>
                <textarea
                  id="ap-tagline"
                  rows={2}
                  maxLength={120}
                  className="textarea textarea-bordered"
                  value={form.publicTagline}
                  onChange={update("publicTagline")}
                  placeholder="A one-line intro people see on your public card"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {form.publicTagline.length} / 120
                  </span>
                </label>
              </div>

              {/* social links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label" htmlFor="ap-twitter">
                    <span className="label-text font-semibold">Twitter URL</span>
                  </label>
                  <input
                    id="ap-twitter"
                    type="url"
                    className="input input-bordered"
                    value={form.twitterUrl}
                    onChange={update("twitterUrl")}
                    placeholder="https://twitter.com/you"
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="ap-github">
                    <span className="label-text font-semibold">GitHub URL</span>
                  </label>
                  <input
                    id="ap-github"
                    type="url"
                    className="input input-bordered"
                    value={form.githubUrl}
                    onChange={update("githubUrl")}
                    placeholder="https://github.com/you"
                  />
                </div>
                <div className="form-control">
                  <label className="label" htmlFor="ap-site">
                    <span className="label-text font-semibold">
                      Personal site
                    </span>
                  </label>
                  <input
                    id="ap-site"
                    type="url"
                    className="input input-bordered"
                    value={form.personalSiteUrl}
                    onChange={update("personalSiteUrl")}
                    placeholder="https://yourname.dev"
                  />
                </div>
              </div>

              {/* cohort presentation video */}
              <div className="form-control">
                <label className="label" htmlFor="ap-video">
                  <span className="label-text font-semibold">
                    Cohort presentation video URL
                  </span>
                  <span className="label-text-alt text-base-content/60">
                    YouTube · Loom · Google Drive
                  </span>
                </label>
                <input
                  id="ap-video"
                  type="url"
                  className="input input-bordered"
                  value={form.cohortPresentationVideoUrl}
                  onChange={update("cohortPresentationVideoUrl")}
                  placeholder="https://..."
                />
                {videoPreviewable && (
                  <div className="mt-3 border border-base-300 rounded-lg overflow-hidden">
                    <VideoEmbed
                      videoUrl={form.cohortPresentationVideoUrl}
                      videoEmbedType={videoType}
                    />
                  </div>
                )}
              </div>

              <div className="card-actions justify-end pt-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!dirty || saving}
                >
                  {saving && (
                    <span className="loading loading-spinner loading-sm mr-2" />
                  )}
                  {saving ? "Saving…" : "Save public card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }
    ```

    Reminder: the PATCH handler from plan 03-03 treats empty strings as "clear this field" via `FieldValue.delete()`. The client's job is therefore to SEND empty strings for intentionally-cleared fields (already handled via the `initial[k] !== form[k]` diff above).
  </action>
  <acceptance_criteria>
    - `src/app/profile/AmbassadorPublicCardSection.tsx` exists with the above content and compiles.
    - Loading the component without an authenticated user renders nothing.
    - Loading with a real ambassador user hydrates from `GET /api/ambassador/profile` and shows the form pre-filled.
    - Typing a valid YouTube/Loom/Drive URL in the video field shows the inline preview; clearing the field hides the preview.
    - Save is disabled until a field changes.
    - Save success calls `toast.success(...)` and re-hydrates from the PATCH response.
    - Save failure calls `toast.error(...)` with the server-provided error string when present.
    - `npx tsc --noEmit` passes.
    - `npm run lint -- src/app/profile/AmbassadorPublicCardSection.tsx` passes.
  </acceptance_criteria>
</task>

<task id="2" title="Wire the section into /profile page with role gating">
  <read_first>
    - src/app/profile/page.tsx (specifically the block near line 306-310 where `AmbassadorApplicationStatus` is rendered)
    - src/lib/permissions.ts (hasRole)
  </read_first>
  <action>
    Edit `src/app/profile/page.tsx`:

    1. Add import at the top alongside the existing `AmbassadorApplicationStatus` import:
       ```tsx
       import AmbassadorPublicCardSection from "./AmbassadorPublicCardSection";
       ```
    2. Locate the existing block (around line 306-307):
       ```tsx
       {/* Ambassador Application Status (APPLY-07) — feature-gated */}
       {isAmbassadorProgramEnabled() && <AmbassadorApplicationStatus />}
       ```
       Immediately AFTER that block, insert:
       ```tsx
       {/* Ambassador Public Card (PRESENT-03) — role-gated + feature-gated */}
       {isAmbassadorProgramEnabled() &&
         profile &&
         (hasRole(profile, "ambassador") ||
           hasRole(profile, "alumni-ambassador")) && (
           <AmbassadorPublicCardSection />
         )}
       ```

    Gating rules (in order):
    - `isAmbassadorProgramEnabled()` — feature flag must be on.
    - `profile` — must have loaded (already handled earlier in the page render tree, but the null-guard is defensive since we're outside that block).
    - `hasRole(profile, "ambassador") || hasRole(profile, "alumni-ambassador")` — only actual ambassadors see the section. Applicants who have NOT been accepted see nothing (the Application Status section above already covers their state).

    `hasRole` is already imported at line 17 (`import { hasRole } from "@/lib/permissions";`), so no additional import is needed beyond the component itself.

    Do not modify any other code in `page.tsx`. The section slots in cleanly between "Ambassador Application Status" and "Skill Level" per D-05.
  </action>
  <acceptance_criteria>
    - `src/app/profile/page.tsx` diff is exactly: one new import line + one new conditional render block.
    - `/profile` as an unauthenticated user: no change (redirect to login as before).
    - `/profile` as a logged-in user with NO ambassador role: no change (no new section).
    - `/profile` as a logged-in user with `"ambassador"` role: the new "Ambassador Public Card" section appears between the application-status card and the skill-level card.
    - `/profile` as a logged-in user with `"alumni-ambassador"` role: the new section appears (D-05 — alumni keep the surface).
    - `/profile` with `FEATURE_AMBASSADOR_PROGRAM=false`: the new section is NOT rendered (matches the application-status gating).
    - `npx tsc --noEmit` passes.
    - `npm run lint -- src/app/profile/page.tsx` passes.
    - `npm run build` completes without errors.
  </acceptance_criteria>
</task>

</tasks>

<verification>
Phase-level /profile truth after all three tasks merge:

1. **Unauthenticated route guard** (existing): visit `/profile` without auth → redirects to login. No change, no regression.

2. **Non-ambassador user** (existing behavior preserved): log in as a user whose `profile.roles` does NOT include `ambassador` or `alumni-ambassador`; confirm the "Ambassador Public Card" section does NOT appear.

3. **Ambassador happy path** (PRESENT-03):
   - Log in as a user with `roles: ["ambassador"]`.
   - Confirm the "Ambassador Public Card" section renders with fields pre-filled from the current subdoc.
   - Edit `publicTagline`, save. Confirm toast success, re-hydrated value persists on reload.
   - Clear `twitterUrl` (set to empty). Save. Confirm the server deletes the field (verify via Firestore console — subdoc no longer has `twitterUrl`).

4. **Video preview** (PRESENT-04 edit side):
   - Paste a YouTube URL into the video field. Confirm `LiteYouTubeEmbed` appears below the input.
   - Paste a Loom URL. Confirm the Loom iframe appears.
   - Paste a Google Drive share link. Confirm the Drive iframe appears.
   - Paste random text. Confirm no preview renders.
   - Save. Confirm the value persists and the public card on `/ambassadors` (after plan 03-05 merges) shows the embed.

5. **Alumni ambassador**:
   - Change a test user's `profile.roles` to include `"alumni-ambassador"` instead of `"ambassador"`. Reload `/profile`. Confirm the section still renders and is still editable (D-05 — alumni keep the public card).

6. **Feature flag off**:
   - Set `FEATURE_AMBASSADOR_PROGRAM=false`. Restart dev. Reload `/profile`. Confirm the new section does NOT render.

No automated test file is added in this plan. Reasoning: the component is a thin form against an already-tested endpoint (plan 03-03 ships its own tests), and React integration testing on `/profile` is not an established pattern in this codebase — adding it would be scope creep. A future plan can introduce Playwright coverage once Phase 3's total surface is stable.
</verification>

<success_criteria>
- PRESENT-03 **satisfied**: accepted ambassadors can edit their public profile card from `/profile` with changes persisting via the PATCH endpoint.
- PRESENT-04 **fully satisfied** (combined with plan 03-05's render side): ambassadors can paste a YouTube/Loom/Drive URL, preview it live, and save it; the same URL renders on the public card on `/ambassadors` and `/u/[username]`.
- The /profile page remains backwards-compatible for every non-ambassador user — the new section is strictly additive and gated.
- Save flow matches existing `/profile` UX conventions: toast-based feedback, `authFetch` for HTTP, DaisyUI components for visuals.
</success_criteria>

<output>
New files:
- `src/app/profile/AmbassadorPublicCardSection.tsx`

Modified files:
- `src/app/profile/page.tsx` (one import + one conditional render block)

Summary file: `.planning/phases/03-public-presentation/03-06-SUMMARY.md` — executor produces this after merge. Note in the summary that the Task 0 pre-flight confirmed the GET handler shipped by plan 03-03 Task 2.
</output>
