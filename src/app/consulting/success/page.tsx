"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CheckCircle2, Calendar, Video, Clock, Mail } from "lucide-react";
import { ConsultingBooking } from "@/types/consulting";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [booking, setBooking] = useState<ConsultingBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found in request.");
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/consulting/booking-status?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking);
        } else {
          // If webhook is still processing in background, retry after 2 seconds
          setTimeout(async () => {
            const retryRes = await fetch(`/api/consulting/booking-status?sessionId=${sessionId}`);
            if (retryRes.ok) {
              const retryData = await retryRes.json();
              setBooking(retryData.booking);
            } else {
              setError("We received your payment! Details will be emailed to you shortly.");
            }
            setLoading(false);
          }, 2000);
          return;
        }
      } catch (err) {
        console.error("Error loading booking details:", err);
        setError("Unable to load booking details. Please check your email.");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-sm text-base-content/70">Confirming your consultation with Ahsan...</p>
      </div>
    );
  }

  const startTimeDate = booking?.startTime
    ? typeof booking.startTime === "string"
      ? parseISO(booking.startTime)
      : new Date(booking.startTime)
    : null;

  const timezone = booking?.timezone || "UTC";
  const formattedTime = startTimeDate
    ? format(toZonedTime(startTimeDate, timezone), "EEEE, MMMM d, yyyy 'at' h:mm a")
    : null;

  return (
    <div className="max-w-2xl mx-auto bg-base-200/60 backdrop-blur border border-base-300 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 text-center">
      <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Booking Confirmed!</h1>
        <p className="text-base text-base-content/80">
          Thank you, <strong>{booking?.clientName || "there"}</strong>. Your 1:1 consultation is
          officially scheduled.
        </p>
      </div>

      {booking && (
        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 text-left space-y-4 shadow-sm">
          <div className="flex items-start justify-between border-b border-base-300 pb-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-primary">
                Session Type
              </span>
              <h3 className="text-lg font-bold">{booking.packageName}</h3>
            </div>
            <span className="badge badge-success badge-sm font-semibold">Paid</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-base-content/80">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span>{formattedTime ? formattedTime : "Time confirmed"}</span>
            </div>
            <div className="flex items-center gap-2 text-base-content/80">
              <Clock className="w-4 h-4 text-secondary shrink-0" />
              <span>
                {booking.durationMinutes} Minutes Duration ({timezone})
              </span>
            </div>
            <div className="flex items-center gap-2 text-base-content/80 sm:col-span-2">
              <Mail className="w-4 h-4 text-accent shrink-0" />
              <span>
                Calendar invite sent to <strong>{booking.clientEmail}</strong>
              </span>
            </div>
          </div>

          {booking.meetLink ? (
            <div className="pt-2">
              <a
                href={booking.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full gap-2 shadow-lg font-bold"
              >
                <Video className="w-4 h-4" /> Open Google Meet Link
              </a>
            </div>
          ) : (
            <div className="p-3 bg-base-200 rounded-xl text-xs text-base-content/70 flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <span>Google Meet link will be attached to your calendar invitation email.</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="alert alert-info text-xs py-2">
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4 pt-2">
        <p className="text-xs text-base-content/60">
          Need to prepare anything or have questions beforehand? Reply directly to your confirmation
          email.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/consulting" className="btn btn-outline btn-sm">
            Book Another Session
          </Link>
          <Link href="/" className="btn btn-primary btn-sm">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConsultingSuccessPage() {
  return (
    <div className="min-h-screen bg-base-100 py-16 px-4">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  );
}
