"use client";

import Link from "next/link";
import { Linkedin, Twitter, Github, Globe } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import VideoEmbed from "@/app/admin/ambassadors/[applicationId]/VideoEmbed";
import AmbassadorBadge from "@/components/ambassador/AmbassadorBadge";
import type { PublicAmbassadorDoc } from "@/types/ambassador";

interface Props {
  ambassador: PublicAmbassadorDoc;
}

export default function AmbassadorCard({ ambassador }: Props) {
  const profileHref = `/u/${ambassador.username || ambassador.uid}`;

  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body gap-3">
        <div className="flex items-start gap-4">
          <ProfileAvatar
            photoURL={ambassador.photoURL ?? undefined}
            displayName={ambassador.displayName ?? "Ambassador"}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <Link
              href={profileHref}
              className="link link-hover no-underline"
            >
              <h3 className="text-lg font-semibold truncate">
                {ambassador.displayName ?? "Ambassador"}
              </h3>
            </Link>
            <div className="mt-1">
              <AmbassadorBadge role="ambassador" size="sm" />
            </div>
            {ambassador.publicTagline && (
              <p className="text-sm text-base-content/70 mt-2 line-clamp-2">
                {ambassador.publicTagline}
              </p>
            )}
          </div>
        </div>

        {(ambassador.university || ambassador.city) && (
          <div className="flex flex-wrap gap-2">
            {ambassador.university && (
              <span className="badge badge-outline badge-sm">
                {ambassador.university}
              </span>
            )}
            {ambassador.city && (
              <span className="badge badge-outline badge-sm">
                {ambassador.city}
              </span>
            )}
          </div>
        )}

        {ambassador.cohortPresentationVideoUrl &&
          ambassador.cohortPresentationVideoEmbedType && (
            <div className="mt-2">
              <VideoEmbed
                videoUrl={ambassador.cohortPresentationVideoUrl}
                videoEmbedType={ambassador.cohortPresentationVideoEmbedType}
              />
            </div>
          )}

        <div className="flex items-center gap-3 mt-2">
          {ambassador.linkedinUrl && (
            <a
              href={ambassador.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="text-base-content/60 hover:text-primary"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          )}
          {ambassador.twitterUrl && (
            <a
              href={ambassador.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="text-base-content/60 hover:text-primary"
            >
              <Twitter className="w-5 h-5" />
            </a>
          )}
          {ambassador.githubUrl && (
            <a
              href={ambassador.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-base-content/60 hover:text-primary"
            >
              <Github className="w-5 h-5" />
            </a>
          )}
          {ambassador.personalSiteUrl && (
            <a
              href={ambassador.personalSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Personal site"
              className="text-base-content/60 hover:text-primary"
            >
              <Globe className="w-5 h-5" />
            </a>
          )}
          <Link
            href={profileHref}
            className="btn btn-primary btn-sm ml-auto"
          >
            View profile
          </Link>
        </div>
      </div>
    </div>
  );
}
