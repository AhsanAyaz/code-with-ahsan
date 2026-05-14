"use client";

type Flag = {
  id: string;
  type: "missing_report" | "missing_discord_role";
  period?: string;
  flaggedAt: string;
};

function formatMonthHuman(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CronFlagsPanel({ flags }: { flags: Flag[] }) {
  return (
    <section className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Flagged by Automated Check</h2>
        {flags.length === 0 ? (
          <div className="alert alert-success">
            <span>No flags. This ambassador is up to date.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {flags.map((f) => {
              const flaggedDate = new Date(f.flaggedAt).toLocaleDateString();
              if (f.type === "missing_report") {
                return (
                  <li key={f.id} className="alert alert-warning">
                    <span>
                      Missing report for {f.period ? formatMonthHuman(f.period) : "an unknown month"} — flagged {flaggedDate}
                    </span>
                  </li>
                );
              }
              return (
                <li key={f.id} className="alert alert-warning">
                  <span>
                    Missing Discord Ambassador role — flagged {flaggedDate}. Use the retry button on the application detail page to re-assign.
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
