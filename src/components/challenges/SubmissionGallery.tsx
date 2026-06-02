import { ExternalLink, Github } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import type { Submission } from "@/types/challenges";

function formatSubmittedAt(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Renders a grid of user submissions for a specific challenge.
 * Displays user avatars, repository links, and optional demo links.
 */
export default function SubmissionGallery({
  submissions,
}: {
  submissions: Submission[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-base-300 bg-base-200 p-8 text-center">
        <h3 className="font-semibold text-lg">No submissions yet</h3>
        <p className="text-sm text-base-content/70 mt-2">
          Be the first participant to add a project to this challenge gallery.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {submissions.map((submission) => (
        <article
          key={submission.id}
          className="card bg-base-200 border border-base-300 shadow-sm h-full"
        >
          <div className="card-body">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                photoURL={submission.userAvatar}
                displayName={submission.userName}
                size="sm"
              />
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{submission.userName}</h3>
                <p className="text-xs text-base-content/60">
                  Submitted {formatSubmittedAt(submission.submittedAt)}
                </p>
              </div>
            </div>

            {submission.description && (
              <p className="text-sm text-base-content/70">
                {submission.description}
              </p>
            )}

            <div className="card-actions mt-auto">
              <a
                href={submission.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline"
              >
                <Github className="w-4 h-4" aria-hidden="true" />
                Repo
              </a>
              {submission.demoUrl && (
                <a
                  href={submission.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-primary"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  Demo
                </a>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
