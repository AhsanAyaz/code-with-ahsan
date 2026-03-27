"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import { HACKATHON_TEAMS } from "@/app/events/cwa-promptathon/2026/constants";
import type { WinnerPlacement } from "@/types/events";

interface WinnersFormData {
  first: WinnerPlacement;
  second: WinnerPlacement;
  third: WinnerPlacement;
}

const emptyPlacement = (): WinnerPlacement => ({
  teamName: "",
  projectDescription: "",
  judgeQuote: "",
});

const PLACEMENTS: Array<{
  key: keyof WinnersFormData;
  label: string;
  badgeClass: string;
}> = [
  { key: "first", label: "First Place", badgeClass: "badge-warning" },
  { key: "second", label: "Second Place", badgeClass: "badge-ghost" },
  { key: "third", label: "Third Place", badgeClass: "badge-accent" },
];

export default function AdminEventWinnersPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { success, error } = useToast();

  const [formData, setFormData] = useState<WinnersFormData>({
    first: emptyPlacement(),
    second: emptyPlacement(),
    third: emptyPlacement(),
  });
  const [saving, setSaving] = useState(false);

  const updatePlacement = (
    placement: keyof WinnersFormData,
    field: keyof WinnerPlacement,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [placement]: { ...prev[placement], [field]: value },
    }));
  };

  const handleSave = async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(ADMIN_TOKEN_KEY)
        : null;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/winners`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token ?? "",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        success("Winners saved!");
      } else {
        error("Failed to save winners");
      }
    } catch {
      error("Failed to save winners");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manage Winners — {eventId}</h1>
        <p className="text-base-content/60 mt-1">
          Set the winning teams and their project details for the public display.
        </p>
      </div>

      <div className="space-y-6">
        {PLACEMENTS.map(({ key, label, badgeClass }) => (
          <div key={key} className="card bg-base-200 shadow-md">
            <div className="card-body">
              <h2 className="card-title text-xl">
                <span className={`badge ${badgeClass} text-sm`}>{label}</span>
              </h2>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Team</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData[key].teamName}
                  onChange={(e) =>
                    updatePlacement(key, "teamName", e.target.value)
                  }
                >
                  <option value="">Select a team</option>
                  {HACKATHON_TEAMS.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">
                    Project Description
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Describe the project..."
                  value={formData[key].projectDescription}
                  onChange={(e) =>
                    updatePlacement(key, "projectDescription", e.target.value)
                  }
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">
                    Judge&apos;s Quote
                  </span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  placeholder="A quote from the judges..."
                  value={formData[key].judgeQuote}
                  onChange={(e) =>
                    updatePlacement(key, "judgeQuote", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : (
            "Save Winners"
          )}
        </button>
      </div>
    </div>
  );
}
