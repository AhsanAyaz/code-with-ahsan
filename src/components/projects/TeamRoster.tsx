"use client";

import Image from "next/image";
import { Project, ProjectMember } from "@/types/mentorship";
import ContactInfo from "@/components/mentorship/ContactInfo";

interface TeamRosterProps {
  project: Project;
  members: ProjectMember[];
  isCreator: boolean;
  onRemoveMember?: (memberId: string) => void;
  removingMemberId?: string | null;
  onTransferOwnership?: (memberId: string, memberName: string) => void;
}

export default function TeamRoster({
  project,
  members,
  isCreator,
  onRemoveMember,
  removingMemberId,
  onTransferOwnership,
}: TeamRosterProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Team ({members.length} / {project.maxTeamSize} members)
      </h2>

      <div className="space-y-3">
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
              <ContactInfo discordUsername={member.userProfile?.discordUsername} />
            </div>
            {member.userId === project.creatorId ? (
              <span className="badge badge-primary">Creator</span>
            ) : (
              <span className="badge">Member</span>
            )}
            {isCreator && member.userId !== project.creatorId && (
              <div className="flex gap-1">
                {onTransferOwnership && (
                  <button
                    onClick={() => onTransferOwnership(member.userId, member.userProfile?.displayName || "this member")}
                    className="btn btn-ghost btn-sm"
                    title="Transfer ownership"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Transfer
                  </button>
                )}
                {onRemoveMember && (
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="btn btn-ghost btn-sm btn-circle"
                    title="Remove member"
                    disabled={removingMemberId === member.id}
                  >
                    {removingMemberId === member.id ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
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
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-sm text-base-content/60 text-center py-4">
          No team members yet.
        </div>
      )}
    </div>
  );
}
