const ROLE_BADGE: Record<string, string> = {
  admin: "badge-warning",
  moderator: "badge-info",
};

/** Admin portal role as a badge, coloured to match the staff banner. */
export default function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_BADGE[role] ?? "badge-ghost";
  return <span className={`badge badge-sm ${cls} capitalize`}>{role || "unknown"}</span>;
}
