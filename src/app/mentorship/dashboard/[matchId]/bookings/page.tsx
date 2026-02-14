"use client";

import Link from "next/link";
import BookingsList from "@/components/mentorship/BookingsList";
import { useDashboard } from "../DashboardContext";

export default function BookingsPage() {
  const { matchDetails, currentUserId, isMentor } = useDashboard();

  return (
    <div className="space-y-4">
      {!isMentor && (
        <div className="flex justify-end">
          <Link
            href={`/mentorship/book/${matchDetails.mentorId}`}
            className="btn btn-accent btn-sm gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Booking
          </Link>
        </div>
      )}
      <BookingsList
        userId={currentUserId}
        role={isMentor ? "mentor" : "mentee"}
        filterPartnerId={
          isMentor
            ? matchDetails.menteeId
            : matchDetails.mentorId
        }
        embedded
      />
    </div>
  );
}
