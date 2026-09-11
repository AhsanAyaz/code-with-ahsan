import { HACKATHON_TEAMS as PROMPTATHON_TEAMS } from "@/app/events/cwa-promptathon/2026/constants";
import {
  EVENT as SHIP_KARACHI,
  HACKATHON_TEAMS as SHIP_KARACHI_TEAMS,
} from "@/app/events/cwa-ship-karachi/2026/constants";

/**
 * The events the admin area can manage.
 *
 * `id` is the Firestore document id used throughout
 * `/api/admin/events/[eventId]/...` and `events/{id}/winners/data`, so it must
 * match what the public page fetches with. Adding an event here is all that is
 * needed for it to appear in the list and get a working winners screen.
 */
export type AdminEvent = {
  id: string;
  name: string;
  type: "hackathon" | "meetup";
  date: string;
  /** Team names offered in the winners dropdown. */
  teams: string[];
};

export const ADMIN_EVENTS: AdminEvent[] = [
  {
    id: SHIP_KARACHI.eventId,
    name: SHIP_KARACHI.name,
    type: "hackathon",
    date: SHIP_KARACHI.dateLabel,
    teams: SHIP_KARACHI_TEAMS,
  },
  {
    id: "cwa-promptathon-2026",
    name: "CWA Prompt-A-Thon 2026",
    type: "hackathon",
    date: "28 March 2026",
    teams: PROMPTATHON_TEAMS,
  },
];

export const getAdminEvent = (id: string): AdminEvent | null =>
  ADMIN_EVENTS.find((event) => event.id === id) ?? null;
