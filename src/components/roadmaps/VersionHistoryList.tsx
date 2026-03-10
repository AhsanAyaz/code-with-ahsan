"use client";

import { useState, useEffect } from "react";
import type { RoadmapVersion } from "@/types/mentorship";

interface VersionHistoryListProps {
  roadmapId: string;
}

export default function VersionHistoryList({
  roadmapId,
}: VersionHistoryListProps) {
  const [versions, setVersions] = useState<RoadmapVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await fetch(`/api/roadmaps/${roadmapId}/versions`);
        if (res.ok) {
          const data = await res.json();
          setVersions(data.versions || []);
        }
      } catch (err) {
        console.error("Error fetching version history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [roadmapId]);

  const statusBadgeClass = (status: RoadmapVersion["status"]) => {
    switch (status) {
      case "approved":
        return "badge badge-sm badge-success";
      case "draft":
        return "badge badge-sm badge-warning";
      case "rejected":
        return "badge badge-sm badge-error";
      default:
        return "badge badge-sm";
    }
  };

  return (
    <div className="collapse collapse-arrow bg-base-200">
      <input type="checkbox" />
      <div className="collapse-title text-lg font-medium">
        Version History ({loading ? "..." : versions.length})
      </div>
      <div className="collapse-content">
        {loading ? (
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner loading-sm"></span>
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-base-content/70 py-2">
            No version history available.
          </p>
        ) : (
          <ul className="divide-y divide-base-300">
            {versions.map((v) => (
              <li
                key={v.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-semibold text-sm">
                    v{v.version}
                  </span>
                  <span className={statusBadgeClass(v.status)}>{v.status}</span>
                  {v.difficulty && (
                    <span className="badge badge-sm badge-outline">
                      {v.difficulty}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-sm text-base-content/80 text-center">
                  {v.changeDescription ||
                    (v.version === 1 ? "Initial version" : "")}
                </div>
                <div className="text-right text-xs text-base-content/60 shrink-0">
                  <div>{new Date(v.createdAt).toLocaleDateString()}</div>
                  {v.estimatedHours && (
                    <div className="mt-0.5">{v.estimatedHours}h estimated</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
