"use client";

export function ActivitySummaryPanel({
  eventsCount,
  referralsCount,
  reportsCount,
  strikes,
}: {
  eventsCount: number;
  referralsCount: number;
  reportsCount: number;
  strikes: number;
}) {
  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Activity Summary</h2>
        <div className="stats stats-vertical lg:stats-horizontal shadow">
          <div className="stat">
            <div className="stat-title">Events</div>
            <div className="stat-value">{eventsCount}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Referrals</div>
            <div className="stat-value">{referralsCount}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Reports submitted</div>
            <div className="stat-value">{reportsCount}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Confirmed strikes</div>
            <div
              className={
                strikes >= 2
                  ? "stat-value text-error"
                  : strikes === 1
                    ? "stat-value text-warning"
                    : "stat-value"
              }
            >
              {strikes}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
