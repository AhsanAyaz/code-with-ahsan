"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";
import type { AvailableSlot } from "@/types/mentorship";

interface TimeSlotPickerProps {
  mentorId: string;
  mentorName: string;
  onBookingComplete?: (bookingId: string) => void;
}

export default function TimeSlotPicker({
  mentorId,
  mentorName,
  onBookingComplete,
}: TimeSlotPickerProps) {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Record<string, AvailableSlot[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(startOfDay(new Date()));

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(addDays(startDate, 6), "yyyy-MM-dd");
      const res = await fetch(
        `/api/mentorship/time-slots?mentorId=${mentorId}&startDate=${start}&endDate=${end}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || {});
      } else {
        setError("Failed to load available slots");
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      setError("Failed to load available slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [startDate, mentorId]);

  const prevWeek = () => {
    setStartDate((prev) => addDays(prev, -7));
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const nextWeek = () => {
    setStartDate((prev) => addDays(prev, 7));
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const getDaysArray = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  };

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    setError(null);
    try {
      const res = await authFetch("/api/mentorship/bookings", {
        method: "POST",
        body: JSON.stringify({
          mentorId,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (res.status === 409) {
        setError(
          "This slot was just booked by someone else. Please choose another."
        );
        // Refresh slots
        fetchSlots();
        setSelectedSlot(null);
      } else if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to book session");
      } else {
        const data = await res.json();
        onBookingComplete?.(data.booking?.id);
        toast.success("Session booked successfully!");
        setSelectedSlot(null);
        setSelectedDate(null);
        fetchSlots(); // Refresh to remove booked slot
      }
    } catch (err) {
      console.error("Booking error:", err);
      setError("Failed to book session. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const days = getDaysArray();
  const slotsForSelectedDate = selectedDate
    ? slots[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Book a Session with {mentorName}</h3>
        <p className="text-sm opacity-70">30-minute mentorship sessions</p>

        {/* Date Navigator - show 7 days at a time */}
        <div className="flex items-center gap-2 my-4">
          <button
            className="btn btn-sm btn-ghost"
            onClick={prevWeek}
            aria-label="Previous week"
          >
            &lt;
          </button>
          <div className="flex gap-1 flex-wrap">
            {days.map((date) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const hasSlots = (slots[dateKey]?.length || 0) > 0;
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isPast = date < startOfDay(new Date());

              return (
                <button
                  key={dateKey}
                  className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-ghost"} ${!hasSlots || isPast ? "btn-disabled opacity-50" : ""}`}
                  onClick={() => {
                    if (!isPast && hasSlots) {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }
                  }}
                  disabled={!hasSlots || isPast}
                >
                  <div className="text-center">
                    <div className="text-xs">{format(date, "EEE")}</div>
                    <div className="font-bold">{format(date, "d")}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={nextWeek}
            aria-label="Next week"
          >
            &gt;
          </button>
        </div>

        {/* Available Slots Grid */}
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : selectedDate && slotsForSelectedDate.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slotsForSelectedDate.map((slot, idx) => (
              <button
                key={`${slot.start}-${idx}`}
                className={`btn btn-sm ${selectedSlot === slot ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSelectedSlot(slot)}
              >
                {slot.displayTime}
              </button>
            ))}
          </div>
        ) : selectedDate ? (
          <p className="text-center py-4 opacity-60">
            No available slots for this date.
          </p>
        ) : (
          <p className="text-center py-4 opacity-60">
            Select a date to see available slots.
          </p>
        )}

        {/* Booking Confirmation */}
        {selectedSlot && selectedDate && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <p className="font-medium">Confirm Booking</p>
            <p className="text-sm">
              {format(selectedDate, "EEEE, MMMM d, yyyy")} at{" "}
              {selectedSlot.displayTime} (30 minutes)
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleBook}
                disabled={booking}
              >
                {booking ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Confirm Booking"
                )}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedSlot(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
