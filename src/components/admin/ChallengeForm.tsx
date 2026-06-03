"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Challenge,
  ChallengeDifficulty,
  ChallengeStatus,
} from "@/types/challenges";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { useToast } from "@/contexts/ToastContext";
import {
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_STATUSES,
  DEFAULT_CHALLENGE_DIFFICULTY,
  DEFAULT_CHALLENGE_STATUS,
  parseChallengeResourcesText,
  parseStringLines,
} from "@/lib/challenges";

interface ChallengeFormProps {
  initialData?: Challenge;
  isEdit?: boolean;
}

/**
 * Helper to convert HTML date inputs (YYYY-MM-DD) to ISO strings.
 * Optional parameter to set the time to the end of the day.
 */
function dateInputToIso(value: string, endOfDay = false) {
  const time = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  return new Date(`${value}${time}`).toISOString();
}

function labelize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Challenge form for Admin creation and editing.
 * Handles local state management, text parsing (for lists/resources), 
 * and submission to the respective API endpoint.
 */
export default function ChallengeForm({
  initialData,
  isEdit,
}: ChallengeFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    topic: initialData?.topic || "",
    difficulty:
      initialData?.difficulty ||
      (DEFAULT_CHALLENGE_DIFFICULTY as ChallengeDifficulty),
    status: initialData?.status || (DEFAULT_CHALLENGE_STATUS as ChallengeStatus),
    startDate: initialData?.startDate
      ? initialData.startDate.split("T")[0]
      : "",
    endDate: initialData?.endDate ? initialData.endDate.split("T")[0] : "",
    brief: initialData?.brief || "",
    deliverablesText: initialData?.deliverables?.join("\n") || "",
    resourcesText:
      initialData?.resources
        ?.map((resource) => `${resource.title} | ${resource.url}`)
        .join("\n") || "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const url = isEdit
        ? `/api/admin/challenges/${initialData?.id}`
        : "/api/admin/challenges";
      const method = isEdit ? "PUT" : "POST";

      const formattedData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        topic: formData.topic.trim(),
        difficulty: formData.difficulty,
        status: formData.status,
        startDate: dateInputToIso(formData.startDate),
        endDate: dateInputToIso(formData.endDate, true),
        brief: formData.brief.trim(),
        deliverables: parseStringLines(formData.deliverablesText),
        resources: parseChallengeResourcesText(formData.resourcesText),
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify(formattedData),
      });

      if (res.ok) {
        toast.success(isEdit ? "Challenge updated!" : "Challenge created!");
        router.push("/admin/challenges");
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error submitting challenge", error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto bg-base-100 p-8 rounded-2xl shadow-xl space-y-6"
    >
      <div className="form-control w-full">
        <label className="label pb-2">
          <span className="label-text font-medium">Title</span>
        </label>
        <input
          required
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
      </div>

      <div className="form-control w-full">
        <label className="label pb-2">
          <span className="label-text font-medium">Short Description</span>
        </label>
        <input
          required
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="input input-bordered w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-control w-full">
          <label className="label pb-2">
            <span className="label-text font-medium">
              Topic (e.g., React, AI, CSS)
            </span>
          </label>
          <input
            required
            type="text"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control w-full">
          <label className="label pb-2">
            <span className="label-text font-medium">Difficulty</span>
          </label>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className="select select-bordered w-full"
          >
            {CHALLENGE_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {labelize(difficulty)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-control w-full">
          <label className="label pb-2">
            <span className="label-text font-medium">Start Date</span>
          </label>
          <input
            required
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>

        <div className="form-control w-full">
          <label className="label pb-2">
            <span className="label-text font-medium">End Date</span>
          </label>
          <input
            required
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="input input-bordered w-full"
          />
        </div>
      </div>

      <div className="form-control w-full">
        <label className="label pb-2">
          <span className="label-text font-medium">Status</span>
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="select select-bordered w-full"
        >
          {CHALLENGE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labelize(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-control w-full">
        <label className="label pb-2">
          <span className="label-text font-medium">
            Full Brief (Markdown supported)
          </span>
        </label>
        <textarea
          required
          name="brief"
          value={formData.brief}
          onChange={handleChange}
          className="textarea textarea-bordered w-full min-h-32"
        />
      </div>

      <div className="form-control w-full">
        <label className="label pb-2">
          <span className="label-text font-medium">Deliverables</span>
        </label>
        <textarea
          name="deliverablesText"
          value={formData.deliverablesText}
          onChange={handleChange}
          className="textarea textarea-bordered w-full min-h-28"
          placeholder="One deliverable per line"
        />
        <label className="label">
          <span className="label-text-alt">
            Example: Public GitHub repo with README
          </span>
        </label>
      </div>

      <div className="form-control w-full">
        <label className="label pb-2">
          <span className="label-text font-medium">Resources</span>
        </label>
        <textarea
          name="resourcesText"
          value={formData.resourcesText}
          onChange={handleChange}
          className="textarea textarea-bordered w-full min-h-28"
          placeholder="Title | https://example.com"
        />
        <label className="label">
          <span className="label-text-alt">
            Use one resource per line: title | url
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost"
        >
          Cancel
        </button>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading
            ? "Saving..."
            : isEdit
              ? "Update Challenge"
              : "Create Challenge"}
        </button>
      </div>
    </form>
  );
}
