"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MarkdownRenderer from "@/components/roadmaps/MarkdownRenderer";
import { Roadmap, MentorshipProfile } from "@/types/mentorship";

export const dynamic = "force-dynamic";

export default function RoadmapDetailPage() {
  const params = useParams();
  const roadmapId = params.id as string;

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [relatedMentors, setRelatedMentors] = useState<MentorshipProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch roadmap and related mentors
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch roadmap with full content
        const roadmapRes = await fetch(`/api/roadmaps/${roadmapId}`);

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
      {/* Back button */}
      <Link href="/roadmaps" className="btn btn-ghost btn-sm mb-4">
        ← Back to Roadmaps
      </Link>

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{roadmap.title}</h1>

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
          <div className="flex items-center gap-3 mb-4">
            {roadmap.creatorProfile.photoURL && (
              <Image
                src={roadmap.creatorProfile.photoURL}
                alt={roadmap.creatorProfile.displayName}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div>
              <p className="text-sm text-base-content/70">Created by</p>
              <p className="font-semibold">
                {roadmap.creatorProfile.displayName}
              </p>
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
                href={`/mentorship/profile/${mentor.username || mentor.uid}`}
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
