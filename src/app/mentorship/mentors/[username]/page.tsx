"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { MentorProfileDetails } from "@/types/mentorship";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function MentorProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [mentor, setMentor] = useState<MentorProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMentor = async () => {
      try {
        const response = await fetch(`/api/mentorship/mentors/${username}`);
        if (response.ok) {
          const data = await response.json();
          setMentor(data.mentor);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load mentor profile");
        }
      } catch (err) {
        console.error("Error fetching mentor:", err);
        setError("Failed to load mentor profile");
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchMentor();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="card bg-base-100 shadow-xl max-w-lg mx-auto">
        <div className="card-body text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="card-title justify-center">Mentor Not Found</h2>
          <p className="text-base-content/70">
            {error || "This mentor profile is not available or does not exist."}
          </p>
          <div className="card-actions justify-center mt-4">
            <Link href="/mentorship/mentors" className="btn btn-primary">
              Browse All Mentors
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const availableDays = mentor.availability
    ? Object.keys(mentor.availability).filter(
        (day) =>
          mentor.availability![day] && mentor.availability![day].length > 0
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link href="/mentorship">Mentorship</Link>
          </li>
          <li>
            <Link href="/mentorship/mentors">Community Mentors</Link>
          </li>
          <li className="text-primary">{mentor.displayName}</li>
        </ul>
      </div>

      {/* Profile Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="avatar">
                <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4">
                  {mentor.photoURL ? (
                    <img src={mentor.photoURL} alt={mentor.displayName} />
                  ) : (
                    <div className="bg-primary text-primary-content flex items-center justify-center text-5xl font-bold w-full h-full">
                      {mentor.displayName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{mentor.displayName}</h1>
              <p className="text-base-content/60 text-sm">@{mentor.username}</p>
              {mentor.currentRole && (
                <p className="text-lg text-base-content/70 mt-1">
                  {mentor.currentRole}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                {(mentor.avgRating ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-warning">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold">{mentor.avgRating}</span>
                    <span className="text-base-content/60">
                      ({mentor.ratingCount} reviews)
                    </span>
                  </div>
                )}
                <div className="badge badge-primary badge-lg gap-1">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {mentor.activeMenteeCount} / {mentor.maxMentees} mentees
                </div>
                <div className="badge badge-secondary badge-lg gap-1">
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {mentor.completedMentorships} completed
                </div>
              </div>

              {/* Capacity indicator */}
              {mentor.isAtCapacity && (
                <div className="alert alert-warning mt-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>
                    This mentor is currently at capacity. Check back later!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {mentor.bio && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              About
            </h2>
            <p className="text-base-content/80 whitespace-pre-wrap">
              {mentor.bio}
            </p>
          </div>
        </div>
      )}

      {/* Major Projects / Experience Section */}
      {mentor.majorProjects && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Experience & Projects
            </h2>
            <div className="text-base-content/80 whitespace-pre-wrap">
              {mentor.majorProjects}
            </div>
          </div>
        </div>
      )}

      {/* Expertise Section */}
      {(mentor.expertise?.length ?? 0) > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Areas of Expertise
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {mentor.expertise?.map((skill) => (
                <span key={skill} className="badge badge-primary badge-lg">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Availability Section */}
      {availableDays.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Availability
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS_OF_WEEK.map((day) => {
                const isAvailable = availableDays.includes(day);
                return (
                  <div
                    key={day}
                    className={`badge badge-lg capitalize ${
                      isAvailable ? "badge-secondary" : "badge-ghost opacity-40"
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-base-content/60 mt-2">
              Days marked in color indicate general availability for mentorship
              sessions.
            </p>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content">
        <div className="card-body text-center">
          <h3 className="card-title justify-center text-2xl">
            Interested in getting mentored?
          </h3>
          <p className="opacity-90">
            {mentor.isAtCapacity
              ? "This mentor is at capacity, but you can explore other amazing mentors in our community."
              : "Sign in to request a mentorship match with this mentor."}
          </p>
          <div className="card-actions justify-center mt-4 gap-3">
            <Link
              href="/mentorship/browse"
              className="btn btn-ghost bg-white/20 hover:bg-white/30"
            >
              Browse Mentors
            </Link>
            <Link
              href="/mentorship"
              className="btn btn-ghost bg-white/20 hover:bg-white/30"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
