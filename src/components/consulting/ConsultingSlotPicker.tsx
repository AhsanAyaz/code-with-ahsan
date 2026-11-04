"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Calendar, Clock, Globe } from "lucide-react";
import { ConsultingAvailableSlot } from "@/types/consulting";

interface ConsultingSlotPickerProps {
  durationMinutes: number;
  selectedSlot: ConsultingAvailableSlot | null;
  onSelectSlot: (slot: ConsultingAvailableSlot) => void;
  timezone: string;
  onChangeTimezone: (tz: string) => void;
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function ConsultingSlotPicker({
  durationMinutes,
  selectedSlot,
  onSelectSlot,
  timezone,
  onChangeTimezone,
}: ConsultingSlotPickerProps) {
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [slots, setSlots] = useState<ConsultingAvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(addDays(startDate, 6), "yyyy-MM-dd");
      const res = await fetch(
        `/api/consulting/available-slots?startDate=${start}&endDate=${end}&duration=${durationMinutes}&timezone=${encodeURIComponent(
          timezone
        )}`
      );

      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      } else {
        setError("Unable to load availability for this week.");
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      setError("Unable to load availability.");
    } finally {
      setLoading(false);
    }
  }, [startDate, durationMinutes, timezone]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  // Filter slots for the currently selected day
  const slotsForSelectedDay = slots.filter((slot) => {
    const slotDate = toZonedTime(parseISO(slot.start), timezone);
    return isSameDay(slotDate, selectedDay);
  });

  return (
    <div className="bg-base-200/50 backdrop-blur border border-base-300 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-base-300">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Select Date & Time
          </h3>
          <p className="text-xs text-base-content/70 mt-0.5">
            Times are displayed in your chosen timezone.
          </p>
        </div>

        {/* Timezone Selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-base-content/60" />
          <select
            value={timezone}
            onChange={(e) => onChangeTimezone(e.target.value)}
            className="select select-sm select-bordered max-w-xs text-xs font-mono bg-base-100"
          >
            {COMMON_TIMEZONES.includes(timezone) ? null : (
              <option value={timezone}>{timezone}</option>
            )}
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setStartDate((prev) => addDays(prev, -7))}
          className="btn btn-ghost btn-sm gap-1"
          aria-label="Previous Week"
        >
          <ChevronLeft className="w-4 h-4" /> Prev Week
        </button>
        <span className="font-semibold text-sm">
          {format(startDate, "MMM d")} - {format(addDays(startDate, 6), "MMM d, yyyy")}
        </span>
        <button
          onClick={() => setStartDate((prev) => addDays(prev, 7))}
          className="btn btn-ghost btn-sm gap-1"
          aria-label="Next Week"
        >
          Next Week <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-6">
        {daysOfWeek.map((day) => {
          const isSelected = isSameDay(day, selectedDay);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));
          const daySlots = slots.filter((s) =>
            isSameDay(toZonedTime(parseISO(s.start), timezone), day)
          );
          const hasSlots = daySlots.length > 0;

          return (
            <button
              key={day.toISOString()}
              disabled={isPast}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                isSelected
                  ? "bg-primary text-primary-content border-primary shadow-md scale-[1.02]"
                  : isPast
                    ? "opacity-30 border-transparent cursor-not-allowed"
                    : "bg-base-100 border-base-300 hover:border-primary/50"
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                {format(day, "EEE")}
              </span>
              <span className="text-base sm:text-lg font-bold">{format(day, "d")}</span>
              <span
                className={`text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? "bg-primary-content/20 text-primary-content"
                    : hasSlots
                      ? "bg-success/15 text-success font-medium"
                      : "text-base-content/40"
                }`}
              >
                {hasSlots ? `${daySlots.length} slots` : "-"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Available Slots List */}
      <div className="mt-4 pt-4 border-t border-base-300">
        <h4 className="text-xs uppercase tracking-wider font-bold text-base-content/70 mb-3 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-primary" />
          Available Slots for {format(selectedDay, "EEEE, MMMM d")}
        </h4>

        {loading ? (
          <div className="flex justify-center items-center py-10">
            <span className="loading loading-spinner loading-md text-primary"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error text-xs py-2">{error}</div>
        ) : slotsForSelectedDay.length === 0 ? (
          <div className="text-center py-8 bg-base-100/60 rounded-xl border border-dashed border-base-300">
            <p className="text-sm text-base-content/60">
              No available slots on this day. Please check adjacent days or next week.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {slotsForSelectedDay.map((slot) => {
              const startZoned = toZonedTime(parseISO(slot.start), timezone);
              const endZoned = toZonedTime(parseISO(slot.end), timezone);
              const isSelected = selectedSlot?.start === slot.start;

              return (
                <button
                  key={slot.start}
                  onClick={() => onSelectSlot(slot)}
                  className={`btn btn-sm text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? "btn-primary shadow-lg"
                      : "btn-outline border-base-300 hover:border-primary hover:bg-primary/10"
                  }`}
                >
                  {format(startZoned, "h:mm a")} - {format(endZoned, "h:mm a")}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
