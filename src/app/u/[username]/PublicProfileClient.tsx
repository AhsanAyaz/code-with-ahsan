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
