"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";
import type { MentorBooking } from "@/types/mentorship";

interface BookingsListProps {
  userId: string;
  role: "mentor" | "mentee";
}

export default function BookingsList({ userId, role }: BookingsListProps) {
  const toast = useToast();
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await authFetch(
          `/api/mentorship/bookings?userId=${userId}&role=${role}&status=all`
        );
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings || []);
        }
      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [userId, role]);

  const handleCancel = async (bookingId: string) => {
    // Prompt for reason - when mentor cancels, this reason drives the reschedule-aware Discord DM
    // If the reason contains "reschedule", the mentee's DM will prompt them to rebook
    const reason = prompt(
      role === "mentor"
        ? 'Why are you cancelling? (Tip: include "reschedule" to prompt the mentee to rebook a new time)'
        : "Why are you cancelling? (optional)"
    );
    if (reason === null) return; // User clicked Cancel on the prompt dialog

    setCancellingId(bookingId);
    try {
      const res = await authFetch("/api/mentorship/bookings", {
        method: "PUT",
        body: JSON.stringify({
          bookingId,
          action: "cancel",
          reason: reason || undefined,
        }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: "cancelled" as const } : b
          )
        );
        toast.success("Booking cancelled.");
      } else {
        toast.error("Failed to cancel booking.");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("Failed to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), "h:mm a");
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            {role === "mentor" ? "Mentee Bookings" : "My Bookings"}
          </h3>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">
          {role === "mentor" ? "Mentee Bookings" : "My Bookings"}
        </h3>

        {bookings.length === 0 ? (
          <p className="opacity-60">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const partner =
                role === "mentor"
                  ? booking.menteeProfile
                  : booking.mentorProfile;
              const isPast = new Date(booking.startTime) < new Date();
              const isCancelled = booking.status === "cancelled";

              return (
                <div
                  key={booking.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${isPast || isCancelled ? "bg-base-200 opacity-60" : "bg-base-200"}`}
                >
                  <div className="flex items-center gap-3">
                    {partner?.photoURL && (
                      <img
                        src={partner.photoURL}
                        alt={partner.displayName}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium">
                        {partner?.displayName || "Unknown"}
                      </p>
                      <p className="text-sm opacity-70">
                        {formatDate(booking.startTime)} at{" "}
                        {formatTime(booking.startTime)}
                      </p>
                      {isCancelled && booking.cancellationReason && (
                        <p className="text-xs opacity-60 mt-1">
                          Reason: {booking.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCancelled ? (
                      <span className="badge badge-error badge-sm">
                        Cancelled
                      </span>
                    ) : isPast ? (
                      <span className="badge badge-ghost badge-sm">
                        Completed
                      </span>
                    ) : (
                      <button
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                      >
                        {cancellingId === booking.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Cancel"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
