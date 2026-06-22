"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useMentorship } from "@/contexts/MentorshipContext";
import TimeSlotPicker from "@/components/mentorship/TimeSlotPicker";
import Link from "next/link";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function BookMentorPage({
  params,
}: {
  params: Promise<{ mentorId: string }>;
}) {
  const { mentorId } = use(params);
  const router = useRouter();
  const { user, loading } = useMentorship();
  const [mentor, setMentor] = useState<any>(null);
  const [mentorLoading, setMentorLoading] = useState(true);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [isActiveMentee, setIsActiveMentee] = useState(false);
  const [menteeCheckLoading, setMenteeCheckLoading] = useState(true);
  const userUid = user?.uid;

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

  // Verify the viewer is an active mentee of this mentor before allowing booking.
  // Reuses the same endpoint the mentor profile uses for requestStatus.
  // Auth resolution is gated on the outer `loading` flag, so once that settles a
  // missing userUid means an unauthenticated viewer — clear the check loading via
  // the async finally rather than a synchronous setState in the effect body.
  useEffect(() => {
    if (loading) return;
    if (!userUid) {
      // Resolve asynchronously to avoid a synchronous setState within the effect body.
      Promise.resolve().then(() => setMenteeCheckLoading(false));
      return;
    }
    fetch(`/api/mentorship/mentee-requests?menteeId=${userUid}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const active = (data?.requests || []).some(
          (r: { mentorId: string; status: string }) =>
            r.mentorId === mentorId && r.status === "active"
        );
        setIsActiveMentee(active);
      })
      .catch(console.error)
      .finally(() => setMenteeCheckLoading(false));
  }, [loading, userUid, mentorId]);

  if (loading || mentorLoading || menteeCheckLoading) {
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

  if (!isActiveMentee) {
    return (
      <div className="text-center py-20 max-w-lg mx-auto space-y-4">
        <h2 className="text-xl font-semibold">
          You&apos;re not an active mentee of this mentor
        </h2>
        <p className="text-base-content/70">
          Only active mentees can book a session. Request mentorship from this
          mentor first, and once they accept you can book sessions here.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          {mentor.username && (
            <Link
              href={`/mentorship/mentors/${mentor.username}`}
              className="btn btn-primary"
            >
              View Mentor Profile
            </Link>
          )}
          <Link href="/mentorship/browse" className="btn btn-ghost">
            Browse Mentors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mentor Info Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar photoURL={mentor.photoURL} displayName={mentor.displayName} size="xl" />
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
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Booking Success Message */}
      {bookingComplete && (
        <div className="alert alert-success">
          <span>Session booked! You can view your bookings from the mentorship dashboard.</span>
        </div>
      )}

      {/* Time Slot Picker */}
      <TimeSlotPicker
        mentorId={mentorId}
        mentorName={mentor.displayName}
        onBookingComplete={() => setBookingComplete(true)}
      />

    </div>
  );
}
