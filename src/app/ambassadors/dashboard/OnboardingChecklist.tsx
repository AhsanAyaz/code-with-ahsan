"use client";

import { useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/apiClient";
import { useToast } from "@/contexts/ToastContext";

type OnboardingFlags = {
  joinedDiscord: boolean;
  setBio: boolean;
  uploadedVideo: boolean;
  sharedReferralLink: boolean;
  loggedFirstEvent: boolean;
};

export function OnboardingChecklist({
  initial,
}: {
  initial: OnboardingFlags;
}) {
  const [flags, setFlags] = useState<OnboardingFlags>(initial);
  const toast = useToast();

  async function markDone(key: keyof OnboardingFlags) {
    const prev = flags[key];
    setFlags((f) => ({ ...f, [key]: true }));
    try {
      const res = await authFetch("/api/ambassador/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding: { [key]: true } }),
      });
      if (!res.ok) {
        setFlags((f) => ({ ...f, [key]: prev }));
        toast.error("Could not save your progress. Please try again.");
      }
    } catch {
      setFlags((f) => ({ ...f, [key]: prev }));
      toast.error("Could not save your progress. Please try again.");
    }
  }

  const allDone =
    flags.joinedDiscord &&
    flags.setBio &&
    flags.uploadedVideo &&
    flags.sharedReferralLink &&
    flags.loggedFirstEvent;

  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Getting Started</h2>
        <p className="text-sm text-base-content/70">
          Complete these steps to hit the ground running.
        </p>

        {allDone ? (
          <div className="alert alert-success" role="status">
            <span>{"You're all set! Keep up the great work."}</span>
          </div>
        ) : (
          <ul role="list" className="space-y-2">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5">
                {flags.joinedDiscord ? "✔" : "○"}
              </span>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    flags.joinedDiscord
                      ? "line-through text-base-content/50"
                      : ""
                  }
                >
                  Join the #ambassadors channel on Discord
                </span>
                {!flags.joinedDiscord && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => markDone("joinedDiscord")}
                  >
                    Mark as done
                  </button>
                )}
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5">
                {flags.setBio ? "✔" : "○"}
              </span>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    flags.setBio ? "line-through text-base-content/50" : ""
                  }
                >
                  Set your public bio on your profile
                </span>
                {!flags.setBio && (
                  <Link href="/profile" className="btn btn-sm btn-primary">
                    Go to profile
                  </Link>
                )}
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5">
                {flags.uploadedVideo ? "✔" : "○"}
              </span>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    flags.uploadedVideo
                      ? "line-through text-base-content/50"
                      : ""
                  }
                >
                  Upload your cohort presentation video
                </span>
                {!flags.uploadedVideo && (
                  <Link href="/profile" className="btn btn-sm btn-primary">
                    Go to profile
                  </Link>
                )}
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5">
                {flags.sharedReferralLink ? "✔" : "○"}
              </span>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    flags.sharedReferralLink
                      ? "line-through text-base-content/50"
                      : ""
                  }
                >
                  Share your referral link with at least one person
                </span>
                {!flags.sharedReferralLink && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => markDone("sharedReferralLink")}
                  >
                    Copy referral link
                  </button>
                )}
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5">
                {flags.loggedFirstEvent ? "✔" : "○"}
              </span>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span
                  className={
                    flags.loggedFirstEvent
                      ? "line-through text-base-content/50"
                      : ""
                  }
                >
                  Log your first event
                </span>
                {!flags.loggedFirstEvent && (
                  <Link
                    href="/ambassadors/report"
                    className="btn btn-sm btn-primary"
                  >
                    Go to report page
                  </Link>
                )}
              </div>
            </li>
          </ul>
        )}
      </div>
    </section>
  );
}
