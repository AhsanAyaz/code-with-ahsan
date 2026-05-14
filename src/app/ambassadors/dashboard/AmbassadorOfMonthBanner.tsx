"use client";

export function AmbassadorOfMonthBanner({
  ambassadorOfTheMonth,
}: {
  ambassadorOfTheMonth: { uid: string; displayName: string } | null;
}) {
  if (!ambassadorOfTheMonth) return null;

  return (
    <div className="alert border border-primary">
      <span className="font-bold text-primary">Ambassador of the Month</span>
      <span>{ambassadorOfTheMonth.displayName}</span>
    </div>
  );
}
