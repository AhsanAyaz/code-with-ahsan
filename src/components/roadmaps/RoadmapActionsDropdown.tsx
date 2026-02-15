import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Roadmap } from "@/types/mentorship";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";

interface RoadmapActionsDropdownProps {
  roadmap: Roadmap;
  onAction?: (action: string, roadmapId: string) => void;
  className?: string;
}

export default function RoadmapActionsDropdown({
  roadmap,
  onAction,
  className = "",
}: RoadmapActionsDropdownProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const isDetailPage = pathname === `/roadmaps/${roadmap.id}`;

  const handleSubmitForReview = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/roadmaps/${roadmap.id}`, {
        method: "PUT",
        body: JSON.stringify({ action: "submit" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit roadmap");
      }

      showSuccessToast("Roadmap submitted for review!");
      onAction?.("submit", roadmap.id);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoadmap = async () => {
    if (!confirm("Are you sure you want to delete this roadmap?")) return;

    setLoading(true);
    try {
      const response = await authFetch(`/api/roadmaps/${roadmap.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete roadmap");
      }

      showSuccessToast("Roadmap deleted successfully!");
      onAction?.("delete", roadmap.id);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <label tabIndex={0} className="btn btn-ghost btn-xs btn-circle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="inline-block w-5 h-5 stroke-current"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          ></path>
        </svg>
      </label>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-300 rounded-box w-52"
      >
        {/* Preview - Hide if already on detail page */}
        {!isDetailPage && (
          <li>
            <Link
              href={`/roadmaps/${roadmap.id}`}
              target="_blank"
              className="flex items-center gap-2"
            >
              <span>👁️</span>
              <span>Preview</span>
            </Link>
          </li>
        )}

        {/* Edit - Drafts or Approved without pending draft */}
        {(roadmap.status === "draft" ||
          (roadmap.status === "approved" && !roadmap.hasPendingDraft)) && (
          <li>
            <Link
              href={`/roadmaps/${roadmap.id}/edit`}
              className="flex items-center gap-2"
            >
              <span>✏️</span>
              <span>Edit</span>
            </Link>
          </li>
        )}

        {/* Submit - Only drafts */}
        {roadmap.status === "draft" && (
          <li>
            <button
              onClick={handleSubmitForReview}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <span>🚀</span>
              <span>{loading ? "Submitting..." : "Submit for Review"}</span>
            </button>
          </li>
        )}

        {/* Delete - Drafts and Pending (not approved) */}
        {roadmap.status !== "approved" && (
          <li>
            <button
              onClick={handleDeleteRoadmap}
              disabled={loading}
              className="flex items-center gap-2 text-error"
            >
              <span>🗑️</span>
              <span>{loading ? "Deleting..." : "Delete"}</span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
