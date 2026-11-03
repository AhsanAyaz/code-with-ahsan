"use client";

import { useState, useEffect, type ButtonHTMLAttributes } from "react";
import AdminActionButton from "@/components/admin/AdminActionButton";
import { useToast } from "@/contexts/ToastContext";
import type { WinnerPlacement } from "@/types/events";
import { adminFetch, adminErrorMessage } from "@/lib/adminAccess/client";

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

interface WinnersEditorProps {
  eventId: string;
  teams: string[];
  /**
   * Which credential this copy of the editor writes with. Omitted (the admin
   * panel): the signed-in staff member's ID token via adminFetch. Set (the
   * presenter deck): the localStorage key holding the host session token,
   * sent as x-host-token.
   */
  hostTokenKey?: string;
  /** Called after a successful load so the parent can show "announced at". */
  onLoadedAtChange?: (loadedAt: string | null) => void;
}

function PlainButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} />;
}

function AdminClearButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <AdminActionButton action="events.winners.delete" {...props} />;
}

export default function WinnersEditor({
  eventId,
  teams,
  hostTokenKey,
  onLoadedAtChange,
}: WinnersEditorProps) {
  const { success, error } = useToast();
  // The host deck has no admin portal role context and its route authorizes
  // clearing itself. In the admin portal, clearing winners is admin-only.
  const ClearButton = hostTokenKey ? PlainButton : AdminClearButton;

  const [formData, setFormData] = useState<WinnersFormData>({
    first: emptyPlacement(),
    second: emptyPlacement(),
    third: emptyPlacement(),
  });
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const updateLoadedAt = (value: string | null) => {
    setLoadedAt(value);
    onLoadedAtChange?.(value);
  };

  // Load existing winners on mount
  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/winners`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.first) {
          // The stored doc can be partial (an interrupted save, or a placement
          // cleared by hand in the console), so every placement is merged onto
          // a blank one. Reading data.second.teamName straight off a partial
          // doc is what used to blank the whole page with a TypeError.
          setFormData({
            first: { ...emptyPlacement(), ...data.first },
            second: { ...emptyPlacement(), ...(data.second ?? {}) },
            third: { ...emptyPlacement(), ...(data.third ?? {}) },
          });
          setLoadedAt(data.announcedAt ?? null);
          onLoadedAtChange?.(data.announcedAt ?? null);
        }
      })
      .catch(() => {});
    // onLoadedAtChange is a render-time callback; the fetch should only re-run
    // when the event changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  /** Write request with whichever credential this editor uses. */
  const writeFetch = (url: string, init: RequestInit): Promise<Response> => {
    if (!hostTokenKey) return adminFetch(url, init);
    const token = typeof window !== "undefined" ? localStorage.getItem(hostTokenKey) : null;
    const headers = new Headers(init.headers);
    headers.set("x-host-token", token ?? "");
    return fetch(url, { ...init, headers });
  };

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

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await writeFetch(`/api/admin/events/${eventId}/winners`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFormData({ first: emptyPlacement(), second: emptyPlacement(), third: emptyPlacement() });
        updateLoadedAt(null);
        success("Winners cleared");
      } else {
        error(await adminErrorMessage(res, "Failed to clear winners"));
      }
    } catch {
      error("Failed to clear winners");
    } finally {
      setClearing(false);
    }
  };

  const allTeamsSelected =
    !!formData.first?.teamName && !!formData.second?.teamName && !!formData.third?.teamName;

  const handleSave = async () => {
    if (!allTeamsSelected) {
      error("Please select a team for all three placements");
      return;
    }

    setSaving(true);
    try {
      const res = await writeFetch(`/api/admin/events/${eventId}/winners`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        updateLoadedAt(new Date().toISOString());
        success("Winners saved!");
      } else {
        error(await adminErrorMessage(res, "Failed to save winners"));
      }
    } catch {
      error("Failed to save winners");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
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
                  onChange={(e) => updatePlacement(key, "teamName", e.target.value)}
                >
                  <option value="">Select a team</option>
                  {teams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Project Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Describe the project..."
                  value={formData[key].projectDescription}
                  onChange={(e) => updatePlacement(key, "projectDescription", e.target.value)}
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Judge&apos;s Quote</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  placeholder="A quote from the judges..."
                  value={formData[key].judgeQuote}
                  onChange={(e) => updatePlacement(key, "judgeQuote", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <ClearButton
          className="btn btn-error btn-outline btn-sm"
          onClick={handleClear}
          disabled={clearing || saving || !loadedAt}
        >
          {clearing ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Clearing...
            </>
          ) : (
            "Clear Winners"
          )}
        </ClearButton>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || clearing || !allTeamsSelected}
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
