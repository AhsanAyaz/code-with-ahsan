"use client";

import { useState } from "react";
import { UnavailableDate } from "@/types/mentorship";

interface OverrideDatesManagerProps {
  dates: UnavailableDate[];
  onChange: (dates: UnavailableDate[]) => void;
}

export default function OverrideDatesManager({
  dates,
  onChange,
}: OverrideDatesManagerProps) {
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  // Today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split("T")[0];

  const handleAdd = () => {
    if (!newDate) return;

    // Check if date already exists
    if (dates.some((d) => d.date === newDate)) {
      alert("This date is already in your unavailable dates list.");
      return;
    }

    const updated = [
      ...dates,
      { date: newDate, reason: newReason || undefined },
    ];
    onChange(updated);
    setNewDate("");
    setNewReason("");
  };

  const handleRemove = (dateToRemove: string) => {
    const updated = dates.filter((d) => d.date !== dateToRemove);
    onChange(updated);
  };

  // Sort dates ascending
  const sortedDates = [...dates].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title text-lg">Unavailable Dates</h3>
        <p className="text-sm opacity-70 mb-3">
          Block specific dates when you won't be available.
        </p>

        {/* Add New Date */}
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            className="input input-bordered input-sm"
            min={today}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            className="input input-bordered input-sm flex-1"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleAdd}
            disabled={!newDate}
          >
            Add
          </button>
        </div>

        {/* List Existing Overrides */}
        {sortedDates.length > 0 ? (
          <div className="space-y-1">
            {sortedDates.map((override) => {
              // Format date for display
              const formattedDate = new Date(override.date + "T00:00:00")
                .toLocaleDateString(undefined, {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

              return (
                <div
                  key={override.date}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <span className="font-medium">{formattedDate}</span>
                  {override.reason && (
                    <span className="text-sm opacity-60 flex-1 ml-4">
                      {override.reason}
                    </span>
                  )}
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost text-error"
                    onClick={() => handleRemove(override.date)}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm opacity-60">No override dates set.</p>
        )}
      </div>
    </div>
  );
}
