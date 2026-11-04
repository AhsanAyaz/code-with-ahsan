/**
 * src/lib/adminAccess/labels.ts
 *
 * Human-readable labels for admin ACL action ids and audit log targets.
 * Isomorphic: used by the Activity page.
 */

import { ADMIN_ACTIONS, type AdminAction } from "./actions";

const DOMAIN_LABELS: Record<string, string> = {
  portal: "Portal",
  staff: "Team",
  audit: "Activity log",
  mentorship: "Mentorship",
  projects: "Projects",
  roadmaps: "Roadmaps",
  challenges: "Challenges",
  courses: "Courses",
  consulting: "1:1 Advisory",
  comms: "Comms",
  events: "Events",
  raffle: "Raffle",
  ambassador: "Ambassadors",
};

/** Explicit labels where splitting the id would read badly. */
const OVERRIDES: Partial<Record<AdminAction, string>> = {
  "staff.manage": "Team: role changed",
  "comms.emailBlast": "Comms: email blast sent",
  "comms.broadcast": "Comms: broadcast sent",
  "raffle.spin": "Raffle: spin",
};

function words(segment: string): string {
  return segment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

/**
 * "mentorship.profile.decline" -> "Mentorship: profile decline"
 * "ambassador.eligibilityBypass.revoke" -> "Ambassadors: eligibility bypass revoke"
 * Unknown ids are returned as they are.
 */
export function actionLabel(action: string): string {
  const override = OVERRIDES[action as AdminAction];
  if (override) return override;
  const [domain, ...rest] = action.split(".");
  if (!domain || rest.length === 0) return action;
  const domainLabel = DOMAIN_LABELS[domain] ?? words(domain);
  return `${domainLabel}: ${rest.map(words).join(" ")}`;
}

/** Every ACL action with its label, grouped by domain in ACL order (for filter menus). */
export function actionOptionsByDomain(): {
  domain: string;
  actions: { id: AdminAction; label: string }[];
}[] {
  const groups = new Map<string, { id: AdminAction; label: string }[]>();
  for (const id of Object.keys(ADMIN_ACTIONS) as AdminAction[]) {
    const domainKey = id.split(".")[0];
    const domain = DOMAIN_LABELS[domainKey] ?? words(domainKey);
    const label = actionLabel(id);
    const short = label.startsWith(`${domain}: `) ? label.slice(domain.length + 2) : label;
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain)!.push({ id, label: short });
  }
  return Array.from(groups, ([domain, actions]) => ({ domain, actions }));
}

/** Link for an audit target when there is an obvious page for it. */
export function targetHref(target: { type: string; id: string } | null): string | null {
  if (!target?.id) return null;
  const id = encodeURIComponent(target.id);
  switch (target.type) {
    case "project":
      return `/projects/${id}`;
    case "roadmap":
      return `/roadmaps/${id}`;
    case "challenge":
      return `/admin/challenges/${id}/edit`;
    case "ambassador_application":
      return `/admin/ambassadors/${id}`;
    case "ambassador":
      return `/admin/ambassadors/members/${id}`;
    case "event_winners":
      return `/admin/events/${id}`;
    default:
      return null;
  }
}
