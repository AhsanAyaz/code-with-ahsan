"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/apiClient";
import { useMentorship } from "@/contexts/MentorshipContext";
import { hasRole } from "@/lib/permissions";
import { AmbassadorOfMonthBanner } from "./AmbassadorOfMonthBanner";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { PersonalStatsPanel } from "./PersonalStatsPanel";
import { LeaderboardPanel } from "./LeaderboardPanel";

type DashboardData = {
  profile: { uid: string; displayName: string; email: string };
  stats: {
    referralsCount: number;
    eventsCount: number;
    reportsCount: number;
    reportsOnTime: number;
    strikes: number;
    nextReportDue: string | null;
  };
  cohort: {
    cohortId: string;
    name: string;
    startDate: string;
    endDate: string;
    ambassadorOfTheMonth: { uid: string; displayName: string } | null;
  } | null;
  onboarding: {
    joinedDiscord: boolean;
    setBio: boolean;
    uploadedVideo: boolean;
    sharedReferralLink: boolean;
    loggedFirstEvent: boolean;
  };
};

export function DashboardClient() {
  const { profile, profileLoading } = useMentorship();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoading && profile && !hasRole(profile, "ambassador")) {
      router.replace("/profile");
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/ambassador/dashboard/me");
        if (!res.ok) {
          if (!cancelled) {
            setError(
              "Could not load your dashboard. Check your connection and try again."
            );
          }
          return;
        }
        const json = (await res.json()) as DashboardData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setError(
            "Could not load your dashboard. Check your connection and try again."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div role="alert" className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center">
        <span
          className="loading loading-spinner loading-md"
          aria-label="Loading dashboard"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Ambassador Dashboard</h1>
        <p className="text-base-content/70">
          Your personal impact hub. Stats update hourly.
        </p>
      </header>

      <AmbassadorOfMonthBanner
        ambassadorOfTheMonth={data.cohort?.ambassadorOfTheMonth ?? null}
      />

      <OnboardingChecklist initial={data.onboarding} />

      <PersonalStatsPanel
        referralsCount={data.stats.referralsCount}
        eventsCount={data.stats.eventsCount}
        reportsOnTime={data.stats.reportsOnTime}
        strikes={data.stats.strikes}
        nextReportDue={data.stats.nextReportDue}
      />

      <LeaderboardPanel cohortId={data.cohort?.cohortId ?? null} />
    </div>
  );
}
