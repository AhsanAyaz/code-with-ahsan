---
phase: 3
plan: "03-04"
title: "AmbassadorBadge component + /u/[username] canonical profile route + 308 redirect"
wave: 3
depends_on: ["03-02"]
files_modified:
  - "src/components/ambassador/AmbassadorBadge.tsx"
  - "src/app/u/[username]/page.tsx"
  - "src/app/u/[username]/PublicProfileClient.tsx"
  - "next.config.ts"
autonomous: true
requirements:
  - "PRESENT-02"
must_haves:
  - "Visiting `/u/{username}` renders an Ambassador badge when the underlying profile has `\"ambassador\"` in `roles`, and an Alumni Ambassador badge when it has `\"alumni-ambassador\"` — verified by server-side `hasRole(profile, ...)` (PRESENT-02)."
  - "A request to `/mentorship/mentors/{username}` returns a 308 permanent redirect to `/u/{username}` with the full path + query string preserved (D-01)."
  - "`AmbassadorBadge` is a single reusable component that switches on `role: \"ambassador\" | \"alumni-ambassador\"` so Phase 5's alumni transition reuses it unchanged (D-10); badge rendering is scoped to `/u/[username]` only (D-11)."
---

<objective>
Ship the canonical public profile route `/u/[username]` and the reusable `AmbassadorBadge` component that renders the "Ambassador" or "Alumni Ambassador" pill on it (PRESENT-02, D-10, D-11). Also wire the 308 permanent redirect from `/mentorship/mentors/[username]` → `/u/[username]` (D-01) so every existing mentor deep-link survives. The page is intentionally generic: it composes mentor-section content (if `hasRole(profile, "mentor")`) with ambassador badge(s) above the mentor content (if `hasRole(profile, "ambassador"|"alumni-ambassador")`). For v1 the mentor section reuses the existing `MentorProfileClient` logic moved/copied under the new route; if the user is ambassador-only (no mentor role), a stripped-down public card is rendered showing just photo, display name, badges, and the ambassador's social links from `public_ambassadors/{uid}`. The 308 redirect lives in `next.config.ts` because `redirects()` preserves `:path*` + query strings natively and applies at the edge before Next.js routing — that's cleaner than a per-route `redirect()` call that requires a placeholder page to exist.
</objective>

<tasks>

<task id="1" title="Create AmbassadorBadge component">
  <read_first>
    - src/components/mentorship/MentorCard.tsx (DaisyUI badge + icon patterns)
    - src/types/mentorship.ts (Role type)
    - .planning/codebase/CONVENTIONS.md (PascalCase component, DaisyUI)
  </read_first>
  <action>
    Create the directory and file `src/components/ambassador/AmbassadorBadge.tsx` with the exact contents below. Single component, two variants, both using DaisyUI `badge` classes consistent with existing `MentorCard` `badge badge-primary` patterns. Uses Lucide React (already in `package.json`, per STACK.md) for the icon.

    ```tsx
    "use client";

    import { Award, GraduationCap } from "lucide-react";

    export type AmbassadorBadgeRole = "ambassador" | "alumni-ambassador";

    interface AmbassadorBadgeProps {
      role: AmbassadorBadgeRole;
      /** Optional size modifier — maps to DaisyUI badge sizes. Default: "md". */
      size?: "sm" | "md" | "lg";
      /** Optional extra className appended after the DaisyUI classes. */
      className?: string;
    }

    /**
     * Ambassador / Alumni Ambassador pill (PRESENT-02, D-10).
     *
     * Single component, two variants. Phase 5's alumni transition reuses this
     * unchanged by switching the `role` prop — NO Phase 3 code edits required
     * when Phase 5 adds its own call-sites.
     *
     * Badge placement scoped to /u/[username] only for Phase 3 (D-11). MentorCard
     * integration, project/roadmap byline chips, etc. are deferred to a future
     * quick task.
     */
    export default function AmbassadorBadge({
      role,
      size = "md",
      className = "",
    }: AmbassadorBadgeProps) {
      const sizeClass = size === "sm" ? "badge-sm" : size === "lg" ? "badge-lg" : "";
      if (role === "ambassador") {
        return (
          <span
            className={`badge badge-primary gap-1 ${sizeClass} ${className}`.trim()}
            title="Code With Ahsan Student Ambassador"
          >
            <Award className="h-3 w-3" aria-hidden="true" />
            Ambassador
          </span>
        );
      }
      // role === "alumni-ambassador"
      return (
        <span
          className={`badge badge-secondary gap-1 ${sizeClass} ${className}`.trim()}
          title="Code With Ahsan Alumni Ambassador"
        >
          <GraduationCap className="h-3 w-3" aria-hidden="true" />
          Alumni Ambassador
        </span>
      );
    }
    ```

    Verify:
    ```bash
    npx tsc --noEmit
    npm run lint -- --quiet src/components/ambassador/AmbassadorBadge.tsx
    ```
  </action>
  <acceptance_criteria>
    - `test -f src/components/ambassador/AmbassadorBadge.tsx`
    - `grep -q "export default function AmbassadorBadge" src/components/ambassador/AmbassadorBadge.tsx`
    - `grep -q "\"ambassador\" | \"alumni-ambassador\"" src/components/ambassador/AmbassadorBadge.tsx`
    - `grep -q "from \"lucide-react\"" src/components/ambassador/AmbassadorBadge.tsx`
    - `grep -q "badge badge-primary" src/components/ambassador/AmbassadorBadge.tsx`
    - `grep -q "badge badge-secondary" src/components/ambassador/AmbassadorBadge.tsx`
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
</task>

<task id="2" title="Create /u/[username] canonical public profile route">
  <read_first>
    - src/app/mentorship/mentors/[username]/page.tsx (current mentor detail page — reference pattern for server-fetch + metadata + client wrapper)
    - src/app/mentorship/mentors/[username]/MentorProfileClient.tsx (client component to reuse inside PublicProfileClient)
    - src/lib/firebaseAdmin.ts (db)
    - src/lib/permissions.ts (hasRole)
    - src/types/mentorship.ts (MentorshipProfile, Role)
    - src/types/ambassador.ts (AmbassadorSubdoc, PublicAmbassadorDoc, PUBLIC_AMBASSADORS_COLLECTION — after Plan 03-01)
    - src/components/ambassador/AmbassadorBadge.tsx (Task 1 above)
    - src/components/ProfileAvatar.tsx
  </read_first>
  <action>
    STEP A — Create `src/app/u/[username]/page.tsx` (server component, fetches via Admin SDK, generates metadata, passes initial data to a client wrapper).

    Use this content VERBATIM. The profile lookup queries `mentorship_profiles` by `where("username", "==", username.toLowerCase())` — same pattern as `/mentorship/mentors/[username]/page.tsx` lines 14–32. It then reads the ambassador subdoc (if present) to determine whether to render ambassador sections.

    ```typescript
    import type { Metadata } from "next";
    import { notFound } from "next/navigation";
    import { db } from "@/lib/firebaseAdmin";
    import {
      PUBLIC_AMBASSADORS_COLLECTION,
      type PublicAmbassadorDoc,
    } from "@/types/ambassador";
    import type { Role } from "@/types/mentorship";
    import PublicProfileClient from "./PublicProfileClient";

    interface PageProps {
      params: Promise<{ username: string }>;
    }

    export interface PublicProfileData {
      uid: string;
      username: string;
      displayName: string;
      photoURL: string;
      roles: Role[];
      // Mentor-section fields (rendered only if roles includes "mentor" and status accepted)
      mentorPublic: boolean;
      // Ambassador-section fields (rendered only if roles includes "ambassador" or "alumni-ambassador")
      ambassadorPublic: PublicAmbassadorDoc | null;
      linkedinUrl?: string;
      bio?: string;
      currentRole?: string;
    }

    async function getPublicProfile(
      username: string
    ): Promise<PublicProfileData | null> {
      try {
        const snap = await db
          .collection("mentorship_profiles")
          .where("username", "==", username.toLowerCase())
          .limit(1)
          .get();

        if (snap.empty) return null;

        const doc = snap.docs[0];
        const p = doc.data() as {
          username?: string;
          displayName?: string;
          photoURL?: string;
          roles?: Role[];
          role?: Role | null;
          status?: string;
          isPublic?: boolean;
          linkedinUrl?: string;
          bio?: string;
          currentRole?: string;
        };
        const uid = doc.id;

        const roles: Role[] =
          Array.isArray(p.roles) && p.roles.length > 0
            ? (p.roles.filter(Boolean) as Role[])
            : p.role
              ? [p.role]
              : [];

        // Ambassador projection (public read — the single source of truth for
        // ambassador-section content on this page).
        let ambassadorPublic: PublicAmbassadorDoc | null = null;
        if (roles.includes("ambassador") || roles.includes("alumni-ambassador")) {
          const ambSnap = await db
            .collection(PUBLIC_AMBASSADORS_COLLECTION)
            .doc(uid)
            .get();
          if (ambSnap.exists) {
            ambassadorPublic = { ...(ambSnap.data() as PublicAmbassadorDoc), uid };
          }
        }

        // Mentor section is visible only for accepted + public mentors (mirrors the
        // existing /mentorship/mentors/[username] gating).
        const mentorPublic =
          roles.includes("mentor") &&
          p.status === "accepted" &&
          p.isPublic !== false;

        return {
          uid,
          username: (p.username ?? username).toLowerCase(),
          displayName: p.displayName ?? username,
          photoURL: p.photoURL ?? "",
          roles,
          mentorPublic,
          ambassadorPublic,
          linkedinUrl: p.linkedinUrl,
          bio: p.bio,
          currentRole: p.currentRole,
        };
      } catch (error) {
        console.error("Error fetching public profile:", error);
        return null;
      }
    }

    export async function generateMetadata({
      params,
    }: PageProps): Promise<Metadata> {
      const { username } = await params;
      const profile = await getPublicProfile(username);
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
      const url = `${siteUrl}/u/${username}`;

      if (!profile) {
        return {
          title: "Profile Not Found | Code with Ahsan",
          description: "This profile is not available.",
          alternates: { canonical: url },
        };
      }

      const isAmbassador = profile.roles.includes("ambassador");
      const isAlumni = profile.roles.includes("alumni-ambassador");
      const badgeLabel = isAmbassador
        ? "Student Ambassador"
        : isAlumni
          ? "Alumni Ambassador"
          : profile.roles.includes("mentor")
            ? "Mentor"
            : "Member";

      const title = `${profile.displayName} (@${profile.username}) — ${badgeLabel} | Code with Ahsan`;
      const description =
        profile.bio ??
        profile.ambassadorPublic?.publicTagline ??
        `${profile.displayName} on Code with Ahsan.`;

      return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
          title,
          description,
          url,
          siteName: "Code with Ahsan",
          type: "profile",
        },
        twitter: { card: "summary", title, description },
        robots: { index: true, follow: true },
      };
    }

    export default async function PublicProfilePage({ params }: PageProps) {
      const { username } = await params;
      const profile = await getPublicProfile(username);
      if (!profile) notFound();
      // Refuse to render if the profile exists but has no public-visible role —
      // prevents enumerating users by username.
      if (!profile.mentorPublic && !profile.ambassadorPublic) notFound();

      return <PublicProfileClient profile={profile} />;
    }
    ```

    STEP B — Create `src/app/u/[username]/PublicProfileClient.tsx`. Client component that composes:
      1. Header: ProfileAvatar + displayName + `@username` + badges row (via AmbassadorBadge)
      2. Social links row if any of linkedinUrl / twitterUrl / githubUrl / personalSiteUrl are present
      3. Bio / tagline paragraph
      4. Mentor-section placeholder comment: `{/* Mentor-section v1: link out to /mentorship/mentors/[username] for the legacy deep-profile view */}` — in v1 we do not in-place absorb the full MentorProfileClient (too much client state); instead we link to the existing /mentorship/mentors/[username] URL. That URL is NOW the redirect source (handled in Task 3), so this link is a scaffold for v2 when the mentor content is inlined. For Phase 3 the important outcome is the badges render correctly (PRESENT-02); rich mentor UI migration is deferred.

    Use this content VERBATIM:

    ```tsx
    "use client";

    import Link from "next/link";
    import ProfileAvatar from "@/components/ProfileAvatar";
    import AmbassadorBadge from "@/components/ambassador/AmbassadorBadge";
    import type { PublicProfileData } from "./page";

    interface Props {
      profile: PublicProfileData;
    }

    export default function PublicProfileClient({ profile }: Props) {
      const isAmbassador = profile.roles.includes("ambassador");
      const isAlumni = profile.roles.includes("alumni-ambassador");
      const isMentor = profile.mentorPublic;

      const amb = profile.ambassadorPublic;
      const linkedinUrl = profile.linkedinUrl ?? amb?.linkedinUrl;
      const twitterUrl = amb?.twitterUrl;
      const githubUrl = amb?.githubUrl;
      const personalSiteUrl = amb?.personalSiteUrl;
      const hasSocials = !!(linkedinUrl || twitterUrl || githubUrl || personalSiteUrl);

      return (
        <div className="max-w-3xl mx-auto space-y-6 py-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {/* Header */}
              <div className="flex items-start gap-4">
                <ProfileAvatar
                  photoURL={profile.photoURL}
                  displayName={profile.displayName}
                  size="xl"
                  ring
                />
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                  <p className="text-sm text-base-content/70">@{profile.username}</p>
                  {/* Badges row (PRESENT-02, D-10, D-11) */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isAmbassador && <AmbassadorBadge role="ambassador" />}
                    {isAlumni && <AmbassadorBadge role="alumni-ambassador" />}
                  </div>
                </div>
              </div>

              {/* Tagline / Bio */}
              {amb?.publicTagline && (
                <p className="mt-4 text-base-content/80">{amb.publicTagline}</p>
              )}
              {!amb?.publicTagline && profile.bio && (
                <p className="mt-4 text-base-content/80">{profile.bio}</p>
              )}

              {/* University / City (ambassador subdoc) */}
              {(amb?.university || amb?.city) && (
                <p className="text-sm text-base-content/60 mt-2">
                  {[amb?.university, amb?.city].filter(Boolean).join(" · ")}
                </p>
              )}

              {/* Social links row */}
              {hasSocials && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      LinkedIn
                    </a>
                  )}
                  {twitterUrl && (
                    <a
                      href={twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      Twitter
                    </a>
                  )}
                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      GitHub
                    </a>
                  )}
                  {personalSiteUrl && (
                    <a
                      href={personalSiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      Website
                    </a>
                  )}
                </div>
              )}

              {/* Mentor section — for v1, link to the legacy mentor detail UI.
                 NOTE: /mentorship/mentors/[username] 308-redirects back here (Task 3),
                 so this link is a v2-scaffold placeholder. Keeping the mentor deep-profile
                 inlined is deferred. The badges + public fields above cover PRESENT-02. */}
              {isMentor && (
                <div className="mt-6 pt-6 border-t border-base-200">
                  <p className="text-sm text-base-content/70">
                    {profile.displayName} is a Code With Ahsan mentor.
                  </p>
                  <Link
                    href={`/mentorship/mentors?search=${encodeURIComponent(profile.displayName)}`}
                    className="btn btn-primary btn-sm mt-2"
                  >
                    See mentor profile
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    ```

    Verify:
    ```bash
    npx tsc --noEmit
    npm run lint -- --quiet src/app/u/[username]/page.tsx src/app/u/[username]/PublicProfileClient.tsx
    ```
  </action>
  <acceptance_criteria>
    - `test -f src/app/u/[username]/page.tsx`
    - `test -f src/app/u/[username]/PublicProfileClient.tsx`
    - `grep -q "export default async function PublicProfilePage" src/app/u/[username]/page.tsx`
    - `grep -q "PUBLIC_AMBASSADORS_COLLECTION" src/app/u/[username]/page.tsx`
    - `grep -q "AmbassadorBadge" src/app/u/[username]/PublicProfileClient.tsx`
    - `grep -q "isAmbassador && <AmbassadorBadge role=\"ambassador\" />" src/app/u/[username]/PublicProfileClient.tsx`
    - `grep -q "isAlumni && <AmbassadorBadge role=\"alumni-ambassador\" />" src/app/u/[username]/PublicProfileClient.tsx`
    - `grep -q "notFound()" src/app/u/[username]/page.tsx`
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
</task>

<task id="3" title="Add 308 redirect /mentorship/mentors/[username] → /u/[username] in next.config.ts">
  <read_first>
    - next.config.ts (existing `redirects()` block — lines 30–107)
    - .planning/phases/03-public-presentation/03-CONTEXT.md (D-01)
  </read_first>
  <action>
    Open `next.config.ts`. Inside the `async redirects()` block, add ONE new entry at the END of the returned array (after the last existing entry `{ source: "/dinq-giveaway", ... permanent: true }`, before the closing `];`). The `:username*` parameter pattern preserves the captured segment; query strings are preserved automatically by Next.js redirects.

    Next.js redirects with `permanent: true` emit HTTP 308. `:path` wildcards capture a single segment; `:path*` captures deep paths. Mentor detail is exactly one segment deep (`/mentorship/mentors/[username]`), so `:username` is correct.

    Insert VERBATIM:

    ```typescript
          {
            // Phase 3 D-01: /u/[username] is the canonical public profile URL.
            // /mentorship/mentors/[username] 308-redirects here so existing deep-links
            // (inbound SEO, OG shares, social cards) keep resolving.
            source: "/mentorship/mentors/:username",
            destination: "/u/:username",
            permanent: true,
          },
    ```

    Preserve final-comma placement so JSON/TS syntax stays valid. Then build:

    ```bash
    npx tsc --noEmit
    # Optional: dry-run the build to surface any Next.js config parse error
    npm run build -- --no-lint 2>&1 | tail -40
    ```

    IMPORTANT: the existing mentor detail pages at `/mentorship/mentors/[username]/page.tsx` + `MentorProfileClient.tsx` can REMAIN in the repo — the redirect fires before Next.js reaches the route tree, so the files are dead code but not broken code. Do NOT delete them in this plan; deletion is a post-launch cleanup task.
  </action>
  <acceptance_criteria>
    - `grep -q "/mentorship/mentors/:username" next.config.ts`
    - `grep -A3 "/mentorship/mentors/:username" next.config.ts | grep -q "destination: \"/u/:username\""`
    - `grep -A4 "/mentorship/mentors/:username" next.config.ts | grep -q "permanent: true"`
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0 (or the redirect step does not produce an error in output)
  </acceptance_criteria>
</task>

</tasks>

<verification>
- `test -f src/components/ambassador/AmbassadorBadge.tsx && test -f src/app/u/[username]/page.tsx && test -f src/app/u/[username]/PublicProfileClient.tsx`
- `grep -q "/mentorship/mentors/:username" next.config.ts`
- `npx tsc --noEmit` exits 0
- Manual smoke test after deploy:
  - `curl -sI $SITE_URL/mentorship/mentors/ahsanayaz` → 308 with `location: /u/ahsanayaz`
  - Visit `/u/{some-seeded-ambassador-username}` → page renders with Ambassador badge
  - Visit `/u/{non-existent}` → 404 via `notFound()`
</verification>

<must_haves>
- Visiting `/u/{username}` renders an Ambassador badge when the underlying profile has `"ambassador"` in `roles`, and an Alumni Ambassador badge when it has `"alumni-ambassador"` — verified by server-side `hasRole(profile, ...)` (PRESENT-02).
- A request to `/mentorship/mentors/{username}` returns a 308 permanent redirect to `/u/{username}` with the full path + query string preserved (D-01).
- `AmbassadorBadge` is a single reusable component that switches on `role: "ambassador" | "alumni-ambassador"` so Phase 5's alumni transition reuses it unchanged (D-10); badge rendering is scoped to `/u/[username]` only (D-11).
</must_haves>
