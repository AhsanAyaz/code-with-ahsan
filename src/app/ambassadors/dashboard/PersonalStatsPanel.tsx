"use client";

export function PersonalStatsPanel({
  referralsCount,
  eventsCount,
  reportsOnTime,
  strikes,
  nextReportDue,
}: {
  referralsCount: number;
  eventsCount: number;
  reportsOnTime: number;
  strikes: number;
  nextReportDue: string | null;
}) {
  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Your Impact This Cohort</h2>
        <div className="stats stats-vertical lg:stats-horizontal shadow">
          <div className="stat">
            <div className="stat-title">Referrals</div>
            <div className="stat-value">{referralsCount}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Events Hosted</div>
            <div className="stat-value">{eventsCount}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Reports On Time</div>
            <div className="stat-value">{reportsOnTime}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Confirmed Strikes</div>
            <div
              className={strikes >= 2 ? "stat-value text-error" : "stat-value"}
            >
              {strikes}
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Next Report Due</div>
            <div className="stat-value text-base">
              {nextReportDue
                ? new Date(nextReportDue).toLocaleDateString()
                : "—"}
            </div>
          </div>
        </div>
        {strikes >= 2 && (
          <div role="alert" className="alert alert-error mt-4">
            <span>
              You have 2 confirmed strikes. Reach out to the program admin if
              you have questions.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
