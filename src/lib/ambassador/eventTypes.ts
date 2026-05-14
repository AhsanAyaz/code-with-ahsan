/**
 * Phase 4 (D-02): Fixed Zod enum for ambassador-logged event types.
 * Locked per CONTEXT.md so Phase 5 leaderboard per-category counts stay clean.
 */
import { z } from "zod";

export const EventTypeSchema = z.enum([
  "workshop",
  "blog_post",
  "talk_webinar",
  "community_stream",
  "study_group",
  "other",
]);
export type EventType = z.infer<typeof EventTypeSchema>;

/** UI display labels for D-02 event types. Used by LogEventForm select and EventAdminTable rows. */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  workshop: "Workshop",
  blog_post: "Blog post",
  talk_webinar: "Talk / Webinar",
  community_stream: "Community stream",
  study_group: "Study group",
  other: "Other",
};
