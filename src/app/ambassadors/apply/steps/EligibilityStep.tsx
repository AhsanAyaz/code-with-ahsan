"use client";
import { useEffect, useState } from "react";
import { useMentorship } from "@/contexts/MentorshipContext";
import { AMBASSADOR_DISCORD_MIN_AGE_DAYS } from "@/lib/ambassador/constants";

type Check =
  | { loading: true }
  | { loading: false; eligible: boolean; profileAgeDays: number };

export default function EligibilityStep({
  onEligible,
}: {
  onEligible: () => void;
}) {
  const { user, loading } = useMentorship();
  const [check, setCheck] = useState<Check>({ loading: true });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setCheck({ loading: false, eligible: false, profileAgeDays: 0 });
      return;
    }
    // Use Firebase Auth account creation time — persists for the life of
    // the platform account, unlike mentorship_profiles.createdAt which is
    // only populated if the user onboarded as mentor/mentee.
    const createdMs = user.metadata.creationTime
      ? Date.parse(user.metadata.creationTime)
      : NaN;
    const ageDays = Number.isFinite(createdMs)
      ? Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000))
      : 0;
    setCheck({
      loading: false,
      eligible: ageDays >= AMBASSADOR_DISCORD_MIN_AGE_DAYS,
      profileAgeDays: ageDays,
    });
  }, [user, loading]);

  if (check.loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (!check.eligible) {
    const wait = AMBASSADOR_DISCORD_MIN_AGE_DAYS - check.profileAgeDays;
    return (
      <div className="alert alert-warning shadow-md">
        <div>
          <h3 className="font-bold text-lg">Not quite yet!</h3>
          <p className="mt-1">
            The Student Ambassador program requires your Code With Ahsan account
            to be at least{" "}
            <strong>{AMBASSADOR_DISCORD_MIN_AGE_DAYS} days</strong> old.
          </p>
          <p className="mt-2">
            Your account is{" "}
            <strong>
              {check.profileAgeDays} day{check.profileAgeDays === 1 ? "" : "s"}
            </strong>{" "}
            old — come back in{" "}
            <strong>
              {wait} day{wait === 1 ? "" : "s"}
            </strong>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="alert alert-success shadow-md">
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          You&apos;re eligible! Your account is{" "}
          <strong>{check.profileAgeDays} days</strong> old. Let&apos;s get
          started.
        </span>
      </div>
      <button type="button" className="btn btn-primary" onClick={onEligible}>
        Continue
      </button>
    </div>
  );
}
