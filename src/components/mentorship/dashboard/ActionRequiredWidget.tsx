import { MentorshipMatch, ProjectInvitation } from "@/types/mentorship";
import { useState } from "react";
import ProfileAvatar from "@/components/ProfileAvatar";

interface ActionRequiredWidgetProps {
  requests: MentorshipMatch[];
  invitations: ProjectInvitation[];
  role: "mentor" | "mentee";
  onAction: (
    type: "request" | "invitation",
    id: string,
    action: "approve" | "decline" | "accept"
  ) => Promise<void>;
}

export default function ActionRequiredWidget({
  requests,
  invitations,
  role,
  onAction,
}: ActionRequiredWidgetProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (
    type: "request" | "invitation",
    id: string,
    action: "approve" | "decline" | "accept"
  ) => {
    setLoadingId(id);
    try {
      await onAction(type, id, action);
    } finally {
      setLoadingId(null);
    }
  };

  if (requests.length === 0 && invitations.length === 0) {
    return null; // Don't show if nothing to do
  }

  return (
    <div className="card bg-base-100 shadow-xl border-l-4 border-warning col-span-1 md:col-span-2">
      <div className="card-body">
        <h3 className="text-xl font-bold flex items-center gap-2 text-warning">
          <span className="text-2xl">⚠️</span> Action Required
        </h3>

        <div className="space-y-4">
          {/* Mentorship Requests (Mentor) */}
          {requests.map((req) => (
            <div
              key={req.id}
              className="alert bg-base-200/50 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <ProfileAvatar photoURL={(req as any).menteeProfile?.photoURL} displayName={(req as any).menteeProfile?.displayName} size="md" />
              <div className="flex-1">
                <div className="font-bold">
                  {(req as any).menteeProfile?.displayName || "Unknown Mentee"}
                </div>
                <div className="text-xs text-base-content/70">
                  Requested mentorship
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className="btn btn-sm btn-success flex-1 sm:flex-none"
                  onClick={() => handleAction("request", req.id, "approve")}
                  disabled={loadingId === req.id}
                >
                  Approve
                </button>
                <button
                  className="btn btn-sm btn-ghost text-error flex-1 sm:flex-none"
                  onClick={() => handleAction("request", req.id, "decline")}
                  disabled={loadingId === req.id}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}

          {/* Project Invitations (Mentee/Mentor) */}
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="alert bg-base-200/50 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="text-2xl">📩</div>
              <div className="flex-1">
                <div className="font-bold">Project Invitation</div>
                <div className="text-xs text-base-content/70">
                  You&apos;ve been invited to join a project
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  className="btn btn-sm btn-success flex-1 sm:flex-none"
                  onClick={() => handleAction("invitation", inv.id, "accept")}
                  disabled={loadingId === inv.id}
                >
                  Accept
                </button>
                <button
                  className="btn btn-sm btn-ghost text-error flex-1 sm:flex-none"
                  onClick={() => handleAction("invitation", inv.id, "decline")}
                  disabled={loadingId === inv.id}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
