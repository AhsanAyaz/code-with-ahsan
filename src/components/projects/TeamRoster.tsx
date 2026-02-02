"use client";

import Image from "next/image";
import { Project, ProjectMember } from "@/types/mentorship";

interface TeamRosterProps {
  project: Project;
  members: ProjectMember[];
  isCreator: boolean;
  onRemoveMember?: (memberId: string) => void;
}

export default function TeamRoster({
  project,
  members,
  isCreator,
  onRemoveMember,
}: TeamRosterProps) {
  const totalMembers = members.length + 1; // +1 for creator

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Team ({totalMembers} member{totalMembers !== 1 ? "s" : ""})
      </h2>

      <div className="space-y-3">
        {/* Creator */}
        <div className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
          {project.creatorProfile?.photoURL && (
            <Image
              src={project.creatorProfile.photoURL}
              alt={project.creatorProfile.displayName}
              width={48}
              height={48}
              className="rounded-full"
            />
          )}
          <div className="flex-1">
            <div className="font-semibold">
              {project.creatorProfile?.displayName}
            </div>
            {project.creatorProfile?.username && (
              <div className="text-sm text-base-content/70">
                @{project.creatorProfile.username}
              </div>
            )}
          </div>
          <span className="badge badge-primary">Creator</span>
        </div>

        {/* Members */}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
          >
            {member.userProfile?.photoURL && (
              <Image
                src={member.userProfile.photoURL}
                alt={member.userProfile.displayName}
                width={48}
                height={48}
                className="rounded-full"
              />
            )}
            <div className="flex-1">
              <div className="font-semibold">
                {member.userProfile?.displayName}
              </div>
              {member.userProfile?.username && (
                <div className="text-sm text-base-content/70">
                  @{member.userProfile.username}
                </div>
              )}
            </div>
            <span className="badge">Member</span>
            {isCreator && onRemoveMember && (
              <button
                onClick={() => onRemoveMember(member.id)}
                className="btn btn-ghost btn-sm btn-circle"
                title="Remove member"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-sm text-base-content/60 text-center py-4">
          No team members yet. Applications will appear here once approved.
        </div>
      )}
    </div>
  );
}
