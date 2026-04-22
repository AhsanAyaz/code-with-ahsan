---
phase: 02-application-subsystem
plan: 07
type: execute
wave: 3
depends_on:
  - "02-01"
  - "02-02"
  - "02-04"
  - "02-05"
files_modified:
  - src/app/ambassadors/apply/page.tsx
  - src/app/ambassadors/apply/ApplyWizard.tsx
  - src/app/ambassadors/apply/steps/EligibilityStep.tsx
  - src/app/ambassadors/apply/steps/PersonalInfoStep.tsx
  - src/app/ambassadors/apply/steps/ApplicationStep.tsx
  - src/app/ambassadors/apply/steps/ReviewStep.tsx
  - src/app/ambassadors/apply/useApplyForm.ts
  - src/app/profile/AmbassadorApplicationStatus.tsx
autonomous: true
requirements:
  - APPLY-01
  - APPLY-02
  - APPLY-03
  - APPLY-04
  - APPLY-05
  - APPLY-07
must_haves:
  truths:
    - "A signed-in user with a profile older than AMBASSADOR_DISCORD_MIN_AGE_DAYS can complete all 4 steps at /ambassadors/apply and submit an application (D-01)."
    - "Step 1 (Eligibility) blocks younger accounts with a 'come back in N days' screen; no subsequent steps render (D-02)."
    - "Step 2 shows a cohort dropdown populated by GET /api/ambassador/cohorts?scope=open. If empty, shows 'No open cohorts' + deferred 'Notify me' placeholder (D-05)."
    - "Step 3 validates the Discord handle, academic email (or student-ID path), and video URL client-side using isValidVideoUrl (D-07) and validateAcademicEmail (D-15) from Plan 02 — the same helpers the server uses."
    - "Step 3 enforces D-13: explicit two-path choice ('I have an academic email' vs 'I don't have a .edu email'). No mid-field surprise reveal."
    - "Step 3 student-ID upload follows the signed-URL flow: POST /api/ambassador/applications/student-id-upload-url → PUT directly to Google Cloud Storage → persist returned storagePath into the form state (APPLY-05)."
    - "Step 4 shows a read-only review and a Submit button that POSTs to /api/ambassador/applications; on 201 redirects to /profile with a success toast."
    - "The applicant's own profile page surfaces application status (APPLY-07) by reading GET /api/ambassador/applications/me and rendering a status badge block."
    - "D-15 soft-warning: if academic email TLD is not recognized, show a warning next to the field ('We couldn't auto-verify — you can continue by uploading a student ID'); form remains submittable."
    - "The whole /ambassadors/apply route returns 404 when FEATURE_AMBASSADOR_PROGRAM is off (inherited from existing /ambassadors/layout.tsx)."
  artifacts:
    - path: "src/app/ambassadors/apply/page.tsx"
      provides: "Server component — auth gate (redirect to sign-in if not signed in), feature-flag inheritance from layout, renders ApplyWizard client component"
      min_lines: 30
    - path: "src/app/ambassadors/apply/ApplyWizard.tsx"
      provides: "Client component — step state machine (1→2→3→4), DaisyUI steps header, form context provider, submit handler"
      min_lines: 120
    - path: "src/app/ambassadors/apply/steps/EligibilityStep.tsx"
      provides: "Step 1 — Discord age gate. Calls profile API + AMBASSADOR_DISCORD_MIN_AGE_DAYS constant. 'Not yet' screen for underage accounts."
      min_lines: 60
    - path: "src/app/ambassadors/apply/steps/PersonalInfoStep.tsx"
      provides: "Step 2 — university, year, country, city, cohort dropdown (GET /api/ambassador/cohorts?scope=open)"
      min_lines: 80
    - path: "src/app/ambassadors/apply/steps/ApplicationStep.tsx"
      provides: "Step 3 — motivation/experience/pitch textareas (3x), Discord handle, two-path academic verification, video URL"
      min_lines: 150
    - path: "src/app/ambassadors/apply/steps/ReviewStep.tsx"
      provides: "Step 4 — read-only review + Submit button"
      min_lines: 70
    - path: "src/app/ambassadors/apply/useApplyForm.ts"
      provides: "Shared form state hook: { values, errors, setField, validateStep, buildSubmitPayload }"
      exports:
        - "useApplyForm"
        - "ApplyFormState"
      min_lines: 100
    - path: "src/app/profile/AmbassadorApplicationStatus.tsx"
      provides: "APPLY-07 client component — fetches /api/ambassador/applications/me, renders status badge + submitted-date"
      min_lines: 60
  key_links:
    - from: "src/app/ambassadors/apply/ApplyWizard.tsx"
      to: "/api/ambassador/applications"
      via: "fetch POST with Firebase ID token in Authorization header; body is ApplicationSubmitInput"
      pattern: "fetch.*api/ambassador/applications"
    - from: "src/app/ambassadors/apply/steps/ApplicationStep.tsx"
      to: "isValidVideoUrl"
      via: "client-side validation — same Plan 02 helper the server uses (no drift)"
      pattern: "isValidVideoUrl"
    - from: "src/app/ambassadors/apply/steps/ApplicationStep.tsx"
      to: "validateAcademicEmail"
      via: "client-side validation — D-15 soft warning on unknown TLD"
      pattern: "validateAcademicEmail"
    - from: "src/app/ambassadors/apply/steps/ApplicationStep.tsx"
      to: "/api/ambassador/applications/student-id-upload-url"
      via: "POST to get a signed upload URL, then PUT file bytes directly to GCS"
      pattern: "student-id-upload-url"
    - from: "src/app/ambassadors/apply/steps/PersonalInfoStep.tsx"
      to: "/api/ambassador/cohorts?scope=open"
      via: "GET cohort list for the dropdown"
      pattern: "api/ambassador/cohorts.*scope=open"
    - from: "src/app/ambassadors/apply/steps/EligibilityStep.tsx"
      to: "AMBASSADOR_DISCORD_MIN_AGE_DAYS"
      via: "constant import — never hardcode 30"
      pattern: "AMBASSADOR_DISCORD_MIN_AGE_DAYS"
    - from: "src/app/profile/AmbassadorApplicationStatus.tsx"
      to: "/api/ambassador/applications/me"
      via: "fetch own application status on mount (APPLY-07)"
      pattern: "api/ambassador/applications/me"
---

<objective>
Build the 4-step apply wizard per D-01/D-02/D-04/D-05/D-13/D-15 and the profile-page status strip per APPLY-07. This is the first user-facing surface where an applicant can create an application; all writes go through the Plan 05 POST endpoint.

Purpose:
- Match D-01 exactly: 4 steps (Eligibility → Personal Info → Application → Review). No more, no fewer.
- Mirror server-side validation on the client using Plan 02's helpers so error messages are consistent and the user can't submit garbage.
- Surface application status on the existing profile page (APPLY-07) — minimal surgery to profile/page.tsx (a single new component mount).

Output:
- `/ambassadors/apply/page.tsx` + `ApplyWizard.tsx` + 4 step components + `useApplyForm.ts`.
- `AmbassadorApplicationStatus.tsx` mounted inside `src/app/profile/page.tsx`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/02-application-subsystem/02-CONTEXT.md
@.planning/phases/02-application-subsystem/02-RESEARCH.md
@.planning/phases/02-application-subsystem/02-01-SUMMARY.md
@.planning/phases/02-application-subsystem/02-02-SUMMARY.md
@.planning/phases/02-application-subsystem/02-04-SUMMARY.md
@.planning/phases/02-application-subsystem/02-05-SUMMARY.md

<interfaces>
<!-- Contracts the executor needs — no codebase scavenging required. -->

From @/types/ambassador (Plan 01):
```typescript
export type ApplicationSubmitInput = {
  targetCohortId: string;
  university: string;
  yearOfStudy: string;
  country: string;
  city: string;
  discordHandle: string;
  academicEmail?: string;
  studentIdStoragePath?: string;
  motivation: string;
  experience: string;
  pitch: string;
  videoUrl: string;
};
export type ApplicationStatus = "submitted" | "under_review" | "accepted" | "declined";
export const APPLICATION_VIDEO_PROMPTS: readonly [string, string, string];   // from constants.ts
```

From @/lib/ambassador/constants (Plan 01):
```typescript
export const AMBASSADOR_DISCORD_MIN_AGE_DAYS: number;    // 30
```

From @/lib/ambassador/videoUrl (Plan 02):
```typescript
export function isValidVideoUrl(url: string): boolean;
export function classifyVideoUrl(url: string): "youtube" | "loom" | "drive" | "unknown";
```

From @/lib/ambassador/academicEmail (Plan 02):
```typescript
export function validateAcademicEmail(email: string): {
  syntaxValid: boolean;
  academicTldMatch: boolean;
  hipoMatch: boolean;
  needsManualVerification: boolean;
  normalizedDomain: string | null;
};
```

From @/contexts/AuthContext (existing):
```typescript
// The existing auth context provides the Firebase user + idToken accessor.
// Typical usage: const { user, getIdToken } = useAuth();
// getIdToken() returns Promise<string|null>. Send as `Authorization: Bearer ${idToken}` on POST /api/ambassador/applications.
```

From @/contexts/ToastContext (existing):
```typescript
// Existing toast pattern — used by onboarding page. Use this for success/error feedback.
// const { showToast } = useToast();
// showToast({ type: 'success' | 'error', message: string });
```

Cohort API response shape (Plan 04 GET /api/ambassador/cohorts?scope=open):
```typescript
{ items: Array<{ cohortId: string; name: string; startDate: string; endDate: string; maxSize: number; acceptedCount: number; applicationWindowOpen: boolean; }> }
```

Submit API response shape (Plan 05 POST /api/ambassador/applications):
```typescript
// 201: { applicationId: string; status: "submitted"; discordResolved: boolean }
// 400: { error: string; field?: string; details?: unknown }
// 403: { error: string; reason: "too_new" | "profile_missing"; profileAgeDays?: number; requiredDays: number }
// 409: { error: string; existingApplicationId?: string; existingStatus?: string } // duplicate or cohort closed
```

Student-ID upload response (Plan 05 POST /api/ambassador/applications/student-id-upload-url):
```typescript
{ uploadUrl: string; storagePath: string; expiresAtMs: number }
// Then PUT the file bytes to uploadUrl with matching Content-Type header.
```

Own-applications response (Plan 05 GET /api/ambassador/applications/me):
```typescript
{ items: Array<Omit<ApplicationDoc, "reviewerNotes" | "reviewedBy"> & { applicationId: string }> }
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: useApplyForm hook + ApplyWizard shell + page.tsx</name>
  <files>src/app/ambassadors/apply/useApplyForm.ts, src/app/ambassadors/apply/ApplyWizard.tsx, src/app/ambassadors/apply/page.tsx</files>
  <read_first>
    - @src/app/mentorship/onboarding/page.tsx (closest existing multi-step form pattern — RESEARCH.md reference)
    - @src/contexts/AuthContext.tsx (idToken accessor)
    - @src/contexts/ToastContext.tsx (toast pattern)
    - @src/app/ambassadors/layout.tsx (feature flag gate — already present)
    - @src/types/ambassador.ts (ApplicationSubmitInput)
    - @.planning/phases/02-application-subsystem/02-RESEARCH.md (lines 538-547 DaisyUI steps pattern)
  </read_first>
  <action>
Create three files.

**File 1: `src/app/ambassadors/apply/page.tsx`** — server component (auth redirect + feature gate inherited from layout).

```typescript
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ApplyWizard from "./ApplyWizard";

// Feature-flag gate is inherited from src/app/ambassadors/layout.tsx (existing).
// This page is a server component only to server-render the shell; all interactivity is in ApplyWizard.

export default async function ApplyPage() {
  // Minimal server-side auth hint — the client ApplyWizard will re-check via AuthContext and redirect if needed.
  // Detailed auth handling lives in the client component because our auth is Firebase-client-driven.
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Apply to be a Student Ambassador</h1>
        <p className="text-base-content/70 mt-2">Tell us about yourself. You can complete this in one sitting (~10 minutes).</p>
      </header>
      <ApplyWizard />
    </div>
  );
}
```

**File 2: `src/app/ambassadors/apply/useApplyForm.ts`** — form state hook.

```typescript
"use client";
import { useCallback, useState } from "react";
import type { ApplicationSubmitInput } from "@/types/ambassador";
import { isValidVideoUrl } from "@/lib/ambassador/videoUrl";
import { validateAcademicEmail } from "@/lib/ambassador/academicEmail";

export type ApplyFormState = ApplicationSubmitInput & {
  _academicPath: "email" | "studentId" | null;   // D-13 explicit choice
  _studentIdFile?: File | null;                   // local-only; cleared after upload
  _academicEmailWarning?: string;                 // D-15 soft warning
};

const EMPTY: ApplyFormState = {
  targetCohortId: "",
  university: "",
  yearOfStudy: "",
  country: "",
  city: "",
  discordHandle: "",
  academicEmail: "",
  studentIdStoragePath: "",
  motivation: "",
  experience: "",
  pitch: "",
  videoUrl: "",
  _academicPath: null,
};

const MIN_PROMPT_LENGTH = 60;

export function useApplyForm() {
  const [values, setValues] = useState<ApplyFormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = useCallback(<K extends keyof ApplyFormState>(key: K, value: ApplyFormState[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _, ...rest } = e;
      return rest;
    });
  }, []);

  /** Per-step validation. Returns true if the step passes. */
  const validateStep = useCallback((step: 1 | 2 | 3 | 4): boolean => {
    const e: Record<string, string> = {};
    if (step === 2) {
      if (!values.targetCohortId) e.targetCohortId = "Select a cohort.";
      if (!values.university) e.university = "Required.";
      if (!values.yearOfStudy) e.yearOfStudy = "Required.";
      if (!values.country) e.country = "Required.";
      if (!values.city) e.city = "Required.";
    }
    if (step === 3) {
      if (values.motivation.length < MIN_PROMPT_LENGTH) e.motivation = `Please write at least ${MIN_PROMPT_LENGTH} characters.`;
      if (values.experience.length < MIN_PROMPT_LENGTH) e.experience = `Please write at least ${MIN_PROMPT_LENGTH} characters.`;
      if (values.pitch.length < MIN_PROMPT_LENGTH) e.pitch = `Please write at least ${MIN_PROMPT_LENGTH} characters.`;
      if (!values.discordHandle) e.discordHandle = "Enter your Discord handle.";
      if (!values.videoUrl || !isValidVideoUrl(values.videoUrl)) e.videoUrl = "Paste a Loom, YouTube, or Google Drive link.";
      if (values._academicPath === null) e._academicPath = "Choose an academic-verification path.";
      if (values._academicPath === "email") {
        if (!values.academicEmail) e.academicEmail = "Enter your academic email.";
        else {
          const r = validateAcademicEmail(values.academicEmail);
          if (!r.syntaxValid) e.academicEmail = "Enter a valid email address.";
        }
      }
      if (values._academicPath === "studentId" && !values.studentIdStoragePath) e.studentIdStoragePath = "Upload your student ID.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [values]);

  /** Build the submit payload — strip local-only fields (underscore-prefixed) per ApplicationSubmitInput shape. */
  const buildSubmitPayload = useCallback((): ApplicationSubmitInput => {
    const { _academicPath, _studentIdFile, _academicEmailWarning, ...submit } = values;
    // If the applicant chose path "email", ensure studentIdStoragePath is omitted.
    if (_academicPath === "email") return { ...submit, studentIdStoragePath: undefined };
    // If path "studentId", ensure academicEmail is omitted.
    if (_academicPath === "studentId") return { ...submit, academicEmail: undefined };
    return submit;
  }, [values]);

  return { values, errors, setField, validateStep, buildSubmitPayload };
}
```

**File 3: `src/app/ambassadors/apply/ApplyWizard.tsx`** — client component, 4-step state machine.

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";       // adjust import if existing path differs
import { useToast } from "@/contexts/ToastContext";    // adjust import if existing path differs
import { useApplyForm } from "./useApplyForm";
import EligibilityStep from "./steps/EligibilityStep";
import PersonalInfoStep from "./steps/PersonalInfoStep";
import ApplicationStep from "./steps/ApplicationStep";
import ReviewStep from "./steps/ReviewStep";

type Step = 1 | 2 | 3 | 4;

export default function ApplyWizard() {
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const { user, getIdToken } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const form = useApplyForm();

  if (!user) {
    return (
      <div className="alert alert-info">
        <span>Please <a href="/auth" className="link">sign in</a> to apply.</span>
      </div>
    );
  }

  const goNext = (from: Step) => {
    if (from === 1) { setStep(2); return; }  // Eligibility step advances itself after check
    if (!form.validateStep(from)) {
      showToast({ type: "error", message: "Please fix the highlighted fields." });
      return;
    }
    setStep((from + 1) as Step);
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const handleSubmit = async () => {
    if (!form.validateStep(3)) { setStep(3); return; }
    setSubmitting(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error("Not signed in");
      const payload = form.buildSubmitPayload();
      const res = await fetch("/api/ambassador/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        const msg = body.error ?? `Submission failed (HTTP ${res.status})`;
        showToast({ type: "error", message: msg });
        return;
      }
      showToast({ type: "success", message: "Application submitted! Check your email for confirmation." });
      router.push("/profile");
    } catch (e) {
      showToast({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ul className="steps steps-horizontal w-full mb-8">
        <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Eligibility</li>
        <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Your Info</li>
        <li className={`step ${step >= 3 ? "step-primary" : ""}`}>Application</li>
        <li className={`step ${step >= 4 ? "step-primary" : ""}`}>Review</li>
      </ul>

      {step === 1 && <EligibilityStep onEligible={() => setStep(2)} />}
      {step === 2 && <PersonalInfoStep form={form} onNext={() => goNext(2)} onBack={goBack} />}
      {step === 3 && <ApplicationStep form={form} onNext={() => goNext(3)} onBack={goBack} />}
      {step === 4 && <ReviewStep form={form} onBack={goBack} onSubmit={handleSubmit} submitting={submitting} />}
    </div>
  );
}
```

IMPORTANT: adjust the AuthContext / ToastContext import paths to match the existing codebase. If the hooks are `useAuth` / `useToast` but in different paths (e.g. `@/providers/`), update accordingly. Executor MUST verify via `grep -r "export function useAuth" src/` and `grep -r "export function useToast" src/` before wiring.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>Three files created. ApplyWizard orchestrates 4 steps with DaisyUI progress header. useApplyForm provides typed state + per-step validation using Plan 02 helpers. page.tsx is a thin server-component shell.</done>
  <acceptance_criteria>
    - `grep -q "step-primary" src/app/ambassadors/apply/ApplyWizard.tsx` (DaisyUI steps)
    - `grep -q "Eligibility.*Your Info.*Application.*Review" src/app/ambassadors/apply/ApplyWizard.tsx` OR `grep -c 'step.*step-primary' src/app/ambassadors/apply/ApplyWizard.tsx` returns >= 4 (4 steps)
    - `grep -q "isValidVideoUrl" src/app/ambassadors/apply/useApplyForm.ts`
    - `grep -q "validateAcademicEmail" src/app/ambassadors/apply/useApplyForm.ts`
    - `grep -q "_academicPath" src/app/ambassadors/apply/useApplyForm.ts` (D-13 explicit path)
    - `grep -q "buildSubmitPayload" src/app/ambassadors/apply/useApplyForm.ts`
    - `grep -q "api/ambassador/applications" src/app/ambassadors/apply/ApplyWizard.tsx` (POST submit)
    - `grep -q "Bearer" src/app/ambassadors/apply/ApplyWizard.tsx` (idToken header)
    - `grep -q "'use client'" src/app/ambassadors/apply/ApplyWizard.tsx` OR `grep -q '"use client"' src/app/ambassadors/apply/ApplyWizard.tsx`
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Four step components (Eligibility, PersonalInfo, Application, Review)</name>
  <files>src/app/ambassadors/apply/steps/EligibilityStep.tsx, src/app/ambassadors/apply/steps/PersonalInfoStep.tsx, src/app/ambassadors/apply/steps/ApplicationStep.tsx, src/app/ambassadors/apply/steps/ReviewStep.tsx</files>
  <read_first>
    - @src/app/ambassadors/apply/useApplyForm.ts (form contract — Task 1)
    - @src/lib/ambassador/constants.ts (AMBASSADOR_DISCORD_MIN_AGE_DAYS, APPLICATION_VIDEO_PROMPTS)
    - @src/lib/ambassador/videoUrl.ts (isValidVideoUrl — re-use in ApplicationStep)
    - @src/lib/ambassador/academicEmail.ts (validateAcademicEmail — re-use for D-15 warning)
    - @src/contexts/AuthContext.tsx (profile data access — or API call to /api/mentorship/profile)
    - @src/app/mentorship/onboarding/page.tsx (DaisyUI input classes reference — existing codebase style)
  </read_first>
  <action>
Create four step components. All are `"use client"`. Each receives `form: ReturnType<typeof useApplyForm>` and `onNext` / `onBack` (except EligibilityStep which only takes `onEligible`).

**`src/app/ambassadors/apply/steps/EligibilityStep.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AMBASSADOR_DISCORD_MIN_AGE_DAYS } from "@/lib/ambassador/constants";

type Check = { loading: true } | { loading: false; eligible: boolean; profileAgeDays: number };

export default function EligibilityStep({ onEligible }: { onEligible: () => void }) {
  const { user, getIdToken } = useAuth();
  const [check, setCheck] = useState<Check>({ loading: true });

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const idToken = await getIdToken();
        const res = await fetch("/api/mentorship/profile", {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        });
        if (!res.ok) {
          setCheck({ loading: false, eligible: false, profileAgeDays: 0 });
          return;
        }
        const body = await res.json();
        const createdAt = body.profile?.createdAt;
        const createdMs = typeof createdAt === "object" && createdAt?._seconds
          ? createdAt._seconds * 1000
          : typeof createdAt === "string"
            ? Date.parse(createdAt)
            : Number(createdAt);
        const ageDays = Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000));
        setCheck({ loading: false, eligible: ageDays >= AMBASSADOR_DISCORD_MIN_AGE_DAYS, profileAgeDays: ageDays });
      } catch {
        setCheck({ loading: false, eligible: false, profileAgeDays: 0 });
      }
    }
    load();
  }, [user, getIdToken]);

  if (check.loading) return <div className="loading loading-spinner" />;
  if (!check.eligible) {
    const wait = AMBASSADOR_DISCORD_MIN_AGE_DAYS - check.profileAgeDays;
    return (
      <div className="alert alert-warning">
        <div>
          <h3 className="font-bold">Not quite yet!</h3>
          <p>The Student Ambassador program requires your Code With Ahsan account to be at least {AMBASSADOR_DISCORD_MIN_AGE_DAYS} days old.</p>
          <p className="mt-2">Your account is {check.profileAgeDays} day{check.profileAgeDays === 1 ? "" : "s"} old — come back in {wait} day{wait === 1 ? "" : "s"}.</p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="alert alert-success mb-4">
        <span>You're eligible! Let's get started.</span>
      </div>
      <button type="button" className="btn btn-primary" onClick={onEligible}>Continue</button>
    </div>
  );
}
```

**`src/app/ambassadors/apply/steps/PersonalInfoStep.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";
import type { useApplyForm } from "../useApplyForm";

type CohortItem = { cohortId: string; name: string; startDate: string; endDate: string };

export default function PersonalInfoStep({
  form,
  onNext,
  onBack,
}: {
  form: ReturnType<typeof useApplyForm>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [cohorts, setCohorts] = useState<CohortItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ambassador/cohorts?scope=open")
      .then((r) => r.json())
      .then((b) => setCohorts(b.items ?? []))
      .catch(() => setCohorts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading loading-spinner" />;

  if (cohorts && cohorts.length === 0) {
    return (
      <div className="alert alert-info">
        <div>
          <p className="font-semibold">No open cohorts right now.</p>
          <p>We'll announce the next application window on Discord and by email.</p>
          <p className="mt-2 text-sm opacity-70">(Notify-me subscription coming soon.)</p>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <fieldset>
        <label className="label"><span className="label-text">Target cohort</span></label>
        <select
          className={`select select-bordered w-full ${form.errors.targetCohortId ? "select-error" : ""}`}
          value={form.values.targetCohortId}
          onChange={(e) => form.setField("targetCohortId", e.target.value)}
        >
          <option value="">— Select a cohort —</option>
          {cohorts!.map((c) => <option key={c.cohortId} value={c.cohortId}>{c.name}</option>)}
        </select>
        {form.errors.targetCohortId && <span className="text-error text-sm">{form.errors.targetCohortId}</span>}
      </fieldset>

      <fieldset>
        <label className="label"><span className="label-text">University</span></label>
        <input type="text" className={`input input-bordered w-full ${form.errors.university ? "input-error" : ""}`}
               value={form.values.university}
               onChange={(e) => form.setField("university", e.target.value)} />
        {form.errors.university && <span className="text-error text-sm">{form.errors.university}</span>}
      </fieldset>

      <fieldset>
        <label className="label"><span className="label-text">Year of study</span></label>
        <select className={`select select-bordered w-full ${form.errors.yearOfStudy ? "select-error" : ""}`}
                value={form.values.yearOfStudy}
                onChange={(e) => form.setField("yearOfStudy", e.target.value)}>
          <option value="">— Select —</option>
          <option value="1">1st year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
          <option value="5+">5th year or beyond</option>
          <option value="graduate">Graduate student</option>
        </select>
        {form.errors.yearOfStudy && <span className="text-error text-sm">{form.errors.yearOfStudy}</span>}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <fieldset>
          <label className="label"><span className="label-text">Country</span></label>
          <input type="text" className={`input input-bordered w-full ${form.errors.country ? "input-error" : ""}`}
                 value={form.values.country}
                 onChange={(e) => form.setField("country", e.target.value)} />
          {form.errors.country && <span className="text-error text-sm">{form.errors.country}</span>}
        </fieldset>
        <fieldset>
          <label className="label"><span className="label-text">City</span></label>
          <input type="text" className={`input input-bordered w-full ${form.errors.city ? "input-error" : ""}`}
                 value={form.values.city}
                 onChange={(e) => form.setField("city", e.target.value)} />
          {form.errors.city && <span className="text-error text-sm">{form.errors.city}</span>}
        </fieldset>
      </div>

      <div className="flex justify-between pt-4">
        <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>
        <button type="submit" className="btn btn-primary">Continue</button>
      </div>
    </form>
  );
}
```

**`src/app/ambassadors/apply/steps/ApplicationStep.tsx`**

```typescript
"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { APPLICATION_VIDEO_PROMPTS } from "@/lib/ambassador/constants";
import { validateAcademicEmail } from "@/lib/ambassador/academicEmail";
import type { useApplyForm } from "../useApplyForm";

export default function ApplicationStep({
  form,
  onNext,
  onBack,
}: {
  form: ReturnType<typeof useApplyForm>;
  onNext: () => void;
  onBack: () => void;
}) {
  const { getIdToken } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleAcademicEmailBlur = (email: string) => {
    if (!email) return;
    const r = validateAcademicEmail(email);
    if (r.needsManualVerification) {
      form.setField("_academicEmailWarning", "We couldn't auto-verify this email. You can continue — you may also choose 'I don't have a .edu email' and upload a student ID instead.");
    } else {
      form.setField("_academicEmailWarning", undefined);
    }
  };

  const handleStudentIdUpload = async (file: File) => {
    try {
      setUploading(true);
      const idToken = await getIdToken();
      if (!idToken) throw new Error("not signed in");
      // Client-generated applicationId UUID for the storage path.
      const applicationId = (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
        ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const signedRes = await fetch("/api/ambassador/applications/student-id-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ applicationId, contentType: file.type, fileSizeBytes: file.size }),
      });
      if (!signedRes.ok) { throw new Error("upload-url-failed"); }
      const { uploadUrl, storagePath } = await signedRes.json();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("upload-failed");
      form.setField("studentIdStoragePath", storagePath);
    } catch {
      form.setField("studentIdStoragePath", "");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      {/* Three motivation prompts (D-04) */}
      {(["motivation", "experience", "pitch"] as const).map((key, i) => (
        <fieldset key={key}>
          <label className="label"><span className="label-text">{APPLICATION_VIDEO_PROMPTS[i]}</span></label>
          <textarea
            className={`textarea textarea-bordered w-full h-32 ${form.errors[key] ? "textarea-error" : ""}`}
            value={form.values[key]}
            onChange={(e) => form.setField(key, e.target.value)}
          />
          <div className="flex justify-between text-xs mt-1">
            <span>{form.errors[key] ?? " "}</span>
            <span className="opacity-60">{form.values[key].length} chars (min 60)</span>
          </div>
        </fieldset>
      ))}

      {/* Discord handle */}
      <fieldset>
        <label className="label"><span className="label-text">Discord handle (e.g. ahsanayaz)</span></label>
        <input type="text" className={`input input-bordered w-full ${form.errors.discordHandle ? "input-error" : ""}`}
               value={form.values.discordHandle}
               onChange={(e) => form.setField("discordHandle", e.target.value)} />
        {form.errors.discordHandle && <span className="text-error text-sm">{form.errors.discordHandle}</span>}
      </fieldset>

      {/* Academic verification — D-13 explicit two-path choice */}
      <fieldset className="border border-base-300 rounded-lg p-4">
        <legend className="px-2 font-semibold">Academic verification</legend>
        <div className="flex gap-4 mb-4">
          <label className="label cursor-pointer gap-2">
            <input type="radio" className="radio" name="academicPath" checked={form.values._academicPath === "email"}
                   onChange={() => form.setField("_academicPath", "email")} />
            <span>I have an academic email</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input type="radio" className="radio" name="academicPath" checked={form.values._academicPath === "studentId"}
                   onChange={() => form.setField("_academicPath", "studentId")} />
            <span>I don't have a .edu email</span>
          </label>
        </div>
        {form.errors._academicPath && <div className="text-error text-sm">{form.errors._academicPath}</div>}

        {form.values._academicPath === "email" && (
          <div>
            <input type="email" className={`input input-bordered w-full ${form.errors.academicEmail ? "input-error" : ""}`}
                   value={form.values.academicEmail ?? ""}
                   onChange={(e) => form.setField("academicEmail", e.target.value)}
                   onBlur={(e) => handleAcademicEmailBlur(e.target.value)}
                   placeholder="you@university.edu" />
            {form.errors.academicEmail && <span className="text-error text-sm">{form.errors.academicEmail}</span>}
            {form.values._academicEmailWarning && (
              <div className="alert alert-warning mt-2 text-sm">{form.values._academicEmailWarning}</div>
            )}
          </div>
        )}

        {form.values._academicPath === "studentId" && (
          <div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="file-input file-input-bordered w-full"
                   onChange={(e) => {
                     const f = e.target.files?.[0];
                     if (f) { form.setField("_studentIdFile", f); void handleStudentIdUpload(f); }
                   }}
                   disabled={uploading} />
            {uploading && <div className="text-sm opacity-60 mt-1">Uploading…</div>}
            {form.values.studentIdStoragePath && <div className="text-success text-sm mt-1">Uploaded.</div>}
            {form.errors.studentIdStoragePath && <div className="text-error text-sm mt-1">{form.errors.studentIdStoragePath}</div>}
          </div>
        )}
      </fieldset>

      {/* Video URL */}
      <fieldset>
        <label className="label">
          <span className="label-text">Video link (Loom, YouTube, or Google Drive)</span>
        </label>
        <input type="url" className={`input input-bordered w-full ${form.errors.videoUrl ? "input-error" : ""}`}
               value={form.values.videoUrl}
               onChange={(e) => form.setField("videoUrl", e.target.value)}
               placeholder="https://www.loom.com/share/..." />
        {form.errors.videoUrl && <span className="text-error text-sm">{form.errors.videoUrl}</span>}
      </fieldset>

      <div className="flex justify-between pt-4">
        <button type="button" className="btn btn-ghost" onClick={onBack}>Back</button>
        <button type="submit" className="btn btn-primary" disabled={uploading}>Continue</button>
      </div>
    </form>
  );
}
```

**`src/app/ambassadors/apply/steps/ReviewStep.tsx`**

```typescript
"use client";
import type { useApplyForm } from "../useApplyForm";

export default function ReviewStep({
  form,
  onBack,
  onSubmit,
  submitting,
}: {
  form: ReturnType<typeof useApplyForm>;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const v = form.values;
  const fields: Array<[string, string]> = [
    ["Cohort", v.targetCohortId || "(not set)"],
    ["University", v.university],
    ["Year of study", v.yearOfStudy],
    ["Location", `${v.city}, ${v.country}`],
    ["Discord handle", v.discordHandle],
    ["Academic verification", v._academicPath === "email" ? v.academicEmail ?? "" : v.studentIdStoragePath ? "student ID uploaded" : "(not set)"],
    ["Video", v.videoUrl],
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Review</h2>
      <div className="card bg-base-200">
        <div className="card-body p-4">
          <dl className="grid grid-cols-[min-content_1fr] gap-x-4 gap-y-2 text-sm">
            {fields.map(([label, val]) => (
              <div key={label} className="contents">
                <dt className="font-semibold whitespace-nowrap">{label}</dt>
                <dd className="break-words">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {/* Prompt review */}
      {(["motivation", "experience", "pitch"] as const).map((k, i) => (
        <div key={k} className="card bg-base-100 border border-base-300">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm">Prompt {i + 1}</h3>
            <p className="whitespace-pre-wrap text-sm">{v[k]}</p>
          </div>
        </div>
      ))}
      <div className="flex justify-between pt-4">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={submitting}>Back</button>
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </div>
  );
}
```

Notes:
- Form field names MUST match `ApplicationSubmitInput` exactly (Plan 01) or the POST in Plan 05 will 400. The `_`-prefixed keys (`_academicPath`, `_studentIdFile`, `_academicEmailWarning`) are stripped by `buildSubmitPayload`.
- `APPLICATION_VIDEO_PROMPTS` comes from Plan 01's constants.ts; the three prompts render in order.
- The video URL input does NOT render an embed in this step — embedding is admin-side (Plan 08).
- D-13 explicit choice: the radio buttons force the applicant to choose a path before fields for that path render.
- D-15: `handleAcademicEmailBlur` sets `_academicEmailWarning` from `validateAcademicEmail.needsManualVerification` — the form still allows submission.
- Upload flow: client generates a UUID, POSTs to `/student-id-upload-url`, PUTs the file to GCS with matching Content-Type.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>Four step components exist. EligibilityStep calls /api/mentorship/profile and compares age to AMBASSADOR_DISCORD_MIN_AGE_DAYS. PersonalInfoStep loads cohorts via GET /api/ambassador/cohorts?scope=open. ApplicationStep uses APPLICATION_VIDEO_PROMPTS, D-13 radio path choice, D-15 soft warning, signed-URL student-ID upload. ReviewStep renders read-only summary with Submit button.</done>
  <acceptance_criteria>
    - `grep -q "AMBASSADOR_DISCORD_MIN_AGE_DAYS" src/app/ambassadors/apply/steps/EligibilityStep.tsx`
    - `grep -q "api/mentorship/profile" src/app/ambassadors/apply/steps/EligibilityStep.tsx` (profile age fetch)
    - `grep -q "Not quite yet" src/app/ambassadors/apply/steps/EligibilityStep.tsx` (ineligible branch)
    - `grep -q "api/ambassador/cohorts" src/app/ambassadors/apply/steps/PersonalInfoStep.tsx`
    - `grep -q "scope=open" src/app/ambassadors/apply/steps/PersonalInfoStep.tsx`
    - `grep -q "No open cohorts" src/app/ambassadors/apply/steps/PersonalInfoStep.tsx` (D-05 empty state)
    - `grep -q "APPLICATION_VIDEO_PROMPTS" src/app/ambassadors/apply/steps/ApplicationStep.tsx` (3 prompts)
    - `grep -c "textarea" src/app/ambassadors/apply/steps/ApplicationStep.tsx` returns >= 3 (3 motivation fields)
    - `grep -q "_academicPath.*email" src/app/ambassadors/apply/steps/ApplicationStep.tsx` (D-13)
    - `grep -q "_academicPath.*studentId" src/app/ambassadors/apply/steps/ApplicationStep.tsx` (D-13)
    - `grep -q "validateAcademicEmail" src/app/ambassadors/apply/steps/ApplicationStep.tsx` (D-15)
    - `grep -q "student-id-upload-url" src/app/ambassadors/apply/steps/ApplicationStep.tsx` (APPLY-05 upload flow)
    - `grep -q "PUT" src/app/ambassadors/apply/steps/ApplicationStep.tsx` (direct-to-GCS upload)
    - `grep -q "Submit application" src/app/ambassadors/apply/steps/ReviewStep.tsx`
    - Each step file contains `"use client"` or `'use client'`
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

<task type="auto" tdd="false">
  <name>Task 3: AmbassadorApplicationStatus component mounted on /profile (APPLY-07)</name>
  <files>src/app/profile/AmbassadorApplicationStatus.tsx, src/app/profile/page.tsx</files>
  <read_first>
    - @src/app/profile/page.tsx (existing profile page — identify where to insert the new section without disrupting existing UI)
    - @src/contexts/AuthContext.tsx (idToken accessor)
    - @src/lib/features.ts (isAmbassadorProgramEnabled — client-side check via NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM)
    - @src/types/ambassador.ts (ApplicationStatus type)
  </read_first>
  <action>
**File 1: `src/app/profile/AmbassadorApplicationStatus.tsx`** — the new client component.

```typescript
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { ApplicationStatus } from "@/types/ambassador";

type MeApplication = {
  applicationId: string;
  status: ApplicationStatus;
  targetCohortId: string;
  submittedAt?: { _seconds: number } | string;
  decidedAt?: { _seconds: number } | string;
  discordRoleAssigned?: boolean;
  discordRetryNeeded?: boolean;
};

const BADGE_CLASS: Record<ApplicationStatus, string> = {
  submitted: "badge badge-info",
  under_review: "badge badge-warning",
  accepted: "badge badge-success",
  declined: "badge badge-error",
};

const BADGE_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  accepted: "Accepted",
  declined: "Declined",
};

function formatTs(ts: MeApplication["submittedAt"]): string {
  if (!ts) return "";
  if (typeof ts === "string") return new Date(ts).toLocaleDateString();
  if (ts && typeof ts === "object" && "_seconds" in ts) return new Date(ts._seconds * 1000).toLocaleDateString();
  return "";
}

export default function AmbassadorApplicationStatus() {
  const { user, getIdToken } = useAuth();
  const [items, setItems] = useState<MeApplication[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const idToken = await getIdToken();
        if (!idToken) { setLoading(false); return; }
        const res = await fetch("/api/ambassador/applications/me", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) { setItems([]); return; }
        const body = await res.json();
        setItems(body.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, getIdToken]);

  if (loading) return null;
  if (!items || items.length === 0) {
    return (
      <section className="card bg-base-200 mb-4">
        <div className="card-body p-4">
          <h3 className="font-semibold">Ambassador Program</h3>
          <p className="text-sm">
            Applications are open. <Link href="/ambassadors/apply" className="link link-primary">Apply now</Link>.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card bg-base-200 mb-4">
      <div className="card-body p-4">
        <h3 className="font-semibold">Ambassador Application Status</h3>
        <ul className="space-y-2 mt-2">
          {items.map((a) => (
            <li key={a.applicationId} className="flex items-center justify-between">
              <div>
                <span className={BADGE_CLASS[a.status]}>{BADGE_LABEL[a.status]}</span>
                <span className="ml-2 text-sm opacity-70">Submitted {formatTs(a.submittedAt)}</span>
                {a.status === "accepted" && a.discordRetryNeeded && (
                  <span className="ml-2 badge badge-warning badge-sm">Discord pending — admin will retry</span>
                )}
              </div>
              {a.decidedAt && <span className="text-xs opacity-60">Decided {formatTs(a.decidedAt)}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

**File 2: `src/app/profile/page.tsx`** — insert the new section.

```typescript
// MINIMAL SURGERY only. Do not rewrite existing profile page.
// Locate the JSX where the profile renders (after header, before other sections).
// Add ONE import at the top:
//   import AmbassadorApplicationStatus from "./AmbassadorApplicationStatus";
// Add ONE render location (inside the profile layout, before other sections):
//   <AmbassadorApplicationStatus />

// If isAmbassadorProgramEnabled() is false (server-side check), render nothing — the page currently-existing content is unaffected.
// Wrap with a feature-flag check:
//   {isAmbassadorProgramEnabled() && <AmbassadorApplicationStatus />}
// (If page.tsx is a client component, use the NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM env var via the same helper — it reads both server+client flags.)
```

Executor instructions:
1. Open `src/app/profile/page.tsx`.
2. Add the import: `import AmbassadorApplicationStatus from "./AmbassadorApplicationStatus";` (alongside existing imports).
3. Add the import: `import { isAmbassadorProgramEnabled } from "@/lib/features";` (if not already present).
4. Find the main profile body render location — a natural place is right after the profile header / before mentor / mentee sections.
5. Insert: `{isAmbassadorProgramEnabled() && <AmbassadorApplicationStatus />}`
6. If the page is a server component, the check is inline. If it's a client component, the same `isAmbassadorProgramEnabled()` helper works via `NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM`.
7. Do NOT remove or rearrange any existing content in profile/page.tsx.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>AmbassadorApplicationStatus component fetches /api/ambassador/applications/me on mount, renders a status badge + "Apply now" CTA (if no application exists). The component is mounted inside src/app/profile/page.tsx behind the feature flag.</done>
  <acceptance_criteria>
    - `grep -q "api/ambassador/applications/me" src/app/profile/AmbassadorApplicationStatus.tsx`
    - `grep -q "badge-success" src/app/profile/AmbassadorApplicationStatus.tsx` (accepted status badge)
    - `grep -q "badge-error" src/app/profile/AmbassadorApplicationStatus.tsx` (declined status badge)
    - `grep -q "Apply now" src/app/profile/AmbassadorApplicationStatus.tsx` (empty-state CTA)
    - `grep -q "discordRetryNeeded" src/app/profile/AmbassadorApplicationStatus.tsx` (surfaces DISC-03 retry state)
    - `grep -q '"use client"' src/app/profile/AmbassadorApplicationStatus.tsx` OR `grep -q "'use client'" src/app/profile/AmbassadorApplicationStatus.tsx`
    - `grep -q "AmbassadorApplicationStatus" src/app/profile/page.tsx` (mounted)
    - `grep -q "isAmbassadorProgramEnabled" src/app/profile/page.tsx` (feature-gated)
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
</task>

</tasks>

<verification>
```bash
npx tsc --noEmit
npx next build --debug 2>&1 | grep -E "(error|Type error)" | head -5
```

Smoke test (requires local dev server + feature flag on + open cohort):
1. Sign in as a user whose CWA profile is <30 days old → visit /ambassadors/apply → see "Not quite yet!" screen, cannot advance.
2. Sign in as an eligible user → visit /ambassadors/apply → Step 1 advances automatically → Step 2 shows cohort dropdown with the open cohort → fill fields → Continue → Step 3 renders.
3. In Step 3, fill all three prompts with <60 chars each → click Continue → see red error messages on each.
4. Paste `https://vimeo.com/123` as video → click Continue → error: "Paste a Loom, YouTube, or Google Drive link."
5. Paste `https://www.loom.com/share/abc123` → error clears.
6. Enter `test@gmail.com` as academic email → blur → warning alert appears but Continue still works.
7. Switch to "I don't have a .edu email" → upload JPEG → see "Uploaded." confirmation.
8. Review step shows all values → Submit → redirect to /profile → toast "Application submitted!" → AmbassadorApplicationStatus section shows "Submitted" badge.
9. Submit again → API returns 409 → toast "You already have an active application for this cohort."
</verification>

<success_criteria>
- [ ] All 4 steps are reachable in order; each enforces its own validation before advancing.
- [ ] Step 1 uses AMBASSADOR_DISCORD_MIN_AGE_DAYS constant — no hardcoded "30".
- [ ] Step 2 shows "No open cohorts" empty state if GET /api/ambassador/cohorts?scope=open returns 0 items (D-05).
- [ ] Step 3 enforces D-13 explicit two-path choice; hides the "other" path's inputs after choice.
- [ ] Step 3 student-ID upload uses signed URL flow (POST → PUT to GCS).
- [ ] Step 3 video URL validated by isValidVideoUrl from Plan 02 (client-side + server-side parity).
- [ ] D-15 soft warning fires on unknown academic TLD; form remains submittable.
- [ ] Submit POSTs to /api/ambassador/applications with Bearer idToken, handles 201/400/403/409 responses.
- [ ] AmbassadorApplicationStatus renders on /profile and shows the applicant's application status (APPLY-07).
- [ ] `npx tsc --noEmit` passes.
- [ ] `npx next build` succeeds (no route errors).
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-subsystem/02-07-SUMMARY.md` with:
- Component tree diagram (page → ApplyWizard → 4 steps)
- How Plan 08 (admin list + detail) reads the same shape via /api/ambassador/applications (no new wire formats needed)
- Any AuthContext / ToastContext path adjustments made during implementation
- Note on studentIdStoragePath vs. applicationId: the storage path uses a client-UUID that does NOT match the Firestore doc id; admin detail page reads storagePath from the doc and generates a signed URL in Plan 08
- Any deviations from the plan with rationale
</output>
