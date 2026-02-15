"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";
import { SESSION_TEMPLATES } from "@/lib/mentorship-templates";
import type { MentorBooking } from "@/types/mentorship";
import ProfileAvatar from "@/components/ProfileAvatar";

interface BookingsListProps {
  userId: string;
  role: "mentor" | "mentee";
  /** When set, only show bookings with this specific partner */
  filterPartnerId?: string;
  /** Hide the outer card wrapper (for embedding in dashboard tabs) */
  embedded?: boolean;
}

export default function BookingsList({ userId, role, filterPartnerId, embedded }: BookingsListProps) {
  const toast = useToast();
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await authFetch(
          `/api/mentorship/bookings?userId=${userId}&role=${role}&status=all`
        );
        if (res.ok) {
          const data = await res.json();
          let fetched: MentorBooking[] = data.bookings || [];
          if (filterPartnerId) {
            fetched = fetched.filter((b) =>
              role === "mentor" ? b.menteeId === filterPartnerId : b.mentorId === filterPartnerId
            );
          }
          setBookings(fetched);
        }
      } catch (err) {
        console.error("Error fetching bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [userId, role, filterPartnerId]);

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
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
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

  const handleApprove = async (bookingId: string) => {
    setApprovingId(bookingId);
    try {
      const res = await authFetch("/api/mentorship/bookings", {
        method: "PUT",
        body: JSON.stringify({ bookingId, action: "approve" }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: "confirmed" } : b
          )
        );
        toast.success("Booking approved.");
      } else if (res.status === 409) {
        // Slot conflict — pending booking was auto-deleted
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        toast.error("Time slot conflict — the pending booking has been removed.");
      } else {
        toast.error("Failed to approve booking.");
      }
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Failed to approve booking.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    setDecliningId(bookingId);
    try {
      const res = await authFetch("/api/mentorship/bookings", {
        method: "PUT",
        body: JSON.stringify({ bookingId, action: "decline" }),
      });
      if (res.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
        toast.success("Booking declined.");
      } else {
        toast.error("Failed to decline booking.");
      }
    } catch (err) {
      console.error("Decline error:", err);
      toast.error("Failed to decline booking.");
    } finally {
      setDecliningId(null);
    }
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "MMM d, yyyy");
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), "h:mm a");
  };

  const title = role === "mentor" ? "Mentee Bookings" : "My Bookings";

  if (loading) {
    if (embedded) {
      return (
        <div className="flex justify-center items-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      );
    }
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">{title}</h3>
          <div className="flex justify-center py-4">
            <span className="loading loading-spinner"></span>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!embedded && <h3 className="card-title">{title}</h3>}

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

            return (
              <div
                key={booking.id}
                className={`flex items-center justify-between p-3 rounded-lg ${isPast ? "bg-base-200 opacity-60" : "bg-base-200"}`}
              >
                <div className="flex items-center gap-3">
                  <ProfileAvatar photoURL={partner?.photoURL} displayName={partner?.displayName} size="sm" />
                  <div>
                    <p className="font-medium">
                      {partner?.displayName || "Unknown"}
                    </p>
                    <p className="text-sm opacity-70">
                      {formatDate(booking.startTime)} at{" "}
                      {formatTime(booking.startTime)}
                      {booking.templateId && (() => {
                        const tmpl = SESSION_TEMPLATES.find(t => t.id === booking.templateId);
                        return tmpl ? ` · ${tmpl.icon} ${tmpl.title}` : "";
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {booking.calendarSyncStatus === "synced" && (
                    <span className="badge badge-success badge-xs" title="Google Calendar event created">Cal</span>
                  )}
                  {booking.calendarSyncStatus === "failed" && (
                    <span className="badge badge-warning badge-xs" title="Calendar sync failed">!</span>
                  )}
                  {booking.status === "pending_approval" && role === "mentee" && (
                    <span className="badge badge-warning badge-sm">Pending Approval</span>
                  )}
                  {booking.status === "pending_approval" && role === "mentor" && (
                    <>
                      <button
                        className="btn btn-xs btn-success"
                        onClick={() => handleApprove(booking.id)}
                        disabled={approvingId === booking.id || decliningId === booking.id}
                      >
                        {approvingId === booking.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Approve"
                        )}
                      </button>
                      <button
                        className="btn btn-xs btn-error"
                        onClick={() => handleDecline(booking.id)}
                        disabled={approvingId === booking.id || decliningId === booking.id}
                      >
                        {decliningId === booking.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Decline"
                        )}
                      </button>
                    </>
                  )}
                  {booking.status === "confirmed" && isPast && (
                    <span className="badge badge-ghost badge-sm">
                      Completed
                    </span>
                  )}
                  {booking.status === "confirmed" && !isPast && (
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
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">{content}</div>
    </div>
  );
}
