"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Github, Linkedin, Send } from "lucide-react";
import { AuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useMentorship } from "@/contexts/MentorshipContext";
import { authFetch } from "@/lib/apiClient";
import type { Challenge } from "@/types/challenges";

export const dynamic = "force-dynamic";

/**
 * Project Submission Page.
 * Allows authenticated participants to submit a GitHub repo and optional demo link
 * to an active challenge. Handles prerequisite checks like ensuring the user has
 * already joined the challenge.
 */
export default function SubmitChallengePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { setShowLoginPopup } = useContext(AuthContext);
  const { user, loading } = useMentorship();
  const challengeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [description, setDescription] = useState("");
  const [joined, setJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [loadingJoinStatus, setLoadingJoinStatus] = useState(true);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoadingChallenge(true);
        const response = await fetch(`/api/challenges/${challengeId}`);
        if (!response.ok) {
          throw new Error("Challenge not found");
        }
        const data = await response.json();
        setChallenge(data.challenge);
      } catch (fetchError) {
        console.error("Error fetching challenge:", fetchError);
        setError("Challenge not found or no longer available.");
      } finally {
        setLoadingChallenge(false);
      }
    };

    if (challengeId) {
      fetchChallenge();
    }
  }, [challengeId]);

  useEffect(() => {
    const fetchJoinStatus = async () => {
      if (!challengeId) return;
      try {
        setLoadingJoinStatus(true);
        const response = await authFetch(
          `/api/challenges/${challengeId}/participants`,
          {
            method: "GET",
          },
        );

        if (!response.ok) {
          throw new Error("Unable to determine join status");
        }

        const data = await response.json();
        setJoined(Boolean(data.joined));
        setParticipantCount(typeof data.count === "number" ? data.count : null);
      } catch (fetchError) {
        console.error("Error fetching participant status:", fetchError);
      } finally {
        setLoadingJoinStatus(false);
      }
    };

    if (user && challengeId) {
      fetchJoinStatus();
    }
  }, [challengeId, user]);

  const handleJoinChallenge = async () => {
    if (!user) {
      setShowLoginPopup(true);
      return;
    }

    setError(null);

    try {
      const response = await authFetch(
        `/api/challenges/${challengeId}/participants`,
        {
          method: "POST",
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to join challenge");
      }

      setJoined(true);
      setParticipantCount((prev) => (typeof prev === "number" ? prev + 1 : 1));
      toast.success(
        "You joined the challenge. Now you can submit your project!",
      );
    } catch (joinError) {
      const message =
        joinError instanceof Error
          ? joinError.message
          : "Failed to join challenge";
      setError(message);
      toast.error(message);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setShowLoginPopup(true);
      return;
    }

    if (!joined) {
      setError("Please join the challenge before submitting your project.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await authFetch(
        `/api/challenges/${challengeId}/submissions`,
        {
          method: "POST",
          body: JSON.stringify({
            repoUrl: repoUrl.trim(),
            demoUrl: demoUrl.trim() || undefined,
            linkedinUrl: linkedinUrl.trim(),
            description: description.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit project");
      }

      toast.success("Project submitted to the challenge gallery!");
      router.push(`/challenges/${challengeId}`);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit project";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingChallenge || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="page-padding">
        <div className="max-w-2xl mx-auto">
          <div className="alert alert-error">
            <span>{error || "Challenge not found"}</span>
          </div>
          <Link href="/challenges" className="btn btn-ghost mt-4">
            Back to Challenges
          </Link>
        </div>
      </div>
    );
  }

  if (challenge.status !== "active") {
    return (
      <div className="page-padding">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="alert alert-warning">
            <span>This challenge is not accepting submissions right now.</span>
          </div>
          <Link href={`/challenges/${challenge.id}`} className="btn btn-ghost">
            Back to Challenge
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-padding">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-sm breadcrumbs">
          <ul>
            <li>
              <Link href="/challenges">Challenges</Link>
            </li>
            <li>
              <Link href={`/challenges/${challenge.id}`}>
                {challenge.title}
              </Link>
            </li>
            <li>Submit</li>
          </ul>
        </div>

        <section className="bg-base-200 border border-base-300 rounded-lg p-6">
          <p className="text-sm text-primary font-semibold mb-2">
            Submit to Challenge
          </p>
          <h1 className="text-3xl font-bold">{challenge.title}</h1>
          <p className="text-base-content/70 mt-3">{challenge.description}</p>
        </section>

        {!user && (
          <div className="alert alert-warning">
            <span>You need to sign in before submitting your project.</span>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowLoginPopup(true)}
            >
              Sign In
            </button>
          </div>
        )}

        {user && loadingJoinStatus && (
          <div className="alert alert-info">
            <span>Checking your challenge participation status...</span>
          </div>
        )}

        {user && !loadingJoinStatus && !joined && (
          <div className="alert alert-info">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span>
                You must join this challenge before submitting a project.
                {participantCount !== null && (
                  <strong>
                    {" "}
                    {participantCount} participant
                    {participantCount !== 1 ? "s" : ""} have already joined.
                  </strong>
                )}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleJoinChallenge}
                disabled={submitting}
              >
                Join Challenge
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-base-100 border border-base-300 rounded-lg p-6 space-y-5"
        >
          <label className="form-control w-full inline-block">
            <div className="label">
              <span className="label-text font-semibold flex items-center gap-2">
                <Github className="w-4 h-4" aria-hidden="true" />
                GitHub Repository URL
              </span>
            </div>
            <input
              type="url"
              required
              className="input input-bordered w-full"
              placeholder="https://github.com/username/project"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              disabled={submitting || !user}
            />
          </label>

          <label className="form-control w-full inline-block">
            <div className="label">
              <span className="label-text font-semibold flex items-center gap-2">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Demo URL
              </span>
              <span className="label-text-alt text-base-content/60">
                Optional
              </span>
            </div>
            <input
              type="url"
              className="input input-bordered w-full"
              placeholder="https://your-demo.example.com"
              value={demoUrl}
              onChange={(event) => setDemoUrl(event.target.value)}
              disabled={submitting || !user}
            />
          </label>

          <label className="form-control w-full inline-block">
            <div className="label">
              <span className="label-text font-semibold flex items-center gap-2">
                <Linkedin className="w-4 h-4" aria-hidden="true" />
                LinkedIn Post URL
              </span>
            </div>
            <input
              type="url"
              required
              pattern="https://([\w-]+\.)?linkedin\.com/.+"
              title="Enter a valid LinkedIn post URL (https://www.linkedin.com/...)"
              className="input input-bordered w-full"
              placeholder="https://www.linkedin.com/posts/your-post"
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              disabled={submitting || !user}
            />
            <div className="label">
              <span className="label-text-alt text-base-content/60">
                Share your project on LinkedIn, then paste the post link here.
              </span>
            </div>
          </label>

          <label className="form-control w-full inline-block">
            <div className="label">
              <span className="label-text font-semibold">Project Summary</span>
              <span className="label-text-alt text-base-content/60">
                Optional &bull; {description.length}/1000 characters
              </span>
            </div>
            <textarea
              className="textarea textarea-bordered min-h-36 w-full"
              placeholder="What did you build, what did you learn, and what should viewers try?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              disabled={submitting || !user}
            />
          </label>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Link
              href={`/challenges/${challenge.id}`}
              className="btn btn-ghost"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !user || !joined || loadingJoinStatus}
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              Submit Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
