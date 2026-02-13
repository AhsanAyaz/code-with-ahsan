"use client";

import { useState, useEffect, use } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import TimeSlotPicker from "@/components/mentorship/TimeSlotPicker";
import BookingsList from "@/components/mentorship/BookingsList";
import Link from "next/link";

export default function BookMentorPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = use(params);
  const { user, loading } = useMentorship();
  const [mentor, setMentor] = useState<any>(null);
  const [mentorLoading, setMentorLoading] = useState(true);
  const [bookingComplete, setBookingComplete] = useState(false);

  // Fetch mentor profile using existing GET /api/mentorship/profile?uid={uid} endpoint
  // This endpoint exists at src/app/api/mentorship/profile/route.ts and returns
  // { profile: { uid, displayName, photoURL, currentRole, expertise, ... } }
  // It fetches from mentorship_profiles/{uid} document by document ID.
  useEffect(() => {
    fetch(`/api/mentorship/profile?uid=${mentorId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) setMentor(data.profile);
      })
      .catch(console.error)
      .finally(() => setMentorLoading(false));
  }, [mentorId]);

  if (loading || mentorLoading) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">Mentor not found</h2>
        <Link href="/mentorship" className="btn btn-primary mt-4">
          Browse Mentors
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">
          Please log in to book a session
        </h2>
      </div>
    );
  }

  if (user.uid === mentorId) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">
          You cannot book a session with yourself
        </h2>
        <Link href="/profile" className="btn btn-primary mt-4">
          Manage Your Availability
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mentor Info Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body flex-row items-center gap-4">
          {mentor.photoURL && (
            <img
              src={mentor.photoURL}
              alt={mentor.displayName}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h2 className="card-title">{mentor.displayName}</h2>
            {mentor.currentRole && (
              <p className="text-sm opacity-70">{mentor.currentRole}</p>
            )}
            {mentor.expertise?.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {mentor.expertise.map((skill: string) => (
                  <span key={skill} className="badge badge-sm badge-outline">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Success Message */}
      {bookingComplete && (
        <div className="alert alert-success">
          <span>Session booked! Check your bookings below.</span>
        </div>
      )}

      {/* Time Slot Picker */}
      <TimeSlotPicker
        mentorId={mentorId}
        mentorName={mentor.displayName}
        onBookingComplete={() => setBookingComplete(true)}
      />

      {/* My Bookings with this mentor */}
      <BookingsList userId={user.uid} role="mentee" />
    </div>
  );
}
