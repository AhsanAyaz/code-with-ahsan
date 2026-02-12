"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useMentorship } from "@/contexts/MentorshipContext";
import MarkdownRenderer from "@/components/roadmaps/MarkdownRenderer";
import { Roadmap, MentorshipProfile } from "@/types/mentorship";

export const dynamic = "force-dynamic";

export default function RoadmapDetailPage() {
  const params = useParams();
  const roadmapId = params.id as string;
  const { user, profile } = useMentorship();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [relatedMentors, setRelatedMentors] = useState<MentorshipProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewingDraft, setIsPreviewingDraft] = useState(false);

  // Fetch roadmap and related mentors
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if we should preview the draft version
        const searchParams = new URLSearchParams(window.location.search);
        const previewDraft = searchParams.get('preview') === 'draft';
        setIsPreviewingDraft(previewDraft);

        // Fetch roadmap with full content
        const roadmapRes = await fetch(`/api/roadmaps/${roadmapId}${previewDraft ? '?preview=draft' : ''}`);

        if (!roadmapRes.ok) {
          throw new Error("Roadmap not found");
        }

        const { roadmap: roadmapData } = await roadmapRes.json();
        setRoadmap(roadmapData);

        // Fetch all public mentors
        const mentorsRes = await fetch(`/api/mentorship/mentors?public=true`);
        if (mentorsRes.ok) {
          const { mentors } = await mentorsRes.json();

          // Filter related mentors by domain match (fuzzy case-insensitive)
          // Map domain value to readable label for matching
          const domainLabels: Record<string, string> = {
            "web-dev": "Web Development",
            frontend: "Frontend",
            backend: "Backend",
            ml: "Machine Learning",
            ai: "AI",
            mcp: "MCP Servers",
            agents: "AI Agents",
            "prompt-engineering": "Prompt Engineering",
          };

          const domainLabel = domainLabels[roadmapData.domain] || roadmapData.domain;

          const filtered = mentors
            .filter((mentor: MentorshipProfile) =>
              mentor.expertise?.some(
                (exp: string) =>
                  exp.toLowerCase().includes(roadmapData.domain.toLowerCase()) ||
                  exp.toLowerCase().includes(domainLabel.toLowerCase())
              )
            )
            .slice(0, 3); // Top 3 only

          setRelatedMentors(filtered);
        }
      } catch (err) {
        console.error("Error fetching roadmap:", err);
        setError("Failed to load roadmap");
      } finally {
        setLoading(false);
      }
    };

    if (roadmapId) {
      fetchData();
    }
  }, [roadmapId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="alert alert-error">
          <span>{error || "Roadmap not found"}</span>
        </div>
        <Link href="/roadmaps" className="btn btn-ghost mt-4">
          Back to Roadmaps
        </Link>
      </div>
    );
  }

  // Domain labels for display
  const domainLabels: Record<string, string> = {
    "web-dev": "Web Development",
    frontend: "Frontend",
    backend: "Backend",
    ml: "Machine Learning",
    ai: "AI",
    mcp: "MCP Servers",
    agents: "AI Agents",
    "prompt-engineering": "Prompt Engineering",
  };

  const domainLabel = domainLabels[roadmap.domain] || roadmap.domain;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Breadcrumbs */}
      <div className="text-sm breadcrumbs mb-4">
        <ul>
          <li>
            <Link href="/mentorship/dashboard">Dashboard</Link>
          </li>
          <li>
            <Link href="/roadmaps">Roadmaps</Link>
          </li>
          <li>{roadmap.title}</li>
        </ul>
      </div>

      {/* Admin Preview Warning */}
      {roadmap.status === "pending" && (
        <div className="alert alert-warning mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            <strong>Admin Preview Mode:</strong> This roadmap is pending approval and not visible to the public yet.
          </span>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-4xl font-bold flex-1">{roadmap.title}</h1>
          {(user?.uid === roadmap.creatorId || profile?.isAdmin) &&
           !isPreviewingDraft &&
           !roadmap.hasPendingDraft && (
            <Link
              href={`/roadmaps/${roadmapId}/edit`}
              className="btn btn-outline btn-sm"
            >
              ✏️ Edit
            </Link>
          )}
        </div>

        {/* Metadata badges */}
        <div className="flex items-center gap-4 text-sm text-base-content/70 mb-4">
          <span className="badge badge-primary">{domainLabel}</span>
          <span className="badge badge-secondary">{roadmap.difficulty}</span>
          {roadmap.estimatedHours && (
            <span>{roadmap.estimatedHours}h estimated</span>
          )}
          <span>Version {roadmap.version}</span>
        </div>

        {/* Author Attribution */}
        {roadmap.creatorProfile && (
          <div className="card bg-base-200 p-4 mb-4">
            <div className="flex items-center gap-3">
              {roadmap.creatorProfile.photoURL && (
                <Image
                  src={roadmap.creatorProfile.photoURL}
                  alt={roadmap.creatorProfile.displayName}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              )}
              <div className="flex-1">
                <p className="text-sm text-base-content/70">Created by</p>
                <p className="font-semibold text-lg">
                  {roadmap.creatorProfile.displayName}
                </p>
                {roadmap.creatorProfile.discordUsername && (
                  <div className="flex items-center gap-2 mt-1">
                    <svg
                      className="w-4 h-4 text-base-content/60"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                    <span className="text-sm text-base-content/70">
                      {roadmap.creatorProfile.discordUsername}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {roadmap.description && (
          <p className="text-lg text-base-content/80 mb-4">
            {roadmap.description}
          </p>
        )}

        {/* Last updated timestamp */}
        <p className="text-xs text-base-content/60">
          Last updated: {new Date(roadmap.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Markdown Content */}
      <div className="mb-12">
        <MarkdownRenderer content={roadmap.content || ""} />
      </div>

      {/* Related Mentors Section */}
      {relatedMentors.length > 0 && (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-4">Related Mentors</h2>
          <p className="text-base-content/70 mb-6">
            These mentors teach {domainLabel} and can help guide you through
            this roadmap
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedMentors.map((mentor: MentorshipProfile) => (
              <Link
                key={mentor.uid}
                href={`/mentorship/mentors/${mentor.username || mentor.uid}`}
                className="card bg-base-200 hover:shadow-lg transition-shadow"
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {mentor.photoURL && (
                      <Image
                        src={mentor.photoURL}
                        alt={mentor.displayName}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {mentor.displayName}
                      </h3>
                      {mentor.currentRole && (
                        <p className="text-xs text-base-content/70 truncate">
                          {mentor.currentRole}
                        </p>
                      )}
                    </div>
                  </div>
                  {mentor.expertise && mentor.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="badge badge-sm badge-outline"
                        >
                          {skill}
                        </span>
                      ))}
                      {mentor.expertise.length > 3 && (
                        <span className="badge badge-sm badge-ghost">
                          +{mentor.expertise.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
