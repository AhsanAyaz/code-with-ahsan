"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/apiClient";
import {
  TimeSlotAvailability,
  UnavailableDate,
  DayOfWeek,
  TimeRange,
} from "@/types/mentorship";
import { useToast } from "@/contexts/ToastContext";
import OverrideDatesManager from "./OverrideDatesManager";

interface AvailabilityManagerProps {
  userId: string;
  initialAvailability?: TimeSlotAvailability;
  initialUnavailableDates?: UnavailableDate[];
  isCalendarConnected?: boolean;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "Africa/Cairo",
];

export default function AvailabilityManager({
  userId,
  initialAvailability,
  initialUnavailableDates = [],
}: AvailabilityManagerProps) {
  const toast = useToast();

  // Detect user's local timezone
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [weekly, setWeekly] = useState<Partial<Record<DayOfWeek, TimeRange[]>>>(
    initialAvailability?.weekly || {}
  );
  const [timezone, setTimezone] = useState<string>(
    initialAvailability?.timezone || detectedTimezone
  );
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>(
    initialUnavailableDates
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update state when props change
  useEffect(() => {
    if (initialAvailability) {
      setWeekly(initialAvailability.weekly);
      setTimezone(initialAvailability.timezone);
    }
  }, [initialAvailability]);

  useEffect(() => {
    setUnavailableDates(initialUnavailableDates);
  }, [initialUnavailableDates]);

  const addRange = (day: DayOfWeek) => {
    setWeekly((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "09:00", end: "17:00" }],
    }));
  };

  const removeRange = (day: DayOfWeek, index: number) => {
    setWeekly((prev) => {
      const dayRanges = prev[day] || [];
      const updated = dayRanges.filter((_, i) => i !== index);
      if (updated.length === 0) {
        const { [day]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [day]: updated };
    });
  };

  const updateRange = (
    day: DayOfWeek,
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setWeekly((prev) => {
      const dayRanges = prev[day] || [];
      const updated = [...dayRanges];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [day]: updated };
    });
  };

  const handleSave = async () => {
    // Validate: start < end for all ranges
    for (const [day, ranges] of Object.entries(weekly)) {
      for (const range of ranges || []) {
        if (range.start >= range.end) {
          toast.error(
            `Invalid time range for ${day}: start time must be before end time`
          );
          return;
        }
      }
    }

    setSaving(true);
    setSaved(false);

    try {
      const res = await authFetch("/api/mentorship/availability", {
        method: "PUT",
        body: JSON.stringify({
          availability: {
            weekly,
            timezone,
            slotDurationMinutes: 30,
          },
          unavailableDates,
        }),
      });

      if (res.ok) {
        toast.success("Availability saved successfully!");
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const error = await res.json();
        toast.error(`Failed to save: ${error.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error saving availability:", err);
      toast.error("Failed to save availability. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Availability Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg">Weekly Availability</h3>
          <p className="text-sm opacity-70">
            Set your regular weekly schedule. Mentees will see available 30-minute slots based on these time ranges.
          </p>

          {/* Timezone Selector */}
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text font-semibold">Your Timezone</span>
            </label>
            <select
              className="select select-bordered"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {/* Show detected timezone first if not in common list */}
              {!COMMON_TIMEZONES.includes(detectedTimezone) && (
                <option value={detectedTimezone}>
                  {detectedTimezone} (Detected)
                </option>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                  {tz === detectedTimezone ? " (Detected)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Day-by-day Availability */}
          <div className="mt-6 space-y-3">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="border-b pb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-medium capitalize">{day}</label>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => addRange(day)}
                  >
                    + Add Time Range
                  </button>
                </div>

                {/* Time Ranges */}
                {weekly[day] && weekly[day]!.length > 0 ? (
                  <div className="space-y-2 ml-4">
                    {weekly[day]!.map((range, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          className="input input-bordered input-sm"
                          value={range.start}
                          onChange={(e) =>
                            updateRange(day, index, "start", e.target.value)
                          }
                        />
                        <span className="text-sm">to</span>
                        <input
                          type="time"
                          className="input input-bordered input-sm"
                          value={range.end}
                          onChange={(e) =>
                            updateRange(day, index, "end", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-xs btn-error btn-ghost"
                          onClick={() => removeRange(day, index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm opacity-60 ml-4">Not available</span>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end gap-2 items-center">
            {saved && (
              <span className="text-success text-sm">Saved!</span>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Save Availability"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Override Dates Card */}
      <OverrideDatesManager
        dates={unavailableDates}
        onChange={setUnavailableDates}
      />
    </div>
  );
}
