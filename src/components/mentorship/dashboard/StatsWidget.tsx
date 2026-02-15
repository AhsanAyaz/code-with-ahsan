interface DashboardStats {
  activeMatches: number;
  completedMentorships: number;
  pendingRequests?: number;
  myRoadmaps?: number;
}

interface StatsWidgetProps {
  stats: DashboardStats;
  role: "mentor" | "mentee";
}

export default function StatsWidget({ stats, role }: StatsWidgetProps) {
  return (
    <div className="stats shadow w-full bg-base-100">
      <div className="stat">
        <div className="stat-figure text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block w-8 h-8 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            ></path>
          </svg>
        </div>
        <div className="stat-title">Active Matches</div>
        <div className="stat-value text-primary">{stats.activeMatches}</div>
      </div>

      <div className="stat">
        <div className="stat-figure text-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block w-8 h-8 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        </div>
        <div className="stat-title">Completed Mentorships</div>
        <div className="stat-value text-success">
          {stats.completedMentorships}
        </div>
      </div>

      {role === "mentor" && (
        <div className="stat">
          <div className="stat-figure text-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block w-8 h-8 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              ></path>
            </svg>
          </div>
          <div className="stat-title">My Roadmaps</div>
          <div className="stat-value text-info">{stats.myRoadmaps || 0}</div>
        </div>
      )}
    </div>
  );
}
